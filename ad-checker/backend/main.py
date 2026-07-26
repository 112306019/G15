from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import os
import time
from groq import Groq
from rules import detect_violations, applicable_groups, CATEGORY_NAMES

app = FastAPI(title="廣告文案品質檢測系統 API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://adchecker.onrender.com",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


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


def call_llm(text, violations, category):
    if not GROQ_API_KEY:
        return None, []

    cat_name = CATEGORY_NAMES.get(category, "食品")
    violation_summary = (
        f"規則引擎已偵測到的明確違規詞：{'、'.join(v['word'] for v in violations)}"
        if violations else "規則引擎未偵測到明確違規詞。"
    )

    prompt = f"""你是台灣衛生福利部食品藥物管理署的廣告法規合規專家，精通《食品安全衛生管理法》《化粧品衛生安全管理法》《醫療器材管理法》《藥事法》及相關認定準則。

目前審查的產品類別為「{cat_name}」，請務必僅依「{cat_name}」適用的法規來判斷。
（注意：藥品與醫療器材經核准後得宣稱療效，食品與化粧品則完全不得宣稱醫療效能。）

【待審文案】
{text}

【規則引擎結果（僅供參考）】
{violation_summary}

你的任務分三部分：
1. semantic_risks：找出語意層級「明確違規」的問題（即使規則引擎沒抓到字面詞）。
2. gray_areas：判讀「灰色地帶」。這些不是固定禁用詞，而是需要靠語意與舉證可能性判斷的踩線說法，例如「1瓶抵12瓶」這類無法舉證的誇大數字、「業界唯一」這類排他宣稱、「7天有感」這類時效宣稱、暗示性療效、見證式宣稱等。請直接從文案判讀，逐筆列出。
3. suggestions / compliant_alternatives：提供修改方向與合規替代詞句。

請僅以 JSON 回覆（不要任何其他文字、不要 markdown）：
{{
  "overall_assessment": "整體評估（2-3句話）",
  "semantic_risks": ["明確違規的語意風險1", "語意風險2"],
  "gray_areas": [
    {{
      "phrase": "從文案中擷取的原始片段（需與原文完全一致以便標註）",
      "label": "風險類型（如：誇大數字宣稱／排他宣稱／時效宣稱／暗示療效／見證宣稱）",
      "reason": "為何屬於灰色地帶、有何開罰風險",
      "law_ref": "相關法規條文"
    }}
  ],
  "suggestions": ["具體修改建議1", "修改建議2", "修改建議3"],
  "compliant_alternatives": ["合規替代詞句1", "合規替代詞句2"]
}}"""

    client = Groq(api_key=GROQ_API_KEY)

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            break
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                time.sleep(10)
                continue
            raise

    raw = response.choices[0].message.content
    clean = raw.replace("```json", "").replace("```", "").strip()
    parsed = json.loads(clean)

    gray_areas = []
    for ga in parsed.get("gray_areas", []):
        phrase = (ga.get("phrase") or "").strip()
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
    return {"status": "ok", "ai_enabled": bool(GROQ_API_KEY)}


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
