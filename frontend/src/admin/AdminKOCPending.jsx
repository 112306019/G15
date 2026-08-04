import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Mail, Instagram, Clock } from 'lucide-react';
import { getKOCPendingList, approveKOC, rejectKOC } from '../api/platform';

// TODO: 目前尚未接上平台管理員登入機制，暫時寫死 admin_id
const ADMIN_ID = 1;

const ROLE_LABELS = { 0: '廠商', 1: 'KOC', 2: '消費者' };

export default function AdminKOCPending() {
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState(null);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPendingList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getKOCPendingList();
      if (res.data.success) {
        setPendingList(res.data.pending_list || []);
      } else {
        setError(res.data.err || '載入失敗');
      }
    } catch (err) {
      setError('載入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingList();
  }, []);

  const handleApprove = async (koc) => {
    setActioningId(koc.koc_id);
    try {
      const res = await approveKOC({ koc_id: koc.koc_id });
      if (res.data.success) {
        setPendingList((prev) => prev.filter((k) => k.koc_id !== koc.koc_id));
      } else {
        alert(res.data.err || '審核失敗');
      }
    } catch (err) {
      alert('審核失敗，請稍後再試');
    } finally {
      setActioningId(null);
    }
  };

  const openRejectModal = (koc) => {
    setRejectTarget(koc);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setRejectTarget(null);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActioningId(rejectTarget.koc_id);
    try {
      const res = await rejectKOC({
        koc_id: rejectTarget.koc_id,
        admin_id: parseInt(localStorage.getItem('admin_id')) || 1,
        reject_reason: rejectReason.trim(),
      });
      if (res.data.success) {
        setPendingList((prev) => prev.filter((k) => k.koc_id !== rejectTarget.koc_id));
        closeRejectModal();
      } else {
        alert(res.data.err || '拒絕失敗');
      }
    } catch (err) {
      alert('拒絕失敗，請稍後再試');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-3">
            KOC 待審核清單
            <span className="text-xs font-bold bg-[#F8F9FA] text-[#8C8880] px-2.5 py-1 rounded-md tracking-wider font-sans border border-[#E2DDD4]">
              共 {pendingList.length} 筆
            </span>
          </h1>
          <p className="text-[#8C8880] mt-2 font-medium">審核使用者申請成為 KOC 的資格，確認社群帳號後同意或拒絕。</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-[#8C8880] font-bold">載入中...</div>
        ) : error ? (
          <div className="py-20 text-center text-[#C8522A] font-bold">{error}</div>
        ) : pendingList.length === 0 ? (
          <div className="py-20 text-center text-[#8C8880] font-bold flex flex-col items-center gap-3">
            <Clock size={32} className="text-[#E2DDD4]" />
            目前沒有待審核的 KOC 申請
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">申請人</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">社群帳號</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">原身分</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">申請時間</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {pendingList.map((koc) => (
                  <tr key={koc.koc_id} className="hover:bg-[#F5F0E8]/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F8F9FA] text-[#1A1A18] border border-[#E2DDD4] flex items-center justify-center font-serif font-black text-lg">
                          {koc.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-[#1A1A18]">{koc.name}</div>
                          <div className="text-xs font-medium text-[#8C8880]">{koc.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {koc.ig_account && (
                          koc.ig_url ? (
                            <a
                              href={koc.ig_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-[#C8522A] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md flex items-center gap-1 w-fit hover:underline"
                            >
                              <Instagram size={11} /> {koc.ig_account}
                            </a>
                          ) : (
                            <span className="text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                              <Instagram size={11} /> {koc.ig_account}
                            </span>
                          )
                        )}
                        {koc.fb_account && (
                          <a
                            href={koc.fb_account}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[#C8522A] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md w-fit hover:underline"
                          >
                            FB
                          </a>
                        )}
                        {koc.threads_account && (
                          koc.threads_url ? (
                            <a
                              href={koc.threads_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-[#C8522A] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md w-fit hover:underline"
                            >
                              Threads {koc.threads_account}
                            </a>
                          ) : (
                            <span className="text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md w-fit">Threads {koc.threads_account}</span>
                          )
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm font-bold text-[#8C8880]">
                      {ROLE_LABELS[koc.user_role] ?? '未知'}
                    </td>

                    <td className="px-6 py-4 text-xs font-bold text-[#8C8880]">
                      {koc.applied_at}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApprove(koc)}
                          disabled={actioningId === koc.koc_id}
                          className="inline-flex items-center gap-1 bg-[#1A1A18] text-[#F5F0E8] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#C8522A] transition-all disabled:opacity-50"
                        >
                          <Check size={14} /> 同意
                        </button>
                        <button
                          onClick={() => openRejectModal(koc)}
                          disabled={actioningId === koc.koc_id}
                          className="inline-flex items-center gap-1 bg-white border border-[#E2DDD4] text-[#8C8880] px-4 py-2 rounded-lg text-xs font-bold hover:border-[#C8522A] hover:text-[#C8522A] transition-all disabled:opacity-50"
                        >
                          <X size={14} /> 拒絕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#1A1A18] mb-2">拒絕 KOC 申請</h3>
            <p className="text-sm text-[#8C8880] mb-5">
              請填寫拒絕原因，將會顯示給申請人參考（{rejectTarget?.name}）。
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="例如：社群帳號未公開、粉絲數不足等"
              className="w-full rounded-xl border border-[#E2DDD4] bg-[#F8F9FA] px-4 py-3 text-sm outline-none focus:border-[#C8522A] resize-none mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={closeRejectModal}
                className="flex-1 rounded-full border border-[#E2DDD4] text-[#8C8880] py-3 text-sm font-bold hover:bg-[#F8F9FA] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={actioningId === rejectTarget?.koc_id}
                className="flex-1 rounded-full bg-[#C8522A] text-white py-3 text-sm font-bold hover:bg-[#A64220] transition-colors disabled:opacity-50"
              >
                確認拒絕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
