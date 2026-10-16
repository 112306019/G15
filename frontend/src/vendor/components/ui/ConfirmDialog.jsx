import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

// ─── ConfirmDialog Context ──────────────────────────────────
// 用法：
//   1. 在最外層（例如 Layout.jsx）用 <ConfirmProvider> 包住整個頁面
//   2. 在任何子元件裡 const confirm = useConfirm()
//
//   一般是非確認（取代 window.confirm）：
//   const ok = await confirm({
//     title: '拒絕這筆接案申請？',
//     description: '拒絕後 KOC 會收到通知，此動作無法復原。',
//     confirmText: '拒絕申請',
//     danger: true,
//   })
//   if (!ok) return   // 回傳 boolean
//
//   需要填寫原因才能確認（取代 window.prompt）：
//   const reason = await confirm({
//     title: '拒絕 KOC「小美」的申請？',
//     confirmText: '拒絕申請',
//     danger: true,
//     requireReason: true,
//     reasonLabel: '拒絕原因',
//     reasonPlaceholder: '請說明拒絕原因，KOC 會收到這則訊息',
//   })
//   if (!reason) return   // 使用者取消，回傳 null；確認則回傳填寫的原因字串（已 trim）

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const [reason, setReason] = useState('')
  const resolver = useRef(null)

  const confirm = useCallback((options = {}) => {
    setState({
      title: options.title || '確定要執行這個動作嗎？',
      description: options.description || '',
      confirmText: options.confirmText || '確定',
      cancelText: options.cancelText || '取消',
      danger: !!options.danger,
      requireReason: !!options.requireReason,
      reasonLabel: options.reasonLabel || '原因',
      reasonPlaceholder: options.reasonPlaceholder || '請填寫原因',
    })
    setReason('')

    return new Promise((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const handleClose = useCallback((confirmed) => {
    if (!confirmed) {
      const wasRequireReason = state?.requireReason
      setState(null)
      if (resolver.current) {
        resolver.current(wasRequireReason ? null : false)
        resolver.current = null
      }
      return
    }

    if (state?.requireReason) {
      const trimmed = reason.trim()
      if (!trimmed) return // 原因為空，不關閉、不 resolve

      setState(null)
      if (resolver.current) {
        resolver.current(trimmed)
        resolver.current = null
      }
      return
    }

    setState(null)
    if (resolver.current) {
      resolver.current(true)
      resolver.current = null
    }
  }, [state, reason])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {state && (
        <div
          className="
            fixed inset-0 z-[200] flex items-center justify-center
            bg-ink/40 backdrop-blur-sm p-4
            animate-in fade-in duration-200
          "
          onClick={() => handleClose(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(e) => e.stopPropagation()}
            className="
              relative w-full max-w-sm bg-white rounded-[2rem]
              p-7 shadow-2xl border border-edge
              animate-in zoom-in-95 duration-200
            "
          >
            <div
              className={`
                w-11 h-11 rounded-full flex items-center justify-center mb-4
                ${state.danger ? 'bg-[#FFF0F0] text-[#D93025]' : 'bg-cream text-brand'}
              `}
            >
              <AlertTriangle size={20} />
            </div>

            <h3
              id="confirm-dialog-title"
              className="text-lg font-display font-bold text-ink mb-2"
            >
              {state.title}
            </h3>

            {state.description && (
              <p className="text-sm text-muted font-medium leading-relaxed mb-6">
                {state.description}
              </p>
            )}

            {!state.description && !state.requireReason && <div className="mb-4" />}

            {state.requireReason && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                  {state.reasonLabel}
                </label>
                <textarea
                  autoFocus
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={state.reasonPlaceholder}
                  className="
                    w-full bg-mist border border-edge rounded-xl
                    px-4 py-3 text-sm text-ink placeholder:text-muted/50
                    outline-none focus:bg-white focus:border-brand
                    focus:ring-4 focus:ring-brand/10 transition-all resize-none
                  "
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="
                  px-5 py-2.5 rounded-full text-sm font-bold
                  border border-edge text-muted
                  hover:border-brand hover:text-brand
                  transition-colors
                "
              >
                {state.cancelText}
              </button>

              <button
                type="button"
                onClick={() => handleClose(true)}
                autoFocus={!state.requireReason}
                disabled={state.requireReason && !reason.trim()}
                className={`
                  px-5 py-2.5 rounded-full text-sm font-bold text-white
                  transition-colors shadow-sm
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${state.danger
                    ? 'bg-[#D93025] hover:bg-[#B0241C]'
                    : 'bg-brand hover:bg-brand-dark'}
                `}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm 必須在 <ConfirmProvider> 內使用')
  }
  return ctx
}
