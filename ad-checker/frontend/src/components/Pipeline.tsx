import React from 'react'

const STEPS = ['文字處理', '規則檢測', 'AI 分析', '輸出結果']

interface Props {
  currentStep: number
}

export default function Pipeline({ currentStep }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', margin: '1.25rem 0' }}>
      {STEPS.map((label, i) => {
        const isDone = i < currentStep
        const isActive = i === currentStep
        return (
          <React.Fragment key={label}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20, fontSize: 12,
              border: `1px solid ${isDone ? '#0F6E56' : isActive ? '#5340e0' : '#ddd'}`,
              color: isDone ? '#0F6E56' : isActive ? '#5340e0' : '#aaa',
              background: isDone ? '#E1F5EE' : isActive ? '#EEEDFE' : '#fafafa',
              transition: 'all 0.3s',
              fontFamily: 'Noto Sans TC, sans-serif',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: isDone ? '#0F6E56' : isActive ? '#5340e0' : '#ccc',
              }} />
              {label}
            </div>
            {i < STEPS.length - 1 && (
              <span style={{ color: '#ccc', fontSize: 11 }}>›</span>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
