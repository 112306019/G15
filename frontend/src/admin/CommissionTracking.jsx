import React, { useMemo, useState } from 'react';
import { ChevronDown, Search, Ticket } from 'lucide-react';

const EARNINGS_STATUS_LABELS = {
  pending: '待結算',
  withdrawable: '可提領',
  transferred: '已分潤',
  cancelled: '已取消（退款）',
};
const EARNINGS_STATUS_STYLES = {
  pending: 'bg-[#E2DDD4] text-[#8C8880]',
  withdrawable: 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/30',
  transferred: 'bg-[#F5F0E8] text-[#B89B6A] border-[#B89B6A]/30',
  cancelled: 'bg-white text-[#8C8880] border-[#E2DDD4]',
};

// 訂單編號是 36 字元的 UUID，只顯示前 8 碼，滑鼠移上去可看完整編號
const shortOrderId = id => (id ? id.slice(0, 8).toUpperCase() : '-');
const fmtOrderDate = value =>
  value ? new Date(value).toLocaleDateString('zh-TW') : '-';
const fmtMoney = n => `NT$ ${Math.round(Number(n || 0)).toLocaleString()}`;

// 已取消（退款）的分潤與訂單金額不算進小計
const summarize = items => {
  const active = items.filter(item => item.status !== 'cancelled');
  return {
    orders: active.length,
    cancelled: items.length - active.length,
    orderTotal: active.reduce((sum, item) => sum + Number(item.order_total || 0), 0),
    commission: active.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  };
};

// 逐筆分潤 → KOC → 任務（一組推薦碼對應一個任務），依有效分潤由高到低排序
const groupTracking = tracking => {
  const kocMap = new Map();
  tracking.forEach(item => {
    const kocKey = item.koc_user_id ?? item.koc_name ?? 'unknown';
    if (!kocMap.has(kocKey)) {
      kocMap.set(kocKey, { key: kocKey, name: item.koc_name || '未知 KOC', missions: new Map() });
    }
    const koc = kocMap.get(kocKey);
    const missionKey = item.kocmission_id ?? item.promotion_code;
    if (!koc.missions.has(missionKey)) {
      koc.missions.set(missionKey, {
        key: missionKey,
        campaignName: item.campaign_name || '未知活動',
        vendorName: item.vendor_name || '',
        promotionCode: item.promotion_code,
        items: [],
      });
    }
    koc.missions.get(missionKey).items.push(item);
  });

  return Array.from(kocMap.values())
    .map(koc => {
      const missions = Array.from(koc.missions.values())
        .map(mission => ({
          ...mission,
          items: [...mission.items].sort(
            (a, b) => new Date(b.order_created_at) - new Date(a.order_created_at)
          ),
          summary: summarize(mission.items),
        }))
        .sort((a, b) => b.summary.commission - a.summary.commission);
      return {
        ...koc,
        missions,
        summary: summarize(missions.flatMap(mission => mission.items)),
      };
    })
    .sort((a, b) => b.summary.commission - a.summary.commission);
};

function CommissionAmount({ item }) {
  const cancelled = item.status === 'cancelled';
  const adjusted = !cancelled && item.original_amount !== item.amount;
  return (
    <div className="text-right">
      <div className={`font-black text-sm ${cancelled ? 'text-[#8C8880] line-through' : 'text-[#1A1A18]'}`}>
        {fmtMoney(item.amount)}
      </div>
      {adjusted && (
        <div className="text-[10px] font-bold text-[#8C8880] mt-0.5">
          原 {fmtMoney(item.original_amount)}（部分退款）
        </div>
      )}
    </div>
  );
}

function SummaryFigures({ summary }) {
  return (
    <div className="flex items-center gap-4 sm:gap-6 text-right shrink-0">
      <div>
        <div className="text-[10px] font-bold text-[#8C8880]">訂單金額</div>
        <div className="text-sm font-bold text-[#1A1A18]">{fmtMoney(summary.orderTotal)}</div>
      </div>
      <div>
        <div className="text-[10px] font-bold text-[#8C8880]">分潤</div>
        <div className="text-sm font-black text-[#C8522A]">{fmtMoney(summary.commission)}</div>
      </div>
    </div>
  );
}

