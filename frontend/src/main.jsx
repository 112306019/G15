import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// GTM/GA4 只做行銷維度（流量來源、裝置、地區）的輔助呈現，戰報上的
// 點擊數/EPC 一律以後端 CouponNew.click_count 為準，兩套資料源不要混用
// ——沒設定 VITE_GTM_ID 時完全不動 DOM，本地開發預設是 no-op。
const gtmId = import.meta.env.VITE_GTM_ID
if (gtmId) {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`
  document.head.appendChild(script)
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
