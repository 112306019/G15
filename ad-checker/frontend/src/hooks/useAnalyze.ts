import { useState } from 'react'
import axios from 'axios'
import type { AnalyzeRequest, AnalyzeResponse } from '../types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function useAnalyze() {
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(-1)

  const analyze = async (req: AnalyzeRequest) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setStep(0)

    try {
      setStep(1)
      await new Promise(r => setTimeout(r, 300))
      setStep(2)
      const res = await axios.post<AnalyzeResponse>(`${API_BASE}/api/analyze`, req)
      setResult(res.data)
    } catch (e) {
      if (axios.isAxiosError(e)) {
        setError(e.response?.data?.detail ?? e.message)
      } else {
        setError('未知錯誤')
      }
    } finally {
      setLoading(false)
      setStep(-1)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
    setStep(-1)
  }

  return { result, loading, error, step, analyze, reset }
}
