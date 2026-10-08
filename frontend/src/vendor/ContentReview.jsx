import React, { useEffect, useMemo, useState } from 'react'
import {
  X,
  UserCheck,
  FileText,
  Copy,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react'

import {
  kocApplications as initial,
  kocs,
  campaigns,
  products
} from './mock'

import { Avatar } from './components/ui'
import { cn } from './lib/utils'
import { useToast } from './components/ui/Toast'
import { useConfirm } from './components/ui/ConfirmDialog'

import {
  getVendorApplications,
  reviewVendorApplication
} from '../api/vendor'
import { getErrorMessage } from '../errorMessage'

// ─── 共用 UI 元件 ─────────────────────────────────────────────

function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white rounded-[1.5rem] border border-[#E2DDD4] shadow-sm overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

function StatCard({ label, value, icon: Icon, onClick, active }) {
  const clickable = typeof onClick === 'function'

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-4 sm:p-5 flex flex-col justify-between transition-colors',
        clickable ? 'cursor-pointer' : '',
        active
          ? 'border-[#C8522A] ring-2 ring-[#C8522A]/15'
          : 'hover:border-[#B89B6A]'
      )}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <span
          className={cn(
            'text-xs sm:text-sm font-bold tracking-wide',
            active ? 'text-[#C8522A]' : 'text-[#8C8880]'
          )}
        >
          {label}
        </span>
        <div className={active ? 'text-[#C8522A]' : 'text-[#8C8880]'}>
          <Icon size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
        </div>
      </div>

      <div className="text-xl sm:text-2xl font-black text-[#1A1A18] font-sans">
        {value}
      </div>
    </Card>
  )
}

