from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import os
import re
from dotenv import load_dotenv
load_dotenv()
import time
import httpx
import opencc
import google.generativeai as genai
import numpy as np
from rules import detect_violations, applicable_groups, CATEGORY_NAMES

app = FastAPI(title="廣告文案品質檢測系統 API", version="1.1.0")

# CORS 允許清單改用環境變數設定，避免之後修改這個檔案的其他部分時
# 不小心又把正式前端網域蓋掉（這已經發生過兩次）。
# CORS_ALLOWED_ORIGINS 用逗號分隔多個網域；沒設定時使用下面這組預設值。
_default_cors_origins = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "https://adchecker.onrender.com,"
    "https://g15-frontend.onrender.com"
)
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", _default_cors_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

NGROK_ENDPOINT = os.getenv("NGROK_ENDPOINT", "")  # e.g. https://xxxx.ngrok-free.dev/api/generate
QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen2.5:7b-instruct-q4_K_M")

# s2twp：簡體 → 繁體，並轉換成台灣慣用詞（軟件→軟體、信息→資訊 等）
# 對已經是繁體的輸入（例如 TAIDE）基本上不會有作用，安全可以一律套用
_s2twp = opencc.OpenCC("s2twp")

EMBED_MODEL = "models/gemini-embedding-001"
CASE_INDEX_PATH = os.path.join(os.path.dirname(__file__), "case_index.json")

# ---------------------------------------------------------------------------
# RAG：真實判決/函釋案例檢索
# 服務啟動時載入一次（case_index.json 是離線用 build_case_index.py 產生的），
# 之後每次請求只做向量相似度計算，不會重新呼叫 embedding API。
# ---------------------------------------------------------------------------
_case_bank = []          # list of case dict（不含 embedding，用來回傳內容）
_case_vectors = None     # numpy array, shape (N, D)
_case_categories = []    # list[str]，跟 _case_bank 對齊，用來篩選類別

if os.path.exists(CASE_INDEX_PATH) and GEMINI_API_KEY:
    try:
        with open(CASE_INDEX_PATH, encoding="utf-8") as f:
            raw = json.load(f)
        _case_bank = [{k: v for k, v in c.items() if k != "embedding"} for c in raw]
        _case_categories = [c["category"] for c in raw]
        _case_vectors = np.array([c["embedding"] for c in raw], dtype=np.float32)
        # 預先做 L2 normalize，之後算 cosine similarity 只需要做內積
        norms = np.linalg.norm(_case_vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1e-8
        _case_vectors = _case_vectors / norms
        print(f"已載入 {len(_case_bank)} 筆實務案例索引")
    except Exception as e:
        print(f"案例索引載入失敗，將不使用 RAG 檢索: {e}")


def _embed_query(text):
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=text,
        task_type="RETRIEVAL_QUERY",
    )
    vec = np.array(result["embedding"], dtype=np.float32)
    return vec / (np.linalg.norm(vec) + 1e-8)


def retrieve_similar_cases(text, category, top_k=5):
    """依語意相似度，從真實判決/函釋案例中找出跟目前文案最相關的幾筆，
    只在同一個產品類別內比對（食品文案不會比對到藥品案例）。

    文案通常一句話裡包含好幾個不同的宣稱（例如同時有時效宣稱、體感變化、
    排他宣稱），如果整段文字只轉一個 embedding 去查，向量會被字數多的主題
    「拉走」，少數的主張（例如短短一句「業界唯一」）訊號會被稀釋掉，導致
    查不到對應案例。因此改成把文案拆成一句一句分別查，各自找出最相關的
    案例後再合併、去重，確保每個獨立主張都有機會撈到對應的真實案例。"""
    if _case_vectors is None or not GEMINI_API_KEY:
        return []

    # 用常見中文標點拆句，並濾掉空字串/太短的殘留片段
    clauses = [c.strip() for c in re.split(r"[，。！？；、\n]", text) if len(c.strip()) >= 2]
    if not clauses:
        clauses = [text]

    # 同一類別的候選案例先篩出來，避免每個子句都重算一次篩選
    category_idx = [i for i in range(len(_case_bank)) if _case_categories[i] == category]
    if not category_idx:
        return []
    category_vectors = _case_vectors[category_idx]

    scored = {}  # case 在 _case_bank 中的 index -> 目前看過的最高相似度
    for clause in clauses:
        try:
            query_vec = _embed_query(clause)
        except Exception as e:
            print(f"查詢 embedding 失敗（子句：{clause[:20]}...），略過: {e}")
            continue

        sims = category_vectors @ query_vec
        # 每個子句只取最相關的 1-2 筆，避免同一句話霸佔掉所有名額
        top_local = np.argsort(sims)[::-1][:2]
        for local_i in top_local:
            global_i = category_idx[local_i]
            sim = float(sims[local_i])
            if global_i not in scored or sim > scored[global_i]:
                scored[global_i] = sim

    ranked = sorted(scored.items(), key=lambda x: x[1], reverse=True)
    return [_case_bank[i] for i, _ in ranked[:top_k]]


