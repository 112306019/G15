import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock, Instagram, X } from 'lucide-react';
import {
  getKOCPendingList,
  approveKOC,
  rejectKOC,
} from '../api/platform';

export default function AdminKOCPending() {
  const navigate = useNavigate();
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
        setError(res.data.err || '載入失敗');
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
        admin_id: Number(localStorage.getItem('admin_id')) || 1,
      });

      if (res.data.success) {
        setPendingList((prev) =>
          prev.filter((item) => item.koc_id !== koc.koc_id)
        );
      } else {
        alert(res.data.err || '審核失敗');
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
        alert(res.data.err || '拒絕失敗');
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
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <button
        onClick={() => navigate('/admin/influencers')}
        className="flex items-center gap-2 text-[#8C8880] hover:text-[#1A1A18] transition-colors font-bold text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回 KOC 管理
      </button>

      {/* 頁面標題 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-3">
            KOC 待審核清單

            <span className="text-xs font-bold bg-[#F8F9FA] text-[#8C8880] px-2.5 py-1 rounded-md tracking-wider font-sans border border-[#E2DDD4]">
              共 {pendingList.length} 筆
            </span>
          </h1>

          <p className="text-[#8C8880] mt-2 font-medium">
            審核使用者申請成為 KOC 的資格，確認社群帳號後同意或拒絕。
          </p>
        </div>
      </div>

      {/* 待審核表格 */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* 表頭永遠保留 */}
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">
                  申請人
                </th>

                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">
                  社群帳號
                </th>

                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">
                  申請時間
                </th>

                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider text-center">
                  操作
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2DDD4]">
              {/* 載入中 */}
              {loading && (
                <tr>
                  <td colSpan={4}>
                    <div className="py-20 text-center text-[#8C8880] font-bold">
                      載入中...
                    </div>
                  </td>
                </tr>
              )}

              {/* 載入錯誤 */}
              {!loading && error && (
                <tr>
                  <td colSpan={4}>
                    <div className="py-20 text-center text-[#C8522A] font-bold">
                      <p>{error}</p>

                      <button
                        type="button"
                        onClick={fetchPendingList}
                        className="mt-4 rounded-full bg-[#1A1A18] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#C8522A]"
                      >
                        重新載入
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* 沒有資料，表頭仍然存在 */}
              {!loading && !error && pendingList.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="py-20 text-center text-[#8C8880] font-bold flex flex-col items-center gap-3">
                      <Clock
                        size={32}
                        className="text-[#E2DDD4]"
                      />

                      <span>
                        目前沒有待審核的 KOC 申請
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {/* 有資料 */}
              {!loading &&
                !error &&
                pendingList.map((koc) => {
                  const isActioning =
                    actioningId === koc.koc_id;

                  return (
                    <tr
                      key={koc.koc_id}
                      className="hover:bg-[#F5F0E8]/50 transition-colors group"
                    >
                      {/* 申請人 */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F8F9FA] text-[#1A1A18] border border-[#E2DDD4] flex items-center justify-center font-serif font-black text-lg">
                            {koc.name?.charAt(0) || '?'}
                          </div>

                          <div>
                            <div className="font-bold text-[#1A1A18]">
                              {koc.name || '未提供姓名'}
                            </div>

                            <div className="text-xs font-medium text-[#8C8880]">
                              {koc.email || '未提供 Email'}
                            </div>

                            <div className="text-[11px] font-medium text-[#8C8880]/70 mt-1">
                              KOC ID：{koc.koc_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 社群帳號 */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {koc.ig_account &&
                            (koc.ig_url ? (
                              <a
                                href={koc.ig_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-[#C8522A] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md flex items-center gap-1 w-fit hover:underline"
                              >
                                <Instagram size={11} />
                                {koc.ig_account}
                              </a>
                            ) : (
                              <span className="text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                                <Instagram size={11} />
                                {koc.ig_account}
                              </span>
                            ))}

                          {koc.fb_account &&
                            (koc.fb_url ? (
                              
                              <a                                href={koc.fb_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-[#C8522A] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md w-fit hover:underline"
                              >
                                FB：{koc.fb_account}
                              </a>
                            ) : (
                              <span className="text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md w-fit">
                                FB：{koc.fb_account}
                              </span>
                            ))}

                          {koc.threads_account &&
                            (koc.threads_url ? (
                              <a
                                href={koc.threads_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-[#C8522A] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md w-fit hover:underline"
                              >
                                Threads {koc.threads_account}
                              </a>
                            ) : (
                              <span className="text-xs font-bold text-[#8C8880] bg-[#F8F9FA] border border-[#E2DDD4] px-2 py-0.5 rounded-md w-fit">
                                Threads {koc.threads_account}
                              </span>
                            ))}

                          {!koc.ig_account &&
                            !koc.fb_account &&
                            !koc.threads_account && (
                              <span className="text-xs font-medium text-[#8C8880]">
                                未提供社群帳號
                              </span>
                            )}
                        </div>
                      </td>

                      {/* 申請時間 */}
                      <td className="px-6 py-4 text-xs font-bold text-[#8C8880] whitespace-nowrap">
                        {formatAppliedAt(koc.applied_at)}
                      </td>

                      {/* 操作 */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleApprove(koc)
                            }
                            disabled={isActioning}
                            className="inline-flex items-center gap-1 bg-[#1A1A18] text-[#F5F0E8] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#C8522A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Check size={14} />

                            {isActioning
                              ? '處理中'
                              : '同意'}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openRejectModal(koc)
                            }
                            disabled={isActioning}
                            className="inline-flex items-center gap-1 bg-white border border-[#E2DDD4] text-[#8C8880] px-4 py-2 rounded-lg text-xs font-bold hover:border-[#C8522A] hover:text-[#C8522A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <X size={14} />
                            拒絕
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
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
          onClick={closeRejectModal}
        >
          <div
            className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <h3 className="text-lg font-bold text-[#1A1A18] mb-2">
              拒絕 KOC 申請
            </h3>

            <p className="text-sm text-[#8C8880] mb-5">
              請填寫拒絕原因，將會顯示給申請人參考
              （{rejectTarget?.name || '未提供姓名'}）。
            </p>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(event) =>
                setRejectReason(event.target.value)
              }
              placeholder="例如：社群帳號未公開、資料不完整等"
              className="w-full rounded-xl border border-[#E2DDD4] bg-[#F8F9FA] px-4 py-3 text-sm outline-none focus:border-[#C8522A] resize-none mb-2"
            />

            <div className="text-right text-xs text-[#8C8880] mb-6">
              {rejectReason.length} 字
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={
                  actioningId ===
                  rejectTarget?.koc_id
                }
                className="flex-1 rounded-full border border-[#E2DDD4] text-[#8C8880] py-3 text-sm font-bold hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
              >
                取消
              </button>

              <button
                type="button"
                onClick={handleReject}
                disabled={
                  actioningId ===
                  rejectTarget?.koc_id
                }
                className="flex-1 rounded-full bg-[#C8522A] text-white py-3 text-sm font-bold hover:bg-[#A64220] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actioningId ===
                rejectTarget?.koc_id
                  ? '處理中...'
                  : '確認拒絕'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}