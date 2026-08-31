import api from './index'

// 廠商註冊
export const registerVendor = (data) => {
  return api.post('/vendor/auth/register', data)
}

// 廠商登入
export const loginVendor = (data) => {
  return api.post('/vendor/auth/login', data)
}

// 廠商註冊信箱驗證
export const verifyVendorEmail = (data) => {
  return api.post('/vendor/auth/verifyEmail', data)
}

// 重新寄送廠商註冊驗證碼
export const resendVendorVerification = (data) => {
  return api.post('/vendor/auth/resendVerification', data)
}

// ======================================================
// 廠商個人資料
// ======================================================

export const getVendorProfile = (vendorId) => {
  return api.get('/vendor/profile/get', {
    params: {
      vendor_id: vendorId,
    },
  })
}

export const updateVendorProfile = (data) => {
  return api.post('/vendor/profile/update', data)
}

// ======================================================
// 商品
// ======================================================

// 獲取商品清單
export const getVendorProducts = (vendorId, status) => {
  return api.get('/vendor/product/getlist', {
    params: {
      vendor_id: vendorId,
      status,
    },
  })
}

// 新增商品
export const createVendorProduct = (data) => {
  return api.post('/vendor/product/create', data)
}

// 修改商品
export const updateVendorProduct = (data) => {
  return api.post('/vendor/product/update', data)
}

// 刪除商品
export const deleteVendorProduct = (data) => {
  return api.post('/vendor/product/delete', data)
}

// 修改商品狀態
export const updateVendorProductStatus = (data) => {
  return api.post('/vendor/product/updateStatus', data)
}

// ======================================================
// 活動 / Campaign
// ======================================================

// 獲取活動清單
export const getVendorCampaigns = (vendorId, status) => {
  return api.get('/vendor/campaign/getlist', {
    params: {
      vendor_id: vendorId,
      status,
    },
  })
}

// 建立活動
export const createVendorCampaign = (data) => {
  return api.post('/vendor/campaign/create', data)
}

// 修改活動
export const updateVendorCampaign = (data) => {
  return api.post('/vendor/campaign/update', data)
}

// 刪除活動草稿
export const deleteVendorCampaign = (data) => {
  return api.post('/vendor/campaign/delete', data)
}

// ======================================================
// KOC 報名
// ======================================================

// 獲取 KOC 報名清單
export const getVendorApplications = (
  vendorId,
  campaignId = '',
  applicationStatus = ''
) => {
  const params = {
    vendor_id: vendorId,
  }

  if (campaignId) {
    params.campaign_id = campaignId
  }

  if (applicationStatus) {
    params.status = applicationStatus
  }

  return api.get('/vendor/application/getlist', {
    params,
  })
}

// 審核 KOC 報名
export const reviewVendorApplication = (data) => {
  return api.post('/vendor/application/review', data)
}

// ======================================================
// 投稿 / 任務成果
// ======================================================

// 獲取投稿內容
export const getVendorSubmissions = (
  vendorId,
  submissionType = ''
) => {
  const params = {
    vendor_id: vendorId,
  }

  if (submissionType) {
    params.submission_type = submissionType
  }

  return api.get(
    '/vendor/mission/getSubmissionDetail',
    {
      params,
    }
  )
}

// 審核投稿
export const reviewVendorSubmission = (data) => {
  return api.post('/vendor/mission/reviewSubmission', data)
}

// ======================================================
// 訂單
// ======================================================

// 獲取訂單清單
export const getVendorOrders = (vendorId) => {
  return api.get('/vendor/order/getlist', {
    params: {
      vendor_id: vendorId,
    },
  })
}

// 獲取訂單詳情
export const getVendorOrderDetail = (
  vendorId,
  orderId
) => {
  return api.get('/vendor/order/getDetail', {
    params: {
      vendor_id: vendorId,
      order_id: orderId,
    },
  })
}

// 更新出貨狀態
export const updateVendorShipping = (data) => {
  return api.post('/vendor/order/updateShipping', data)
}

