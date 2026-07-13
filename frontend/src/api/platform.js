// frontend/src/api/platform.js
import api from './index'

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