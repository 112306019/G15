import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

// ─── Toast Context ──────────────────────────────────────────
// 用法：
//   1. 在最外層（例如 Layout.jsx）用 <ToastProvider> 包住整個頁面
//   2. 在任何子元件裡 const { toast } = useToast()
//   3. toast.success('文案已核准') / toast.error('儲存失敗，請稍後再試')

const ToastContext = createContext(null)

const variantStyles = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-[#1A7A4C]',
    barClass: 'bg-[#1A7A4C]',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-[#D93025]',
    barClass: 'bg-[#D93025]',
  },
  info: {
    icon: AlertCircle,
    iconClass: 'text-[#C8522A]',
    barClass: 'bg-[#C8522A]',
  },
}

function ToastItem({ id, type, message, onDismiss }) {
  const { icon: Icon, iconClass, barClass } = variantStyles[type] || variantStyles.info

  return (
    <div
      role="status"
      className="
        relative flex items-start gap-3 w-full max-w-sm
        bg-white rounded-2xl border border-[#E2DDD4] shadow-lg
        px-4 py-3.5 pl-4 overflow-hidden
        animate-in slide-in-from-bottom-3 fade-in duration-300
      "
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${barClass}`} />

      <Icon size={20} className={`shrink-0 mt-0.5 ${iconClass}`} />

      <p className="flex-1 text-sm font-bold text-[#1A1A18] leading-snug">
        {message}
      </p>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="shrink-0 p-1 rounded-full text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F5F0E8] transition-colors"
        aria-label="關閉通知"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children, duration = 4000 }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const show = useCallback((type, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts(prev => [...prev, { id, type, message }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
  }, [dismiss, duration])

  const toast = useRef({
    success: (message) => show('success', message),
    error: (message) => show('error', message),
    info: (message) => show('info', message),
  }).current

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2.5 items-end">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast 必須在 <ToastProvider> 內使用')
  }
  return ctx
}
