import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { getAdminSiteTraffic } from '../api/platform';
import { getErrorMessage } from '../errorMessage';

const RANGE_OPTIONS = [
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: 'year', label: '今年度' },
];

// 兩條線的顏色已用 dataviz 驗證工具檢查過（色盲可分辨、對淺色背景對比足夠）
const SERIES = [
  { key: 'page_views', label: '瀏覽量', color: '#C8522A' },
  { key: 'visitors', label: '訪客數', color: '#2A72B5' },
];

const fmtNumber = n => Number(n || 0).toLocaleString();
// 2026-10-03 → 10/03
const fmtDate = value => value.slice(5).replace('-', '/');

function TrafficTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E2DDD4] rounded-xl shadow-lg px-3 py-2 text-xs">
      <div className="font-bold text-[#1A1A18] mb-1">{label}</div>
      {SERIES.map(series => {
        const item = payload.find(p => p.dataKey === series.key);
        return (
          <div key={series.key} className="flex items-center gap-2 text-[#8C8880]">
            <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: series.color }} />
            <span>{series.label}</span>
            <span className="ml-auto font-bold text-[#1A1A18]">{fmtNumber(item?.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function SiteTrafficChart() {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await getAdminSiteTraffic(range);
        if (cancelled) return;
        setData(response.data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, '網站流量載入失敗'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const daily = data?.daily || [];
  const hasTraffic = daily.some(day => day.page_views || day.visitors);

  return (
    <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-[1.5rem] shadow-sm border border-[#E2DDD4] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1A1A18]">網站流量趨勢</h2>
          <p className="text-[11px] text-[#8C8880] mt-1">資料來源：Google Analytics，可能有數小時延遲</p>
        </div>
        <select
          value={range}
          onChange={e => setRange(e.target.value)}
          className="w-full sm:w-auto text-xs sm:text-sm font-bold border-[#E2DDD4] rounded-xl border px-3 sm:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#C8522A]/20 cursor-pointer bg-[#F8F9FA] text-[#1A1A18]"
        >
          {RANGE_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-[#8C8880] min-h-[250px] sm:min-h-[350px]">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-bold">讀取中...</span>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center gap-2 text-[#C8522A] min-h-[250px] sm:min-h-[350px]">
          <AlertCircle size={18} />
          <span className="text-sm font-bold">{error}</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {SERIES.map(series => (
              <div key={series.key} className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-3 sm:p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#8C8880] mb-1">
                  <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: series.color }} />
                  {series.key === 'visitors' ? '不重複訪客' : '總瀏覽量'}
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#1A1A18]">
                  {fmtNumber(data?.totals?.[series.key])}
                </div>
              </div>
            ))}
          </div>

          {!hasTraffic ? (
            <div className="flex-1 bg-[#F8F9FA] rounded-[1rem] border border-dashed border-[#E2DDD4] flex flex-col items-center justify-center min-h-[220px]">
              <TrendingUp size={36} className="text-[#E2DDD4] mb-3" />
              <p className="text-[#8C8880] text-xs sm:text-sm font-bold">這段期間還沒有流量資料</p>
            </div>
          ) : showTable ? (
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-[#E2DDD4] text-xs font-bold text-[#8C8880]">
                    <th className="pb-2 pr-4">日期</th>
                    {SERIES.map(series => (
                      <th key={series.key} className="pb-2 pl-4 text-right">{series.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DDD4]">
                  {daily.map(day => (
                    <tr key={day.date}>
                      <td className="py-2 pr-4 font-bold text-[#1A1A18]">{day.date}</td>
                      {SERIES.map(series => (
                        <td key={series.key} className="py-2 pl-4 text-right font-bold">
                          {fmtNumber(day[series.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 min-h-[220px] sm:min-h-[280px]">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#E2DDD4" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDate}
                    tick={{ fontSize: 11, fill: '#8C8880', fontWeight: 'bold' }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#8C8880' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    content={<TrafficTooltip />}
                    cursor={{ stroke: '#8C8880', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  {SERIES.map(series => (
                    <Line
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {hasTraffic && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <div className="flex items-center gap-4 text-xs font-bold text-[#8C8880]">
                {SERIES.map(series => (
                  <span key={series.key} className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 rounded-full" style={{ backgroundColor: series.color }} />
                    {series.label}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowTable(value => !value)}
                className="text-xs font-bold text-[#C8522A] hover:underline"
              >
                {showTable ? '顯示圖表' : '顯示表格'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
