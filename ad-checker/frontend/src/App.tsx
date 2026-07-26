import { useState } from 'react'
import type { Category } from './types'
import { useAnalyze } from './hooks/useAnalyze'
import Pipeline from './components/Pipeline'
import ResultPanel from './components/ResultPanel'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'food', label: '食品' },
  { value: 'cosmetic', label: '化粧品' },
  { value: 'medical_device', label: '醫療器材' },
  { value: 'drug', label: '藥品' },
]

const EXAMPLES: Record<Category, string> = {
  food: '本產品採用珍貴人蔘配方，能有效降低血糖、降血壓，預防癌症，增強自體免疫力，三天見效，保證讓您恢復年輕活力，養顏美容，調節生理機能。',
  cosmetic: '本面霜含高濃度玻尿酸，能活化毛囊、促進膠原蛋白合成，有效消炎殺菌，除疤去痘疤，抑制落髮，醫藥級配方保證完全消除皺紋，讓您重返20歲肌膚。',
  medical_device: '本紅外線治療儀保證療效，包治各種痠痛與皮膚疾病，天下第一最強療效，更有壯陽強精奇效，3天見效，1台抵10台同級機種。',
  drug: '本藥品最強配方，立竿見影治療百病，壯陽強精，保證100%有效，三天藥到病除，比同類藥品效果強3倍。',
}

const CATEGORY_LABEL: Record<Category, string> = {
  food: '食品', cosmetic: '化粧品', medical_device: '醫療器材', drug: '藥品',
}

type View = 'input' | 'result'

export default function App() {
  const [text, setText] = useState('')
  const [category, setCategory] = useState<Category>('food')
  const [view, setView] = useState<View>('input')
  const { result, loading, error, step, analyze, reset } = useAnalyze()

  const handleAnalyze = () => {
    if (!text.trim()) return
    setView('result')   // 立刻切到結果頁（先顯示分析中）
    analyze({ text, category })
  }

  const handleBack = () => {
    setView('input')
    reset()
  }

  const handleClear = () => {
    setText('')
    reset()
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'Noto Sans TC, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', margin: 0, marginBottom: 4 }}>
          廣告文案品質檢測系統
        </h1>
        <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
          食品・化粧品・醫療器材・藥品廣告法規合規分析（2025年版）
        </p>
      </div>

      {/* ========================= 第一頁：文案輸入 ========================= */}
      {view === 'input' && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
              style={{
                fontSize: 13, padding: '6px 10px', height: 36,
                border: '0.5px solid #ddd', borderRadius: 8,
                background: '#fff', color: '#333', cursor: 'pointer',
              }}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <div style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }} />
              選擇產品類別以適用對應法規
            </div>
          </div>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="請輸入廣告文案內容..."
            style={{
              width: '100%', minHeight: 220, padding: 12,
              fontSize: 14, fontFamily: 'Noto Sans TC, sans-serif',
              border: '0.5px solid #ddd', borderRadius: 8,
              background: '#fff', color: '#1a1a1a', resize: 'vertical',
              lineHeight: 1.7, boxSizing: 'border-box', outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = '#999' }}
            onBlur={e => { e.target.style.borderColor = '#ddd' }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={handleAnalyze}
              disabled={!text.trim()}
              style={{
                background: !text.trim() ? '#ccc' : '#1a1a1a',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 20px', fontSize: 14, fontWeight: 500,
                cursor: !text.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              開始檢測 →
            </button>
            <button
              onClick={() => setText(EXAMPLES[category])}
              style={{
                background: 'transparent', border: '0.5px solid #ddd',
                borderRadius: 8, padding: '8px 16px', fontSize: 14,
                color: '#555', cursor: 'pointer',
              }}
            >
              載入範例文案
            </button>
            <button
              onClick={handleClear}
              style={{
                background: 'transparent', border: '0.5px solid #ddd',
                borderRadius: 8, padding: '8px 16px', fontSize: 14,
                color: '#555', cursor: 'pointer',
              }}
            >
              清除
            </button>
          </div>
        </div>
      )}

      {/* ========================= 第二頁：檢測結果 ========================= */}
      {view === 'result' && (
        <div>
          {/* 返回列 + 受檢文案摘要 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button
              onClick={handleBack}
              style={{
                background: 'transparent', border: '0.5px solid #ddd',
                borderRadius: 8, padding: '7px 14px', fontSize: 14,
                color: '#555', cursor: 'pointer', flexShrink: 0,
              }}
            >
              ← 返回修改
            </button>
            <span style={{
              fontSize: 12, color: '#666', background: '#f3f3f3',
              padding: '4px 10px', borderRadius: 20, flexShrink: 0,
            }}>
              類別：{CATEGORY_LABEL[category]}
            </span>
          </div>

          {/* Pipeline indicator */}
          {step >= 0 && <Pipeline currentStep={step} />}

          {/* Error state */}
          {error && (
            <div style={{
              background: '#FCEBEB', border: '0.5px solid #F09595',
              borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#A32D2D',
              marginTop: '1rem',
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '1rem 0' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#ccc',
                  animation: `bounce 1.2s ${i * 0.2}s infinite`,
                }} />
              ))}
              <span style={{ fontSize: 13, color: '#aaa', marginLeft: 4 }}>
                {step === 0 ? '文字處理中...' : step === 1 ? '規則檢測中...' : 'AI 分析中...'}
              </span>
              <style>{`
                @keyframes bounce {
                  0%,80%,100% { transform: translateY(0); }
                  40% { transform: translateY(-7px); }
                }
              `}</style>
            </div>
          )}

          {/* Result */}
          {result && !loading && <ResultPanel data={result} />}
        </div>
      )}
    </div>
  )
}
