// KOC 推廣連結歸因：消費者從 /r/<優惠碼> 短連結落地時，網址會帶 ?ref=<優惠碼>
// （見 backend koc_link_redirect）。這裡把它記在 localStorage，之後的
// begin_checkout / purchase 事件帶上 link_ref 參數，讓 GA4 能算出
// 「透過連結進站、即使沒手動輸入優惠碼」的結帳與購買。

const STORAGE_KEY = 'koc_link_ref';
// 歸因有效期：點連結後 30 天內的結帳都算這組連結帶來的
const ATTRIBUTION_DAYS = 30;

export const captureKocRef = (search) => {
  const params = new URLSearchParams(search);
  const code = params.get('ref');
  if (!code) return null;

  const record = {
    code,
    kocId: params.get('koc_id') || '',
    ts: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // 無痕模式等情況可能無法寫入，歸因就只限這次落地事件
  }
  return record;
};

export const getKocRef = () => {
  try {
    const record = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!record?.code) return undefined;
    if (Date.now() - record.ts > ATTRIBUTION_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
    return record.code;
  } catch {
    return undefined;
  }
};
