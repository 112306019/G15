// frontend/src/api/koc.js
import api from './index'

// 獲取koc個人資料詳情
export const getKOCProfile = (userId) => {
  return api.get('/koc/profile/getProfile', {
    params: { user_id: userId }
  })
}

// 獲取任務列表
export const getMissionList = (userId, stage) => {
  return api.get('/koc/mission/getlist', {
    params: { User_id: userId, stage }
  })
}

// 獲取任務詳情
export const getMissionDetail = (missionId) => {
  return api.get('/koc/mission/getDetail', {
    params: { KOCMission_id: missionId }
  })
}

// 提交文案/連結
export const submitMission = (data) => {
  return api.post('/koc/mission/submit', data)
}

// 儲存草稿
export const saveDraft = (data) => {
  return api.post('/koc/mission/saveDraft', data)
}

// 獲取各階段任務數量
export const getStageCounts = (userId) => {
  return api.get('/koc/mission/getStageCounts', {
    params: { User_id: userId }
  })
}

// 獲取申請列表(資格審核)
export const getApplicationList = (userId, status) => {
  return api.get('/koc/application/getlist', {
    params: { User_id: userId, status }
  })
}

// 移除申請紀錄
export const removeApplication = (applicationId, userId) => {
  return api.delete(`/koc/application/remove/${applicationId}`, {
    params: { user_id: userId }
  })
}

// 更新 KOC 個人資料
export const updateKOCProfile = (data) => {
  return api.post('/koc/profile/updateProfile', data)
}

// 獲取收益總覽
export const getRevenueTotal = (userId) => {
  return api.get('/koc/revenue/getTotal', {
    params: { user_id: userId }
  })
}

// 獲取收益明細
export const getRevenueHistory = (userId) => {
  return api.get('/koc/revenue/getHistory', {
    params: { user_id: userId }
  })
}

// 獲取待定收益明細
export const getPendingEarningsDetail = (userId) => {
  return api.get('/koc/revenue/getPendingDetail', {
    params: { user_id: userId }
  })
}

// 獲取成效分析列表
export const getAnalyticsList = (userId) => {
  return api.get('/koc/analytics/getList', {
    params: { user_id: userId }
  })
}

// 獲取成效分析圖表
export const getAnalyticsDetail = (missionId, period) => {
  return api.get('/koc/analytics/getDetail', {
    params: { KOCMission_id: missionId, period }
  })
}

// 申請成為 KOC
export const applyKOC = (data) => {
  return api.post('/koc/apply', data)

}

// 取得或建立任務對應的聊天室
export const getOrCreateChatRoom = (kocMissionId) => {
  return api.post('/koc/chat/getOrCreateRoom', { kocmission_id: kocMissionId })
}

// 取得聊天室歷史訊息
export const getChatHistory = (roomId) => {
  return api.get('/koc/chat/getHistory', {
    params: { room_id: roomId }
  })
}

// 發送聊天室訊息
export const sendChatMessage = (data) => {
  return api.post('/koc/chat/sendMessage', data)

}