import React, { useState, useEffect } from 'react';
import { Search, ClipboardList, TrendingUp, Clock, Edit } from 'lucide-react';
import { getAllMissions, updateKOCMissionStage, getEarningsTracking } from '../api/platform';

const STAGE_LABELS = { 0: '撰寫文案', 1: '文案審核中', 2: '待發佈', 3: '推廣中', 4: '已結案' };
const STAGE_CODE_TO_VALUE = { 0: 'writing', 1: 'reviewing', 2: 'publishing', 3: 'promoting', 4: 'completed' };

const STAGE_OPTIONS = [
  { value: 'writing', label: '撰寫文案' },
  { value: 'reviewing', label: '文案審核中' },
  { value: 'publishing', label: '待發佈' },
  { value: 'promoting', label: '推廣中' },
  { value: 'completed', label: '已結案' },
];

const EARNINGS_STATUS_LABELS = { pending: '待結算', withdrawable: '可提領', transferred: '已分潤' };
const EARNINGS_STATUS_STYLES = {
  pending: 'bg-[#E2DDD4] text-[#8C8880]',
  withdrawable: 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/30',
  transferred: 'bg-[#F5F0E8] text-[#B89B6A] border-[#B89B6A]/30',
};

export default function AdminMissions() {
  const [activeTab, setActiveTab] = useState('missions');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [newStage, setNewStage] = useState('writing');
  const [updatingStage, setUpdatingStage] = useState(false);

  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState('');

  const fetchMissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllMissions();
      if (res.data.success) {
        setMissions(res.data.missions || []);
      } else {
        setError(res.data.err || '載入失敗');
      }
    } catch (err) {
      console.error('載入任務列表失敗', err);
      setError('載入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const filteredMissions = missions.filter((mission) => {
    if (!keyword.trim()) return true;
    const kw = keyword.trim().toLowerCase();
    return (
      mission.kocmission_id?.toLowerCase().includes(kw) ||
      mission.koc_name?.toLowerCase().includes(kw) ||
      mission.vendor_name?.toLowerCase().includes(kw)
    );
  });

  const [tracking, setTracking] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(true);
  const [trackingError, setTrackingError] = useState(null);

  useEffect(() => {
    const fetchTracking = async () => {
      setTrackingLoading(true);
      setTrackingError(null);
      try {
        const res = await getEarningsTracking();
        if (res.data.success) {
          setTracking(res.data.tracking || []);
        } else {
          setTrackingError(res.data.err || '載入失敗');
        }
      } catch (err) {
        console.error('載入分潤追蹤資料失敗', err);
        setTrackingError('載入失敗，請稍後再試');
      } finally {
        setTrackingLoading(false);
      }
    };
    fetchTracking();
  }, []);

  const handleUpdateClick = (mission) => {
    setSelectedMission(mission);
    setNewStage(STAGE_CODE_TO_VALUE[mission.stage] || 'writing');
    setShowUpdateModal(true);
  };

  const submitStageUpdate = async (e) => {
    e.preventDefault();
    setUpdatingStage(true);
    try {
      const res = await updateKOCMissionStage({
        KOCMisson_id: Number(selectedMission.kocmission_id),
        Stage: newStage,
      });
      if (res.data.success) {
        setShowUpdateModal(false);
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 relative">

      {/* 🟢 狀態更新 Modal */}
      {showUpdateModal && selectedMission && (
        <div className="fixed inset-0 bg-[#1A1A18]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-[#E2DDD4]">
            <div className="w-12 h-12 rounded-full bg-[#F5F0E8] text-[#B89B6A] flex items-center justify-center mb-4 mx-auto">
              <Edit size={24} />
            </div>
            <h3 className="text-xl font-serif font-black text-[#1A1A18] text-center mb-2">更新任務階段</h3>
            <p className="text-[#8C8880] text-center text-sm mb-6">
              任務編號：{selectedMission.kocmission_id}
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
                <button type="button" onClick={() => setShowUpdateModal(false)} className="flex-1 px-4 py-3 bg-white border border-[#E2DDD4] text-[#8C8880] rounded-xl font-bold text-sm hover:bg-[#F8F9FA]">取消</button>
                <button type="submit" disabled={updatingStage} className="flex-1 px-4 py-3 bg-[#1A1A18] text-white rounded-xl font-bold text-sm hover:bg-[#333] disabled:opacity-50">
                  {updatingStage ? '更新中...' : '確認更新'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 頂部標題 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#1A1A18] tracking-tight">任務與活動追蹤</h1>
          <p className="text-[#8C8880] mt-2 font-medium">管理 KOC 的接案進度與推薦碼轉換成效。</p>
        </div>
      </div>

      {/* 🟢 頁籤切換區 */}
      <div className="flex gap-4 border-b border-[#E2DDD4] pb-px">
        <button
          onClick={() => setActiveTab('missions')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'missions' ? 'border-[#C8522A] text-[#C8522A]' : 'border-transparent text-[#8C8880] hover:text-[#1A1A18]'
          }`}
        >
          <ClipboardList size={18} /> KOC 任務進度
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'performance' ? 'border-[#C8522A] text-[#C8522A]' : 'border-transparent text-[#8C8880] hover:text-[#1A1A18]'
          }`}
        >
          <TrendingUp size={18} /> 成效與分潤追蹤
        </button>
      </div>

      {/* 🟢 任務進度表格 (Missions) */}
      {activeTab === 'missions' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-4 border-b border-[#E2DDD4] flex justify-end bg-[#F8F9FA]">
             <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8880]" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜尋任務編號或 KOC..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2DDD4] rounded-lg text-sm outline-none focus:border-[#C8522A]"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">任務編號 / KOC</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">合作廠商</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">目前階段 (Stage)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">截止時間</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase text-center">操作</th>
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

                {!loading && !error && filteredMissions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">
                      目前沒有任務資料
                    </td>
                  </tr>
                )}

                {!loading && !error && filteredMissions.map((mission) => (
                  <tr key={mission.kocmission_id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-black text-[#1A1A18] text-sm">{mission.kocmission_id}</div>
                      <div className="text-xs font-bold text-[#C8522A] mt-1">{mission.koc_name || '未指派'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#8C8880]">{mission.vendor_name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-white border border-[#E2DDD4] px-3 py-1.5 rounded-md text-sm font-bold text-[#1A1A18] shadow-sm">
                        {STAGE_LABELS[mission.stage] ?? '未知'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-[#8C8880] flex items-center gap-1.5 mt-2">
                      <Clock size={14} /> {mission.deadline || '未設定'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleUpdateClick(mission)}
                        className="inline-flex items-center gap-1.5 bg-[#1A1A18] text-[#F5F0E8] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#333] transition-all"
                      >
                        更新階段
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🟢 成效追蹤表格 (Performance) */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-4 border-b border-[#E2DDD4] bg-[#F8F9FA]">
            <p className="text-sm font-bold text-[#8C8880]">追蹤由推薦碼 (Promotion Code) 帶來的實際轉換訂單</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">推薦碼</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">歸屬 KOC</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">綁定訂單</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">分潤金額</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">分潤狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {trackingLoading && (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">
                      載入中...
                    </td>
                  </tr>
                )}

                {!trackingLoading && trackingError && (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-red-500">
                      {trackingError}
                    </td>
                  </tr>
                )}

                {!trackingLoading && !trackingError && tracking.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">
                      目前沒有分潤追蹤資料
                    </td>
                  </tr>
                )}

                {!trackingLoading && !trackingError && tracking.map((item, idx) => (
                  <tr key={`${item.order_id}-${idx}`} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-[#1A1A18]">{item.promotion_code}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#C8522A]">{item.koc_name || '未知'}</td>
                    <td className="px-6 py-4 text-sm font-bold text-[#1A1A18]">{item.order_id}</td>
                    <td className="px-6 py-4 font-black text-[#1A1A18] text-sm">NT$ {item.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest uppercase ${
                        EARNINGS_STATUS_STYLES[item.status] || 'bg-[#E2DDD4] text-[#8C8880]'
                      }`}>
                        {EARNINGS_STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
