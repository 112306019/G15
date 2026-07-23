import React, { useState } from 'react'
import { LayoutDashboard, PackageSearch } from 'lucide-react'

import Overview from './Overview'
import ProductAnalytics from './ProductAnalytics'
import { cn } from './lib/utils'

const analyticsTabs = [
  {
    key: 'overview',
    label: '成效總覽',
    description: '查看訂單、營收與優惠碼整體表現',
    icon: LayoutDashboard
  },
  {
    key: 'products',
    label: '商品成效',
    description: '查看各商品銷量與優惠碼訂單',
    icon: PackageSearch
  }
]

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#1A1A18]">
          成效分析
        </h1>

        <p className="text-sm font-medium text-[#8C8880] mt-2">
          查看活動、訂單、商品與優惠碼帶來的實際成效
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {analyticsTabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                `
                  flex-1 flex items-center gap-4
                  px-5 py-4 rounded-2xl
                  border text-left transition-all
                `,
                isActive
                  ? 'bg-[#1A1A18] border-[#1A1A18] text-white shadow-sm'
                  : 'bg-white border-[#E2DDD4] text-[#1A1A18] hover:border-[#B89B6A]'
              )}
            >
              <div
                className={cn(
                  'p-2.5 rounded-xl',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'bg-[#F5F0E8] text-[#C8522A]'
                )}
              >
                <Icon size={19} />
              </div>

              <div>
                <div className="text-sm font-bold">
                  {tab.label}
                </div>

                <div
                  className={cn(
                    'text-xs mt-1',
                    isActive
                      ? 'text-white/60'
                      : 'text-[#8C8880]'
                  )}
                >
                  {tab.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' && <Overview />}

      {activeTab === 'products' && <ProductAnalytics />}
    </div>
  )
}