import React from 'react'

import ProductAnalytics from './ProductAnalytics'

export default function Analytics() {
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

      <ProductAnalytics />
    </div>
  )
}
