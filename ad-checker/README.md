# 廣告文案品質檢測系統

食品・化粧品・醫療器材・藥品廣告法規合規分析系統（2025年版）

採用 **Rule-based + AI（Claude）混合方法**：
- Rule-based：精準偵測法規明訂禁用詞句
- AI 分析：理解語意語氣，找出隱性合規風險

---

## 專案結構

```
ad-checker/
├── backend/
│   ├── main.py          # FastAPI 主程式
│   ├── rules.py         # 規則檢測模組（禁用詞庫）
│   ├── requirements.txt
│   └── .env.example     # 環境變數範本
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # 主頁面
│   │   ├── components/
│   │   │   ├── Pipeline.tsx  # 分析流程指示器
│   │   │   └── ResultPanel.tsx # 結果顯示
│   │   ├── hooks/
│   │   │   └── useAnalyze.ts # API 呼叫邏輯
│   │   └── types/
│   │       └── index.ts      # TypeScript 型別定義
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── start-backend.sh
└── start-frontend.sh
```

---

## 快速啟動

### 1. 設定 API Key

```bash
cd backend
cp .env.example .env
# 編輯 .env，填入你的 Anthropic API Key
```

### 2. 啟動後端（Terminal 1）

```bash
chmod +x start-backend.sh
./start-backend.sh
```

後端啟動後：
- API：http://localhost:8000
- Swagger 文件：http://localhost:8000/docs

### 3. 啟動前端（Terminal 2）

```bash
chmod +x start-frontend.sh
./start-frontend.sh
```

前端啟動後開啟：http://localhost:5173

---

## API 說明

### POST `/api/analyze`

**Request Body：**
```json
{
  "text": "廣告文案內容",
  "category": "food"  // food | cosmetic | medical_device | drug
}
```

**Response：**
```json
{
  "score": 42,
  "risk_level": "high",
  "violations": [
    {
      "word": "消炎",
      "label": "涉及醫療效能",
      "severity": "danger",
      "group": "medical_efficacy",
      "law_ref": "食安法第28條..."
    }
  ],
  "ai_analysis": {
    "overall_assessment": "...",
    "semantic_risks": ["..."],
    "suggestions": ["..."],
    "compliant_alternatives": ["..."]
  },
  "highlighted_segments": [
    { "text": "本產品能", "type": "normal" },
    { "text": "消炎", "type": "danger" }
  ],
  "danger_count": 3,
  "warning_count": 1
}
```

### GET `/health`

確認後端狀態與 AI 是否啟用。

---

## 法規依據

禁用詞庫來源：衛生福利部食品藥物管理署《食品、化粧品、醫療器材及藥品廣告法規彙編》2025年版

- 食品安全衛生管理法第28條
- 化粧品衛生安全管理法第10條及施行細則附件一、附件四
- 醫療器材管理法第6條、第46條
- 藥事法第65-70條及施行細則第47條

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 後端框架 | FastAPI |
| AI 呼叫 | Anthropic Claude API |
| 前端框架 | React 18 + TypeScript |
| 打包工具 | Vite |
| HTTP 客戶端 | axios（前端）、httpx（後端） |
