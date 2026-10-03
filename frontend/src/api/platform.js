// frontend/src/api/platform.js
import api from './index'

// ======================================================
// KOC 管理
// ======================================================

// 獲取待審核 KOC 列表
export const getKOCPendingList = () => {
  return api.get('/platform/koc/getPendingList')
}

// 審核通過 KOC
export const approveKOC = (data) => {
  return api.post('/platform/koc/approve', data)
}

// 審核拒絕 KOC
export const rejectKOC = (data) => {
  return api.post('/platform/koc/reject', data)
}

// 獲取所有 KOC 列表
export const getKOCList = () => {
  return api.get('/platform/koc/getList')
}

// 獲取 KOC 詳情
export const getKOCDetail = (params) => {
  return api.get('/platform/koc/getDetail', { params })
}

// KOC 任務例外處理（階段平常由流程自動推進）
// data: { Admin_id, KOCMission_id, Reason }
export const forceCloseKOCMission = (data) => {
  return api.post('/platform/kocmission/forceClose', data)
}

export const revertKOCMissionStage = (data) => {
  return api.post('/platform/kocmission/revertStage', data)
}

// ======================================================
// 廠商管理
// ======================================================

// 取得廠商列表
export const getAdminVendorList = (params = {}) => {
  return api.get('/platform/vendors', { params })
}

// 取得廠商詳細資料
export const getAdminVendorDetail = (vendorId) => {
  return api.get('/platform/vendor/detail', {
    params: {
      Vendor_id: vendorId,
    },
  })
}

// 審核廠商申請
export const reviewAdminVendor = (data) => {
  return api.patch('/platform/vendor/review', data)
}

// 手動新增廠商操作紀錄
export const createVendorAuditLog = (data) => {
  return api.post('/platform/vendor/audit', data)
}

// ======================================================
// 平台資料查詢
// ======================================================

// 取得平台總覽
export const getAdminOverview = () => {
  return api.get('/platform/overview')
}

// 取得管理員操作紀錄
export const getAdminAuditLogs = (params = {}) => {
  return api.get('/platform/audit/logs', { params })
}

// 取得優惠碼使用狀況
export const getAdminCouponUsage = (params = {}) => {
  return api.get('/platform/coupons', { params })
}

// 取得成效分析
export const getAdminPerformance = (params = {}) => {
  return api.get('/platform/performance', { params })
}

// 取得所有任務列表
export const getAllMissions = (params = {}) => {
  return api.get('/platform/mission/getAll', { params })
}

// 取得收益追蹤
export const getEarningsTracking = (params = {}) => {
  return api.get('/platform/mission/getEarningsTracking', { params })
}

// 廠商審核逾期列表
export const getVendorReviewOverdue = (params = {}) => {
  return api.get('/platform/vendor/review-overdue', { params })
}

// 手動重新寄送廠商審核逾期提醒信
export const notifyVendorReviewOverdue = (data) => {
  return api.post('/platform/vendor/review-overdue/notify', data)
}

// ======================================================
// Vendor 貨款月結：ShareBuy → Vendor
// ======================================================

// 逐訂單貨款明細
export const getAdminVendorReceivables = (params = {}) => {
  return api.get('/platform/vendor/receivables', { params })
}

// 指定月份可產生貨款月結的 Vendor
// params: { Admin_id, month?: 'YYYY-MM' }
export const getMonthlyPayoutReadyVendors = (params = {}) => {
  return api.get('/platform/vendor/payout-batches/ready', { params })
}

// 產生貨款月結單
// data: { Admin_id, vendor_id?, month?: 'YYYY-MM' }
export const generateVendorPayoutBatch = (data) => {
  return api.post('/platform/vendor/payout-batch/generate', data)
}

// 貨款月結單列表
// params: { Admin_id, vendor_id?, status?, month? }
export const getVendorPayoutBatches = (params = {}) => {
  return api.get('/platform/vendor/payout-batches', { params })
}

// 確認整張貨款月結單已完成匯款
export const confirmVendorPayoutBatch = (data) => {
  return api.post('/platform/vendor/payout-batch/confirm', data)
}

// ======================================================
// Vendor 服務費月結：Vendor → ShareBuy
// ======================================================

// 指定月份可產生 15% 服務費月結單的 Vendor
export const getSettleableVendors = (params = {}) => {
  return api.get('/platform/vendors/settleable', { params })
}

// 產生 Vendor 服務費月結單
export const generateVendorSettlement = (data) => {
  return api.post('/platform/vendor/settlement/generate', data)
}

// 取得 Vendor 服務費月結單
export const getVendorSettlements = (params = {}) => {
  return api.get('/platform/vendor/settlements', { params })
}

// Admin 確認收到 Vendor 服務費
export const confirmVendorSettlementPayment = (data) => {
  return api.post('/platform/vendor/settlement/confirm', data)
}

// Admin 確認／退回 Vendor 回報的服務費匯款
// data: { Admin_id, payment_id, action: 'confirm' | 'reject', Action_reason? }
export const confirmVendorSettlementRemittance = (data) => {
  return api.post('/platform/vendor/settlement/payment/confirm', data)
}

// 平台開給 Vendor 的服務費發票
export const getVendorSettlementInvoices = (params = {}) => {
  return api.get('/platform/vendor/invoices', { params })
}

// ======================================================
// KOC 財務
// ======================================================

// KOC 撥款申請列表
export const getAdminKocPayouts = (params = {}) => {
  return api.get('/platform/koc/payouts', { params })
}

// Admin 確認 KOC 撥款結果
export const confirmAdminKocPayout = (data) => {
  return api.post('/platform/koc/payout/confirm', data)
}

// KOC 銀行批次轉帳 CSV
export const exportKocPayoutTransfers = (params = {}) => {
  return api.get('/platform/payouts/export', {
    params: {
      type: 'koc',
      ...params,
    },
    responseType: 'blob',
  })
}

// ======================================================
// 客服聊天室
// ======================================================

// 取得聊天室列表
export const getAdminSupportRooms = (participantType) => {
  return api.get('/platform/support/getRooms', {
    params: {
      participant_type: participantType,
    },
  })
}

// 取得聊天室訊息
export const getAdminSupportMessages = (roomId) => {
  return api.get('/platform/support/getMessages', {
    params: {
      room_id: roomId,
    },
  })
}

// 客服發送訊息
export const sendAdminSupportMessage = (data) => {
  return api.post('/platform/support/sendMessage', data)
}

// 標記已讀
export const markAdminSupportRead = (roomId) => {
  return api.post('/platform/support/markRead', {
    room_id: roomId,
  })
}

// ======================================================
// 勞務報酬單
// ======================================================

// 取得勞報單列表
export const getAdminTaxForms = (status) => {
  return api.get('/platform/taxForms/getlist', {
    params: status
      ? {
          status,
        }
      : {},
  })
}

// 審核勞報單
export const reviewAdminTaxForm = (data) => {
  return api.post('/platform/taxForms/review', data)
}

// 取得網站流量趨勢（GA4）：range = 7d | 30d | year
export const getAdminSiteTraffic = (range = '7d') => {
  return api.get('/platform/analytics/traffic', { params: { range } })
}

// 新增管理員帳號（只有 super_admin 可以）
export const createAdminAccount = (data) => {
  return api.post('/platform/admins/create', data)
}
