import React, { useState, useEffect } from 'react';
import { Search, Calendar, Image as ImageIcon, ChevronRight, CheckCircle2, Edit3, Clock, Upload, TrendingUp, XCircle, Trash2, AlertCircle, RotateCcw, Ticket, Send, FileText } from 'lucide-react';
import api from '../api/index';
import TaxFormModal from './TaxFormModal';

const STAGES = [
  { id: 1, label: '接案申請', icon: Send, desc: '瀏覽並申請案件' },
  { id: 2, label: '撰寫文案', icon: Edit3, desc: '請提交文案' },
  { id: 3, label: '上傳作品', icon: Upload, desc: '請上傳連結' },
  { id: 4, label: '推廣中', icon: TrendingUp, desc: '優惠碼推廣中' },
  { id: 5, label: '已結案', icon: CheckCircle2, desc: '案件完成' },
];

// 商品資料裡偶爾會有 "無" 這種佔位字串而非真正的網址，這種值要當成沒有圖片處理
const isValidImageUrl = (url) => typeof url === 'string' && /^https?:\/\//.test(url);

// stage 對照表：撰寫文案分頁要合併 writing(0) + reviewing(1) 兩種後端 stage，
// 所以這個分頁的值是陣列，其餘分頁維持單一數字
const STAGE_MAP = {
  1: null,        // 資格審核：從 Application 撈
  2: [0, 1],      // 撰寫文案（含已繳交子狀態）：writing(0) + reviewing(1)
  3: 2,           // 上傳作品：stage=2(publishing)
  4: 3,           // 推廣中：stage=3(promoting)
  5: 4,           // 已結案：stage=4(completed)
};

// 勞務報酬單（勞報單）狀態徽章對照
const TAX_FORM_BADGE = {
  not_submitted: { label: '待上傳勞報單', cls: 'bg-[#F5F0E8] text-[#8C8880]' },
  pending_review: { label: '勞報單審核中', cls: 'bg-[#FDF0ED] text-[#C8522A]' },
  rejected: { label: '勞報單退回', cls: 'bg-red-50 text-red-600' },
  approved: { label: '審核通過 (待撥款)', cls: 'bg-green-50 text-green-700' },
};

