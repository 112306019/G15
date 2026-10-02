// 把 API 或程式錯誤轉成可以直接顯示給使用者的中文訊息。
// 後端的 err 有時是字串，有時是 DRF serializer 的欄位錯誤物件
// （例如 {"email": ["此欄位必填"]}），不可以直接 JSON.stringify 丟到畫面上。

const NETWORK_ERROR = '網路連線異常，請稍後再試';
const HAS_CHINESE = /[一-鿿]/;

// 字串直接用；陣列、物件只取出裡面的文字訊息，不顯示欄位名稱與 JSON 符號
export const formatApiError = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(formatApiError).filter(Boolean).join('；');
  }
  if (typeof value === 'object') {
    return Object.values(value).map(formatApiError).filter(Boolean).join('；');
  }
  return '';
};

export const getErrorMessage = (err, fallback = '操作失敗，請稍後再試') => {
  const apiMessage = formatApiError(err?.response?.data?.err);
  if (apiMessage) return apiMessage;

  const message = err?.message || '';

  // axios 有送出但沒收到回應；fetch 連不上時各瀏覽器的訊息分別是
  // Failed to fetch（Chrome）、Load failed（Safari）、NetworkError...（Firefox）
  const isFetchFailure =
    err instanceof TypeError && /fetch|network|load failed/i.test(message);
  if ((err?.request && !err?.response) || isFetchFailure) {
    return NETWORK_ERROR;
  }

  // 自己 throw new Error('中文訊息') 的保留；其他英文技術訊息
  // （Request failed with status code 500、Unexpected token < ...）一律改用 fallback
  return HAS_CHINESE.test(message) ? message : fallback;
};
