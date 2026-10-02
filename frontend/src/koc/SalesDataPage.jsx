import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import api from '../api/index';

export default function SalesDataPage({ product, onBack }) {
  const [chartData, setChartData] = useState([]);
  const [usageCount, setUsageCount] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!product?.KOCMission_id) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.get('/koc/analytics/getDetail', {
          params: {
            KOCMission_id: product.KOCMission_id,
            period
          }
        });
        if (res.data.success) {
          setChartData(res.data.chart_data);
          setUsageCount(res.data.usage_count);
          setTotalCommission(res.data.total_commision);
        }
      } catch (err) {
        console.error('載入銷售數據失敗', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [product, period]);

  // 計算圖表最大值（動態調整 Y 軸）
  const maxValue = Math.max(...chartData.map(d => d.y_value), 1);

  // 中間刻度（0.75 / 0.5 / 0.25）：資料是整數，最大值太小時四捨五入後
  // 容易跟上一個刻度或 0 重複，這種情況就留空，不重複顯示同一個數字
  let lastAxisValue = maxValue;
  const midAxisLabels = [0.75, 0.5, 0.25].map((fraction) => {
    const value = Math.round(maxValue * fraction);
    if (value > 0 && value < lastAxisValue) {
      lastAxisValue = value;
      return value;
    }
    return '';
  });

  return (
    <div className="max-w-5xl animate-in fade-in zoom-in-95 duration-500">
      
      <button 
        onClick={onBack} 
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回成效分析
      </button>

      <div className="mb-12 flex items-end justify-between">
        <div>
          <p className="text-[#8C8880] font-bold mb-2 uppercase text-sm tracking-widest">
            {product?.campaign_name || ''}
          </p>
          <h2 className="text-[28px] font-serif font-bold text-[#1A1A18]">銷售數據</h2>
        </div>

        {/* 週/月切換 */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
              period === 'week'
                ? 'bg-[#1A1A18] text-white'
                : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
            }`}
          >
            週
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
              period === 'month'
                ? 'bg-[#1A1A18] text-white'
                : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
            }`}
          >
            月
          </button>
        </div>
      </div>

      {/* 圖表區塊 */}
      <div className="bg-white rounded-[2.5rem] p-12 border border-[#E2DDD4] shadow-sm mb-12">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-3.5 h-3.5 bg-[#C8522A] rounded-full shadow-[0_0_10px_rgba(200,82,42,0.4)]"></div>
          <span className="text-sm font-black text-[#1A1A18] tracking-wider uppercase">銷量</span>
        </div>

        {loading ? (
          <div className="h-80 flex items-center justify-center text-[#8C8880] font-bold">
            載入中...
          </div>
        ) : (
          <div className="h-80 w-full flex items-end gap-3 border-l-2 border-b-2 border-[#E2DDD4] relative pt-10 overflow-x-auto">
            {/* 左側數值 */}
            <div className="absolute -left-10 top-0 h-full flex flex-col justify-between py-1 text-[11px] text-[#8C8880] font-bold">
              <span>{maxValue}</span>
              <span>{midAxisLabels[0]}</span>
              <span>{midAxisLabels[1]}</span>
              <span>{midAxisLabels[2]}</span>
              <span className="translate-y-2">0</span>
            </div>

            {chartData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group min-w-[24px]">
                <div
                  className="w-3 bg-gradient-to-t from-[#D6714E] to-[#C8522A] rounded-t-full transition-all group-hover:from-[#A64220] group-hover:scale-x-125"
                  style={{ height: `${maxValue > 0 ? (item.y_value / maxValue) * 100 : 0}%` }}
                />
                <span className="text-[10px] text-[#8C8880] mt-4 font-bold rotate-45 origin-left whitespace-nowrap">
                  {item.x_label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 數據統計 */}
      <div className="bg-[#F5F0E8] rounded-3xl p-8 inline-flex flex-col gap-4 border border-[#E2DDD4] shadow-sm">
        <p className="text-[#1A1A18] font-black text-xl flex items-center gap-4">
          <span className="w-2 h-8 bg-[#1A1A18] rounded-full"></span>
          目前累積總銷售數量：<span className="text-[#C8522A]">{usageCount}</span>
        </p>
        <p className="text-[#1A1A18] font-black text-xl flex items-center gap-4">
          <span className="w-2 h-8 bg-[#1A1A18] rounded-full"></span>
          累積分潤：<span className="text-[#C8522A]">NT$ {totalCommission.toLocaleString()}</span>
        </p>
      </div>
    </div>
  );
}