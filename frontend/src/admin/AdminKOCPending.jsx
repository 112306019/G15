import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Mail, Instagram, Clock } from 'lucide-react';
import { getKOCPendingList, approveKOC, rejectKOC } from '../api/platform';
import { formatApiError } from '../errorMessage';

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
        setPendingList([]);
        setError(formatApiError(res.data.err) || '載入失敗');
      }
    } catch (err) {
      console.error('載入 KOC 待審核清單失敗：', err);
      setPendingList([]);
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
      const res = await approveKOC({
        koc_id: koc.koc_id,
        admin_id: parseInt(localStorage.getItem('admin_id')) || 1,
      });
      if (res.data.success) {
        setPendingList((prev) =>
          prev.filter((item) => item.koc_id !== koc.koc_id)
        );
      } else {
        alert(formatApiError(res.data.err) || '審核失敗');
      }
    } catch (err) {
      console.error('同意 KOC 申請失敗：', err);
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
    if (actioningId) return;

    setRejectModalOpen(false);
    setRejectTarget(null);
    setRejectReason('');
  };

  const handleReject = async () => {
    if (!rejectTarget) return;

    const adminId = Number(localStorage.getItem('admin_id')) || 1;

    setActioningId(rejectTarget.koc_id);

    try {
      const res = await rejectKOC({
        koc_id: rejectTarget.koc_id,
        admin_id: adminId,
        reject_reason: rejectReason.trim(),
      });

      if (res.data.success) {
        setPendingList((prev) =>
          prev.filter(
            (item) => item.koc_id !== rejectTarget.koc_id
          )
        );

        setRejectModalOpen(false);
        setRejectTarget(null);
        setRejectReason('');
      } else {
        alert(formatApiError(res.data.err) || '拒絕失敗');
      }
    } catch (err) {
      console.error('拒絕 KOC 申請失敗：', err);
      alert('拒絕失敗，請稍後再試');
    } finally {
      setActioningId(null);
    }
  };

  const formatAppliedAt = (value) => {
    if (!value) return '未提供';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-10">
      {/* 頁面標題 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-8 gap-4">
        <div>
          <p className="font-mono text-brand font-medium text-[10px] md:text-xs tracking-[0.25em] mb-2 md:mb-2.5 uppercase">KOC REVIEW</p>
          <h1 className="text-2xl md:text-[28px] font-display font-bold text-ink flex items-center gap-3">
            KOC 待審核清單

            <span className="text-[10px] md:text-xs font-bold bg-mist text-muted px-2.5 py-1 rounded-md tracking-wider font-sans border border-edge">
              共 {pendingList.length} 筆
            </span>
          </h1>

          <p className="text-muted mt-1.5 md:mt-2 text-xs md:text-sm font-medium">
            審核使用者申請成為 KOC 的資格，確認社群帳號後同意或拒絕。
          </p>
        </div>
      </div>

      {/* 列表內容區塊 */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-edge overflow-hidden">
        
        <div className="md:hidden flex flex-col divide-y divide-edge">
          {loading && <div className="p-10 text-center text-sm font-bold text-muted">載入中...</div>}
          
          {!loading && error && (
            <div className="p-10 text-center text-sm font-bold text-brand flex flex-col items-center gap-3">
              <p>{error}</p>
              <button type="button" onClick={fetchPendingList} className="rounded-full bg-brand px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-dark">
                重新載入
              </button>
            </div>
          )}

          {!loading && !error && pendingList.length === 0 && (
            <div className="p-10 text-center text-sm font-bold text-muted flex flex-col items-center gap-3">
              <Clock size={28} className="text-edge" />
              <span>目前沒有待審核的 KOC 申請</span>
            </div>
          )}

          {!loading && !error && pendingList.map((koc) => {
            const isActioning = actioningId === koc.koc_id;

            return (
              <div key={koc.koc_id} className="p-5 sm:p-6 hover:bg-cream/30 transition-colors">
                {/* 申請人資訊 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-mist text-ink border border-edge flex items-center justify-center font-display font-black text-xl shrink-0 shadow-sm">
                    {koc.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink text-sm truncate">{koc.name || '未提供姓名'}</div>
                    <div className="text-[11px] font-medium text-muted truncate mt-0.5">{koc.email || '未提供 Email'}</div>
                    <div className="text-[10px] font-medium text-muted/70 mt-0.5">KOC ID：{koc.koc_id}</div>
                  </div>
                </div>

                {/* 社群與時間區塊 */}
                <div className="bg-mist rounded-xl p-3.5 mb-4 flex flex-col gap-3 border border-edge/50">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-muted">社群帳號</span>
                    <div className="flex flex-wrap gap-1.5">
                      {koc.ig_account && (
                        <a href={koc.ig_url || '#'} target={koc.ig_url ? "_blank" : "_self"} rel="noopener noreferrer" 
                           className={`text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1 w-fit ${koc.ig_url ? 'text-brand bg-white border border-edge hover:underline shadow-sm' : 'text-muted bg-edge/30'}`}>
                          <Instagram size={12} /> {koc.ig_account}
                        </a>
                      )}
                      {koc.fb_account && (
                        <a href={koc.fb_url || '#'} target={koc.fb_url ? "_blank" : "_self"} rel="noopener noreferrer" 
                           className={`text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1 w-fit ${koc.fb_url ? 'text-brand bg-white border border-edge hover:underline shadow-sm' : 'text-muted bg-edge/30'}`}>
                          FB: {koc.fb_account}
                        </a>
                      )}
                      {koc.threads_account && (
                        <a href={koc.threads_url || '#'} target={koc.threads_url ? "_blank" : "_self"} rel="noopener noreferrer" 
                           className={`text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1 w-fit ${koc.threads_url ? 'text-brand bg-white border border-edge hover:underline shadow-sm' : 'text-muted bg-edge/30'}`}>
                          Threads: {koc.threads_account}
                        </a>
                      )}
                      {!koc.ig_account && !koc.fb_account && !koc.threads_account && (
                        <span className="text-[11px] font-medium text-muted">未提供社群帳號</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-edge pt-2 mt-1">
                    <span className="text-[10px] font-bold text-muted">申請時間</span>
                    <span className="text-[11px] font-bold text-ink">{formatAppliedAt(koc.applied_at)}</span>
                  </div>
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2.5">
                  <button type="button" onClick={() => openRejectModal(koc)} disabled={isActioning} className="flex-1 inline-flex justify-center items-center gap-1 bg-white border border-edge text-muted py-2.5 rounded-xl text-xs font-bold hover:border-brand hover:text-brand transition-all shadow-sm disabled:opacity-50">
                    <X size={14} /> 拒絕
                  </button>
                  <button type="button" onClick={() => handleApprove(koc)} disabled={isActioning} className="flex-1 inline-flex justify-center items-center gap-1 bg-brand text-white py-2.5 rounded-xl text-xs font-bold hover:bg-brand-dark transition-all shadow-sm disabled:opacity-50">
                    <Check size={14} /> {isActioning ? '處理中' : '同意申請'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-mist border-b border-edge">
                <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">申請人</th>
                <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">社群帳號</th>
                <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider">申請時間</th>
                <th className="px-6 py-4 text-xs font-bold text-muted uppercase tracking-wider text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {loading && <tr><td colSpan={4}><div className="py-20 text-center text-muted font-bold">載入中...</div></td></tr>}
              {!loading && error && (
                <tr>
                  <td colSpan={4}>
                    <div className="py-20 text-center text-brand font-bold flex flex-col items-center gap-3">
                      <p>{error}</p>
                      <button type="button" onClick={fetchPendingList} className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark">
                        重新載入
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && !error && pendingList.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="py-20 text-center text-muted font-bold flex flex-col items-center gap-3">
                      <Clock size={32} className="text-edge" />
                      <span>目前沒有待審核的 KOC 申請</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && !error && pendingList.map((koc) => {
                const isActioning = actioningId === koc.koc_id;
                return (
                  <tr key={koc.koc_id} className="hover:bg-cream/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-mist text-ink border border-edge flex items-center justify-center font-display font-black text-lg">
                          {koc.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-bold text-ink">{koc.name || '未提供姓名'}</div>
                          <div className="text-xs font-medium text-muted">{koc.email || '未提供 Email'}</div>
                          <div className="text-[11px] font-medium text-muted/70 mt-1">KOC ID：{koc.koc_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                        {koc.ig_account && (
                          <a href={koc.ig_url || '#'} target={koc.ig_url ? "_blank" : "_self"} rel="noopener noreferrer" 
                             className={`inline-block whitespace-nowrap text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 w-fit ${koc.ig_url ? 'text-brand bg-white border border-edge hover:underline shadow-sm' : 'text-muted bg-edge/30'}`}>
                            <Instagram size={11} /> {koc.ig_account}
                          </a>
                        )}
                        {koc.fb_account && (
                          <a href={koc.fb_url || '#'} target={koc.fb_url ? "_blank" : "_self"} rel="noopener noreferrer" 
                             className={`inline-block whitespace-nowrap text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 w-fit ${koc.fb_url ? 'text-brand bg-white border border-edge hover:underline shadow-sm' : 'text-muted bg-edge/30'}`}>
                            FB: {koc.fb_account}
                          </a>
                        )}
                        {koc.threads_account && (
                          <a href={koc.threads_url || '#'} target={koc.threads_url ? "_blank" : "_self"} rel="noopener noreferrer" 
                             className={`inline-block whitespace-nowrap text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 w-fit ${koc.threads_url ? 'text-brand bg-white border border-edge hover:underline shadow-sm' : 'text-muted bg-edge/30'}`}>
                            Threads: {koc.threads_account}
                          </a>
                        )}
                        {!koc.ig_account && !koc.fb_account && !koc.threads_account && (
                          <span className="text-xs font-medium text-muted">未提供社群帳號</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-muted">
                      {formatAppliedAt(koc.applied_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => handleApprove(koc)} disabled={isActioning} className="inline-flex items-center gap-1 bg-brand text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-brand-dark transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                          <Check size={14} /> {isActioning ? '處理中' : '同意'}
                        </button>
                        <button type="button" onClick={() => openRejectModal(koc)} disabled={isActioning} className="inline-flex items-center gap-1 bg-white border border-edge text-muted px-4 py-2.5 rounded-xl text-xs font-bold hover:border-brand hover:text-brand transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                          <X size={14} /> 拒絕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 拒絕申請彈窗 */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={closeRejectModal}>
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg sm:text-xl font-display font-black text-ink mb-2">拒絕 KOC 申請</h3>
            <p className="text-xs sm:text-sm text-muted mb-5 font-medium leading-relaxed">
              請填寫拒絕原因，將會顯示給申請人參考（<span className="font-bold text-ink">{rejectTarget?.name || '未提供姓名'}</span>）。
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="例如：社群帳號未公開、資料不完整等"
              className="w-full rounded-xl border border-edge bg-white px-4 py-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 resize-none mb-2 transition-all shadow-sm"
            />
            <div className="text-right text-[10px] sm:text-xs font-bold text-muted mb-6">
              {rejectReason.length} 字
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={closeRejectModal} disabled={actioningId === rejectTarget?.koc_id} className="flex-1 rounded-xl border border-edge text-muted py-3 text-xs sm:text-sm font-bold hover:bg-mist hover:text-ink transition-colors disabled:opacity-50">
                取消
              </button>
              <button type="button" onClick={handleReject} disabled={actioningId === rejectTarget?.koc_id} className="flex-1 rounded-xl bg-brand text-white py-3 text-xs sm:text-sm font-bold hover:bg-brand-dark transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                {actioningId === rejectTarget?.koc_id ? '處理中...' : '確認拒絕'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}