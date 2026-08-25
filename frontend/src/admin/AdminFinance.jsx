import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import {
  Search, Filter, CreditCard, DollarSign, Wallet,
  ArrowUpRight, ArrowDownRight, CheckCircle, Clock, Landmark, XCircle, ShieldAlert
} from 'lucide-react';

export default function AdminFinance() {
  const [activeTab, setActiveTab] = useState('payments');
  const [payments, setPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [settleableCampaigns, setSettleableCampaigns] = useState([]);
  const [settlingId, setSettlingId] = useState(null);

  const [settleableVendors, setSettleableVendors] = useState([]);
  const [settlingVendorId, setSettlingVendorId] = useState(null);
  const [vendorPayouts, setVendorPayouts] = useState([]);
  const [confirmingPayoutId, setConfirmingPayoutId] = useState(null);

  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("admin_token");
  const adminId = localStorage.getItem("admin_id");

  const fetchEarningsData = async () => {
    try {
      const earnRes = await fetch(`${API_BASE_URL}/api/platform/earnings?Admin_id=${adminId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const earnData = await earnRes.json();
      if (Array.isArray(earnData)) {
        setEarnings(earnData.map((e) => ({
          earningId: e.Earnings_id,
          kocMissionId: e.KOCMission_id,
          influencerId: e.Influencer_name || e.Influencer_id,
          campaignName: e.Campaign_name,
          amount: e.amount,
          payoutDate: e.status === 'transferred' && e.created_at
            ? new Date(e.created_at).toLocaleDateString("zh-TW")
            : null,
          status: e.status === 'transferred' ? '已撥款'
            : e.status === 'withdrawable' ? '可提領'
              : '待定',
        })));
      }

      const settleRes = await fetch(`${API_BASE_URL}/api/platform/campaigns/settleable?Admin_id=${adminId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const settleData = await settleRes.json();
      if (Array.isArray(settleData)) {
        setSettleableCampaigns(settleData.map((c) => ({
          campaignId: c.Campaign_id,
          campaignName: c.Campaign_name,
          vendorName: c.Vendor_name,
          eligibleAt: c.Settlement_eligible_at,
          isEligible: c.Is_eligible,
          pendingCount: c.Pending_count,
          pendingAmount: c.Pending_amount,
        })));
      }
    } catch (err) {
      console.error("收益資料載入失敗", err);
    }
  };

  const handleSettle = async (campaignId) => {
    if (!adminId) {
      alert("找不到管理員登入資訊，請重新登入後再試一次");
      return;
    }

    if (!window.confirm("確定要結算這個活動的所有可提領分潤，並匯入 KOC 錢包嗎？")) {
      return;
    }

    setSettlingId(campaignId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/campaign/settle-earnings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ Campaign_id: campaignId, Admin_id: adminId }),
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        alert(data.err || "結算失敗，請稍後再試");
        return;
      }

      alert(`已結算 ${data.settled_count} 筆分潤，共 NT$ ${data.total_amount?.toLocaleString?.() ?? data.total_amount}`);
      fetchEarningsData();
    } catch (err) {
      console.error("結算失敗", err);
      alert("結算失敗，請稍後再試");
    } finally {
      setSettlingId(null);
    }
  };

  const fetchVendorFinanceData = async () => {
    try {
      const [settleRes, payoutRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/platform/vendors/settleable?Admin_id=${adminId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/platform/vendor/payouts?status=pending&Admin_id=${adminId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const settleData = await settleRes.json();
      if (Array.isArray(settleData)) {
        setSettleableVendors(settleData.map((v) => ({
          vendorId: v.Vendor_id,
          vendorName: v.Vendor_name,
          eligibleCount: v.Eligible_count,
          eligibleAmount: v.Eligible_amount,
          notYetEligibleCount: v.Not_yet_eligible_count,
          notYetEligibleAmount: v.Not_yet_eligible_amount,
          earliestEligibleAt: v.Earliest_eligible_at,
        })));
      }

      const payoutData = await payoutRes.json();
      if (Array.isArray(payoutData)) {
        setVendorPayouts(payoutData.map((p) => ({
          payoutId: p.Payout_id,
          vendorId: p.Vendor_id,
          vendorName: p.Vendor_name,
          bankDisplay: p.Bank_display,
          amount: p.Amount,
          payoutDate: p.Payout_date,
          status: p.Status,
        })));
      }
    } catch (err) {
      console.error("廠商金流資料載入失敗", err);
    }
  };

  const handleSettleVendor = async (vendorId) => {
    if (!adminId) {
      alert("找不到管理員登入資訊，請重新登入後再試一次");
      return;
    }

    if (!window.confirm("確定要把這個廠商已過鑑賞期的凍結餘額，結算成可提領餘額嗎？")) {
      return;
    }

    setSettlingVendorId(vendorId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/vendor/settle-earnings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendor_id: vendorId, Admin_id: adminId }),
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        alert(data.err || "結算失敗，請稍後再試");
        return;
      }

      alert(`已結算 ${data.settled_count} 筆，共 NT$ ${data.total_amount?.toLocaleString?.() ?? data.total_amount}`);
      await Promise.all([fetchVendorFinanceData(), fetchTransactions()]);
    } catch (err) {
      console.error("廠商結算失敗", err);
      alert("結算失敗，請稍後再試");
    } finally {
      setSettlingVendorId(null);
    }
  };

  const handleConfirmPayout = async (payoutId, newStatus) => {
    if (!adminId) {
      alert("找不到管理員登入資訊，請重新登入後再試一次");
      return;
    }

    const confirmMsg = newStatus === 'completed'
      ? "確定已經完成匯款，把這筆申請標記為完成嗎？"
      : "確定要標記這筆撥款失敗嗎？金額會退回廠商的可提領餘額。";

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setConfirmingPayoutId(payoutId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/platform/vendor/payout/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payout_id: payoutId, status: newStatus, Admin_id: adminId }),
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        alert(data.err || "處理失敗，請稍後再試");
        return;
      }

      await Promise.all([fetchVendorFinanceData(), fetchTransactions()]);
    } catch (err) {
      console.error("撥款處理失敗", err);
      alert("處理失敗，請稍後再試");
    } finally {
      setConfirmingPayoutId(null);
    }
  };

  const fetchTransactions = async () => {
    try {
      const txRes = await fetch(`${API_BASE_URL}/api/platform/transactions?Wallet_type=vendor&Admin_id=${adminId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const txData = await txRes.json();
      if (Array.isArray(txData)) {
        setTransactions(txData.map((t) => ({
          transactionId: t.Transaction_ID,
          walletType: t.Wallet_type,
          ownerName: t.Owner_name,
          type: t.Type,
          amount: t.Amount,
          grossAmount: t.Gross_amount,
          feeAmount: t.Fee_amount,
          referenceId: t.Reference_id || "-",
          date: t.created_at ? new Date(t.created_at).toLocaleDateString("zh-TW") : "-",
        })));
      }
    } catch (err) {
      console.error("交易紀錄載入失敗", err);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const payRes = await fetch(`${API_BASE_URL}/api/platform/payments?Admin_id=${adminId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payData = await payRes.json();
        if (Array.isArray(payData)) {
          setPayments(payData.map((p) => ({
            orderId: p.Order_id,
            userId: p.User_id,
            amount: parseFloat(p.total_amount) || 0,
            paymentMethod: p.payment_method || "-",
            paymentStatus: p.payment_status,
            orderStatus: p.order_status,
            date: p.created_at ? new Date(p.created_at).toLocaleString("zh-TW") : "-",
          })));
        }

        await fetchTransactions();
        await fetchEarningsData();
        await fetchVendorFinanceData();
      } catch (err) {
        console.error("財務資料載入失敗", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const adminRole = localStorage.getItem("admin_role");
  // 跟後端 Admins.role 的實際存法對齊（snake_case，例如 "super_admin"），
  // 這裡做正規化比對是為了不管前端登入頁存的是 "Super Admin" 還是
  // "super_admin"，都能跟後端判斷一致，避免「前端放行、後端 403」的錯亂。
  const normalizedAdminRole = (adminRole || '').trim().toLowerCase().replace(/\s+/g, '_');
  const FINANCE_ROLES = ['super_admin', 'finance'];

  if (adminRole && !FINANCE_ROLES.includes(normalizedAdminRole)) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center space-y-4">
        <ShieldAlert size={40} className="mx-auto text-[#C8522A]" />
        <h2 className="text-xl font-serif font-black text-[#1A1A18]">您沒有權限檢視此頁面</h2>
        <p className="text-[#8C8880] font-medium">
          財務金流頁面僅開放給「Super Admin」或「Finance」角色，您目前的角色是「{adminRole}」。
          如需存取權限，請聯繫系統管理員。
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      {/* 頂部標題 */}
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

      {/* 頁籤切換區 */}
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

      {/* 表格顯示區塊 */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
        {loading ? (
          <div className="py-20 text-center text-[#8C8880] font-bold">載入中...</div>
        ) : (
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
                  {payments.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center text-[#8C8880]">目前沒有付款資料</td></tr>
                  ) : payments.map((pay, idx) => (
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
              <>
                {settleableCampaigns.length > 0 && (
                  <div className="p-6 border-b border-[#E2DDD4] bg-[#F8F9FA] space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A18] mb-1">
                      <Landmark size={16} /> 待結算活動
                    </div>
                    {settleableCampaigns.map((c) => (
                      <div
                        key={c.campaignId}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-[#E2DDD4] rounded-2xl px-5 py-4"
                      >
                        <div>
                          <div className="text-sm font-bold text-[#1A1A18]">{c.campaignName}</div>
                          <div className="text-xs font-medium text-[#8C8880] mt-1">
                            {c.vendorName} ・ {c.pendingCount} 筆可提領分潤 ・ NT$ {c.pendingAmount?.toLocaleString?.() ?? c.pendingAmount}
                          </div>
                          {!c.isEligible && (
                            <div className="text-xs font-bold text-[#C8522A] mt-1">
                              優惠碼效期至 {new Date(c.eligibleAt).toLocaleDateString("zh-TW")} 才能結算
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleSettle(c.campaignId)}
                          disabled={!c.isEligible || settlingId === c.campaignId}
                          className="shrink-0 bg-[#1A1A18] text-[#F5F0E8] px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#C8522A] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {settlingId === c.campaignId ? '結算中...' : '結算分潤'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                      <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">收益編號 / 任務 ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">KOC</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">分潤金額</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">撥款日期</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">收益狀態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD4]">
                    {earnings.length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-[#8C8880]">目前沒有收益資料</td></tr>
                    ) : earnings.map((earn, idx) => (
                      <tr key={idx} className="hover:bg-[#FDF0ED]/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#1A1A18] text-sm">{earn.earningId}</div>
                          <div className="text-xs font-bold text-[#B89B6A] mt-1">{earn.kocMissionId}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-[#8C8880]">{earn.influencerId}</td>
                        <td className="px-6 py-4 font-black text-[#1A1A18] text-sm">NT$ {earn.amount?.toLocaleString()}</td>
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
              </>
            )}

            {/* TAB 3: 廠商交易與錢包 */}
            {activeTab === 'transactions' && (
              <>
                {settleableVendors.length > 0 && (
                  <div className="p-6 border-b border-[#E2DDD4] bg-[#F8F9FA] space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A18] mb-1">
                      <Landmark size={16} /> 待結算廠商
                    </div>
                    {settleableVendors.map((v) => (
                      <div
                        key={v.vendorId}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-[#E2DDD4] rounded-2xl px-5 py-4"
                      >
                        <div>
                          <div className="text-sm font-bold text-[#1A1A18]">{v.vendorName}</div>
                          <div className="text-xs font-medium text-[#8C8880] mt-1">
                            可結算 {v.eligibleCount} 筆 ・ NT$ {v.eligibleAmount?.toLocaleString?.() ?? v.eligibleAmount}
                            {v.notYetEligibleCount > 0 && (
                              <span className="ml-2 text-[#B89B6A]">
                                （另有 {v.notYetEligibleCount} 筆共 NT$ {v.notYetEligibleAmount?.toLocaleString?.() ?? v.notYetEligibleAmount} 還在鑑賞期內）
                              </span>
                            )}
                          </div>
                          {v.eligibleAmount === 0 && v.earliestEligibleAt && (
                            <div className="text-xs font-bold text-[#C8522A] mt-1">
                              最快 {new Date(v.earliestEligibleAt).toLocaleDateString("zh-TW")} 才有款項可結算
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleSettleVendor(v.vendorId)}
                          disabled={v.eligibleAmount === 0 || settlingVendorId === v.vendorId}
                          className="shrink-0 bg-[#1A1A18] text-[#F5F0E8] px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#C8522A] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {settlingVendorId === v.vendorId ? '結算中...' : '結算'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {vendorPayouts.length > 0 && (
                  <div className="p-6 border-b border-[#E2DDD4] bg-[#FDF0ED]/40 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#1A1A18] mb-1">
                      <Wallet size={16} /> 待處理撥款申請
                    </div>
                    {vendorPayouts.map((p) => (
                      <div
                        key={p.payoutId}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-[#E2DDD4] rounded-2xl px-5 py-4"
                      >
                        <div>
                          <div className="text-sm font-bold text-[#1A1A18]">
                            {p.vendorName} ・ NT$ {p.amount?.toLocaleString?.() ?? p.amount}
                          </div>
                          <div className="text-xs font-medium text-[#8C8880] mt-1">
                            匯款帳戶：{p.bankDisplay} ・ 申請日 {p.payoutDate}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleConfirmPayout(p.payoutId, 'failed')}
                            disabled={confirmingPayoutId === p.payoutId}
                            className="flex items-center gap-1.5 bg-white border border-[#E2DDD4] text-[#8C8880] px-5 py-2.5 rounded-full font-bold text-sm hover:text-[#C8522A] hover:border-[#C8522A] transition-all disabled:opacity-40"
                          >
                            <XCircle size={14} /> 匯款失敗
                          </button>
                          <button
                            onClick={() => handleConfirmPayout(p.payoutId, 'completed')}
                            disabled={confirmingPayoutId === p.payoutId}
                            className="flex items-center gap-1.5 bg-[#1A1A18] text-[#F5F0E8] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#C8522A] transition-all disabled:opacity-40"
                          >
                            <CheckCircle size={14} />
                            {confirmingPayoutId === p.payoutId ? '處理中...' : '標記完成'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                      <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">交易編號 / 廠商</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">交易類型</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">交易金額</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">參照編號</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">交易日期</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD4]">
                    {transactions.length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-[#8C8880]">目前沒有交易紀錄</td></tr>
                    ) : transactions.map((tx, idx) => {
                      // amount 在資料庫裡一律存正數(絕對值)，方向要看 type 判斷，
                      // 不能像原本那樣直接看 amount 正負（withdraw 也是存正數）
                      const isOutflow = tx.type === 'withdraw';
                      return (
                        <tr key={idx} className="hover:bg-[#FDF0ED]/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#1A1A18] text-sm">{tx.transactionId}</div>
                            <div className="text-xs text-[#8C8880] mt-1">{tx.ownerName}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-[#1A1A18] bg-white border border-[#E2DDD4] px-2 py-1 rounded-md">
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`font-black text-sm flex items-center gap-1 ${isOutflow ? 'text-[#C8522A]' : 'text-[#B89B6A]'}`}>
                              {isOutflow ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                              {isOutflow ? '-' : '+'}{tx.amount?.toLocaleString()}
                            </div>
                            {tx.grossAmount != null && (
                              <div className="text-[10px] text-[#8C8880] mt-0.5">
                                訂單 NT$ {tx.grossAmount?.toLocaleString()} － 手續費 NT$ {tx.feeAmount?.toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-[#8C8880]">{tx.referenceId}</td>
                          <td className="px-6 py-4 text-sm font-medium text-[#1A1A18]">{tx.date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}