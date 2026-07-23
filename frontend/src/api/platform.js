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

// 更新 KOC 任務階段

export const updateKOCMissionStage = (data) => {
  return api.patch('/platform/kocmission/stage/update', data)
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
// 一般廠商審核不需要額外呼叫，因為 review API 會自動新增紀錄
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
// 後端尚未完成 /platform/performance
export const getAdminPerformance = (params = {}) => {
  return api.get('/platform/performance', { params })

}

export const getAllMissions = () => {
  return api.get('/platform/mission/getAll');
};

export const getEarningsTracking = () => {
  return api.get('/platform/mission/getEarningsTracking');
};