function OrderRows({ items }) {
  return (
    <div className="divide-y divide-[#E2DDD4]/70 border-t border-[#E2DDD4]/70">
      {items.map((item, idx) => (
        <div
          key={`${item.order_id}-${idx}`}
          className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.2fr_1fr_1fr_auto] gap-x-4 gap-y-1 items-center px-4 py-3 text-xs"
        >
          <div>
            <div className="font-mono font-bold text-[#1A1A18]" title={item.order_id}>
              {shortOrderId(item.order_id)}
            </div>
            <div className="text-[11px] text-[#8C8880]">{fmtOrderDate(item.order_created_at)}</div>
          </div>
          <div className="hidden sm:block text-[#1A1A18] font-bold">{fmtMoney(item.order_total)}</div>
          <div className="hidden sm:block">
            <span className={`inline-block whitespace-nowrap text-[10px] font-bold px-2 py-1 rounded-md border ${
              EARNINGS_STATUS_STYLES[item.status] || 'bg-[#E2DDD4] text-[#8C8880]'
            }`}>
              {EARNINGS_STATUS_LABELS[item.status] || item.status}
            </span>
          </div>
          <CommissionAmount item={item} />
          {/* 手機版：訂單金額與狀態放到第二行 */}
          <div className="sm:hidden col-span-2 flex items-center justify-between text-[11px]">
            <span className="text-[#8C8880]">訂單 {fmtMoney(item.order_total)}</span>
            <span className={`inline-block whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              EARNINGS_STATUS_STYLES[item.status] || 'bg-[#E2DDD4] text-[#8C8880]'
            }`}>
              {EARNINGS_STATUS_LABELS[item.status] || item.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommissionTracking({ tracking, loading, error }) {
  const [search, setSearch] = useState('');
  const [openKocs, setOpenKocs] = useState(() => new Set());
  const [openMissions, setOpenMissions] = useState(() => new Set());

  const keyword = search.trim().toLowerCase();
  const filteredTracking = useMemo(() => {
    if (!keyword) return tracking;
    return tracking.filter(item =>
      [item.koc_name, item.promotion_code, item.campaign_name, item.vendor_name]
        .some(value => value && value.toLowerCase().includes(keyword))
    );
  }, [tracking, keyword]);

  const groups = useMemo(() => groupTracking(filteredTracking), [filteredTracking]);
  const overall = useMemo(() => summarize(filteredTracking), [filteredTracking]);

  const toggle = (setter, key) =>
    setter(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      <div className="p-4 sm:p-5 border-b border-[#E2DDD4] bg-[#F8F9FA] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm font-bold text-[#8C8880]">追蹤由推薦碼 (Promotion Code) 帶來的實際轉換訂單</p>
          <p className="text-[11px] text-[#8C8880] mt-1">
            依 KOC → 任務分組，點開可看逐筆訂單；已取消（退款）的分潤不算進小計。
          </p>
        </div>
        <div className="relative md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8880]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋 KOC、推薦碼、活動或廠商..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-xs md:text-sm outline-none focus:border-[#C8522A] focus:ring-2 focus:ring-[#C8522A]/10 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm font-bold text-[#8C8880]">載入中...</div>
      ) : error ? (
        <div className="p-10 text-center text-sm font-bold text-red-500">{error}</div>
      ) : groups.length === 0 ? (
        <div className="p-10 text-center text-sm font-bold text-[#8C8880]">
          {keyword ? '沒有符合搜尋條件的資料' : '目前沒有分潤追蹤資料'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 divide-x divide-[#E2DDD4] border-b border-[#E2DDD4] text-center">
            {[
              { label: 'KOC', value: groups.length.toLocaleString() },
              { label: '有效訂單', value: overall.orders.toLocaleString() },
              { label: '有效分潤總額', value: fmtMoney(overall.commission) },
            ].map(stat => (
              <div key={stat.label} className="py-3 sm:py-4">
                <div className="text-[10px] sm:text-xs font-bold text-[#8C8880]">{stat.label}</div>
                <div className="text-base sm:text-xl font-black text-[#1A1A18] mt-0.5">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="divide-y divide-[#E2DDD4]">
            {groups.map(koc => {
              const kocOpen = openKocs.has(koc.key);
              return (
                <div key={koc.key}>
                  <button
                    type="button"
                    onClick={() => toggle(setOpenKocs, koc.key)}
                    className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 hover:bg-[#F8F9FA] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-[#8C8880] transition-transform ${kocOpen ? '' : '-rotate-90'}`}
                      />
                      <div className="w-8 h-8 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center text-xs font-bold shrink-0">
                        {koc.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-[#1A1A18] truncate">{koc.name}</div>
                        <div className="text-[11px] text-[#8C8880]">
                          {koc.missions.length} 個任務・{koc.summary.orders} 筆訂單
                          {koc.summary.cancelled > 0 && `・已取消 ${koc.summary.cancelled} 筆`}
                        </div>
                      </div>
                    </div>
                    <SummaryFigures summary={koc.summary} />
                  </button>

                  {kocOpen && (
                    <div className="bg-[#F8F9FA] px-3 sm:px-6 pb-4 space-y-2.5">
                      {koc.missions.map(mission => {
                        const missionKey = `${koc.key}-${mission.key}`;
                        const missionOpen = openMissions.has(missionKey);
                        return (
                          <div key={missionKey} className="bg-white border border-[#E2DDD4] rounded-xl overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggle(setOpenMissions, missionKey)}
                              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#F5F0E8]/40 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ChevronDown
                                  size={14}
                                  className={`shrink-0 text-[#8C8880] transition-transform ${missionOpen ? '' : '-rotate-90'}`}
                                />
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-sm font-bold text-[#1A1A18] truncate">
                                    {mission.campaignName}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#8C8880]">
                                    {mission.vendorName && <span>{mission.vendorName}</span>}
                                    <span className="inline-flex items-center gap-1 font-mono font-bold text-[#C8522A]">
                                      <Ticket size={11} /> {mission.promotionCode}
                                    </span>
                                    <span>{mission.summary.orders} 筆訂單</span>
                                  </div>
                                </div>
                              </div>
                              <SummaryFigures summary={mission.summary} />
                            </button>
                            {missionOpen && <OrderRows items={mission.items} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
