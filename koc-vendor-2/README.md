# KOC Hub — 廠商後台

KOC 接案平台廠商端前端，使用 React + Vite + TailwindCSS 建構。

## 啟動

```bash
npm install
npm run dev
```

Node.js v22 required.

## 技術棧

- **React 18** + **Vite 5**
- **TailwindCSS 3** (custom design tokens)
- **React Router v6** (client-side routing)
- **Recharts** (GMV 圖表)
- **Lucide React** (icons)

## 專案結構

```
src/
├── App.jsx                     # Route config
├── main.jsx                    # Entry point
├── index.css                   # Tailwind + global styles
├── components/
│   ├── layout/
│   │   ├── Layout.jsx          # Root layout wrapper
│   │   ├── Sidebar.jsx         # Collapsible sidebar nav
│   │   └── Topbar.jsx          # Sticky top bar + search
│   └── ui/
│       ├── index.jsx           # Button, Card, Input, Modal, StatCard, Avatar, ProgressBar, EmptyState
│       └── Badge.jsx           # Status badge
├── pages/
│   ├── Overview.jsx            # 總覽 dashboard
│   ├── Campaigns.jsx           # 活動管理 (CRUD + modal)
│   ├── KocManagement.jsx       # KOC 管理 (table + coupon copy)
│   ├── Orders.jsx              # 訂單追蹤
│   ├── Analytics.jsx           # 數據分析 (charts)
│   └── Settings.jsx            # 設定
├── data/
│   └── mock.js                 # 所有 mock 資料（替換為 API calls）
└── lib/
    └── utils.js                # cn(), formatCurrency(), etc.
```

## 替換 Mock 資料為真實 API

`src/data/mock.js` 的所有資料可直接換成 API fetch，
建議在各頁面使用自訂 `useQuery` hook 管理。

## Design System

顏色 token 全部定義在 `tailwind.config.js`：
- `ink` — 文字色系
- `surface` — 背景色系  
- `brand` — Amber 主色
