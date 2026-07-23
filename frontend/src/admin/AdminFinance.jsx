import React, { useState } from 'react';
import { 
  Search, Filter, CreditCard, DollarSign, Wallet, 
  ArrowUpRight, ArrowDownRight, CheckCircle, Clock 
} from 'lucide-react';

export default function AdminFinance() {
  const [activeTab, setActiveTab] = useState('payments');

  // 1. 消費者訂單與付款 (對應 GET /admin/payments)
  const [payments] = useState([
    { orderId: 'ORD-260714-001', userId: 'U10045', amount: 2500, paymentMethod: '信用卡 (Credit)', paymentStatus: 'paid', orderStatus: '已完成', date: '2026-07-14 10:30' },
    { orderId: 'ORD-260601-088', userId: 'U10046', amount: 4200, paymentMethod: 'Line Pay', paymentStatus: 'pending', orderStatus: '處理中', date: '2026-06-01 14:20' },
  ]);

  // 2. KOC 收益與撥款 (對應 GET /admin/earnings)
  const [earnings] = useState([
    { earningId: 'EARN-9901', influencerId: 'U0089', kocMissionId: 'KM-0988', amount: 3500, status: '已撥款', payoutDate: '2026-07-05' },
    { earningId: 'EARN-9902', influencerId: 'U0090', kocMissionId: 'KM-1029', amount: 5000, status: '待結算', payoutDate: null },
  ]);

  // 3. 廠商交易與錢包紀錄 (對應 GET /admin/transactions)
  const [transactions] = useState([
    { transactionId: 'TX-5501', walletId: 'W-98765432', type: '退款 (Refund)', amount: 1500, referenceId: 'ORD-260511-002', date: '2026-07-10' },
    { transactionId: 'TX-5502', walletId: 'W-12345678', type: '任務預扣 (Deduct)', amount: -50000, referenceId: 'C1001', date: '2026-06-01' },
    { transactionId: 'TX-5503', walletId: 'W-98765432', type: '儲值 (Top-up)', amount: 100000, referenceId: 'BANK-0991', date: '2026-01-15' },
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* 🟢 頂部標題 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#1A1A18] tracking-tight">訂單與財務金流</h1>
          <p className="text-[#8C8880] mt-2 font-medium">檢視全站訂單、KOC 撥款進度與廠商錢包交易紀錄。</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8880]" />
            <input type="text" placeholder="搜尋訂單或交易編號..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-sm outline-none focus:border-[#C8522A] shadow-sm" />
          </div>
          <button className="flex items-center justify-center w-10 h-10 bg-white border border-[#E2DDD4] rounded-xl text-[#1A1A18] hover:bg-[#F8F9FA] transition-all shadow-sm">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* 🟢 頁籤切換區 */}
      <div className="flex gap-4 border-b border-[#E2DDD4] pb-px overflow-x-auto">
        <button 
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'payments' ? 'border-[#C8522A] text-[#C8522A]' : 'border-transparent text-[#8C8880] hover:text-[#1A1A18]'
          }`}
        >
          <CreditCard size={18} /> 消費者訂單與付款
        </button>
        <button 
          onClick={() => setActiveTab('earnings')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'earnings' ? 'border-[#C8522A] text-[#C8522A]' : 'border-transparent text-[#8C8880] hover:text-[#1A1A18]'
          }`}
        >
          <DollarSign size={18} /> KOC 收益與撥款
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'transactions' ? 'border-[#C8522A] text-[#C8522A]' : 'border-transparent text-[#8C8880] hover:text-[#1A1A18]'
          }`}
        >
          <Wallet size={18} /> 廠商交易與錢包
        </button>
      </div>

      {/* 🟢 表格顯示區塊 */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
        <div className="overflow-x-auto">
          
          {/* TAB 1: 訂單與付款 */}
          {activeTab === 'payments' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">訂單編號 / 時間</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">消費者 ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">訂單總金額</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">付款方式</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">付款狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {payments.map((pay, idx) => (
                  <tr key={idx} className="hover:bg-[#FDF0ED]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#1A1A18] text-sm">{pay.orderId}</div>
                      <div className="text-xs text-[#8C8880] mt-1">{pay.date}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#8C8880]">{pay.userId}</td>
                    <td className="px-6 py-4 font-black text-[#1A1A18] text-sm">NT$ {pay.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[#1A1A18]">{pay.paymentMethod}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md border tracking-widest uppercase ${
                        pay.paymentStatus === 'paid' ? 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20' : 'bg-[#F8F9FA] text-[#8C8880] border-[#E2DDD4]'
                      }`}>
                        {pay.paymentStatus === 'paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {pay.paymentStatus === 'paid' ? '已付款' : '未付款'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 2: KOC 收益與撥款 */}
          {activeTab === 'earnings' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">收益編號 / 任務 ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">KOC 用戶 ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">分潤金額</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">撥款日期</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">收益狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {earnings.map((earn, idx) => (
                  <tr key={idx} className="hover:bg-[#FDF0ED]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#1A1A18] text-sm">{earn.earningId}</div>
                      <div className="text-xs font-bold text-[#B89B6A] mt-1">{earn.kocMissionId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#8C8880]">{earn.influencerId}</td>
                    <td className="px-6 py-4 font-black text-[#1A1A18] text-sm">NT$ {earn.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[#1A1A18]">{earn.payoutDate || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md border tracking-widest uppercase ${
                        earn.status === '已撥款' ? 'bg-white border-[#E2DDD4] text-[#1A1A18]' : 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20'
                      }`}>
                        {earn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 3: 廠商交易與錢包 */}
          {activeTab === 'transactions' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">交易編號 / 錢包 ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">交易類型</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">交易金額</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">參照編號 (Reference ID)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">交易日期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {transactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-[#FDF0ED]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#1A1A18] text-sm">{tx.transactionId}</div>
                      <div className="text-xs text-[#8C8880] mt-1">{tx.walletId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-[#1A1A18] bg-white border border-[#E2DDD4] px-2 py-1 rounded-md">
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-black text-sm flex items-center gap-1 ${tx.amount > 0 ? 'text-[#B89B6A]' : 'text-[#C8522A]'}`}>
                        {tx.amount > 0 ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#8C8880]">{tx.referenceId}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[#1A1A18]">{tx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </div>
      </div>
    </div>
  );
}