import type { AnalyzeResponse, HighlightSegment, Violation, GrayArea } from '../types'

const RISK_CONFIG = {
  high:   { label: '高度合規風險', emoji: '✕', bg: '#FCEBEB', border: '#F09595', textColor: '#A32D2D', barColor: '#E24B4A' },
  medium: { label: '中度合規風險', emoji: '⚠', bg: '#FAEEDA', border: '#FAC775', textColor: '#854F0B', barColor: '#BA7517' },
  low:    { label: '低度合規風險', emoji: '！', bg: '#EAF3DE', border: '#C0DD97', textColor: '#3B6D11', barColor: '#639922' },
  none:   { label: '合規風險極低', emoji: '✓', bg: '#E1F5EE', border: '#9FE1CB', textColor: '#0F6E56', barColor: '#1D9E75' },
}

interface Props {
  data: AnalyzeResponse
}

const card: React.CSSProperties = {
  background: '#fff', border: '0.5px solid #e5e5e5',
  borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 12,
}
const cardTitle: React.CSSProperties = {
  fontSize: 11, color: '#888', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: 10, fontWeight: 500,
}

function Badge({ severity }: { severity: string }) {
  const styles: Record<string, React.CSSProperties> = {
    danger: { background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F09595' },
    warning: { background: '#FAEEDA', color: '#854F0B', border: '0.5px solid #FAC775' },
    gray: { background: '#F0EDFE', color: '#5340e0', border: '0.5px solid #C4BAF9' },
  }
  const labels: Record<string, string> = { danger: '違規', warning: '注意', gray: '灰色地帶' }
  return (
    <span style={{
      fontSize: 11, padding: '2px 7px', borderRadius: 10, flexShrink: 0,
      fontWeight: 500, marginTop: 1, ...(styles[severity] || styles.gray)
    }}>
      {labels[severity] || severity}
    </span>
  )
}

function HighlightedText({ segments }: { segments: HighlightSegment[] }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.8, background: '#f9f9f9', borderRadius: 8, padding: '12px 14px' }}>
      {segments.map((seg, i) => {
        if (seg.type === 'normal') return <span key={i}>{seg.text}</span>
        const styleMap: Record<string, React.CSSProperties> = {
          danger:  { background: '#F7C1C1', color: '#501313', borderRadius: 3, padding: '1px 3px' },
          warning: { background: '#FAC775', color: '#412402', borderRadius: 3, padding: '1px 3px' },
          gray:    { background: '#DDD8FC', color: '#2D1F8C', borderRadius: 3, padding: '1px 3px', textDecoration: 'underline dotted' },
        }
        return <mark key={i} style={styleMap[seg.type] || {}}>{seg.text}</mark>
      })}
    </div>
  )
}

