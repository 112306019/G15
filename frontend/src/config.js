export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
export const ADGUARD_API_URL = import.meta.env.VITE_ADGUARD_API_URL || 'http://127.0.0.1:8001';

// KOC 戰報短連結：後端 /r/<promotion_code>/ 會記錄點擊後 302 導去商品頁，
// 取代原本純文字優惠碼，讓 KOC 有連結可以分享。掛在後端根路徑（見
// backend/api/urls.py），不是 /api 底下的一般 API，所以直接用 API_BASE_URL。
export const buildPromoLink = (promoCode) => `${API_BASE_URL}/r/${promoCode}`;
