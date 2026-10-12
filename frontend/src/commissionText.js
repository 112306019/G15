// KOC 分潤設定的顯示文字（廠商後台、KOC 接案頁共用）。
// commission 是後端回傳的 { mode, label, base_rate, tiers: [{ name, min_quantity, max_quantity, rate }] }
//   mode：fixed 固定、progressive 階層式累進、platform_tier 舊活動的平台統一級距（整月套用）

// 「第 1–10 件」「第 51 件以上」
export function tierRangeText(tier) {
  if (tier.max_quantity === null || tier.max_quantity === undefined) {
    return `第 ${tier.min_quantity} 件以上`;
  }
  if (tier.min_quantity === tier.max_quantity) return `第 ${tier.min_quantity} 件`;
  return `第 ${tier.min_quantity}–${tier.max_quantity} 件`;
}

// 各層的說明：「第 1–10 件 3%・第 11 件以上 10%」；固定分潤沒有分層，回傳空字串
export function commissionTiersText(commission) {
  if (!commission || commission.mode === 'fixed' || !commission.tiers?.length) return '';
  return commission.tiers.map((tier) => `${tierRangeText(tier)} ${tier.rate}%`).join('・');
}

// 計算方式的一句話說明
export function commissionModeHint(commission) {
  if (!commission) return '';
  if (commission.mode === 'progressive') {
    return '累進計算：每一段件數各用各的分潤比例，每月從第 1 件重新計算';
  }
  if (commission.mode === 'platform_tier') {
    return '本月件數達到新級距時，本月所有分潤都會以新的比例計算';
  }
  return '每筆訂單都用同一個分潤比例';
}
