import React from 'react';
import { TrendingUp, Trophy } from 'lucide-react';
import { tierRangeText } from '../commissionText';

const fmtRange = tier =>
  tier.max_quantity === null || tier.max_quantity === undefined
    ? `${tier.min_quantity} 件以上`
    : `${tier.min_quantity}–${tier.max_quantity} 件`;

// 各種分潤方式的標題與底部說明
const MODE_TEXT = {
  platform_tier: {
    title: '本月分潤級距',
    note:
      '每筆分潤會在成立當下依那一刻的累計件數直接定案；件數跨級距只影響之後新成立的' +
      '分潤，不會回頭調整已經成立的分潤金額。' +
      '件數在訂單完成後才計入，退貨會扣除；每個任務、每個月獨立計算，下個月重新累計。',
  },
  progressive: {
    title: '本月階層式分潤',
    note:
      '累進計算：每一段件數各用各的分潤比例，進入下一層後只有新售出的件數適用較高的比例，前面的不會回頭調整。' +
      '件數在訂單完成後才計入；當月退貨會扣除件數，後面的訂單往前遞補。每個任務、每個月獨立計算，下個月從第 1 件重新開始。',
  },
  fixed: {
    title: '本月分潤',
    note: '這個活動採固定分潤，每筆訂單都用同一個分潤比例。件數在訂單完成後才計入，退貨會扣除。',
  },
};

/**
 * 任務本月的分潤方式與進度。
 * tier：GET /koc/analytics/getDetail 回傳的 commission_tier
 *   mode：platform_tier（舊活動：平台級距、整月套用）、progressive（廠商自訂、階層式累進）、fixed（廠商自訂、固定）
 */
export default function TierProgressCard({ tier }) {
  if (!tier) return null;

  const mode = MODE_TEXT[tier.mode] ? tier.mode : 'platform_tier';
  const text = MODE_TEXT[mode];
  const [year, month] = tier.month.split('-');
  const current = tier.tiers[tier.tier_index];
  const next = tier.next_tier;
  const monthAmount = Number(tier.month_amount || 0);

  // 進度條：目前這一層的起點到下一層起點之間走了多少
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
            {text.title}
          </p>
          <p className="text-[11px] xl:text-xs text-[#8C8880] mt-1">
            {Number(year)} 年 {Number(month)} 月・這個任務本月已售出{' '}
            <span className="font-black text-[#1A1A18]">{tier.quantity}</span> 件活動商品
            {mode !== 'platform_tier' && (
              <>
                ・本月分潤{' '}
                <span className="font-black text-[#1A1A18]">NT$ {monthAmount.toLocaleString()}</span>
              </>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] xl:text-xs font-bold text-[#8C8880]">
            {mode === 'progressive' ? '目前這一層' : tier.tier_name}
          </div>
          <div className="text-2xl xl:text-3xl font-black text-[#C8522A]">{tier.rate}%</div>
        </div>
      </div>

      {/* 固定分潤只有一個比例，不用列級距與進度條 */}
      {mode !== 'fixed' && (
        <>
          <div
            className="grid gap-2 mb-4"
            style={{ gridTemplateColumns: `repeat(${tier.tiers.length}, minmax(0, 1fr))` }}
          >
            {tier.tiers.map((item, index) => {
              const active = index === tier.tier_index;
              // 累進制：已經走過的層也有分潤在算，用淡色標出來
              const passed = mode === 'progressive' && index < tier.tier_index;
              return (
                <div
                  key={item.name}
                  className={`rounded-lg xl:rounded-xl border px-2 py-2 text-center transition-colors ${
                    active
                      ? 'bg-[#FDF0ED] border-[#C8522A] text-[#C8522A]'
                      : passed
                        ? 'bg-[#FDF0ED]/50 border-[#E2DDD4] text-[#8C8880]'
                        : 'bg-[#F8F9FA] border-[#E2DDD4] text-[#8C8880]'
                  }`}
                >
                  <div className="text-[11px] xl:text-xs font-bold">{item.name}</div>
                  <div className={`text-sm xl:text-base font-black ${active ? '' : 'text-[#1A1A18]'}`}>{item.rate}%</div>
                  <div className="text-[10px] xl:text-[11px] font-medium">
                    {mode === 'progressive' ? tierRangeText(item) : fmtRange(item)}
                  </div>
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
              再售出 <span className="text-[#C8522A] font-black">{next.remaining}</span> 件，
              {mode === 'progressive'
                ? `之後售出的每一件改以 ${next.rate}% 計算`
                : `之後新成立的分潤升級到「${next.name}」${next.rate}%`}
            </p>
          ) : (
            <p className="text-xs xl:text-sm font-bold text-[#1A1A18] flex items-center gap-1.5">
              <Trophy size={14} className="text-[#B89B6A]" />
              {mode === 'progressive'
                ? `已進入最高一層，之後售出的每一件都以 ${tier.rate}% 計算`
                : `已達最高級距，之後這個任務的分潤都會以 ${tier.rate}% 計算`}
            </p>
          )}
        </>
      )}

      <p className="text-[10px] xl:text-[11px] text-[#8C8880] mt-3 leading-relaxed">{text.note}</p>
    </div>
  );
}