export default function ResultPanel({ data }: Props) {
  const risk = RISK_CONFIG[data.risk_level]
  const shown = data.violations.slice(0, 8)

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Risk banner */}
      <div style={{
        padding: '14px 16px', borderRadius: 12, marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 12,
        background: risk.bg, border: `0.5px solid ${risk.border}`,
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{risk.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 2 }}>合規評估</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: risk.textColor }}>{risk.label}</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4, display: 'flex', gap: 10 }}>
            <span style={{ color: '#A32D2D' }}>● 違規 {data.danger_count}</span>
            <span style={{ color: '#854F0B' }}>● 注意 {data.warning_count}</span>
            <span style={{ color: '#5340e0' }}>● 灰色地帶 {data.gray_count}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 500, color: risk.barColor }}>{data.score}</div>
          <div style={{ fontSize: 11, color: '#999' }}>合規分數 / 100</div>
          <div style={{ height: 6, width: 80, background: '#e5e5e5', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${data.score}%`, background: risk.barColor, borderRadius: 3, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      </div>

      {/* 規則檢測 — 明確違規詞句（整行寬） */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={cardTitle}>規則檢測 — 明確違規詞句</div>
        {data.violations.length === 0
          ? <div style={{ fontSize: 13, color: '#888', padding: '8px 0' }}>未偵測到明確違規詞句</div>
          : <ul style={{ padding: 0, margin: 0 }}>
              {shown.map((v: Violation, i: number) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '0.5px solid #f0f0f0', fontSize: 13, listStyle: 'none' }}>
                  <Badge severity={v.severity} />
                  <div>
                    <span style={{ fontWeight: 500 }}>「{v.word}」</span>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{v.label}</div>
                    {v.law_ref && <div style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>{v.law_ref}</div>}
                  </div>
                </li>
              ))}
              {data.violations.length > 8 && <li style={{ fontSize: 12, color: '#aaa', padding: '6px 0', listStyle: 'none' }}>...還有 {data.violations.length - 8} 項</li>}
            </ul>
        }
      </div>

      {/* 灰色地帶區塊（完全由 LLM 判讀） */}
      <div style={{ ...card, border: '0.5px solid #C4BAF9', background: '#FAFAFF' }}>
        <div style={{ ...cardTitle, color: '#5340e0', display: 'flex', alignItems: 'center' }}>
          <span>⚠ 灰色地帶警示</span>
          <span style={{ marginLeft: 8, fontSize: 11, background: '#F0EDFE', color: '#5340e0', padding: '1px 8px', borderRadius: 8, border: '0.5px solid #C4BAF9' }}>
            AI 判讀 {data.gray_count} 項
          </span>
        </div>

        {!data.ai_analysis
          ? <div style={{ fontSize: 13, color: '#aaa' }}>AI 分析未啟用，灰色地帶需由 LLM 判讀</div>
          : data.gray_areas.length === 0
            ? <div style={{ fontSize: 13, color: '#888' }}>AI 未判讀出灰色地帶風險</div>
            : data.gray_areas.map((ga: GrayArea, i: number) => (
                <div key={i} style={{ padding: '10px 12px', background: '#F0EDFE', borderRadius: 8, marginBottom: 8, border: '0.5px solid #C4BAF9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Badge severity="gray" />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#2D1F8C' }}>{ga.label}</span>
                  </div>
                  {ga.phrase && (
                    <div style={{ fontSize: 13, color: '#2D1F8C', marginBottom: 4 }}>
                      原文片段：
                      <span style={{ background: '#DDD8FC', color: '#2D1F8C', borderRadius: 4, padding: '1px 6px', marginLeft: 4 }}>「{ga.phrase}」</span>
                    </div>
                  )}
                  {ga.reason && <div style={{ fontSize: 12, color: '#5340e0', marginBottom: 4, lineHeight: 1.6 }}>{ga.reason}</div>}
                  {ga.law_ref && <div style={{ fontSize: 11, color: '#bbb' }}>{ga.law_ref}</div>}
                </div>
              ))
        }
      </div>

      {/* 文案標註 */}
      <div style={card}>
        <div style={cardTitle}>文案標註檢視</div>
        <HighlightedText segments={data.highlighted_segments} />
        <div style={{ marginTop: 8, display: 'flex', gap: 14, fontSize: 12, color: '#888', flexWrap: 'wrap' }}>
          <span><mark style={{ background: '#F7C1C1', borderRadius: 3, padding: '1px 5px' }}>紅色</mark> 明確違規</span>
          <span><mark style={{ background: '#FAC775', borderRadius: 3, padding: '1px 5px' }}>橘色</mark> 需注意</span>
          <span><mark style={{ background: '#DDD8FC', borderRadius: 3, padding: '1px 5px', textDecoration: 'underline dotted' }}>紫色底線</mark> 灰色地帶</span>
        </div>
      </div>

      {/* AI 建議 */}
      {data.ai_analysis && (
        <div style={card}>
          <div style={cardTitle}>AI 整體評估與修改建議</div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: '#333', marginBottom: 12 }}>{data.ai_analysis.overall_assessment}</p>
          <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 8 }}>具體修改建議</div>
            {data.ai_analysis.suggestions.map((s: string, i: number) => (
              <div key={i} style={{ fontSize: 13, color: '#333', padding: '4px 0', display: 'flex', gap: 8 }}>
                <span style={{ color: '#0F6E56', fontWeight: 500, flexShrink: 0 }}>→</span><span>{s}</span>
              </div>
            ))}
          </div>
          {data.ai_analysis.compliant_alternatives.length > 0 && (
            <div style={{ background: '#E1F5EE', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#0F6E56', marginBottom: 8 }}>建議合規替代詞句</div>
              {data.ai_analysis.compliant_alternatives.map((a: string, i: number) => (
                <div key={i} style={{ fontSize: 13, color: '#1a5c45', padding: '4px 0', display: 'flex', gap: 8 }}>
                  <span style={{ flexShrink: 0, fontWeight: 500 }}>✓</span><span>{a}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