// 建立物流單
export const createVendorLogistics = (data) => {
  return api.post('/vendor/order/createLogistics', data)
}

// 查詢物流單
export const queryVendorLogistics = (data) => {
  return api.post('/vendor/order/queryLogistics', data)
}

// ======================================================
// 退貨退款
// ======================================================

// 取得廠商退貨退款申請
export const getVendorReturns = (
  vendorId,
  status = ''
) => {
  const params = {
    vendor_id: vendorId,
  }

  if (status) {
    params.status = status
  }

  return api.get('/vendor/return/getlist', {
    params,
  })
}

// 審核退貨申請
// action:
// approve = 同意
// reject = 拒絕
export const reviewVendorReturn = (data) => {
  return api.post('/vendor/return/review', data)
}

// 確認已收到消費者退回商品
export const confirmVendorReturnReceived = (
  data
) => {
  return api.post(
    '/vendor/return/confirmReceived',
    data
  )
}

// 執行整張訂單全額退款
// 注意：目前後端只支援整單全額退款，
// 不要從前端傳 refunded_amount
export const processVendorReturnRefund = (
  data
) => {
  return api.post(
    '/vendor/return/processRefund',
    data
  )
}

// ======================================================
// 優惠碼
// ======================================================

// 獲取優惠碼使用紀錄
export const getVendorCouponUsage = (
  vendorId,
  campaignId,
  status
) => {
  return api.get('/vendor/coupon/getUsageList', {
    params: {
      vendor_id: vendorId,
      campaign_id: campaignId,
      status,
    },
  })
}

// 修改優惠碼狀態
export const updateVendorCouponStatus = (
  data
) => {
  return api.post(
    '/vendor/coupon/updateStatus',
    data
  )
}

// ======================================================
// 聊天室
// ======================================================

// 建立聊天室
export const createVendorChatroom = (data) => {
  return api.post(
    '/vendor/chatroom/create',
    data
  )
}

// 取得廠商聊天室清單
export const getVendorChatrooms = (
  vendorId
) => {
  return api.get(
    '/vendor/chatroom/getlist',
    {
      params: {
        vendor_id: vendorId,
      },
    }
  )
}

// 取得聊天室訊息
export const getVendorChatMessages = (
  vendorId,
  roomId
) => {
  return api.get(
    '/vendor/chatroom/getMessages',
    {
      params: {
        vendor_id: vendorId,
        room_id: roomId,
      },
    }
  )
}

// 廠商發送訊息
export const sendVendorChatMessage = (
  data
) => {
  return api.post(
    '/vendor/chatroom/sendMessage',
    data
  )
}

// 將 KOC 訊息標記為已讀
export const markVendorChatroomRead = (
  data
) => {
  return api.post(
    '/vendor/chatroom/markRead',
    data
  )
}

// ======================================================
// 成效分析
// ======================================================

// 廠商成效總覽
export const getVendorAnalyticsOverview = (
  vendorId
) => {
  return api.get(
    '/vendor/analytics/overview',
    {
      params: {
        vendor_id: vendorId,
      },
    }
  )
}

// 商品成效
export const getVendorProductPerformance = (
  vendorId,
  campaignId,
  startDate,
  endDate
) => {
  return api.get(
    '/vendor/analytics/productPerformance',
    {
      params: {
        vendor_id: vendorId,
        campaign_id: campaignId,
        start_date: startDate,
        end_date: endDate,
      },
    }
  )
}

// ======================================================
// 金流
// ======================================================

// 金流總覽
export const getVendorFinanceOverview = (
  vendorId
) => {
  return api.get(
    '/vendor/finance/getOverview',
    {
      params: {
        vendor_id: vendorId,
      },
    }
  )
}

// 金流明細列表
export const getVendorFinanceTransactions = (
  vendorId
) => {
  return api.get(
    '/vendor/finance/getTransactions',
    {
      params: {
        vendor_id: vendorId,
      },
    }
  )
}

// 申請撥款
export const requestVendorPayout = (
  data
) => {
  return api.post(
    '/vendor/finance/requestPayout',
    data
  )
}