export default function HomePage({ onNavigate, jumpToStage, onJumpHandled }) {
  const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結
  const [activeStage, setActiveStage] = useState(1);
  const [stageCounts, setStageCounts] = useState({
    qualification: 0,
    writing: 0,
    reviewing: 0,
    publishing: 0,
    promoting: 0,
    completed: 0,
  });
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingReason, setViewingReason] = useState(null);
  const [taxFormTask, setTaxFormTask] = useState(null);

  // 代言申請分頁（stage 1）子狀態：未申請（可瀏覽並申請的活動）/ 已申請（原本的資格審核內容）
  const [applySubTab, setApplySubTab] = useState('unapplied');
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [kocId, setKocId] = useState(null);
  const [appliedCampaign, setAppliedCampaign] = useState(null);

  // 從 TaskDetailPage 跳回時，如果有指定要切換的分頁就切過去
  useEffect(() => {
    if (jumpToStage) {
      setActiveStage(jumpToStage);
      onJumpHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpToStage]);

  // 載入各階段數量徽章
  useEffect(() => {
    const fetchStageCounts = async () => {
      try {
        const res = await api.get('/koc/mission/getStageCounts', {
          params: { User_id: user_id }
        });
        if (res.data.success) {
          setStageCounts(res.data);
        }
      } catch (err) {
        console.error('載入階段數量失敗', err);
      }
    };
    fetchStageCounts();
  }, []);

  // 切換分頁時載入對應資料
  useEffect(() => {
    // jumpToStage 從 TaskDetailPage 返回時會讓 activeStage 在掛載後馬上再變一次，
    // 前一個分頁的請求還沒回來就被新分頁的請求追過去也可能後到——
    // 用 cancelled 避免「舊分頁的回應」蓋掉「新分頁的回應」。
    let cancelled = false;

    const fetchTasks = async () => {
      setLoading(true);
      setTasks([]);
      setAvailableCampaigns([]);
      try {
        if (activeStage === 1 && applySubTab === 'unapplied') {
          // 未申請：撈可申請的活動清單（原「代言申請區」的待申請內容）
          const [availableRes, profileRes] = await Promise.all([
            api.get('/koc/application/getAvailableList', { params: { user_id } }),
            api.get('/koc/profile/getProfile', { params: { user_id } }),
          ]);

          if (cancelled) return;

          if (profileRes.data.success) {
            setKocId(profileRes.data.koc_id);
          }

          if (availableRes.data.success) {
            setAvailableCampaigns(availableRes.data.campaigns.map(c => ({
              id: c.campaign_id,
              order_id: c.order_id,
              name: c.campaign_name,
              image: c.campaign_image,
            })));
          }

        } else if (activeStage === 1) {
          // 已申請：撈 pending + rejected 的 Application
          const [pendingRes, rejectedRes] = await Promise.all([
            api.get('/koc/application/getlist', { params: { User_id: user_id, status: 0 } }),
            api.get('/koc/application/getlist', { params: { User_id: user_id, status: 2 } }),
          ]);

          if (cancelled) return;

          const pending = pendingRes.data.success
            ? pendingRes.data.application.map(a => ({
                id: a.application_id,
                productName: a.campaign_name,
                campaignImage: a.campaign_image,
                vendor: a.vendor_name,
                deadline: a.deadline,
                stage: 1,
                isRejected: false,
                rejectReason: null,
                reject_reason: a.reject_reason,
              }))
            : [];

          const rejected = rejectedRes.data.success
            ? rejectedRes.data.application.map(a => ({
                id: a.application_id,
                productName: a.campaign_name,
                campaignImage: a.campaign_image,
                vendor: a.vendor_name,
                deadline: a.deadline,
                stage: 1,
                isRejected: true,
                rejectReason: a.reject_reason,
              }))
            : [];

          setTasks([...pending, ...rejected]);

        } else if (activeStage === 2) {
          // 撰寫文案：合併 writing(0) + reviewing(1)，reviewing 的卡片標成「已繳交」子狀態
          const [writingRes, reviewingRes] = await Promise.all([
            api.get('/koc/mission/getlist', { params: { User_id: user_id, stage: 0 } }),
            api.get('/koc/mission/getlist', { params: { User_id: user_id, stage: 1 } }),
          ]);

          if (cancelled) return;

          const mapMission = (m, isSubmitted) => ({
            id: m.KOCMission_id,
            productName: m.campaign_name,
            campaignImage: m.campaign_image,
            vendor: m.vendor_name,
            deadline: m.deadline,
            stage: 2,
            isSubmitted,
            isRevising: m.is_revising || false,
            vendorFeedback: m.vendor_feedback || null,
            promoCode: null,
            earningsTotal: m.earnings_total,
            isExpired: m.is_expired || false,
          });

          const writing = writingRes.data.success
            ? writingRes.data.missions.map(m => mapMission(m, false))
            : [];
          const reviewing = reviewingRes.data.success
            ? reviewingRes.data.missions.map(m => mapMission(m, true))
            : [];

          setTasks([...writing, ...reviewing]);

        } else {
          // 上傳作品(3) / 推廣中(4) / 已結案(5)：單一 stage
          const stage = STAGE_MAP[activeStage];
          const res = await api.get('/koc/mission/getlist', {
            params: { User_id: user_id, stage }
          });

          if (cancelled) return;

          if (res.data.success) {
            setTasks(res.data.missions.map(m => ({
              id: m.KOCMission_id,
              productName: m.campaign_name,
              campaignImage: m.campaign_image,
              vendor: m.vendor_name,
              deadline: m.deadline,
              stage: activeStage,
              promoCode: null,
              earningsTotal: m.earnings_total,
              isExpired: m.is_expired || false,
              taxFormStatus: m.tax_form_status || 'not_submitted',
              taxFormUrl: m.tax_form_url || null,
              taxFormRejectReason: m.tax_form_reject_reason || null,
            })));
          }
        }
      } catch (err) {
        if (!cancelled) console.error('載入任務失敗', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTasks();

    return () => {
      cancelled = true;
    };
  }, [activeStage, applySubTab]);

  // 移除退件申請
  const dismissTask = async (taskId) => {
    try {
      await api.delete(`/koc/application/remove/${taskId}`, {
        params: { user_id }
      });
      setTasks(prev => prev.filter(t => t.id !== taskId));
      // 更新徽章數量
      setStageCounts(prev => ({
        ...prev,
        qualification: Math.max(0, prev.qualification - 1)
      }));
    } catch (err) {
      console.error('移除失敗', err);
      alert('移除失敗，請稍後再試');
    }
  };

  const handleGoToDetail = (task) => {
    onNavigate('task_detail', task);
  };

  // 申請任務（原「代言申請區」的申請動作）
  const handleApply = async (campaign) => {
    if (!kocId) {
      alert('尚未取得 KOC 身份資料，請稍後再試');
      return;
    }
    try {
      const res = await api.post('/koc/application/applyMission', {
        koc_id: kocId,
        campaign_id: campaign.id,
        order_id: campaign.order_id,
      });

      if (res.data.success) {
        setAvailableCampaigns(prev => prev.filter(c => c.id !== campaign.id));
        setStageCounts(prev => ({
          ...prev,
          qualification: prev.qualification + 1
        }));
        setAppliedCampaign(campaign);
      } else {
        alert(res.data.err || '申請失敗');
      }
    } catch (err) {
      console.error(err);
      alert('申請失敗，請稍後再試');
    }
  };

  const renderCardAction = (task) => {
    switch(task.stage) {
      case 1:
        if (task.isRejected) {
          return (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setViewingReason(task)}
                className="bg-[#FDF0ED] text-[#C8522A] p-3 rounded-xl text-xs font-bold border border-[#FDF0ED] flex items-center justify-between gap-2 hover:bg-[#FDF0ED]/70 transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <XCircle size={14} className="shrink-0" />
                  抱歉，資格未符
                </span>
                <span className="text-[10px] underline underline-offset-2 shrink-0">查看原因</span>
              </button>
              <button
                onClick={() => dismissTask(task.id)}
                className="w-full bg-white border border-[#E2DDD4] text-[#8C8880] py-2.5 rounded-xl font-bold text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14}/> 移除紀錄
              </button>
            </div>
          );
        }
        return (
          <button disabled className="w-full bg-[#F5F0E8] text-[#8C8880] py-3.5 rounded-2xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2">
            <Clock size={16}/> 廠商審核中
          </button>
        );
      case 2:
        if (task.isSubmitted) {
          // 已繳交，等廠商審核
          return (
            <button onClick={() => handleGoToDetail(task)} className="w-full bg-white border border-[#E2DDD4] text-[#8C8880] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all flex items-center justify-center gap-2">
              <Search size={16}/> 已繳交，查看審核進度
            </button>
          );
        }
        if (task.isRevising) {
          // 文案被廠商退回，需修改後重新提交
          return (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setViewingReason({ type: 'revising', productName: task.productName, rejectReason: task.vendorFeedback })}
                className="bg-[#FDF0ED] text-[#C8522A] p-3 rounded-xl text-xs font-bold border border-[#FDF0ED] flex items-center justify-between gap-2 hover:bg-[#FDF0ED]/70 transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <XCircle size={14} className="shrink-0" />
                  文案退回，請修改
                </span>
                <span className="text-[10px] underline underline-offset-2 shrink-0">查看原因</span>
              </button>
              <button onClick={() => handleGoToDetail(task)} className="w-full bg-[#1A1A18] text-[#F5F0E8] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2">
                <Edit3 size={16}/> 前往修改文案
              </button>
            </div>
          );
        }
        // 撰寫中
        return (
          <div className="flex flex-col gap-3">
            {task.promoCode && (
              <div className="bg-[#FDF0ED]/50 border border-[#C8522A]/20 text-[#C8522A] py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
                <Ticket size={14} /> 需置入專屬優惠碼：{task.promoCode}
              </div>
            )}
            <button onClick={() => handleGoToDetail(task)} className="w-full bg-[#1A1A18] text-[#F5F0E8] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2">
              <Edit3 size={16}/> 前往撰寫文案
            </button>
          </div>
        );
      case 3:
        return (
          <button onClick={() => handleGoToDetail(task)} className="w-full bg-[#C8522A] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#1A1A18] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2">
            <Upload size={16}/> 上傳作品連結
          </button>
        );
      case 4:
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-bold text-[#8C8880]">目前累積分潤</span>
              <span className="text-xl font-black text-[#C8522A]">NT$ {(task.earningsTotal || 0).toLocaleString()}</span>
            </div>
            <button
              onClick={() => handleGoToDetail(task)}
              className="w-full bg-[#1A1A18] text-[#F5F0E8] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
            >
              查看詳情
            </button>
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-bold text-[#8C8880]">獲得分潤</span>
              <span className="text-xl font-black text-[#1A1A18]">NT$ {(task.earningsTotal || 0).toLocaleString()}</span>
            </div>

            {task.taxFormStatus === 'not_submitted' && (
              <button
                onClick={() => setTaxFormTask(task)}
                className="w-full bg-[#1A1A18] text-[#F5F0E8] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <FileText size={16}/> 上傳勞報單連結
              </button>
            )}

            {task.taxFormStatus === 'pending_review' && (
              <button
                onClick={() => setTaxFormTask(task)}
                className="w-full bg-white border border-[#E2DDD4] text-[#8C8880] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all flex items-center justify-center gap-2"
              >
                <FileText size={16}/> 檢視/修改連結
              </button>
            )}

            {task.taxFormStatus === 'rejected' && (
              <button
                onClick={() => setTaxFormTask(task)}
                className="w-full bg-[#C8522A] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#1A1A18] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <FileText size={16}/> 重新上傳連結
              </button>
            )}

            <button onClick={() => handleGoToDetail(task)} className="w-full bg-white border border-[#E2DDD4] text-[#8C8880] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all flex items-center justify-center gap-2">
              <Search size={16}/> 查看詳情
            </button>
          </div>
        );
      default: return null;
    }
  };

  // 分頁數量對照
  const getStageCount = (stageId) => {
    switch(stageId) {
      case 1: return stageCounts.qualification;
      case 2: return stageCounts.writing + stageCounts.reviewing;
      case 3: return stageCounts.publishing;
      case 4: return stageCounts.promoting;
      case 5: return stageCounts.completed;
      default: return 0;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[28px] font-serif font-bold text-[#1A1A18]">接案管理</h2>
        <button onClick={() => onNavigate('analysis')} className="bg-white border border-[#E2DDD4] text-[#1A1A18] px-6 py-3 rounded-full font-bold text-sm hover:border-[#1A1A18] hover:shadow-md transition-all flex items-center gap-2 group">
          <div className="w-6 h-6 bg-[#FDF0ED] rounded-full flex items-center justify-center group-hover:bg-[#C8522A] transition-colors">
            <TrendingUp size={14} className="text-[#C8522A] group-hover:text-white transition-colors" />
          </div>
          查看合作收益總覽
        </button>
      </div>

      <div className="bg-[#1A1A18] rounded-[2rem] p-8 mb-10 flex items-center justify-between shadow-xl relative overflow-hidden border border-[#E2DDD4]">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-[#C8522A]/20 to-transparent"></div>
        <div className="relative z-10">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span className="text-[#C8522A]"></span> 賺取分潤超簡單，跟著進度走！
          </h3>
          <div className="flex items-center gap-4 text-sm font-bold text-[#F5F0E8]/80">
            <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">1</span> 申請接案</span>
            <ChevronRight size={14} className="text-[#8C8880]" />
            <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">2</span> 撰寫文案</span>
            <ChevronRight size={14} className="text-[#8C8880]" />
            <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-full bg-[#C8522A] flex items-center justify-center text-white text-xs shadow-md">3</span> 發布貼文賺獎金</span>
          </div>
        </div>
        
      </div>

      {/* 分頁列 */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-[#E2DDD4] mb-8 flex justify-between overflow-x-auto hide-scrollbar">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.id;
          const count = getStageCount(stage.id);

          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              className={`flex-1 min-w-[140px] flex flex-col items-center justify-center py-4 rounded-xl transition-all relative ${isActive ? 'bg-[#FDF0ED]/50 border border-[#C8522A]/10' : 'hover:bg-[#F8F9FA] border border-transparent'}`}
            >
              {count > 0 && (
                <span className="absolute top-3 right-8 w-5 h-5 bg-[#C8522A] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                  {count}
                </span>
              )}
              <Icon size={20} className={`mb-2 ${isActive ? 'text-[#C8522A]' : 'text-[#8C8880]'}`} />
              <span className={`text-sm font-bold mb-0.5 ${isActive ? 'text-[#1A1A18]' : 'text-[#8C8880]'}`}>{stage.label}</span>
              <span className="text-[10px] font-bold text-[#8C8880] tracking-wider">{stage.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-end mb-6 px-2 gap-4">
        {activeStage !== 1 && (
          <h3 className="text-xl font-bold text-[#1A1A18]">
            {STAGES.find(s => s.id === activeStage)?.label}
          </h3>
        )}

        {activeStage === 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => setApplySubTab('unapplied')}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${
                applySubTab === 'unapplied'
                  ? 'bg-[#C8522A] text-white'
                  : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
              }`}
            >
              未申請
            </button>
            <button
              onClick={() => setApplySubTab('applied')}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${
                applySubTab === 'applied'
                  ? 'bg-[#C8522A] text-white'
                  : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
              }`}
            >
              已申請
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#8C8880] font-bold">載入中...</div>
      ) : activeStage === 1 && applySubTab === 'unapplied' ? (
        /* 未申請：可瀏覽並申請的活動清單（原「代言申請區」的待申請內容） */
        <div className="bg-white rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
          <div className="flex justify-between items-center bg-[#F8F9FA] border-b border-[#E2DDD4] px-10 py-4 text-sm font-bold text-[#8C8880]">
            <div>任務</div>
            <div>動作</div>
          </div>
          <div className="flex flex-col">
            {availableCampaigns.length > 0 ? (
              availableCampaigns.map((campaign, i) => (
                <div
                  key={campaign.id}
                  className={`flex items-center justify-between px-10 py-6 hover:bg-[#F8F9FA] transition-colors ${
                    i !== availableCampaigns.length - 1 ? 'border-b border-[#E2DDD4]' : ''
                  }`}
                >
                  <div className="flex items-center gap-6 flex-1 pr-8">
                    <div className="w-[88px] h-[64px] bg-[#F5F0E8] rounded-xl flex-shrink-0 flex items-center justify-center border border-[#E2DDD4] overflow-hidden">
                      {isValidImageUrl(campaign.image) ? (
                        <img src={campaign.image} alt={campaign.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-[#8C8880]/50" size={24} />
                      )}
                    </div>
                    <div className="font-bold text-[#1A1A18] leading-snug">
                      {campaign.name}
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-[120px] text-right">
                    <button
                      onClick={() => handleApply(campaign)}
                      className="bg-[#1A1A18] text-[#F5F0E8] px-8 py-3 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all active:scale-95 shadow-sm"
                    >
                      申請任務
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-10 py-16 text-center text-[#8C8880] font-bold">
                目前沒有可申請的任務
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task.id} className={`bg-white rounded-[2rem] p-6 border ${task.isRejected ? 'border-[#C8522A]/30 bg-[#FDF0ED]/20' : 'border-[#E2DDD4]'} shadow-sm hover:shadow-[0_16px_40px_rgba(26,26,24,0.06)] transition-all flex flex-col h-full`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-black text-[#8C8880] tracking-widest uppercase bg-[#F8F9FA] px-2 py-1 rounded-md mb-2 inline-block">
                    {task.vendor}
                  </span>
                  {task.deadline && (
                    <div className="flex items-center gap-1.5 text-[#C8522A] text-xs font-bold mt-1">
                      <Calendar size={12} />
                      <span>截止: {task.deadline}</span>
                    </div>
                  )}
                </div>
                {task.isExpired ? (
                  <span className="text-[10px] font-black px-2 py-1 rounded-md shrink-0 bg-[#F5F0E8] text-[#8C8880]">
                    已過期
                  </span>
                ) : task.stage === 5 ? (
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md shrink-0 ${TAX_FORM_BADGE[task.taxFormStatus]?.cls || TAX_FORM_BADGE.not_submitted.cls}`}>
                    {TAX_FORM_BADGE[task.taxFormStatus]?.label || TAX_FORM_BADGE.not_submitted.label}
                  </span>
                ) : task.stage === 2 && (
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md shrink-0 ${task.isSubmitted || task.isRevising ? 'bg-[#FDF0ED] text-[#C8522A]' : 'bg-[#F5F0E8] text-[#8C8880]'}`}>
                    {task.isSubmitted ? '已繳交・審核中' : task.isRevising ? '文案退回，請修改' : '撰寫中'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-[#F5F0E8] rounded-2xl flex items-center justify-center shrink-0 border border-[#E2DDD4]">
                  {isValidImageUrl(task.campaignImage) ? (
                    <img src={task.campaignImage} alt={task.productName} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <ImageIcon size={24} className="text-[#8C8880]/50" />
                  )}
                </div>
                <h4 className={`text-[15px] font-bold leading-snug line-clamp-2 ${task.isRejected ? 'text-[#8C8880] line-through' : 'text-[#1A1A18]'}`}>
                  {task.productName}
                </h4>
              </div>

              <div className="mt-auto pt-4 border-t border-[#F8F9FA]">
                {renderCardAction(task)}
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-white rounded-[2rem] border border-[#E2DDD4] border-dashed">
              <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={24} className="text-[#8C8880]" />
              </div>
              <p className="text-[#1A1A18] font-bold">這個階段目前沒有任務喔！</p>
            </div>
          )}
        </div>
      )}

      {/* 拒絕原因彈出視窗 */}
      {viewingReason && (
        <div
          className="fixed inset-0 bg-[#1A1A18]/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4"
          onClick={() => setViewingReason(null)}
        >
          <div
            className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E2DDD4]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-[#FDF0ED] rounded-full flex items-center justify-center mb-4 text-[#C8522A]">
              <XCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A18] mb-1">
              {viewingReason.type === 'revising' ? '文案退回，請修改' : '申請未通過'}
            </h3>
            <p className="text-xs font-bold text-[#8C8880] mb-4">{viewingReason.productName}</p>
            <div className="bg-[#F8F9FA] rounded-2xl p-5 text-sm text-[#1A1A18] leading-relaxed mb-6 whitespace-pre-wrap">
              {viewingReason.rejectReason || '廠商未填寫原因'}
            </div>
            <button
              onClick={() => setViewingReason(null)}
              className="w-full bg-[#1A1A18] text-[#F5F0E8] py-3 rounded-xl font-bold text-sm hover:bg-[#C8522A] transition-all"
            >
              關閉
            </button>
          </div>
        </div>
      )}

      {/* 上傳勞務報酬單連結彈出視窗 */}
      {taxFormTask && (
        <TaxFormModal
          task={taxFormTask}
          userId={user_id}
          onClose={() => setTaxFormTask(null)}
          onSubmitted={(newStatus, newUrl) => {
            setTasks(previous =>
              previous.map(t =>
                t.id === taxFormTask.id
                  ? { ...t, taxFormStatus: newStatus, taxFormUrl: newUrl, taxFormRejectReason: null }
                  : t
              )
            );
          }}
        />
      )}

      {/* 申請成功彈出視窗 */}
      {appliedCampaign && (
        <div
          className="fixed inset-0 bg-[#1A1A18]/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300"
          onClick={() => setAppliedCampaign(null)}
        >
          <div
            className="bg-white rounded-[2rem] p-12 max-w-md w-full shadow-2xl text-center animate-in zoom-in-95 duration-300 border border-[#E2DDD4]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex justify-center">
              <CheckCircle2 size={64} className="text-[#C8522A]" />
            </div>
            <h4 className="text-2xl font-black text-[#1A1A18] mb-8 leading-snug">
              {appliedCampaign.name}<br />已申請成功
            </h4>
            <button
              onClick={() => setAppliedCampaign(null)}
              className="bg-[#1A1A18] text-[#F5F0E8] w-full py-4 rounded-2xl font-bold text-lg hover:bg-[#C8522A] transition-all active:scale-95 shadow-lg"
            >
              確認
            </button>
          </div>
        </div>
      )}
    </div>
  );
}