function Button({ variant = 'default', className, children, ...props }) {
  const variants = {
    brand: 'bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A] shadow-sm',
    outline: 'border border-[#E2DDD4] bg-white text-[#8C8880] hover:text-[#1A1A18] hover:border-[#1A1A18]',
    danger: 'border border-[#FFF0F0] bg-[#FFF0F0] text-[#D93025] hover:bg-[#D93025] hover:text-white',
    warning: 'border border-[#FDF0ED] bg-[#FDF0ED] text-[#C8522A] hover:bg-[#C8522A] hover:text-white',
    default: 'bg-[#F5F0E8] text-[#1A1A18] hover:bg-[#E2DDD4]'
  }

  return (
    <button
      className={cn(
        `
          inline-flex items-center justify-center
          px-4 py-2.5 rounded-full
          text-[13px] sm:text-sm font-bold transition-all
          disabled:opacity-50
          disabled:cursor-not-allowed whitespace-nowrap
        `,
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── 狀態標籤 ────────────────────────────────────────────────

const qualificationBadge = {
  pending: { label: '待審核', cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' },
  approved: { label: '已通過', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
  rejected: { label: '已拒絕', cls: 'bg-[#FFF0F0] text-[#D93025]', dot: 'bg-[#D93025]' }
}

function Pill({ cfg }) {
  if (!cfg) {
    return (
      <span className="text-[11px] sm:text-xs font-bold text-[#8C8880]">
        未知狀態
      </span>
    )
  }

  return (
    <span
      className={cn(
        `
          inline-flex items-center gap-1.5
          px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full
          text-[10px] sm:text-[11px] font-bold tracking-wider whitespace-nowrap
        `,
        cfg.cls
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ─── Main Component ──────────────────────────────────────────

export default function ContentReview() {
  const vendorId = localStorage.getItem('vendor_id')

  const { toast } = useToast()
  const confirm = useConfirm()

  const [qualificationFilter, setQualificationFilter] = useState('all')

  const [applications, setApplications] = useState(initial)
  const [applicationLoading, setApplicationLoading] = useState(false)
  const [applicationError, setApplicationError] = useState('')
  const [reviewingApplicationId, setReviewingApplicationId] = useState(null)
  const [selectedApplicationId, setSelectedApplicationId] = useState(null)
  const [qualificationNote, setQualificationNote] = useState('')

  // ─── 載入接案申請 ──────────────────────────────────────────
  useEffect(() => {
    async function loadApplications() {
      if (!vendorId) {
        setApplicationError('尚未登入廠商帳號')
        return
      }

      try {
        setApplicationLoading(true)
        setApplicationError('')

        const response = await getVendorApplications(vendorId)

        if (response.data?.success === false) {
          throw new Error(response.data.err || '接案申請載入失敗')
        }

        const applicationData = response.data?.applications || []

        setApplications(
          applicationData.map(item => ({
            id: item.application_id,
            applicationId: item.application_id,
            kocId: item.koc_id,
            kocName: item.koc_name || item.koc_id || '未命名 KOC',
            campaignId: item.campaign_id,
            campaignName: item.campaign_name || '未命名活動',
            productId: item.product_id || null,
            productName: item.product_name || '—',
            status: item.status || 'pending',
            appliedAt: item.applied_at || item.created_at || null,
            couponCode: item.promotion_code || '',
            couponStatus: item.coupon_status || '',
            kocMissionId: item.kocmission_id || null,
            violationCount: item.koc_violation_count || 0
          }))
        )
      } catch (error) {
        console.error('接案申請載入失敗：', error)
        setApplicationError(
          getErrorMessage(error, '接案申請載入失敗')
        )
      } finally {
        setApplicationLoading(false)
      }
    }

    loadApplications()
  }, [vendorId])

  const sortedApplications = useMemo(
    () =>
      [...applications].sort(
        (a, b) => new Date(b.appliedAt) - new Date(a.appliedAt)
      ),
    [applications]
  )

  // ─── 統計資料 ─────────────────────────────────────────────
  const qualificationCounts = {
    pending: applications.filter(item => item.status === 'pending').length,
    approved: applications.filter(item => item.status === 'approved').length,
    rejected: applications.filter(item => item.status === 'rejected').length
  }

  // ─── 依篩選條件過濾清單 ────────────────────────────────────
  const filteredApplications = useMemo(() => {
    if (qualificationFilter === 'all') return sortedApplications
    return sortedApplications.filter(
      item => item.status === qualificationFilter
    )
  }, [sortedApplications, qualificationFilter])

  // ─── 目前選取資料 ──────────────────────────────────────────
  const selectedApplication = selectedApplicationId
    ? applications.find(
        item => item.applicationId === selectedApplicationId
      )
    : null

  const selectedKoc = selectedApplication
    ? kocs.find(koc => koc.id === selectedApplication.kocId)
    : null

  const selectedCampaign = selectedApplication
    ? campaigns.find(
        campaign => campaign.id === selectedApplication.campaignId
      )
    : null

  const selectedProduct = selectedApplication
    ? products.find(
        product => product.id === selectedApplication.productId
      )
    : null

  // ─── 接案審核函式 ────────────────────────────────────
  async function handleReviewApplication(application, reviewStatus) {
    if (!application) return

    if (reviewStatus === 'rejected' && !qualificationNote.trim()) {
      toast.error('拒絕申請時請填寫原因')
      return
    }

    const actionText =
      reviewStatus === 'approved'
        ? '通過這筆接案申請'
        : '拒絕這筆接案申請'

    const confirmed = await confirm({
      title: `確定要${actionText}嗎？`,
      description:
        reviewStatus === 'approved'
          ? '通過後系統會建立 KOC 任務並產生尚未啟用的優惠碼。'
          : 'KOC 會收到拒絕通知，此動作無法復原。',
      confirmText: reviewStatus === 'approved' ? '通過申請' : '拒絕申請',
      danger: reviewStatus === 'rejected'
    })

    if (!confirmed) return

    try {
      setReviewingApplicationId(application.applicationId)
      setApplicationError('')

      const response = await reviewVendorApplication({
        vendor_id: vendorId,
        application_id: application.applicationId,
        status: reviewStatus,
        reject_reason: qualificationNote.trim()
      })

      if (response.data?.success === false) {
        throw new Error(response.data.err || '接案申請審核失敗')
      }

      setApplications(previous =>
        previous.map(item =>
          item.applicationId === application.applicationId
            ? {
                ...item,
                status: response.data?.status || reviewStatus,
                couponCode:
                  response.data?.promotion_code || item.couponCode,
                couponStatus:
                  response.data?.coupon_status ||
                  (reviewStatus === 'approved'
                    ? 'inactive'
                    : item.couponStatus),
                kocMissionId: response.data?.kocmission_id || null
              }
            : item
        )
      )

      toast.success(
        reviewStatus === 'approved'
          ? '接案申請已通過，任務與未啟用優惠碼已建立'
          : '接案申請已拒絕'
      )

      setSelectedApplicationId(null)
      setQualificationNote('')
    } catch (error) {
      console.error('接案申請審核失敗：', error)
      setApplicationError(
        getErrorMessage(error, '接案申請審核失敗')
      )
    } finally {
      setReviewingApplicationId(null)
    }
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 p-4 sm:p-0">
      <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              label="全部"
              value={applications.length}
              icon={FileText}
              active={qualificationFilter === 'all'}
              onClick={() => setQualificationFilter('all')}
            />
            <StatCard
              label="待審資格"
              value={qualificationCounts.pending}
              icon={Clock}
              active={qualificationFilter === 'pending'}
              onClick={() => setQualificationFilter('pending')}
            />
            <StatCard
              label="已通過"
              value={qualificationCounts.approved}
              icon={CheckCircle2}
              active={qualificationFilter === 'approved'}
              onClick={() => setQualificationFilter('approved')}
            />
            <StatCard
              label="已拒絕"
              value={qualificationCounts.rejected}
              icon={X}
              active={qualificationFilter === 'rejected'}
              onClick={() => setQualificationFilter('rejected')}
            />
          </div>

          <Card>
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                    {[
                      'KOC 資訊',
                      '申請活動',
                      '申請商品',
                      '申請時間',
                      '審核狀態',
                      '優惠碼'
                    ].map(header => (
                      <th
                        key={header}
                        className="p-4 sm:p-5 text-left text-[11px] sm:text-xs font-bold text-[#8C8880] uppercase tracking-widest whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E2DDD4]">
                  {applicationLoading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-xs sm:text-sm font-bold text-[#8C8880]">
                        接案申請載入中...
                      </td>
                    </tr>
                  ) : applicationError ? (
                    <tr>
                      <td colSpan={6} className="py-16 px-4 sm:px-5 text-center text-xs sm:text-sm font-bold text-red-600">
                        {applicationError}
                      </td>
                    </tr>
                  ) : filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-xs sm:text-sm font-bold text-[#8C8880]">
                        {qualificationFilter === 'all'
                          ? '目前沒有 KOC 接案申請'
                          : '這個分類目前沒有資料'}
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map(application => {
                      const canReview = application.status === 'pending'
                      return (
                        <tr
                          key={application.applicationId}
                          onClick={() => {
                            if (!canReview) return
                            setSelectedApplicationId(application.applicationId)
                            setQualificationNote('')
                          }}
                          className={cn(
                            'transition-colors',
                            canReview ? 'hover:bg-[#F8F9FA] cursor-pointer' : ''
                          )}
                        >
                          <td className="p-4 sm:p-5">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Avatar name={application.kocName || '?'} size="sm" />
                              <div>
                                <div className="text-[13px] sm:text-sm font-bold text-[#1A1A18]">
                                  {application.kocName}
                                </div>
                                <div className="text-[9px] sm:text-[10px] font-bold text-[#8C8880] font-mono mt-0.5">
                                  {application.kocId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 sm:p-5 text-[11px] sm:text-xs font-bold text-[#8C8880] max-w-[150px] sm:max-w-none truncate">
                            {application.campaignName}
                          </td>
                          <td className="p-4 sm:p-5 text-[11px] sm:text-xs font-medium text-[#8C8880] max-w-[150px] sm:max-w-none truncate">
                            {application.productName}
                          </td>
                          <td className="p-4 sm:p-5 text-[11px] sm:text-xs font-medium text-[#8C8880] whitespace-nowrap">
                            {application.appliedAt
                              ? new Date(application.appliedAt).toLocaleString('zh-TW')
                              : '—'}
                          </td>
                          <td className="p-4 sm:p-5">
                            <Pill cfg={qualificationBadge[application.status]} />
                          </td>
                          <td className="p-4 sm:p-5">
                            {application.couponCode ? (
                              <div>
                                <div className="text-[11px] sm:text-xs font-mono font-bold text-[#C8522A]">
                                  {application.couponCode}
                                </div>
                                <div className="text-[9px] sm:text-[10px] font-bold text-[#8C8880] mt-1">
                                  {application.couponStatus === 'active' ? '已啟用' : '尚未啟用'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-[#E2DDD4] font-bold">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 接案審核 Modal */}
          {selectedApplication && selectedApplication.status === 'pending' && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A18]/40 backdrop-blur-sm p-2 sm:p-4">
              <div className="relative w-full max-w-2xl bg-white rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl border border-[#E2DDD4] max-h-[95vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A18]">
                    審核接案申請
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedApplicationId(null)
                      setQualificationNote('')
                    }}
                    className="p-1.5 sm:p-2 text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F5F0E8] rounded-full transition-colors -mr-2 sm:mr-0"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-center gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-[#E2DDD4]">
                    <Avatar name={selectedApplication.kocName || '?'} size="md" />
                    <div className="flex-1">
                      <div className="font-bold text-base sm:text-lg text-[#1A1A18]">
                        {selectedApplication.kocName}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-[#8C8880] mt-0.5 sm:mt-1">
                        {selectedApplication.kocId}
                      </div>
                    </div>

                    <span
                      className={`relative group px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap cursor-help ${
                        selectedApplication.violationCount > 0
                          ? 'bg-[#FDF0ED] text-[#C8522A]'
                          : 'bg-[#F5F0E8] text-[#8C8880]'
                      }`}
                    >
                      過往違規次數：{selectedApplication.violationCount}
                      <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-64 bg-[#1A1A18] text-white text-[11px] font-medium normal-case whitespace-normal tracking-normal leading-relaxed rounded-xl px-3 py-2 shadow-lg z-20">
                        包含此 KOC 自行取消任務、以及任務逾期未完成（沒交文案或作品連結）的累計次數
                      </div>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-[#F8F9FA] rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#E2DDD4]">
                      <div className="text-[10px] sm:text-[11px] font-bold text-[#8C8880] uppercase mb-1">
                        申請活動
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-[#1A1A18]">
                        {selectedApplication.campaignName}
                      </div>
                    </div>
                    <div className="bg-[#F8F9FA] rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-[#E2DDD4]">
                      <div className="text-[10px] sm:text-[11px] font-bold text-[#8C8880] uppercase mb-1">
                        申請商品
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-[#1A1A18]">
                        {selectedApplication.productName}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FDF0ED] rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-[11px] sm:text-xs font-bold text-[#C8522A] flex items-start gap-2 sm:gap-3">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    審核通過後，系統會建立 KOC 任務並產生尚未啟用的優惠碼；文案審核通過後才會正式啟用。
                  </div>

                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <label className="text-[10px] sm:text-xs font-bold text-[#8C8880] uppercase tracking-widest">
                      審核備註
                    </label>
                    <textarea
                      rows={4}
                      value={qualificationNote}
                      onChange={e => setQualificationNote(e.target.value)}
                      placeholder="拒絕申請時請填寫原因..."
                      className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-[13px] sm:text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 sm:pt-8 mt-4 border-t border-[#E2DDD4]">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedApplicationId(null)
                      setQualificationNote('')
                    }}
                    className="w-full sm:flex-1 order-3 sm:order-1"
                  >
                    取消
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleReviewApplication(selectedApplication, 'rejected')}
                    disabled={
                      !qualificationNote.trim() ||
                      reviewingApplicationId === selectedApplication.applicationId
                    }
                    className="w-full sm:flex-1 gap-2 order-2"
                  >
                    <X size={16} />
                    拒絕申請
                  </Button>
                  <Button
                    variant="brand"
                    onClick={() => handleReviewApplication(selectedApplication, 'approved')}
                    disabled={reviewingApplicationId === selectedApplication.applicationId}
                    className="w-full sm:flex-[2] gap-2 order-1 sm:order-3"
                  >
                    <UserCheck size={16} />
                    通過接案申請
                  </Button>
                </div>
              </div>
            </div>
          )}
      </>

    </div>
  )
}