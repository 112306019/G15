import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import api from '../api/index';

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_BADGE = {
  pending: { label: '撥款處理中', cls: 'bg-[#FFF8E7] text-[#9A6700]' },
  completed: { label: '已撥款', cls: 'bg-green-50 text-green-700' },
  failed: { label: '撥款失敗', cls: 'bg-red-50 text-red-600' },
};

function PayoutRow({ payout }) {
  const badge = STATUS_BADGE[payout.status] || { label: payout.status, cls: 'bg-[#F5F0E8] text-[#8C8880]' };

  return (
    <div className="grid grid-cols-5 px-8 py-5 items-center text-sm border-b border-[#E2DDD4] last:border-0 hover:bg-[#F8F9FA] transition-colors">
      <div className="font-black text-[#C8522A]">NT$ {(payout.amount || 0).toLocaleString()}</div>
      <div className="text-[#8C8880] font-medium">NT$ {(payout.platform_fee || 0).toLocaleString()}</div>
      <div className={payout.invoice_number ? 'font-mono font-bold text-[#1A1A18]' : 'text-[#8C8880] font-medium'}>
        {payout.invoice_number ? (
          <span className={payout.invoice_voided_at ? 'line-through text-[#8C8880]' : ''}>{payout.invoice_number}</span>
        ) : '尚未開立'}
        {payout.invoice_voided_at && (
          <span className="ml-1.5 text-[10px] font-bold text-[#C8522A]">已作廢</span>
        )}
        {payout.invoice_number && payout.random_number && !payout.invoice_voided_at && (
          <span className="block text-[10px] font-mono font-medium text-[#8C8880] mt-0.5">
            隨機碼 {payout.random_number}
          </span>
        )}
      </div>
      <div>
        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>
      <div className="text-[#8C8880] font-medium">{formatDateTime(payout.payout_date)}</div>
    </div>
  );
}

export default function PayoutRecordsPage({ onBack }) {
  const user_id = localStorage.getItem('userId');
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState([]);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const res = await api.get('/koc/revenue/getPayoutRecords', {
          params: { user_id },
        });
        if (res.data.success) {
          setPayouts(res.data.payouts || []);
        }
      } catch (err) {
        console.error('載入撥款紀錄失敗', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [user_id]);

  return (
    <div className="max-w-5xl animate-in fade-in duration-500 p-4 md:p-0 mx-auto">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回我的收益
      </button>

      <h2 className="text-[28px] font-serif font-bold mb-4 text-[#1A1A18]">撥款紀錄</h2>
      <p className="text-xs font-bold text-[#8C8880] mb-10">
        ※ 平台服務費會就此筆金額開立統一發票給您，作為申報個人所得稅時可列報的成本費用憑證；發票開立後會另外寄信通知，號碼也會顯示在下面。
      </p>

      {loading ? (
        <div className="py-16 text-center text-[#8C8880] font-bold">載入中...</div>
      ) : (
        <div className="w-full bg-white rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
          <div className="grid grid-cols-5 px-8 py-4 bg-[#F8F9FA] border-b border-[#E2DDD4] text-[#8C8880] text-sm font-bold">
            <span>實付金額</span>
            <span>平台服務費</span>
            <span>發票號碼</span>
            <span>狀態</span>
            <span>申請日期</span>
          </div>
          {payouts.length === 0 ? (
            <div className="py-16 text-center text-[#8C8880] font-bold">目前沒有撥款紀錄</div>
          ) : (
            payouts.map((payout) => <PayoutRow key={payout.payout_id} payout={payout} />)
          )}
        </div>
      )}
    </div>
  );
}