class AnalyzeRequest(BaseModel):
    text: str
    category: str


class Violation(BaseModel):
    word: str
    label: str
    severity: str
    group: str
    law_ref: str = ""


class GrayArea(BaseModel):
    phrase: str
    label: str
    reason: str
    law_ref: str = ""
    severity: str = "gray"


class AIAnalysis(BaseModel):
    overall_assessment: str
    semantic_risks: list[str]
    suggestions: list[str]
    compliant_alternatives: list[str]
    ai_enabled: bool = True


class AnalyzeResponse(BaseModel):
    score: int
    risk_level: str
    category: str
    violations: list[Violation]
    gray_areas: list[GrayArea]
    ai_analysis: Optional[AIAnalysis]
    highlighted_segments: list[dict]
    danger_count: int
    warning_count: int
    gray_count: int


def calc_score(violations, gray_areas):
    danger = sum(1 for v in violations if v["severity"] == "danger")
    warning = sum(1 for v in violations if v["severity"] == "warning")
    gray = len(gray_areas)
    return max(0, 100 - danger * 18 - warning * 8 - gray * 5)


def get_risk_level(score):
    if score >= 80: return "none"
    if score >= 60: return "low"
    if score >= 35: return "medium"
    return "high"


def build_highlighted_segments(text, violations, gray_areas):
    marked = [None] * len(text)

    sorted_v = sorted(violations, key=lambda v: len(v["word"]), reverse=True)
    for v in sorted_v:
        word = v["word"]
        start = 0
        while True:
            idx = text.find(word, start)
            if idx == -1:
                break
            for i in range(idx, idx + len(word)):
                if marked[i] is None:
                    marked[i] = v["severity"]
            start = idx + 1

    for ga in sorted(gray_areas, key=lambda g: len(g.get("phrase", "")), reverse=True):
        phrase = ga.get("phrase", "")
        if not phrase:
            continue
        start = 0
        while True:
            idx = text.find(phrase, start)
            if idx == -1:
                break
            for i in range(idx, idx + len(phrase)):
                if marked[i] is None:
                    marked[i] = "gray"
            start = idx + 1

    segments = []
    i = 0
    while i < len(text):
        if marked[i] is None:
            j = i
            while j < len(text) and marked[j] is None:
                j += 1
            segments.append({"text": text[i:j], "type": "normal"})
            i = j
        else:
            sev = marked[i]
            j = i
            while j < len(text) and marked[j] == sev:
                j += 1
            segments.append({"text": text[i:j], "type": sev})
            i = j
    return segments


