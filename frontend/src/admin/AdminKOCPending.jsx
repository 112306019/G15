import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Mail, Instagram } from 'lucide-react';
import { getKOCPendingList, approveKOC, rejectKOC } from '../api/platform';

// TODO: 目前尚未接上平台管理員登入機制，暫時寫死 admin_id
const ADMIN_ID = 1;

const ROLE_LABELS = { 0: '廠商', 1: 'KOC', 2: '消費者' };

export default function AdminKOCPending() {
  const navigate = useNavigate();

  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPendingList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getKOCPendingList();
      if (res.data.success) {
        setPendingList(res.data.pending_list || []);
      } else {
        setError(res.data.err || '載入失敗');
      }
    } catch (err) {
      console.error('載入待審核 KOC 列表失敗', err);
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
      const res = await approveKOC({ koc_id: koc.koc_id, admin_id: ADMIN_ID });
      if (res.data.success) {
        setPendingList((prev) => prev.filter((item) => item.koc_id !== koc.koc_id));
      } else {
        alert(res.data.err || '審核失敗');
      }
    } catch (err) {
      console.error('同意申請失敗', err);
      alert('審核失敗，請稍後再試');
    } finally {
      setActioningId(null);
    }
  };

  const openRejectModal = (koc) => {
    setRejectTarget(koc);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('請輸入拒絕原因');
      return;
    }
    setActioningId(rejectTarget.koc_id);
    try {
      const res = await rejectKOC({
        koc_id: rejectTarget.koc_id,
        admin_id: ADMIN_ID,
        reject_reason: rejectReason.trim(),
      });
      if (res.data.success) {
        setPendingList((prev) => prev.filter((item) => item.koc_id !== rejectTarget.koc_id));
        setRejectTarget(null);
      } else {
        alert(res.data.err || '審核失敗');
      }
    } catch (err) {
      console.error('拒絕申請失敗', err);
      alert('審核失敗，請稍後再試');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 relative">

      <button
        onClick={() => navigate('/admin/influencers')}
        className="flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm"
      >
        <ArrowLeft size={16} /> 返回 KOC 列表
      </button>

      <div>
        <h1 className="text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-3">
          待審核 KOC 申請
          <span className="text-xs font-bold bg-[#FDF0ED] text-[#C8522A] px-2.5 py-1 rounded-md tracking-wider font-sans border border-[#C8522A]/20">
            共 {pendingList.length} 筆
          </span>
        </h1>
        <p className="text-[#8C8880] mt-2 font-medium">審核使用者提出的 KOC 身分申請。</p>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
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
              {loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">
                    載入中...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-red-500">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && pendingList.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">
                    目前沒有待審核的申請
                  </td>
                </tr>
              )}

              {!loading && !error && pendingList.map((koc) => (
                <tr key={koc.koc_id} className="hover:bg-[#FDF0ED]/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-serif font-black text-lg">
                        {koc.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-[#1A1A18]">{koc.name}</div>
                        <div className="text-xs font-medium text-[#8C8880] flex items-center gap-1">
                          <Mail size={11} /> {koc.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {koc.ig_account && (
                        <span className="text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                          <Instagram size={11} /> {koc.ig_account}
                        </span>
                      )}
                      {koc.fb_account && (
                        <span className="text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md w-fit">FB {koc.fb_account}</span>
                      )}
                      {koc.threads_account && (
                        <span className="text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md w-fit">Threads {koc.threads_account}</span>
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
      </div>

      {/* 拒絕原因彈窗 */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-[#1A1A18]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-[#E2DDD4]">
            <h3 className="text-xl font-serif font-black text-[#1A1A18] mb-2">拒絕申請</h3>
            <p className="text-[#8C8880] text-sm mb-6">
              申請人：{rejectTarget.name}（{rejectTarget.koc_id}）
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="請輸入拒絕原因，將顯示給申請人..."
              className="w-full h-28 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-4 text-sm outline-none focus:border-[#C8522A] resize-none mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 px-4 py-3 bg-white border border-[#E2DDD4] text-[#8C8880] rounded-xl font-bold text-sm hover:bg-[#F8F9FA]"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={actioningId === rejectTarget.koc_id}
                className="flex-1 px-4 py-3 bg-[#1A1A18] text-white rounded-xl font-bold text-sm hover:bg-[#C8522A] disabled:opacity-50"
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
