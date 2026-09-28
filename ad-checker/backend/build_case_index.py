"""
離線腳本：把 all_cases.json 裡的每筆案例轉成 embedding 向量，存成 case_index.json。
只在案例資料更新時手動跑一次即可，平常 FastAPI 服務啟動時只會讀取 case_index.json，
不會重新呼叫 embedding API（省錢、省時間）。

使用方式：
    python build_case_index.py

需要環境變數 GEMINI_API_KEY（跟 main.py 用同一把 key）。
"""
import json
import os
import time
from dotenv import load_dotenv
load_dotenv()

import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    raise SystemExit("請先在 .env 設定 GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

EMBED_MODEL = "models/gemini-embedding-001"

with open("all_cases.json", encoding="utf-8") as f:
    cases = json.load(f)

print(f"共 {len(cases)} 筆案例，開始轉 embedding...")

indexed = []
for i, case in enumerate(cases):
    # 摘要通常很長，embedding 模型有長度限制，太長的話先截斷
    text = case["summary"][:2000]
    try:
        result = genai.embed_content(
            model=EMBED_MODEL,
            content=text,
            task_type="RETRIEVAL_DOCUMENT",
        )
        embedding = result["embedding"]
    except Exception as e:
        print(f"  [{i}] 失敗: {e}")
        time.sleep(2)
        continue

    indexed.append({**case, "embedding": embedding})

    if (i + 1) % 20 == 0:
        print(f"  已完成 {i + 1}/{len(cases)}")

with open("case_index.json", "w", encoding="utf-8") as f:
    json.dump(indexed, f, ensure_ascii=False)

print(f"完成，成功索引 {len(indexed)} 筆，存成 case_index.json")