def build_compliance_prompt(text, violations, category, retrieved_cases=None):
    cat_name = CATEGORY_NAMES.get(category, "食品")
    violation_summary = (
        f"規則引擎已偵測到的明確違規詞：{'、'.join(v['word'] for v in violations)}"
        if violations else "規則引擎未偵測到明確違規詞。"
    )

    cases_block = ""
    if retrieved_cases:
        case_lines = []
        for c in retrieved_cases:
            summary = c["summary"][:300]  # 避免單筆過長把 prompt 撐爆
            case_lines.append(f"・（{c['type']}，{c['date']}）{summary}")
        cases_block = (
            "\n【相關實務案例參考（真實判決／函釋，非本次待審文案）】\n"
            "以下是過去實際認定違規的判決或函釋摘要，供你判斷本次文案時參考類似的認定標準與法條引用方式，"
            "不代表待審文案內容跟這些案例相同：\n"
            + "\n".join(case_lines) + "\n"
        )

    prompt = f"""你是台灣衛生福利部食品藥物管理署的廣告法規合規專家，精通《食品安全衛生管理法》《化粧品衛生安全管理法》《醫療器材管理法》《藥事法》及相關認定準則。

目前審查的產品類別為「{cat_name}」，請務必僅依「{cat_name}」適用的法規來判斷。
（注意：藥品與醫療器材經核准後得宣稱療效，食品與化粧品則完全不得宣稱醫療效能。）

【待審文案】
{text}

【規則引擎結果（僅供參考）】
{violation_summary}
{cases_block}
你的任務分三部分：
1. semantic_risks：找出語意層級「明確違規」的問題（即使規則引擎沒抓到字面詞）。
2. gray_areas：判讀「灰色地帶」。這些不是固定禁用詞，而是需要靠語意與舉證可能性判斷的踩線說法，例如「1瓶抵12瓶」這類無法舉證的誇大數字、「業界唯一」這類排他宣稱、「7天有感」這類時效宣稱、暗示性療效、見證式宣稱、體感變化描述（如代謝變快、體態改善、氣色變好）等。請盡可能寬鬆地判讀，只要片段本身缺乏具體舉證依據、帶有誇大或暗示效果的語氣，就應列為 gray_areas，即使同一句話裡也包含被規則引擎抓到的明確違規詞（兩者可以並存，不互斥，請針對句子中不同片段分別標註）。除非文案完全平鋪直敘、毫無任何主觀效果宣稱，否則 gray_areas 通常不應為空陣列。
3. suggestions / compliant_alternatives：提供修改方向與合規替代詞句。

【極重要規則】gray_areas 裡的 "phrase" 欄位，一定要是直接從上面【待審文案】中逐字複製出來的一小段真實文字，長度通常 2 到 15 個字。絕對禁止把下面 JSON 範例格式裡的說明文字（例如「從文案中擷取的原始片段」這幾個字）當作答案抄進去，那只是欄位說明，不是範例答案。如果你在文案裡找不到任何值得標記的片段，就把 gray_areas 設為空陣列 []，不要硬湊。

舉例一：如果【待審文案】是「本產品三天有感，讓你代謝變快，體態更輕盈」，正確的 gray_areas 應該長這樣：
[
  {{"phrase": "三天有感", "label": "時效宣稱", "reason": "缺乏具體實驗數據佐證，屬於誇大時效宣稱", "law_ref": "食安法第28條第1項"}},
  {{"phrase": "代謝變快", "label": "體感變化描述", "reason": "暗示生理機能改變，屬於誇大不實描述", "law_ref": "食安法第28條第1項"}}
]

舉例二：如果【待審文案】是「1瓶抵12瓶效果，業界唯一獨家配方，用過都說有感」，正確的 gray_areas 應該長這樣：
[
  {{"phrase": "1瓶抵12瓶效果", "label": "誇大數字宣稱", "reason": "以無法舉證的倍數效果誇大功效", "law_ref": "食安法第28條第1項"}},
  {{"phrase": "業界唯一獨家配方", "label": "排他宣稱", "reason": "宣稱獨家但無法舉證，涉及不實比較", "law_ref": "食安法第28條第1項"}},
  {{"phrase": "用過都說有感", "label": "見證宣稱", "reason": "以他人使用經驗暗示效果，屬於見證式宣稱，易誤導消費者", "law_ref": "食安法第28條第1項"}}
]

請僅以 JSON 回覆（不要任何其他文字、不要 markdown、不要重複輸出範例內容）：
{{
  "overall_assessment": "整體評估（2-3句話）",
  "semantic_risks": ["明確違規的語意風險1", "語意風險2"],
  "gray_areas": [
    {{
      "phrase": "（從【待審文案】逐字複製的真實片段）",
      "label": "風險類型（如：誇大數字宣稱／排他宣稱／時效宣稱／暗示療效／見證宣稱）",
      "reason": "為何屬於灰色地帶、有何開罰風險",
      "law_ref": "相關法規條文"
    }}
  ],
  "suggestions": ["具體修改建議1", "修改建議2", "修改建議3"],
  "compliant_alternatives": ["合規替代詞句1", "合規替代詞句2"]
}}"""
    return prompt


def call_gemini(prompt):
    if not GEMINI_API_KEY:
        return None

    model = genai.GenerativeModel("gemini-flash-latest")
    response = None
    for attempt in range(3):
        try:
            response = model.generate_content(
                prompt,
                generation_config={"temperature": 0.2},
            )
            break
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                time.sleep(10)
                continue
            raise
    return response.text


