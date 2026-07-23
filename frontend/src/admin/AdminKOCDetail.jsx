import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Instagram,
  ClipboardList, CreditCard, AlertTriangle, Edit
} from 'lucide-react';
import { getKOCList, getKOCDetail, updateKOCMissionStage } from '../api/platform';

const STAGE_LABELS = { 0: '撰寫文案', 1: '文案審核中', 2: '待發佈', 3: '已結案' };
const STAGE_CODE_TO_VALUE = { 0: 'writing', 1: 'reviewing', 2: 'publishing', 3: 'completed' };

const STAGE_OPTIONS = [
  { value: 'writing', label: '撰寫文案' },
  { value: 'reviewing', label: '文案審核中' },
  { value: 'publishing', label: '待發佈' },
  { value: 'completed', label: '已結案' },
];

export default function AdminKocDetail() {
  const navigate = useNavigate();
  const { id: kocId } = useParams();
  const location = useLocation();

  const [profile, setProfile] = useState(location.state?.koc || null);
  const [profileLoading, setProfileLoading] = useState(!location.state?.koc);

  const [missions, setMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionsError, setMissionsError] = useState(null);

  const [stageTarget, setStageTarget] = useState(null);
  const [newStage, setNewStage] = useState('writing');
  const [updatingStage, setUpdatingStage] = useState(false);

  // 若不是從列表頁點擊過來（沒有 state），退而求其次用列表 API 找出基本資料
  useEffect(() => {
    if (profile) return;
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const res = await getKOCList();
        if (res.data.success) {
          const found = (res.data.koc_list || []).find((k) => k.koc_id === kocId);
          setProfile(found || null);
        }
      } catch (err) {
        console.error('載入 KOC 基本資料失敗', err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [kocId, profile]);

  const fetchMissions = async () => {
    setMissionsLoading(true);
    setMissionsError(null);
    try {
      const res = await getKOCDetail({ koc_id: kocId });
      if (res.data.success) {
        setMissions(res.data.data || []);
      } else {
        setMissionsError(res.data.err || '載入失敗');
      }
    } catch (err) {
      console.error('載入 KOC 任務參與資料失敗', err);
      setMissionsError('載入失敗，請稍後再試');
    } finally {
      setMissionsLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kocId]);

  const openStageModal = (mission) => {
    setStageTarget(mission);
    setNewStage(STAGE_CODE_TO_VALUE[mission.Stage] || 'writing');
  };

  const submitStageUpdate = async (e) => {
    e.preventDefault();
    setUpdatingStage(true);
    try {
      const res = await updateKOCMissionStage({
        KOCMisson_id: Number(stageTarget.KOCMisson_id),
        Stage: newStage,
      });
      if (res.data.success) {
        setStageTarget(null);
        fetchMissions();
      } else {
        alert(res.data.err || '更新失敗');
      }
    } catch (err) {
      console.error('更新任務階段失敗', err);
      alert('更新失敗，請稍後再試');
    } finally {
      setUpdatingStage(false);
    }
  };

  if (!profileLoading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in">
        <div className="w-16 h-16 bg-[#F8F9FA] text-[#8C8880] rounded-full flex items-center justify-center mb-4 border border-[#E2DDD4]">
          <AlertTriangle size={24} />
        </div>
        <p className="text-[#1A1A18] font-bold text-lg mb-2">找不到 KOC 資料</p>
        <p className="text-[#8C8880] text-sm mb-6">這筆資料可能已被移除或存取路徑錯誤。</p>
        <button
          onClick={() => navigate('/admin/influencers')}
          className="flex items-center gap-2 bg-[#1A1A18] text-[#F5F0E8] px-6 py-3 rounded-full text-sm font-bold tracking-wider hover:bg-[#C8522A] transition-all shadow-md hover:-translate-y-0.5"
        >
          <ArrowLeft size={16} /> 返回 KOC 列表
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 relative">

      {/* 頂部：返回按鈕 */}
      <button
        onClick={() => navigate('/admin/influencers')}
        className="flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm mb-4"
      >
        <ArrowLeft size={16} /> 返回 KOC 列表
      </button>

      {/* 主要資訊卡片 */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FDF0ED] rounded-full mix-blend-multiply filter blur-[80px] opacity-70"></div>

        {/* KOC 個人資料區塊 */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-10 pb-10 border-b border-[#E2DDD4] relative z-10">

          <div className="w-28 h-28 bg-[#1A1A18] rounded-[1.5rem] flex items-center justify-center text-5xl text-[#F5F0E8] font-serif font-black shadow-[0_8px_20px_rgba(26,26,24,0.15)] border-4 border-white">
            {profileLoading ? '…' : (profile?.name?.charAt(0) || '?')}
          </div>

          <div className="flex-1">
            <h2 className="text-3xl font-serif font-black text-[#1A1A18] flex items-center gap-3 mb-2">
              {profileLoading ? '載入中...' : (profile?.name || '未知使用者')}
              <span className="text-[10px] font-sans font-bold bg-[#B89B6A] text-[#1A1A18] px-2 py-1 rounded-md tracking-widest uppercase">
                平台認證
              </span>
            </h2>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-bold text-[#8C8880]">
              <div className="flex items-center gap-1.5 text-[#1A1A18]">
                <Instagram size={16} className="text-[#C8522A]" />
                <span>{profile?.ig_account ? `@${profile.ig_account}` : '未綁定'}</span>
              </div>
            </div>

            <div className="mt-5 flex gap-3 items-center flex-wrap">
              <span className="text-[10px] font-sans font-bold bg-[#F8F9FA] text-[#8C8880] px-2 py-1.5 rounded-md tracking-widest border border-[#E2DDD4]">
                ID: {kocId}
              </span>
              {!profileLoading && profile && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md border tracking-widest ${
                  profile.status === 0
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${profile.status === 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  {profile.status === 0 ? '已啟用' : '已停權'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 任務參與紀錄 */}
        <div className="space-y-6 relative z-10 mb-10">
          <h3 className="font-serif font-bold text-xl text-[#1A1A18] flex items-center gap-2">
            <ClipboardList size={20} className="text-[#B89B6A]" />
            任務參與紀錄
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-[#F8F9FA] rounded-2xl overflow-hidden border border-[#E2DDD4]">
              <thead>
                <tr className="border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">任務編號 (Mission ID)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">綁定推薦碼</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">目前階段 (Stage)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">截止時間</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {missionsLoading && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm font-bold text-[#8C8880]">
                      載入中...
                    </td>
                  </tr>
                )}

                {!missionsLoading && missionsError && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm font-bold text-red-500">
                      {missionsError}
                    </td>
                  </tr>
                )}

                {!missionsLoading && !missionsError && missions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm font-bold text-[#8C8880]">
                      目前尚無接案紀錄
                    </td>
                  </tr>
                )}

                {!missionsLoading && !missionsError && missions.map((mission) => (
                  <tr key={mission.KOCMisson_id} className="hover:bg-white transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1A1A18] text-sm">
                      {mission.KOCMisson_id}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#C8522A]">
                      {mission.Promotion_code || '無'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest uppercase ${
                        mission.Stage === 3 ? 'bg-[#E2DDD4] text-[#8C8880]' : 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20'
                      }`}>
                        {STAGE_LABELS[mission.Stage] ?? '未知'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-[#8C8880]">
                      {mission.Deadline || '未設定'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openStageModal(mission)}
                        className="inline-flex items-center gap-1.5 bg-white border border-[#E2DDD4] text-[#1A1A18] px-3 py-1.5 rounded-lg text-xs font-bold hover:border-[#1A1A18] transition-all"
                      >
                        <Edit size={12} /> 更新階段
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 收益與撥款紀錄：目前平台 API 尚未提供對應查詢，先保留空狀態 */}
        <div className="space-y-6 relative z-10 pt-8 border-t border-[#E2DDD4]">
          <h3 className="font-serif font-bold text-xl text-[#1A1A18] flex items-center gap-2">
            <CreditCard size={20} className="text-[#C8522A]" />
            收益與撥款資料
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-[#F8F9FA] rounded-2xl overflow-hidden border border-[#E2DDD4]">
              <thead>
                <tr className="border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">收益來源 (KOC 任務)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">收益金額</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">撥款日期</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">撥款狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm font-bold text-[#8C8880]">
                    目前尚無收益紀錄
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 更新階段彈窗 */}
      {stageTarget && (
        <div className="fixed inset-0 bg-[#1A1A18]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-[#E2DDD4]">
            <div className="w-12 h-12 rounded-full bg-[#F5F0E8] text-[#B89B6A] flex items-center justify-center mb-4 mx-auto">
              <Edit size={24} />
            </div>
            <h3 className="text-xl font-serif font-black text-[#1A1A18] text-center mb-2">更新任務階段</h3>
            <p className="text-[#8C8880] text-center text-sm mb-6">
              任務編號：{stageTarget.KOCMisson_id}
            </p>
            <form onSubmit={submitStageUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#8C8880] mb-2">選擇新階段</label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm font-bold text-[#1A1A18] outline-none focus:border-[#C8522A]"
                >
                  {STAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setStageTarget(null)} className="flex-1 px-4 py-3 bg-white border border-[#E2DDD4] text-[#8C8880] rounded-xl font-bold text-sm hover:bg-[#F8F9FA]">取消</button>
                <button type="submit" disabled={updatingStage} className="flex-1 px-4 py-3 bg-[#1A1A18] text-white rounded-xl font-bold text-sm hover:bg-[#333] disabled:opacity-50">
                  {updatingStage ? '更新中...' : '確認更新'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
