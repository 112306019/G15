import React, { useState } from 'react';
import { ShieldAlert, Undo2, X } from 'lucide-react';
import { forceCloseKOCMission, revertKOCMissionStage } from '../api/platform';
import { getErrorMessage } from '../errorMessage';

// 後端 STAGE_CODE_MAP：0 撰寫文案、1 文案審核中、2 待發佈、3 推廣中、4 已結案
const STAGE_LABELS = { 0: '撰寫文案', 1: '文案審核中', 2: '待發佈', 3: '推廣中', 4: '已結案' };
const COMPLETED = 4;

// 可退回的階段 → 退回後會發生什麼（跟後端 admin_revert_mission_stage 的處理一致）。
// KOC 不再提交文案給廠商審核，只剩推廣中可以退回待發佈。
const REVERT_EFFECTS = {
  3: '退回「待發佈」：作品連結標成退回，KOC 需重新提交連結；優惠碼在重新提交前暫停使用。',
};

/**
 * KOC 任務的管理員例外處理。階段平常由流程自動推進，這裡只提供：
 * - 強制結案：任何未結束的任務，結案後優惠碼停用
 * - 退回上一階段：只有推廣中可以退回待發佈，用來更正誤操作
 * 兩者都必須填原因，會寫入操作紀錄並通知 KOC 與廠商。
 *
 * mission: { id, stage（0~4 數字代碼）, title（顯示用，例如案件名稱） }
 */
export default function MissionActionModal({ mission, onClose, onDone }) {
  const canRevert = Boolean(REVERT_EFFECTS[mission.stage]);
  const [action, setAction] = useState('close');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isCompleted = mission.stage === COMPLETED;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        Admin_id: localStorage.getItem('admin_id'),
        KOCMission_id: Number(mission.id),
        Reason: reason.trim(),
      };
      if (action === 'revert') {
        await revertKOCMissionStage(payload);
      } else {
        await forceCloseKOCMission(payload);
      }
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, '處理失敗，請稍後再試'));
    } finally {
      setSubmitting(false);
    }
  };

  const optionClass = (value) =>
    `w-full text-left rounded-xl border p-3 sm:p-4 transition-colors ${
      action === value
        ? 'border-brand bg-brand-soft'
        : 'border-edge bg-white hover:bg-mist'
    }`;

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-edge animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-muted hover:text-ink transition-colors"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-display font-black text-ink mb-1">任務例外處理</h3>
        <p className="text-muted text-xs sm:text-sm mb-1">
          {mission.title ? `${mission.title}・` : ''}任務編號 {mission.id}
        </p>
        <p className="text-xs sm:text-sm font-bold text-ink mb-4">
          目前階段：{STAGE_LABELS[mission.stage] || '未知'}
        </p>

        <div className="bg-mist border border-edge rounded-xl p-3 text-[11px] sm:text-xs text-muted leading-relaxed mb-5">
          任務階段會隨 KOC 交件、廠商審核與活動期間自動推進，這裡只處理例外狀況。
          所有操作都會寫入操作紀錄，並通知 KOC 與廠商。
        </div>

        {isCompleted ? (
          <div className="py-6 text-center text-sm font-bold text-muted">這個任務已經結束，無法再處理。</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2.5">
              <button type="button" onClick={() => setAction('close')} className={optionClass('close')}>
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <ShieldAlert size={16} className="text-brand" /> 強制結案
                </div>
                <p className="text-[11px] sm:text-xs text-muted mt-1">
                  例如 KOC 違規、廠商要求終止合作。任務會標示為「平台終止」，優惠碼與推廣連結停止使用。
                </p>
              </button>

              <button
                type="button"
                onClick={() => canRevert && setAction('revert')}
                disabled={!canRevert}
                className={`${optionClass('revert')} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Undo2 size={16} className="text-gold" /> 退回上一階段
                </div>
                <p className="text-[11px] sm:text-xs text-muted mt-1">
                  {canRevert ? REVERT_EFFECTS[mission.stage] : '只有「推廣中」的任務可以退回上一階段。'}
                </p>
              </button>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-ink mb-2">處理原因（必填，會通知 KOC 與廠商）</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                placeholder="例如：作品連結無法開啟，請 KOC 重新提交"
                className="w-full bg-mist border border-edge rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all resize-none"
              />
            </div>

            {error && (
              <div className="bg-brand-soft border border-brand/20 rounded-xl p-3 text-xs sm:text-sm font-bold text-brand">
                {error}
              </div>
            )}

            <div className="flex gap-2.5 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-white border border-edge text-muted rounded-xl font-bold text-xs sm:text-sm hover:bg-mist transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-brand text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-brand-dark transition-all shadow-md disabled:opacity-50"
              >
                {submitting ? '處理中...' : action === 'revert' ? '確認退回' : '確認結案'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
