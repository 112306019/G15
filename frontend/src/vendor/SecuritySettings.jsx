import React, { useEffect, useState } from 'react'
import { KeyRound, Loader2, MonitorSmartphone, X } from 'lucide-react'
import { changeVendorPassword, getVendorLoginHistory } from '../api/vendor'
import { getErrorMessage } from '../errorMessage'

const MIN_PASSWORD_LENGTH = 8

const formatDate = (value) =>
  new Date(value).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })

const formatDateTime = (value) =>
  new Date(value).toLocaleString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

// 把瀏覽器回報的 user agent 轉成看得懂的「系統 · 瀏覽器」
function parseUserAgent(ua) {
  if (!ua) return '未知裝置'
  let browser = '瀏覽器'
  if (ua.includes('Edg')) browser = 'Edge'
  else if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari')) browser = 'Safari'

  let os = ''
  if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Windows')) os = 'Windows'

  return os ? `${os} · ${browser}` : browser
}

const INPUT_CLASS =
  'w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-[13px] sm:text-sm font-medium text-[#1A1A18] outline-none focus:border-[#C8522A] focus:bg-white transition-colors'

function PasswordField({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] sm:text-xs font-bold text-[#8C8880] uppercase tracking-wider">{label}</label>
      <input type="password" className={INPUT_CLASS} {...props} />
    </div>
  )
}

// 廠商個人資料頁「安全性設定」裡的登入與安全性：更新密碼、登入記錄
// （比照前台 KOC／消費者的「登入與安全性」頁）
export default function SecuritySettings() {
  const vendorId = localStorage.getItem('vendor_id')

  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [logsError, setLogsError] = useState('')
  const [passwordUpdatedAt, setPasswordUpdatedAt] = useState(null)

  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    if (!vendorId) {
      setLoadingLogs(false)
      return
    }
    let cancelled = false
    getVendorLoginHistory(vendorId)
      .then((response) => {
        if (cancelled) return
        setLogs(response.data?.logs || [])
        setPasswordUpdatedAt(response.data?.password_updated_at || null)
      })
      .catch((err) => {
        if (!cancelled) setLogsError(getErrorMessage(err, '登入記錄載入失敗，請稍後再試'))
      })
      .finally(() => {
        if (!cancelled) setLoadingLogs(false)
      })
    return () => {
      cancelled = true
    }
  }, [vendorId])

  const openPasswordModal = () => {
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setPwError('')
    setSavedMessage('')
    setPwOpen(true)
  }

  const handleSavePassword = async (event) => {
    event.preventDefault()
    if (!currentPw) return setPwError('請輸入目前密碼')
    if (newPw.length < MIN_PASSWORD_LENGTH) return setPwError(`新密碼需至少 ${MIN_PASSWORD_LENGTH} 位`)
    if (newPw !== confirmPw) return setPwError('兩次輸入的新密碼不相符')

    setSaving(true)
    setPwError('')
    try {
      const response = await changeVendorPassword({
        vendor_id: vendorId,
        current_password: currentPw,
        new_password: newPw,
      })
      setPasswordUpdatedAt(response.data?.password_updated_at || new Date().toISOString())
      setPwOpen(false)
      setSavedMessage('密碼已成功更新')
    } catch (err) {
      setPwError(getErrorMessage(err, '密碼更新失敗，請稍後再試'))
    } finally {
      setSaving(false)
    }
    return undefined
  }

  return (
    <>
      {/* 密碼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl sm:rounded-2xl bg-[#F8F9FA] border border-[#E2DDD4] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <KeyRound size={18} className="text-[#8C8880] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-[#1A1A18]">密碼</p>
            <p className="text-[11px] sm:text-xs text-[#8C8880] mt-1">
              {passwordUpdatedAt ? `上次更新於 ${formatDate(passwordUpdatedAt)}` : '尚未更新過密碼'}
            </p>
            {savedMessage && <p className="text-[11px] sm:text-xs font-bold text-[#2F8F4E] mt-1">✓ {savedMessage}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={openPasswordModal}
          className="w-full sm:w-auto rounded-full border border-[#E2DDD4] bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-[#1A1A18] hover:border-[#1A1A18] transition-colors"
        >
          更新密碼
        </button>
      </div>

      {/* 登入記錄 */}
      <div>
        <p className="text-sm font-bold text-[#1A1A18] mb-3 flex items-center gap-2">
          <MonitorSmartphone size={16} className="text-[#8C8880]" />
          登入記錄
        </p>
        <div className="rounded-xl sm:rounded-2xl border border-[#E2DDD4] overflow-hidden">
          {loadingLogs ? (
            <div className="p-6 flex justify-center">
              <Loader2 size={18} className="animate-spin text-[#C8522A]" />
            </div>
          ) : logsError ? (
            <div className="p-5 text-center text-xs font-bold text-[#C8522A]">{logsError}</div>
          ) : logs.length === 0 ? (
            <div className="p-5 text-center text-xs font-bold text-[#8C8880]">
              目前沒有可顯示的登入記錄，下次登入後會開始記錄。
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={log.log_id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-[#E2DDD4] last:border-0"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#1A1A18]">
                  {parseUserAgent(log.user_agent)}
                  {index === 0 && (
                    <span className="rounded-md bg-[#EAF6EC] px-2 py-0.5 text-[10px] font-bold text-[#2F8F4E]">
                      最近一次登入
                    </span>
                  )}
                </div>
                <div className="text-[11px] sm:text-xs font-medium text-[#8C8880]">{formatDateTime(log.login_at)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 更新密碼彈窗 */}
      {pwOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1A18]/40 backdrop-blur-sm p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPwOpen(false)
          }}
        >
          <form
            onSubmit={handleSavePassword}
            className="w-full max-w-md rounded-[1.5rem] sm:rounded-[2rem] bg-white border border-[#E2DDD4] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-bold text-xl text-[#1A1A18]">更新密碼</h3>
              <button
                type="button"
                onClick={() => setPwOpen(false)}
                className="p-2 rounded-full text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F8F9FA] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <PasswordField
                label="目前密碼"
                placeholder="輸入目前密碼"
                autoComplete="current-password"
                value={currentPw}
                onChange={(event) => setCurrentPw(event.target.value)}
              />
              <PasswordField
                label="新密碼"
                placeholder={`輸入新密碼（至少 ${MIN_PASSWORD_LENGTH} 位）`}
                autoComplete="new-password"
                value={newPw}
                onChange={(event) => setNewPw(event.target.value)}
              />
              <PasswordField
                label="確認新密碼"
                placeholder="再次輸入新密碼"
                autoComplete="new-password"
                value={confirmPw}
                onChange={(event) => setConfirmPw(event.target.value)}
              />
            </div>

            {pwError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                {pwError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setPwOpen(false)}
                className="w-full sm:flex-1 rounded-full border border-[#E2DDD4] bg-white py-3 text-xs sm:text-sm font-bold text-[#8C8880] hover:border-[#1A1A18] hover:text-[#1A1A18] transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:flex-1 rounded-full bg-[#1A1A18] py-3 text-xs sm:text-sm font-bold text-[#F5F0E8] hover:bg-[#C8522A] transition-colors disabled:opacity-50"
              >
                {saving ? '儲存中...' : '確認儲存'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
