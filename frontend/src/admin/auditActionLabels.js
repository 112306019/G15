// 操作紀錄 action_type 的中文名稱。後端 platform.AUDIT_ACTION_LABELS 也有一份並會
// 回傳 Action_label；這裡是前端備援，後端還沒更新或缺少某個類型時仍能顯示中文。
// 新增操作類型時兩邊要一起加。
export const AUDIT_ACTION_LABELS = {
  approve_koc: '核准 KOC 申請',
  reject_koc: '退回 KOC 申請',
  approve_vendor: '核准廠商入駐',
  reject_vendor: '退回廠商申請',
  review_vendor: '更新廠商審核狀態',
  generate_vendor_monthly_settlement: '產生廠商貨款月結單',
  confirm_vendor_settlement_paid: '確認廠商貨款已撥付',
  confirm_vendor_settlement_failed: '廠商貨款撥付失敗',
  generate_vendor_monthly_payout_batch: '產生廠商月撥款批次',
  confirm_vendor_monthly_payout: '確認廠商月撥款',
  vendor_monthly_payout_failed: '廠商月撥款失敗',
  confirm_koc_payout_completed: '確認 KOC 撥款完成',
  confirm_koc_payout_failed: 'KOC 撥款失敗',
  settle_campaign_earnings: '結算活動分潤',
  resolve_return_dispute_approve: '退貨爭議：同意退款',
  resolve_return_dispute_reject: '退貨爭議：維持拒絕',
  notify_vendor_review_overdue: '提醒廠商審核逾期',
  create_admin: '新增管理員帳號',
  admin_close_mission: '強制結案 KOC 任務',
  admin_revert_mission_stage: '退回 KOC 任務階段',
};

export const getAuditActionLabel = (log) =>
  log.Action_label || AUDIT_ACTION_LABELS[log.Action_type] || log.Action_type;
