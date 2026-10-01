import api from './index'


// ======================================================
// KOC 管理
// ======================================================

// 待審核 KOC
export const getKOCPendingList = () => {
  return api.get(
    '/platform/koc/getPendingList'
  )
}

// 通過 KOC
export const approveKOC = (
  data
) => {
  return api.post(
    '/platform/koc/approve',
    data
  )
}

// 拒絕 KOC
export const rejectKOC = (
  data
) => {
  return api.post(
    '/platform/koc/reject',
    data
  )
}

// 所有 KOC
export const getKOCList = () => {
  return api.get(
    '/platform/koc/getList'
  )
}

// KOC 詳情
export const getKOCDetail = (
  params
) => {
  return api.get(
    '/platform/koc/getDetail',
    {
      params,
    }
  )
}

// 更新 KOC 任務階段
export const updateKOCMissionStage = (
  data
) => {
  return api.patch(
    '/platform/kocmission/stage/update',
    data
  )
}


// ======================================================
// 廠商管理
// ======================================================

// 廠商列表
export const getAdminVendorList = (
  params = {}
) => {
  return api.get(
    '/platform/vendors',
    {
      params,
    }
  )
}

// 廠商詳情
export const getAdminVendorDetail = (
  vendorId
) => {
  return api.get(
    '/platform/vendor/detail',
    {
      params: {
        Vendor_id: vendorId,
      },
    }
  )
}

// 審核廠商
export const reviewAdminVendor = (
  data
) => {
  return api.patch(
    '/platform/vendor/review',
    data
  )
}

// 建立 Vendor audit log
export const createVendorAuditLog = (
  data
) => {
  return api.post(
    '/platform/vendor/audit',
    data
  )
}


// ======================================================
// 平台資料
// ======================================================

// 平台總覽
export const getAdminOverview = () => {
  return api.get(
    '/platform/overview'
  )
}

// 稽核紀錄
export const getAdminAuditLogs = (
  params = {}
) => {
  return api.get(
    '/platform/audit/logs',
    {
      params,
    }
  )
}

// 優惠碼使用狀況
export const getAdminCouponUsage = (
  params = {}
) => {
  return api.get(
    '/platform/coupons',
    {
      params,
    }
  )
}

// 成效分析
export const getAdminPerformance = (
  params = {}
) => {
  return api.get(
    '/platform/performance',
    {
      params,
    }
  )
}

// 所有任務
export const getAllMissions = (
  params = {}
) => {
  return api.get(
    '/platform/mission/getAll',
    {
      params,
    }
  )
}

// 收益追蹤
export const getEarningsTracking = (
  params = {}
) => {
  return api.get(
    '/platform/mission/getEarningsTracking',
    {
      params,
    }
  )
}


// ======================================================
// Vendor 審核逾期
// ======================================================

export const getVendorReviewOverdue = (
  params = {}
) => {
  return api.get(
    '/platform/vendor/review-overdue',
    {
      params,
    }
  )
}

export const notifyVendorReviewOverdue = (
  data
) => {
  return api.post(
    '/platform/vendor/review-overdue/notify',
    data
  )
}


// ======================================================
// Vendor 商品款撥款
// ShareBuy → Vendor
// ======================================================

// 平台應撥給 Vendor 的商品款
export const getAdminVendorReceivables = (
  params = {}
) => {
  return api.get(
    '/platform/vendor/receivables',
    {
      params,
    }
  )
}

// 建立商品款撥款紀錄。
// 建立後狀態為 pending。
export const createVendorReceivablePayout = (
  data
) => {
  return api.post(
    '/platform/vendor/receivable/payout',
    data
  )
}

// 確認商品款撥款成功 / 失敗
export const confirmVendorReceivablePayout = (
  data
) => {
  return api.post(
    '/platform/vendor/receivable/payout/confirm',
    data
  )
}


// ======================================================
// Vendor 15% 平台服務費
// Vendor → ShareBuy
// ======================================================

// 可產生服務費結算單的 Vendor
export const getSettleableVendors = (
  params = {}
) => {
  return api.get(
    '/platform/vendors/settleable',
    {
      params,
    }
  )
}

// 產生 Vendor 服務費結算單
export const generateVendorSettlement = (
  data
) => {
  return api.post(
    '/platform/vendor/settlement/generate',
    data
  )
}

// Vendor 服務費結算單
export const getVendorSettlements = (
  params = {}
) => {
  return api.get(
    '/platform/vendor/settlements',
    {
      params,
    }
  )
}

// Admin 確認收到 Vendor 15% 服務費
export const confirmVendorSettlementPayment = (
  data
) => {
  return api.post(
    '/platform/vendor/settlement/confirm',
    data
  )
}

// 平台開給 Vendor 的服務費發票
export const getVendorSettlementInvoices = (
  params = {}
) => {
  return api.get(
    '/platform/vendor/invoices',
    {
      params,
    }
  )
}


// ======================================================
// KOC 財務
// ======================================================

// KOC 撥款申請
export const getAdminKocPayouts = (
  params = {}
) => {
  return api.get(
    '/platform/koc/payouts',
    {
      params,
    }
  )
}

// 確認 KOC 撥款
export const confirmAdminKocPayout = (
  data
) => {
  return api.post(
    '/platform/koc/payout/confirm',
    data
  )
}

// 匯出 KOC 銀行轉帳 CSV
export const exportKocPayoutTransfers = (
  params = {}
) => {
  return api.get(
    '/platform/payouts/export',
    {
      params: {
        type: 'koc',
        ...params,
      },
      responseType: 'blob',
    }
  )
}


// ======================================================
// 客服聊天室
// ======================================================

// 取得聊天室列表
export const getAdminSupportRooms = (
  participantType
) => {
  return api.get(
    '/platform/support/getRooms',
    {
      params: {
        participant_type: participantType,
      },
    }
  )
}

// 取得訊息
export const getAdminSupportMessages = (
  roomId
) => {
  return api.get(
    '/platform/support/getMessages',
    {
      params: {
        room_id: roomId,
      },
    }
  )
}

// 發送客服訊息
export const sendAdminSupportMessage = (
  data
) => {
  return api.post(
    '/platform/support/sendMessage',
    data
  )
}

// 標示聊天室已讀
export const markAdminSupportRead = (
  roomId
) => {
  return api.post(
    '/platform/support/markRead',
    {
      room_id: roomId,
    }
  )
}


// ======================================================
// 勞務報酬單
// ======================================================

// 取得勞報單
export const getAdminTaxForms = (
  status
) => {
  return api.get(
    '/platform/taxForms/getlist',
    {
      params: status
        ? {
            status,
          }
        : {},
    }
  )
}

// 審核勞報單
export const reviewAdminTaxForm = (
  data
) => {
  return api.post(
    '/platform/taxForms/review',
    data
  )
}