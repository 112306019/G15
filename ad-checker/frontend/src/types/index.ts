export type Category = 'food' | 'cosmetic' | 'medical_device' | 'drug'

export interface Violation {
  word: string
  label: string
  severity: 'danger' | 'warning'
  group: string
  law_ref?: string
}

// 灰色地帶現由 LLM 判讀，每筆含原始片段、風險說明與法規
export interface GrayArea {
  phrase: string
  label: string
  reason: string
  law_ref?: string
  severity: string
}

export interface AIAnalysis {
  overall_assessment: string
  semantic_risks: string[]
  suggestions: string[]
  compliant_alternatives: string[]
  ai_enabled?: boolean
}

export interface HighlightSegment {
  text: string
  type: 'normal' | 'danger' | 'warning' | 'gray'
}

export interface AnalyzeResponse {
  score: number
  risk_level: 'high' | 'medium' | 'low' | 'none'
  category: Category
  violations: Violation[]
  gray_areas: GrayArea[]
  ai_analysis: AIAnalysis | null
  highlighted_segments: HighlightSegment[]
  danger_count: number
  warning_count: number
  gray_count: number
}

export interface AnalyzeRequest {
  text: string
  category: Category
}
