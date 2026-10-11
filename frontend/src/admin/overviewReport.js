// 平台營運總覽「匯出報表」：按下時重新抓總覽頁用到的資料，組成 CSV 下載。
// 檔案開頭加 BOM，Excel 開啟中文才不會變亂碼。
import {
  getAdminOverview,
  getAdminPerformance,
  getAdminSiteTraffic,
} from '../api/platform';
import { formatApiError } from '../errorMessage';

// CSV 欄位含逗號、引號或換行時要用引號包起來
const csvCell = value => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = rows => rows.map(row => row.map(csvCell).join(',')).join('\r\n');

const downloadCsv = (filename, rows) => {
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const ensureSuccess = (response, fallback) => {
  if (response.data?.success === false) {
    throw new Error(formatApiError(response.data.err) || fallback);
  }
  return response.data;
};

/**
 * canViewFinance：與總覽頁的收益卡片相同的權限（super_admin / finance）才放營收資料。
 * 網站流量（GA4）讀取失敗時不擋整份報表，只在該區塊註明。
 */
export async function exportOverviewReport({ canViewFinance }) {
  const [overviewResponse, performanceResponse] = await Promise.all([
    getAdminOverview(),
    getAdminPerformance(),
  ]);
  const overview = ensureSuccess(overviewResponse, '取得平台總覽失敗').overview || {};
  const performanceData = ensureSuccess(performanceResponse, '取得成效統計失敗');
  const summary = performanceData.summary || {};
  const periodLabel = performanceData.period?.Label || '';

  let traffic = null;
  let trafficError = '';
  try {
    traffic = ensureSuccess(await getAdminSiteTraffic('30d'), '網站流量讀取失敗');
  } catch (err) {
    trafficError = formatApiError(err.response?.data?.err) || '網站流量暫時無法讀取';
  }

  const now = new Date();
  const rows = [
    ['平台營運總覽報表'],
    ['產生時間', now.toLocaleString('zh-TW', { hour12: false })],
    [],
    ['平台概況', '數值'],
    ['總註冊會員', overview.User_count ?? 0],
    ['合作廠商', overview.Vendor_count ?? 0],
    ['活動數', overview.Campaign_count ?? 0],
    ['KOC 任務數', overview.KOCMission_count ?? 0],
    ['訂單總數', overview.Order_count ?? 0],
    ['已付款訂單', overview.Payment_count ?? 0],
    ['客服工單', overview.Ticket_count ?? 0],
  ];

  if (canViewFinance) {
    rows.push(
      [],
      [`本月營運（${periodLabel}）`, '數值'],
      ['實際訂單數', summary.Total_actual_orders ?? 0],
      ['已完成訂單數', summary.Total_completed_orders ?? 0],
      ['營收 (NT$)', summary.Total_revenue ?? 0],
      ['平均客單價 (NT$)', summary.Average_order_amount ?? 0],
      ['KOC 佣金 (NT$)', summary.Total_commission ?? 0],
      ['本月使用的優惠碼數', summary.Coupons_used_this_month ?? 0],
    );
  }

  rows.push([], ['近 30 天網站流量（Google Analytics）']);
  if (traffic) {
    rows.push(
      ['期間總瀏覽量', traffic.totals?.page_views ?? 0],
      ['期間不重複訪客', traffic.totals?.visitors ?? 0],
      [],
      ['日期', '瀏覽量', '訪客數'],
      ...(traffic.daily || []).map(day => [day.date, day.page_views, day.visitors]),
    );
  } else {
    rows.push(['無法取得', trafficError]);
  }

  // 用本地時間組日期：toISOString 是 UTC，台灣凌晨匯出會變成前一天
  const pad = n => String(n).padStart(2, '0');
  const dateStamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  downloadCsv(`平台營運總覽_${dateStamp}.csv`, rows);
}