def call_taide(prompt):
    if not NGROK_ENDPOINT:
        return None

    # /api/generate 是純文字接龍模式；TAIDE 微調時用的是對話格式，
    # 改用 /api/chat（同一個 ngrok/Ollama 服務，換個路徑）通常指令遵循度較好。
    chat_endpoint = NGROK_ENDPOINT.rsplit("/api/", 1)[0] + "/api/chat"

    system_msg = (
        "你是台灣衛生福利部食品藥物管理署的廣告法規合規專家。"
        "請務必只回覆合法的 JSON，不要有任何其他文字、不要 markdown 標記、不要重複輸出範例內容。"
    )

    # 桌機/ngrok tunnel 可能斷線或跑得比較慢，timeout 抓寬一點
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(
            chat_endpoint,
            json={
                "model": QWEN_MODEL,
                "messages": [
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.1},
            },
        )
        resp.raise_for_status()
        raw = resp.json().get("message", {}).get("content", "")
        # Qwen 等非繁中優化模型常會回簡體，這裡統一轉繁體＋台灣慣用詞
        return _s2twp.convert(raw)


def call_llm(text, violations, category):
    if not NGROK_ENDPOINT and not GEMINI_API_KEY:
        return None, []

    retrieved_cases = retrieve_similar_cases(text, category, top_k=4)
    print(f"[RAG] 檢索到 {len(retrieved_cases)} 筆相關案例:")
    for c in retrieved_cases:
        print(f"  - ({c['type']}, {c['date']}) {c['summary'][:60]}...")
    prompt = build_compliance_prompt(text, violations, category, retrieved_cases)

    raw = None
    if NGROK_ENDPOINT:
        try:
            raw = call_taide(prompt)
        except Exception as e:
            # TAIDE（桌機／tunnel）打不通時，退回 Gemini 當備援；沒設 Gemini key 就直接往上拋
            print(f"TAIDE call failed, falling back to Gemini: {e}")
            if not GEMINI_API_KEY:
                raise
    if raw is None:
        raw = call_gemini(prompt)
    if raw is None:
        return None, []

    clean = raw.replace("```json", "").replace("```", "").strip()
    parsed = json.loads(clean)

    gray_areas = []
    for ga in parsed.get("gray_areas", []):
        phrase = (ga.get("phrase") or "").strip().strip("「」\"'")
        # 防呆：小模型（如 TAIDE）有時會把範例說明文字當成答案吐出來，
        # 這裡驗證 phrase 是否真的是原文的一部分，不是的話直接捨棄，
        # 避免在畫面上出現「從文案中擷取的原始片段」這種假資料。
        if not phrase or phrase not in text:
            continue
        gray_areas.append({
            "phrase": phrase,
            "label": ga.get("label", "灰色地帶"),
            "reason": ga.get("reason", ""),
            "law_ref": ga.get("law_ref", ""),
            "severity": "gray",
        })

    ai_dict = {
        "overall_assessment": parsed.get("overall_assessment", ""),
        "semantic_risks": parsed.get("semantic_risks", []),
        "suggestions": parsed.get("suggestions", []),
        "compliant_alternatives": parsed.get("compliant_alternatives", []),
        "ai_enabled": True,
    }
    return ai_dict, gray_areas


@app.get("/")
def root():
    return {"message": "廣告文案品質檢測系統 API", "version": "1.1.0"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "ai_enabled": bool(NGROK_ENDPOINT or GEMINI_API_KEY),
        "ai_provider": "qwen" if NGROK_ENDPOINT else ("gemini" if GEMINI_API_KEY else None),
    }


@app.get("/api/rules/{category}")
def rules_for_category(category: str):
    if category not in CATEGORY_NAMES:
        raise HTTPException(status_code=400, detail="無效的產品類別")
    return {"category": category, "groups": applicable_groups(category)}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="文案內容不得為空")
    if req.category not in CATEGORY_NAMES:
        raise HTTPException(status_code=400, detail="無效的產品類別")

    violations = detect_violations(req.text, req.category)

    ai_result = None
    gray_areas = []
    try:
        ai_dict, gray_areas = call_llm(req.text, violations, req.category)
        if ai_dict:
            ai_result = AIAnalysis(**ai_dict)
    except Exception as e:
        print(f"AI analysis error: {e}")
        gray_areas = []

    score = calc_score(violations, gray_areas)
    risk_level = get_risk_level(score)
    segments = build_highlighted_segments(req.text, violations, gray_areas)

    return AnalyzeResponse(
        score=score,
        risk_level=risk_level,
        category=req.category,
        violations=[Violation(**v) for v in violations],
        gray_areas=[GrayArea(**ga) for ga in gray_areas],
        ai_analysis=ai_result,
        highlighted_segments=segments,
        danger_count=sum(1 for v in violations if v["severity"] == "danger"),
        warning_count=sum(1 for v in violations if v["severity"] == "warning"),
        gray_count=len(gray_areas),
    )
