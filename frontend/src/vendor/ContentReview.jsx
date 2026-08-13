import React, { useEffect, useMemo, useState } from 'react'
import {
  Check,
  X,
  UserCheck,
  FileText,
  Copy,
  AlertCircle,
  RotateCcw,
  Clock,
  CheckCircle2,
  Loader2
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
  reviewVendorApplication,
  getVendorSubmissions,
  reviewVendorSubmission
} from '../api/vendor'

// ─── 共用 UI 元件 ─────────────────────────────────────────────

function Card({ children, className = '' }) {
  return (
    <div
      className={`
        bg-white rounded-[1.5rem]
        border border-[#E2DDD4]
        shadow-sm overflow-hidden
        ${className}
      `}
    >
      {children}
    </div>
  )
}


function StatCard({ label, value, icon: Icon }) {
  return (
    <Card className="p-5 flex flex-col justify-between hover:border-[#B89B6A] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-[#8C8880] tracking-wide">
          {label}
        </span>

        <div className="text-[#8C8880]">
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>

      <div className="text-2xl font-black text-[#1A1A18] font-sans">
        {value}
      </div>
    </Card>
  )
}


function Button({
  variant = 'default',
  className,
  children,
  ...props
}) {
  const variants = {
    brand:
      'bg-[#1A1A18] text-[#F5F0E8] hover:bg-[#C8522A] shadow-sm',

    outline:
      'border border-[#E2DDD4] bg-white text-[#8C8880] hover:text-[#1A1A18] hover:border-[#1A1A18]',

    danger:
      'border border-[#FFF0F0] bg-[#FFF0F0] text-[#D93025] hover:bg-[#D93025] hover:text-white',

    warning:
      'border border-[#FDF0ED] bg-[#FDF0ED] text-[#C8522A] hover:bg-[#C8522A] hover:text-white',

    default:
      'bg-[#F5F0E8] text-[#1A1A18] hover:bg-[#E2DDD4]'
  }

  return (
    <button
      className={cn(
        `
          inline-flex items-center justify-center
          px-4 py-2.5 rounded-full
          text-sm font-bold transition-all
          disabled:opacity-50
          disabled:cursor-not-allowed
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
  pending: {
    label: '待審核',
    cls: 'bg-[#FDF0ED] text-[#C8522A]',
    dot: 'bg-[#C8522A]'
  },

  approved: {
    label: '已通過',
    cls: 'bg-[#F5F0E8] text-[#1A1A18]',
    dot: 'bg-[#1A1A18]'
  },

  rejected: {
    label: '已拒絕',
    cls: 'bg-[#FFF0F0] text-[#D93025]',
    dot: 'bg-[#D93025]'
  }
}


const submissionBadge = {
  pending: {
    label: '待審文案',
    cls: 'bg-[#FDF0ED] text-[#C8522A]',
    dot: 'bg-[#C8522A]'
  },

  submitted: {
    label: '待審文案',
    cls: 'bg-[#FDF0ED] text-[#C8522A]',
    dot: 'bg-[#C8522A]'
  },

  approved: {
    label: '文案核准',
    cls: 'bg-[#F5F0E8] text-[#1A1A18]',
    dot: 'bg-[#1A1A18]'
  },

  revising: {
    label: '需修改',
    cls: 'bg-[#FFF0F0] text-[#D93025]',
    dot: 'bg-[#D93025]'
  },

  rejected: {
    label: '未通過',
    cls: 'bg-[#FFF0F0] text-[#D93025]',
    dot: 'bg-[#D93025]'
  }
}


function Pill({ cfg }) {
  if (!cfg) {
    return (
      <span className="text-xs font-bold text-[#8C8880]">
        未知狀態
      </span>
    )
  }

  return (
    <span
      className={cn(
        `
          inline-flex items-center gap-1.5
          px-3 py-1.5 rounded-full
          text-[11px] font-bold tracking-wider
        `,
        cfg.cls
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          cfg.dot
        )}
      />

      {cfg.label}
    </span>
  )
}


// ─── 文案合規檢查 ─────────────────────────────────────────────

function compliance(submission) {
  return [
    {
      label: '文案長度 ≥ 50 字',
      ok:
        (submission?.caption?.trim().length ?? 0) >= 50
    },

    {
      label: '包含優惠碼',
      ok: Boolean(
        submission?.couponCode &&
        submission?.caption?.includes(
          submission.couponCode
        )
      )
    },

    {
      label: '無違禁詞',
      ok: !/(保證|最強|第一|治療)/.test(
        submission?.caption ?? ''
      )
    },

    {
      label: '含業配/合作揭露用詞',
      ok: /(合作|業配|贊助|廣告|#ad|#sponsored)/i.test(
        submission?.caption ?? ''
      )
    }
  ]
}


// ─── Main Component ──────────────────────────────────────────

export default function ContentReview() {
  const vendorId =
    localStorage.getItem('vendor_id')

  const { toast } = useToast()
  const confirm = useConfirm()

  // 顯示中的分頁
  const [stage, setStage] =
    useState('qualification')


  const [applications, setApplications] =
    useState(initial)
  const [applicationLoading, setApplicationLoading] = useState(false)
  const [applicationError, setApplicationError] = useState('')
  const [reviewingApplicationId, setReviewingApplicationId] =
    useState(null)

  const [
    selectedApplicationId,
    setSelectedApplicationId
  ] = useState(null)

  const [qualificationNote, setQualificationNote] =
    useState('')

  const [copied, setCopied] =
    useState(null)

  // ── 真實文案投稿 ──

  const [submissions, setSubmissions] =
    useState([])

  const [
    selectedSubmissionId,
    setSelectedSubmissionId
  ] = useState(null)

  const [submissionNote, setSubmissionNote] =
    useState('')

  const [
    submissionLoading,
    setSubmissionLoading
  ] = useState(false)

  const [
    submissionError,
    setSubmissionError
  ] = useState('')

  const [
    reviewingSubmissionId,
    setReviewingSubmissionId
  ] = useState(null)

  const [category, setCategory] = useState('food')
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  // 展開中的「歷史投稿紀錄」missionId 清單
  const [expandedHistoryIds, setExpandedHistoryIds] =
    useState([])

  const toggleHistory = (missionKey) => {
    setExpandedHistoryIds(previous =>
      previous.includes(missionKey)
        ? previous.filter(id => id !== missionKey)
        : [...previous, missionKey]
    )
  }

  const handleAiCheck = async (caption, submissionId) => {
    if (!caption) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await fetch("http://127.0.0.1:8001/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: caption, category }),
      })
      const data = await res.json()
      setAiResult(data)

      // 手動重新分析後，把最新結果覆蓋存回資料庫，
      // 讓下次任何人打開這筆文案時看到的都是這次最新的結果。
      if (submissionId) {
        try {
          await fetch("http://127.0.0.1:8000/api/vendor/mission/submission/saveAiResult", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submission_id: submissionId, ai_result: data }),
          })
        } catch (saveErr) {
          console.error("儲存 AI 審核結果失敗", saveErr)
        }
      }
    } catch (err) {
      console.error("AI 審核失敗", err)
    } finally {
      setAiLoading(false)
    }
  }

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

        const response = await getVendorApplications(
          vendorId
        )

        if (response.data?.success === false) {
          throw new Error(
            response.data.err || '接案申請載入失敗'
          )
        }

        const applicationData =
          response.data?.applications || []

        setApplications(
          applicationData.map(item => ({
            id: item.application_id,
            applicationId: item.application_id,

            kocId: item.koc_id,
            kocName:
              item.koc_name ||
              item.koc_id ||
              '未命名 KOC',

            campaignId: item.campaign_id,
            campaignName:
              item.campaign_name ||
              '未命名活動',

            productId: item.product_id || null,
            productName:
              item.product_name || '—',

            status: item.status || 'pending',

            appliedAt:
              item.applied_at ||
              item.created_at ||
              null,

            couponCode:
              item.promotion_code || '',

            couponStatus:
              item.coupon_status || '',

            kocMissionId:
              item.kocmission_id || null
          }))
        )
      } catch (error) {
        console.error('接案申請載入失敗：', error)

        const apiError =
          error.response?.data?.err

        setApplicationError(
          typeof apiError === 'string'
            ? apiError
            : apiError
              ? JSON.stringify(apiError)
              : error.message ||
              '接案申請載入失敗'
        )
      } finally {
        setApplicationLoading(false)
      }
    }

    loadApplications()
  }, [vendorId])



  // ─── 載入文案投稿 ──────────────────────────────────────────

  useEffect(() => {
    async function loadSubmissions() {
      if (!vendorId) {
        setSubmissionError('尚未登入廠商帳號')
        return
      }

      try {
        setSubmissionLoading(true)
        setSubmissionError('')

        const response =
          await getVendorSubmissions(
            vendorId,
            'text'
          )

        if (response.data?.success === false) {
          throw new Error(
            response.data.err ||
            '文案投稿載入失敗'
          )
        }

        const submissionData =
          response.data?.submissions || []

        setSubmissions(
          submissionData.map(item => ({
            id: item.submission_id,
            submissionId:
              item.submission_id,

            submissionType:
              item.submission_type,

            kocMissionId:
              item.kocmission_id,

            kocId:
              item.koc_id || '',

            kocName:
              item.koc_name ||
              item.koc_id ||
              '未命名 KOC',

            campaignId:
              item.campaign_id || '',

            campaignName:
              item.campaign_name ||
              '未命名活動',

            productId:
              item.product_id || null,

            productName:
              item.product_name || '—',

            caption:
              item.text_content || '',

            contentUrl:
              item.content_url || '',

            couponCode:
              item.promotion_code || '',

            couponStatus:
              item.coupon_status || '',

            status:
              item.status || 'pending',

            missionStage:
              item.stage || '',

            vendorFeedback:
              item.vendor_feedback || '',

            submittedAt:
              item.submitted_time || null,

            reviewedAt:
              item.reviewed_time || null,

            aiResult:
              item.ai_result || null
          }))
        )
      } catch (error) {
        console.error(
          '文案投稿載入失敗：',
          error
        )

        const apiError =
          error.response?.data?.err

        setSubmissionError(
          typeof apiError === 'string'
            ? apiError
            : apiError
              ? JSON.stringify(apiError)
              : error.message ||
              '文案投稿載入失敗'
        )
      } finally {
        setSubmissionLoading(false)
      }
    }

    loadSubmissions()
  }, [vendorId])


  const sortedApplications =
    useMemo(
      () =>
        [...applications].sort(
          (a, b) =>
            new Date(b.appliedAt) -
            new Date(a.appliedAt)
        ),
      [applications]
    )

  const sortedSubmissions =
    useMemo(
      () =>
        [...submissions].sort(
          (a, b) =>
            new Date(b.submittedAt) -
            new Date(a.submittedAt)
        ),
      [submissions]
    )

  // 同一個 kocMissionId 若被退回重新提交，會產生多筆投稿紀錄；
  // 這裡只保留最新一筆作為可審核項目，其餘收進 history 供展開查看
  const groupedSubmissions =
    useMemo(() => {
      const byMission = new Map()

      for (const submission of sortedSubmissions) {
        const key =
          submission.kocMissionId ||
          submission.id

        if (!byMission.has(key)) {
          byMission.set(key, [])
        }

        byMission.get(key).push(submission)
      }

      return Array.from(byMission.values()).map(
        group => {
          const [latest, ...history] = group

          return {
            ...latest,
            historyCount: history.length,
            history
          }
        }
      )
    }, [sortedSubmissions])


  // ─── 統計資料 ─────────────────────────────────────────────

  const qualificationCounts = {
    pending: applications.filter(
      item => item.status === 'pending'
    ).length,

    approved: applications.filter(
      item => item.status === 'approved'
    ).length,

    rejected: applications.filter(
      item => item.status === 'rejected'
    ).length
  }

  const contentCounts = {
    pendingContent: submissions.filter(
      submission =>
        !submission.caption
    ).length,

    submitted: submissions.filter(
      submission =>
        submission.status === 'pending' ||
        submission.status === 'submitted'
    ).length,

    approved: submissions.filter(
      submission =>
        submission.status === 'approved'
    ).length,

    revising: submissions.filter(
      submission =>
        submission.status === 'revising'
    ).length
  }


  // ─── 目前選取資料 ──────────────────────────────────────────

  const selectedApplication =
    selectedApplicationId
      ? applications.find(
        item =>
          item.applicationId ===
          selectedApplicationId
      )
      : null


  const selectedKoc =
    selectedApplication
      ? kocs.find(
        koc =>
          koc.id ===
          selectedApplication.kocId
      )
      : null


  const selectedCampaign =
    selectedApplication
      ? campaigns.find(
        campaign =>
          campaign.id ===
          selectedApplication.campaignId
      )
      : null


  const selectedProduct =
    selectedApplication
      ? products.find(
        product =>
          product.id ===
          selectedApplication.productId
      )
      : null


  const selectedSubmission =
    selectedSubmissionId
      ? submissions.find(
        submission =>
          submission.id ===
          selectedSubmissionId
      )
      : null


  // ─── 接案審核函式 ────────────────────────────────────

  async function handleReviewApplication(
    application,
    reviewStatus
  ) {
    if (!application) return

    if (
      reviewStatus === 'rejected' &&
      !qualificationNote.trim()
    ) {
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
      confirmText:
        reviewStatus === 'approved' ? '通過申請' : '拒絕申請',
      danger: reviewStatus === 'rejected',
    })

    if (!confirmed) return

    try {
      setReviewingApplicationId(
        application.applicationId
      )
      setApplicationError('')

      const response =
        await reviewVendorApplication({
          vendor_id: vendorId,
          application_id:
            application.applicationId,
          status: reviewStatus,
          reject_reason:
            qualificationNote.trim()
        })

      if (response.data?.success === false) {
        throw new Error(
          response.data.err ||
          '接案申請審核失敗'
        )
      }

      setApplications(previous =>
        previous.map(item =>
          item.applicationId ===
            application.applicationId
            ? {
              ...item,
              status:
                response.data?.status ||
                reviewStatus,

              couponCode:
                response.data
                  ?.promotion_code ||
                item.couponCode,

              couponStatus:
                response.data
                  ?.coupon_status ||
                (
                  reviewStatus === 'approved'
                    ? 'inactive'
                    : item.couponStatus
                ),

              kocMissionId:
                response.data
                  ?.kocmission_id ||
                null
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
      console.error(
        '接案申請審核失敗：',
        error
      )

      const apiError =
        error.response?.data?.err

      setApplicationError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message ||
            '接案申請審核失敗'
      )
    } finally {
      setReviewingApplicationId(null)
    }
  }

  function copyCode(code) {
    if (!code) return

    navigator.clipboard
      .writeText(code)
      .catch(() => { })

    setCopied(code)

    window.setTimeout(() => {
      setCopied(null)
    }, 1500)
  }


  // ─── 文案審核 API ─────────────────────────────────────────

  async function handleReviewSubmission(
    submission,
    reviewStatus
  ) {
    if (!submission) return

    if (
      reviewStatus === 'revising' &&
      !submissionNote.trim()
    ) {
      toast.error('退回修改時請填寫原因')
      return
    }

    const actionText =
      reviewStatus === 'approved'
        ? '核准這篇文案並啟用優惠碼'
        : '退回這篇文案'

    const confirmed = await confirm({
      title: `確定要${actionText}嗎？`,
      description:
        reviewStatus === 'approved'
          ? '核准後優惠碼會正式啟用，KOC 可以開始使用。'
          : 'KOC 會收到退回通知與您填寫的修改原因。',
      confirmText:
        reviewStatus === 'approved' ? '核准文案' : '退回修改',
      danger: reviewStatus !== 'approved',
    })

    if (!confirmed) return

    try {
      setReviewingSubmissionId(
        submission.submissionId
      )

      setSubmissionError('')

      const response =
        await reviewVendorSubmission({
          vendor_id: vendorId,

          submission_id:
            submission.submissionId,

          status:
            reviewStatus,

          vendor_feedback:
            submissionNote.trim() ||
            (
              reviewStatus === 'approved'
                ? '文案核准，可發布'
                : ''
            )
        })

      if (response.data?.success === false) {
        throw new Error(
          response.data.err ||
          '文案審核失敗'
        )
      }

      setSubmissions(previous =>
        previous.map(item =>
          item.submissionId ===
            submission.submissionId
            ? {
              ...item,

              status:
                response.data?.status ||
                reviewStatus,

              vendorFeedback:
                response.data
                  ?.vendor_feedback ||
                submissionNote.trim(),

              reviewedAt:
                response.data
                  ?.reviewed_time ||
                new Date().toISOString(),

              couponStatus:
                response.data
                  ?.coupon_status ||
                item.couponStatus,

              missionStage:
                response.data?.stage ||
                item.missionStage
            }
            : item
        )
      )

      toast.success(
        reviewStatus === 'approved'
          ? '文案已核准，優惠碼已正式啟用'
          : '文案已退回修改'
      )

      setSelectedSubmissionId(null)
      setSubmissionNote('')
    } catch (error) {
      console.error(
        '文案審核失敗：',
        error
      )

      const apiError =
        error.response?.data?.err

      setSubmissionError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message ||
            '文案審核失敗'
      )
    } finally {
      setReviewingSubmissionId(null)
    }
  }


  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* 分頁切換 */}
      <div className="flex bg-white rounded-2xl border border-[#E2DDD4] p-1 shadow-sm w-fit mx-auto lg:mx-0">
        {[
          {
            key: 'qualification',
            label: '1. 接案審核',
            sub: '決定是否讓 KOC 參與此活動'
          },
          {
            key: 'content',
            label: '2. 文案審核',
            sub: '審核 KOC 提交的貼文內容'
          }
        ].map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setStage(item.key)
              setSelectedApplicationId(null)
              setSelectedSubmissionId(null)
            }}
            className={cn(
              `
                px-8 py-3 text-left
                transition-all rounded-xl
              `,
              stage === item.key
                ? 'bg-[#F5F0E8] shadow-sm'
                : 'hover:bg-[#F8F9FA]'
            )}
          >
            <div
              className={cn(
                'font-bold text-sm mb-1',
                stage === item.key
                  ? 'text-[#1A1A18]'
                  : 'text-[#8C8880]'
              )}
            >
              {item.label}
            </div>

            <div
              className={cn(
                'text-[11px] font-medium tracking-wider',
                stage === item.key
                  ? 'text-[#8C8880]'
                  : 'text-[#E2DDD4]'
              )}
            >
              {item.sub}
            </div>
          </button>
        ))}
      </div>


      {/* ─── 第一階段：接案審核 ─────────────────────────────── */}

      {stage === 'qualification' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              label="待審資格"
              value={qualificationCounts.pending}
              icon={Clock}
            />

            <StatCard
              label="已通過"
              value={qualificationCounts.approved}
              icon={CheckCircle2}
            />

            <StatCard
              label="已拒絕"
              value={qualificationCounts.rejected}
              icon={X}
            />
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
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
                        className="p-5 text-left text-xs font-bold text-[#8C8880] uppercase tracking-widest whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E2DDD4]">
                  {applicationLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-16 text-center text-sm font-bold text-[#8C8880]"
                      >
                        接案申請載入中...
                      </td>
                    </tr>
                  ) : applicationError ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-16 px-5 text-center text-sm font-bold text-red-600"
                      >
                        {applicationError}
                      </td>
                    </tr>
                  ) : sortedApplications.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-16 text-center text-sm font-bold text-[#8C8880]"
                      >
                        目前沒有 KOC 接案申請
                      </td>
                    </tr>
                  ) : (
                    sortedApplications.map(application => {
                      const canReview =
                        application.status === 'pending'

                      return (
                        <tr
                          key={application.applicationId}
                          onClick={() => {
                            if (!canReview) return

                            setSelectedApplicationId(
                              application.applicationId
                            )
                            setQualificationNote('')
                          }}
                          className={cn(
                            'transition-colors',
                            canReview
                              ? 'hover:bg-[#F8F9FA] cursor-pointer'
                              : ''
                          )}
                        >
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <Avatar
                                name={
                                  application.kocName ||
                                  '?'
                                }
                                size="sm"
                              />

                              <div>
                                <div className="text-sm font-bold text-[#1A1A18]">
                                  {application.kocName}
                                </div>

                                <div className="text-[10px] font-bold text-[#8C8880] font-mono mt-0.5">
                                  {application.kocId}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-5 text-xs font-bold text-[#8C8880]">
                            {application.campaignName}
                          </td>

                          <td className="p-5 text-xs font-medium text-[#8C8880]">
                            {application.productName}
                          </td>

                          <td className="p-5 text-xs font-medium text-[#8C8880] whitespace-nowrap">
                            {application.appliedAt
                              ? new Date(
                                application.appliedAt
                              ).toLocaleString('zh-TW')
                              : '—'}
                          </td>

                          <td className="p-5">
                            <Pill
                              cfg={
                                qualificationBadge[
                                application.status
                                ]
                              }
                            />
                          </td>

                          <td className="p-5">
                            {application.couponCode ? (
                              <div>
                                <div className="text-xs font-mono font-bold text-[#C8522A]">
                                  {application.couponCode}
                                </div>

                                <div className="text-[10px] font-bold text-[#8C8880] mt-1">
                                  {application.couponStatus ===
                                    'active'
                                    ? '已啟用'
                                    : '尚未啟用'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-[#E2DDD4] font-bold">
                                —
                              </span>
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
          {selectedApplication &&
            selectedApplication.status === 'pending' && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A18]/40 backdrop-blur-sm p-4">
                <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-8 shadow-2xl border border-[#E2DDD4]">
                  <div className="flex justify-between items-start mb-8">
                    <h3 className="text-2xl font-serif font-bold text-[#1A1A18]">
                      審核接案申請
                    </h3>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedApplicationId(null)
                        setQualificationNote('')
                      }}
                      className="p-2 text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F5F0E8] rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4 pb-6 border-b border-[#E2DDD4]">
                      <Avatar
                        name={
                          selectedApplication.kocName ||
                          '?'
                        }
                        size="lg"
                      />

                      <div>
                        <div className="font-bold text-lg text-[#1A1A18]">
                          {selectedApplication.kocName}
                        </div>

                        <div className="text-sm font-bold text-[#8C8880] mt-1">
                          {selectedApplication.kocId}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#E2DDD4]">
                        <div className="text-[11px] font-bold text-[#8C8880] uppercase mb-1">
                          申請活動
                        </div>

                        <div className="text-sm font-bold text-[#1A1A18]">
                          {selectedApplication.campaignName}
                        </div>
                      </div>

                      <div className="bg-[#F8F9FA] rounded-2xl p-4 border border-[#E2DDD4]">
                        <div className="text-[11px] font-bold text-[#8C8880] uppercase mb-1">
                          申請商品
                        </div>

                        <div className="text-sm font-bold text-[#1A1A18]">
                          {selectedApplication.productName}
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FDF0ED] rounded-xl px-5 py-4 text-xs font-bold text-[#C8522A] flex items-start gap-3">
                      <AlertCircle
                        size={16}
                        className="shrink-0"
                      />

                      審核通過後，系統會建立 KOC
                      任務並產生尚未啟用的優惠碼；文案審核通過後才會正式啟用。
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-[#8C8880] uppercase tracking-widest">
                        審核備註
                      </label>

                      <textarea
                        rows={4}
                        value={qualificationNote}
                        onChange={event =>
                          setQualificationNote(
                            event.target.value
                          )
                        }
                        placeholder="拒絕申請時請填寫原因..."
                        className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl px-5 py-4 text-sm text-[#1A1A18] outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-8 mt-4 border-t border-[#E2DDD4]">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedApplicationId(null)
                        setQualificationNote('')
                      }}
                      className="flex-1"
                    >
                      取消
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() =>
                        handleReviewApplication(
                          selectedApplication,
                          'rejected'
                        )
                      }
                      disabled={
                        !qualificationNote.trim() ||
                        reviewingApplicationId ===
                        selectedApplication.applicationId
                      }
                      className="flex-1 gap-2"
                    >
                      <X size={16} />
                      拒絕申請
                    </Button>

                    <Button
                      variant="brand"
                      onClick={() =>
                        handleReviewApplication(
                          selectedApplication,
                          'approved'
                        )
                      }
                      disabled={
                        reviewingApplicationId ===
                        selectedApplication.applicationId
                      }
                      className="flex-[2] gap-2"
                    >
                      <UserCheck size={16} />
                      通過接案申請
                    </Button>
                  </div>
                </div>
              </div>
            )}
        </>
      )}


      {/* ─── 第二階段：文案審核 ─────────────────────────────── */}

      {stage === 'content' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard
              label="待提交文案"
              value={contentCounts.pendingContent}
              icon={Clock}
            />

            <StatCard
              label="待審文案"
              value={contentCounts.submitted}
              icon={FileText}
            />

            <StatCard
              label="文案核准"
              value={contentCounts.approved}
              icon={CheckCircle2}
            />

            <StatCard
              label="需修改"
              value={contentCounts.revising}
              icon={RotateCcw}
            />
          </div>


          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                    {[
                      'KOC',
                      '活動',
                      '商品',
                      '優惠碼',
                      '文案預覽',
                      '提交時間',
                      '狀態'
                    ].map(header => (
                      <th
                        key={header}
                        className="p-5 text-xs font-bold text-[#8C8880] uppercase tracking-widest whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>


                <tbody className="divide-y divide-[#E2DDD4]">
                  {submissionLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center"
                      >
                        <div className="inline-flex items-center gap-2 text-sm font-bold text-[#8C8880]">
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                          文案投稿載入中...
                        </div>
                      </td>
                    </tr>
                  ) : submissionError ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 px-5 text-center text-sm font-bold text-red-600"
                      >
                        {submissionError}
                      </td>
                    </tr>
                  ) : groupedSubmissions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center text-sm font-bold text-[#8C8880]"
                      >
                        目前沒有文案投稿
                      </td>
                    </tr>
                  ) : (
                    groupedSubmissions.map(submission => {
                      const canReview =
                        submission.status ===
                        'pending' ||
                        submission.status ===
                        'submitted' ||
                        submission.status ===
                        'revising'

                      return (
                        <React.Fragment key={submission.id}>
                        <tr
                          onClick={() => {
                            if (!canReview) return

                            setSelectedSubmissionId(
                              submission.id
                            )

                            setSubmissionNote(
                              submission
                                .vendorFeedback ||
                              ''
                            )

                            setAiResult(submission.aiResult || null)
                          }}
                          className={cn(
                            'transition-colors',
                            canReview
                              ? 'hover:bg-[#F8F9FA] cursor-pointer'
                              : ''
                          )}
                        >
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <Avatar
                                name={
                                  submission.kocName ||
                                  '?'
                                }
                                size="sm"
                              />

                              <div>
                                <div className="text-sm font-bold text-[#1A1A18]">
                                  {
                                    submission.kocName
                                  }
                                </div>

                                <div className="text-[10px] font-bold text-[#8C8880] font-mono mt-0.5">
                                  {
                                    submission.kocId
                                  }
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-5 text-xs font-bold text-[#8C8880]">
                            {
                              submission.campaignName
                            }
                          </td>

                          <td className="p-5 text-xs font-medium text-[#8C8880]">
                            {
                              submission.productName
                            }
                          </td>

                          <td className="p-5 text-xs font-mono font-bold text-[#C8522A]">
                            {submission.couponCode ||
                              '—'}
                          </td>

                          <td className="p-5 text-xs text-[#8C8880] max-w-[220px]">
                            {submission.caption ? (
                              <span className="line-clamp-2 font-medium">
                                {
                                  submission.caption
                                }
                              </span>
                            ) : (
                              <span className="text-[#E2DDD4] italic">
                                尚未提交
                              </span>
                            )}
                          </td>

                          <td className="p-5 text-xs font-medium text-[#8C8880] whitespace-nowrap">
                            {submission.submittedAt
                              ? new Date(
                                submission.submittedAt
                              ).toLocaleString(
                                'zh-TW'
                              )
                              : '—'}
                          </td>

                          <td className="p-5">
                            <div className="flex items-center gap-2">
                              <Pill
                                cfg={
                                  submissionBadge[
                                  submission.status
                                  ]
                                }
                              />

                              {submission.historyCount > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleHistory(
                                      submission.kocMissionId ||
                                      submission.id
                                    )
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-1 rounded-md hover:border-[#C8522A] hover:text-[#C8522A] transition-colors"
                                >
                                  <RotateCcw size={10} />
                                  已重新提交 {submission.historyCount} 次
                                  {expandedHistoryIds.includes(
                                    submission.kocMissionId ||
                                    submission.id
                                  ) ? ' ▲' : ' ▼'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {submission.historyCount > 0 &&
                          expandedHistoryIds.includes(
                            submission.kocMissionId ||
                            submission.id
                          ) && (
                            <tr className="bg-[#F8F9FA]">
                              <td colSpan={7} className="px-5 pb-4 pt-1">
                                <div className="ml-[52px] space-y-2 border-l-2 border-[#E2DDD4] pl-4">
                                  <div className="text-[10px] font-bold text-[#8C8880] uppercase tracking-widest mb-1">
                                    先前投稿紀錄
                                  </div>

                                  {submission.history.map(past => (
                                    <div
                                      key={past.id}
                                      className="flex items-start justify-between gap-4 text-xs bg-white border border-[#E2DDD4] rounded-xl px-4 py-3"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-[#8C8880] line-clamp-2">
                                          {past.caption || '（未填寫文案）'}
                                        </p>

                                        {past.vendorFeedback && (
                                          <p className="text-[#D93025] font-bold mt-1">
                                            退回原因：{past.vendorFeedback}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <Pill
                                          cfg={submissionBadge[past.status]}
                                        />
                                        <span className="text-[10px] font-medium text-[#8C8880] whitespace-nowrap">
                                          {past.submittedAt
                                            ? new Date(past.submittedAt).toLocaleString('zh-TW')
                                            : '—'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>


          {/* 文案審核 Modal */}
          {selectedSubmission &&
            (
              selectedSubmission.status ===
              'pending' ||
              selectedSubmission.status ===
              'submitted' ||
              selectedSubmission.status ===
              'revising'
            ) && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A18]/40 backdrop-blur-sm p-4">
                <div className="relative w-full max-w-4xl bg-white rounded-[2.5rem] p-10 shadow-2xl border border-[#E2DDD4] max-h-[92vh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-8 pb-6 border-b border-[#E2DDD4]">
                    <div className="flex items-center gap-5">
                      <Avatar
                        name={
                          selectedSubmission.kocName ||
                          '?'
                        }
                        size="lg"
                      />

                      <div>
                        <div className="text-2xl font-serif font-bold text-[#1A1A18] mb-1">
                          {
                            selectedSubmission.kocName
                          }
                        </div>

                        <div className="text-sm font-bold text-[#8C8880]">
                          {
                            selectedSubmission.kocId
                          }
                          {' · '}
                          {
                            selectedSubmission
                              .campaignName
                          }
                        </div>
                      </div>
                    </div>


                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-end gap-2">
                        <Pill
                          cfg={
                            submissionBadge[
                            selectedSubmission
                              .status
                            ]
                          }
                        />

                        <span className="text-xs text-[#C8522A] bg-[#FDF0ED] px-3 py-1 rounded-md font-mono font-bold">
                          優惠碼：
                          {selectedSubmission
                            .couponCode || '—'}
                        </span>

                        <span className="text-[10px] font-bold text-[#8C8880]">
                          優惠碼狀態：
                          {selectedSubmission
                            .couponStatus ||
                            'unknown'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubmissionId(
                            null
                          )
                          setSubmissionNote('')
                        }}
                        className="p-2 text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F5F0E8] rounded-full transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>


                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                    {/* 左側：文案預覽 */}
                    <div>
                      <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-3">
                        貼文預覽
                      </div>

                      <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-3xl p-6 text-sm text-[#1A1A18] leading-relaxed min-h-[260px] whitespace-pre-wrap font-medium">
                        {selectedSubmission.caption ||
                          '尚未提交文案'}
                      </div>
                    </div>


                    {/* 右側：合規檢查與審核意見 */}
                    <div className="flex flex-col">
                      <div className="mb-6">
                        <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-3">
                          AI 文案合規檢測
                        </div>
                        <div className="flex gap-2 mb-3">
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="flex-1 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#C8522A]"
                          >
                            <option value="food">食品</option>
                            <option value="cosmetic">化妝品</option>
                            <option value="medical_device">醫療器材</option>
                            <option value="drug">藥品</option>
                          </select>
                          <Button variant="brand" onClick={() => handleAiCheck(selectedSubmission?.caption, selectedSubmission?.id)} disabled={aiLoading} className="px-6">
                            {aiLoading ? "分析中..." : "AI 審核"}
                          </Button>
                        </div>

                        {aiResult && (
                          <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-5 space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#1A1A18]">合規分數</span>
                              <span className={`font-black text-lg ${aiResult.risk_level === 'none' ? 'text-[#1A1A18]'
                                : aiResult.risk_level === 'low' ? 'text-[#B89B6A]'
                                  : aiResult.risk_level === 'medium' ? 'text-[#C8522A]'
                                    : 'text-[#D93025]'
                                }`}>{aiResult.score} 分</span>
                            </div>

                            {aiResult.violations?.length > 0 && (
                              <div>
                                <div className="font-bold text-[#D93025] mb-1">違規詞（{aiResult.violations.length}）</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {aiResult.violations.map((v, i) => (
                                    <span key={i} className="text-xs bg-[#FFF0F0] text-[#D93025] px-2 py-1 rounded-md font-bold">{v.word}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {aiResult.gray_areas?.length > 0 && (
                              <div>
                                <div className="font-bold text-[#8A6D1F] mb-1">灰色地帶（{aiResult.gray_areas.length}）</div>
                                {aiResult.gray_areas.map((g, i) => (
                                  <div key={i} className="text-xs bg-[#FDF6E3] text-[#6B5A2C] px-3 py-2 rounded-lg mb-1">
                                    <span className="font-bold text-[#8A6D1F]">「{g.phrase}」</span> — {g.reason}
                                  </div>
                                ))}
                              </div>
                            )}

                            {aiResult.ai_analysis && (
                              <div>
                                <div className="font-bold text-[#1A1A18] mb-1">AI 整體評估</div>
                                <p className="text-[#8C8880] text-xs leading-relaxed">{aiResult.ai_analysis.overall_assessment}</p>
                                {aiResult.ai_analysis.suggestions?.length > 0 && (
                                  <ul className="mt-2 list-disc list-inside text-xs text-[#8C8880] space-y-1">
                                    {aiResult.ai_analysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-3">
                        合規檢查
                      </div>

                      <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-3xl p-5 space-y-3 mb-6">
                        {compliance(
                          selectedSubmission
                        ).map(checkItem => (
                          <div
                            key={checkItem.label}
                            className={cn(
                              `
                                flex items-center gap-3
                                text-xs font-bold
                                px-4 py-3 rounded-xl
                                border
                              `,
                              checkItem.ok
                                ? 'bg-[#F5F0E8] border-[#E2DDD4] text-[#1A1A18]'
                                : 'bg-[#FFF0F0] border-[#FFF0F0] text-[#D93025]'
                            )}
                          >
                            {checkItem.ok ? (
                              <Check size={14} />
                            ) : (
                              <X size={14} />
                            )}

                            {checkItem.label}
                          </div>
                        ))}
                      </div>


                      <div className="text-xs font-bold text-[#8C8880] uppercase tracking-widest mb-3">
                        審核意見
                      </div>

                      <textarea
                        rows={5}
                        value={submissionNote}
                        onChange={event =>
                          setSubmissionNote(
                            event.target.value
                          )
                        }
                        placeholder="若需修改請輸入原因..."
                        className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl px-5 py-4 text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 resize-none transition-all flex-1"
                      />
                    </div>
                  </div>


                  <div className="flex gap-4 pt-8 mt-8 border-t border-[#E2DDD4]">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSubmissionId(
                          null
                        )
                        setSubmissionNote('')
                      }}
                      className="px-10"
                    >
                      取消
                    </Button>

                    <div className="flex-1" />

                    <Button
                      variant="warning"
                      onClick={() =>
                        handleReviewSubmission(
                          selectedSubmission,
                          'revising'
                        )
                      }
                      className="px-8 gap-2"
                      disabled={
                        !submissionNote.trim() ||
                        reviewingSubmissionId ===
                        selectedSubmission
                          .submissionId
                      }
                    >
                      {reviewingSubmissionId ===
                        selectedSubmission
                          .submissionId ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <RotateCcw size={16} />
                      )}

                      退回修改
                    </Button>

                    <Button
                      variant="brand"
                      onClick={() =>
                        handleReviewSubmission(
                          selectedSubmission,
                          'approved'
                        )
                      }
                      className="px-8 gap-2"
                      disabled={
                        reviewingSubmissionId ===
                        selectedSubmission
                          .submissionId
                      }
                    >
                      {reviewingSubmissionId ===
                        selectedSubmission
                          .submissionId ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Check size={16} />
                      )}

                      核准文案並啟用優惠碼
                    </Button>
                  </div>
                </div>
              </div>
            )}
        </>
      )}
    </div>
  )
}