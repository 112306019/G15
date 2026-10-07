import React from 'react';
import { TrendingUp, Trophy } from 'lucide-react';

const fmtRange = tier =>
  tier.max_quantity === null || tier.max_quantity === undefined
    ? `${tier.min_quantity} 件以上`
    : `${tier.min_quantity}–${tier.max_quantity} 件`;

/**
 * 任務本月的階梯式分潤級距與升級進度。
 * tier：GET /koc/analytics/getDetail 回傳的 commission_tier
 */
export default function TierProgressCard({ tier }) {
  if (!tier) return null;

  const [year, month] = tier.month.split('-');
  const current = tier.tiers[tier.tier_index];
  const next = tier.next_tier;

  // 進度條：目前級距的起點到下一級起點之間走了多少
  const progress = next
    ? Math.min(
        100,
        Math.max(
          0,
          ((tier.quantity - (current.min_quantity - 1)) /
            (next.min_quantity - (current.min_quantity - 1))) * 100
        )
      )
    : 100;

  return (
    <div className="mt-6 xl:mt-8 w-full bg-white border border-[#E2DDD4] rounded-xl xl:rounded-2xl p-4 xl:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[#1A1A18] font-black text-base xl:text-lg flex items-center gap-2">
            <TrendingUp size={18} className="text-[#C8522A]" />
            本月分潤級距
          </p>
          <p className="text-[11px] xl:text-xs text-[#8C8880] mt-1">
            {Number(year)} 年 {Number(month)} 月・這個任務本月已售出{' '}
            <span className="font-black text-[#1A1A18]">{tier.quantity}</span> 件活動商品
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] xl:text-xs font-bold text-[#8C8880]">{tier.tier_name}</div>
          <div className="text-2xl xl:text-3xl font-black text-[#C8522A]">{tier.rate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {tier.tiers.map((item, index) => {
          const active = index === tier.tier_index;
          return (
            <div
              key={item.name}
              className={`rounded-lg xl:rounded-xl border px-2 py-2 text-center transition-colors ${
                active
                  ? 'bg-[#FDF0ED] border-[#C8522A] text-[#C8522A]'
                  : 'bg-[#F8F9FA] border-[#E2DDD4] text-[#8C8880]'
              }`}
            >
              <div className="text-[11px] xl:text-xs font-bold">{item.name}</div>
              <div className={`text-sm xl:text-base font-black ${active ? '' : 'text-[#1A1A18]'}`}>{item.rate}%</div>
              <div className="text-[10px] xl:text-[11px] font-medium">{fmtRange(item)}</div>
            </div>
          );
        })}
      </div>

      <div className="h-2 bg-[#F5F0E8] rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-[#D6714E] to-[#C8522A] rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      {next ? (
        <p className="text-xs xl:text-sm font-bold text-[#1A1A18]">
          再售出 <span className="text-[#C8522A] font-black">{next.remaining}</span> 件，本月分潤升級到「{next.name}」{next.rate}%
        </p>
      ) : (
        <p className="text-xs xl:text-sm font-bold text-[#1A1A18] flex items-center gap-1.5">
          <Trophy size={14} className="text-[#B89B6A]" />
          已達最高級距，本月這個任務的分潤全部以 {tier.rate}% 計算
        </p>
      )}

      <p className="text-[10px] xl:text-[11px] text-[#8C8880] mt-3 leading-relaxed">
        達到新級距時，本月這個任務的所有分潤都會以新的分潤率重新計算。
        件數在訂單完成後才計入，退貨會扣除；每個任務、每個月獨立計算，下個月重新累計。
      </p>
    </div>
  );
}
