import React, { useState } from 'react'
import { orders as mockOrders } from './mock'
import { formatCurrency, cn } from './lib/utils'

const statusFilters = ['全部','paid','processing','refunded']
const statusLabels  = { 全部:'全部', paid:'已付款', processing:'處理中', refunded:'已退款' }

// 🟢 專屬品牌色的訂單狀態標籤
function OrderBadge({ status }) {
  const config = {
    paid:       { label: '已付款', cls: 'bg-[#F5F0E8] text-[#1A1A18]', dot: 'bg-[#1A1A18]' },
    processing: { label: '處理中', cls: 'bg-[#FDF0ED] text-[#C8522A]', dot: 'bg-[#C8522A]' },
    refunded:   { label: '已退款', cls: 'bg-white border border-[#E2DDD4] text-[#8C8880]', dot: 'bg-[#E2DDD4]' },
  }
  const c = config[status] || { label: status, cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
  
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider', c.cls)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />{c.label}
    </span>
  )
}

export default function Orders() {
  const [filter, setFilter] = useState('全部')

  // 🟢 為了讓你看出版面差異，我動態在原本的 mock 資料前面，塞入兩筆「一般顧客」的自然訂單
  const combinedOrders = [
    { id: 'ORD-999', kocName: null, code: null, productName: 'SanDisk 128GB SDXC 相機記憶卡', amount: 1470, date: '2026-06-15', status: 'paid' },
    { id: 'ORD-998', kocName: null, code: null, productName: 'Sony 降噪藍牙耳機', amount: 11900, date: '2026-06-14', status: 'processing' },
    ...mockOrders
  ];

  const filtered = filter === '全部' ? combinedOrders : combinedOrders.filter(o => o.status === filter)

  // 計算總計金額
  const total = filtered.reduce((s, o) => s + o.amount, 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 頂部過濾與統計列 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        
        {/* 過濾標籤 */}
        <div className="flex gap-2 p-1 bg-[#E2DDD4]/30 rounded-full">
          {statusFilters.map(s => (
            <button 
              key={s} 
              onClick={() => setFilter(s)} 
              className={cn(
                'px-6 py-2 rounded-full text-sm font-bold transition-all',
                filter === s ? 'bg-[#1A1A18] text-white shadow-sm' : 'text-[#8C8880] hover:text-[#1A1A18]'
              )}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
        
        {/* 統計摘要 */}
        <div className="bg-white border border-[#E2DDD4] px-6 py-2.5 rounded-full shadow-sm text-sm font-bold text-[#8C8880] flex items-center gap-2">
          共 <span className="text-[#1A1A18]">{filtered.length}</span> 筆訂單
          <span className="w-1 h-1 bg-[#E2DDD4] rounded-full mx-2"></span>
          總計 <span className="text-[#C8522A] text-lg tracking-tight ml-1">{formatCurrency(total)}</span>
        </div>

      </div>

      {/* 訂單列表 */}
      <div className="bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                {['訂單編號','推廣來源','優惠碼','商品','金額','日期','狀態'].map((h, i) => (
                  <th key={i} className="p-5 text-xs font-bold text-[#8C8880] tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-[#E2DDD4]">
              {filtered.length > 0 ? filtered.map(o => (
                <tr key={o.id} className="hover:bg-[#F8F9FA] transition-colors group">
                  <td className="p-5 text-sm font-mono font-medium text-[#8C8880]">{o.id}</td>
                  
                  {/* 🟢 判斷是否有 KOC：有就顯示名字，沒有就顯示一般顧客 */}
                  <td className="p-5 text-sm">
                    {o.kocName ? (
                      <span className="font-bold text-[#1A1A18]">{o.kocName}</span>
                    ) : (
                      <span className="font-medium text-[#8C8880] bg-[#F5F0E8] px-2 py-1 rounded-md text-xs">一般顧客</span>
                    )}
                  </td>
                  
                  {/* 🟢 判斷是否有優惠碼：有就顯示焦糖橘標籤，沒有就顯示無 */}
                  <td className="p-5">
                    {o.code ? (
                      <span className="text-xs font-mono font-bold text-[#C8522A] bg-[#FDF0ED] px-3 py-1.5 rounded-lg border border-[#FDF0ED]">
                        {o.code}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-[#8C8880]">無</span>
                    )}
                  </td>
                  
                  <td className="p-5 text-sm font-medium text-[#8C8880] line-clamp-1 max-w-[200px]">{o.productName}</td>
                  <td className="p-5 text-sm font-black text-[#1A1A18]">{formatCurrency(o.amount)}</td>
                  <td className="p-5 text-sm font-medium text-[#8C8880]">{o.date}</td>
                  <td className="p-5"><OrderBadge status={o.status} /></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-sm font-bold text-[#8C8880]">
                    目前沒有符合狀態的訂單記錄
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  )
}