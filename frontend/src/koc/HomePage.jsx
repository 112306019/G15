import React, { useState, useEffect } from 'react';
import { Search, Calendar, Image as ImageIcon, ChevronRight, CheckCircle2, Clock, Upload, TrendingUp, XCircle, Trash2, AlertCircle, RotateCcw, Send } from 'lucide-react';
import api from '../api/index';
import { formatApiError } from '../errorMessage';

// 分頁 id 會被其他頁面拿來指定跳轉（例如任務頁返回時 onBack(4)），維持原本編號。
// 「撰寫文案」(id 2) 已移除：KOC 不再提交文案給廠商審核，任務核准後直接進入上傳作品。
const STAGES = [
  { id: 1, label: '接案申請', icon: Send, desc: '瀏覽並申請案件' },
  { id: 3, label: '上傳作品', icon: Upload, desc: '發文後上傳連結' },
  { id: 4, label: '推廣中', icon: TrendingUp, desc: '優惠碼推廣中' },
  { id: 5, label: '已結案', icon: CheckCircle2, desc: '案件已結案' },
];

// 商品資料裡偶爾會有 "無" 這種佔位字串而非真正的網址，這種值要當成沒有圖片處理
const isValidImageUrl = (url) => typeof url === 'string' && /^https?:\/\//.test(url);

// 已結束的任務，案件截止日超過這麼多天後，後端就不會再顯示這筆任務的詳情跟聊天室
// 了（見 backend/api/views/constants.py 的 MISSION_HISTORY_VISIBLE_DAYS）。
const MISSION_HISTORY_VISIBLE_DAYS = 90;

// 距離「任務詳情/聊天室被自動移除」還剩幾天，deadline 是 'YYYY-MM-DD' 字串
function getDaysUntilRemoval(deadline) {
  if (!deadline) return null;
  const removalDate = new Date(deadline);
  removalDate.setDate(removalDate.getDate() + MISSION_HISTORY_VISIBLE_DAYS);
  const diffDays = Math.ceil((removalDate - new Date()) / (1000 * 60 * 60 * 24));
  return diffDays;
}

// 分頁 id → 後端 stage 代碼
const STAGE_MAP = {
  1: null,        // 資格審核：從 Application 撈
  3: 2,           // 上傳作品：stage=2(publishing)
  4: 3,           // 推廣中：stage=3(promoting)
  5: 4,           // 已結案：stage=4(completed)
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

  // 代言申請分頁（stage 1）子狀態：未申請（可瀏覽並申請的活動）/ 已申請（原本的資格審核內容）
  const [applySubTab, setApplySubTab] = useState('unapplied');

  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [kocId, setKocId] = useState(null);
  const [appliedCampaign, setAppliedCampaign] = useState(null);

  // 從 TaskDetailPage 跳回時，如果有指定要切換的分頁就切過去
  useEffect(() => {
    if (jumpToStage) {
      // 舊的「撰寫文案」分頁已移除，指定跳到那裡的一律改到上傳作品
      setActiveStage(jumpToStage === 2 ? 3 : jumpToStage);
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
    let cancelled = false;

    const fetchTasks = async () => {
      setLoading(true);
      setTasks([]);
      setAvailableCampaigns([]);
      try {
        if (activeStage === 1 && applySubTab === 'unapplied') {
          // 未申請：撈可申請的活動清單
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

        } else {
          // 上傳作品(3) / 推廣中(4) / 已結案(5)
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
              endReason: m.end_reason || null,
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

  // 申請任務
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
        alert(formatApiError(res.data.err) || '申請失敗');
      }
    } catch (err) {
      console.error(err);
      alert('申請失敗，請稍後再試');
    }
  };

  const renderCardAction = (task) => {
    if (task.isExpired) {
      return (
        <button disabled className="w-full bg-cream text-muted py-3.5 rounded-2xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2">
          案件已過截止日期
        </button>
      );
    }

    switch(task.stage) {
      case 1:
        if (task.isRejected) {
          return (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setViewingReason(task)}
                className="bg-brand-soft text-brand p-2.5 md:p-3 rounded-xl text-xs font-bold border border-brand-soft flex items-center justify-between gap-2 hover:bg-brand-soft/70 transition-colors text-left"
              >
                <span className="flex items-center gap-1.5 md:gap-2">
                  <XCircle size={14} className="shrink-0" />
                  抱歉，資格未符
                </span>
                <span className="text-[10px] underline underline-offset-2 shrink-0">查看原因</span>
              </button>
              <button
                onClick={() => dismissTask(task.id)}
                className="w-full bg-white border border-edge text-muted py-2.5 md:py-3 rounded-xl font-bold text-xs md:text-sm hover:bg-mist hover:text-ink transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14}/> 移除紀錄
              </button>
            </div>
          );
        }
        return (
          <button disabled className="w-full bg-cream text-muted py-3 md:py-3.5 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm cursor-not-allowed flex items-center justify-center gap-1.5 md:gap-2">
            <Clock size={16}/> 廠商審核中
          </button>
        );
      case 3:
        return (
          <button onClick={() => handleGoToDetail(task)} className="w-full bg-brand text-white py-3 md:py-3.5 rounded-full font-bold text-xs md:text-sm hover:bg-brand-dark transition-colors active:scale-95 flex items-center justify-center gap-1.5 md:gap-2">
            <Upload size={16}/> 上傳作品連結
          </button>
        );
      case 4:
        return (
          <div className="flex flex-col gap-2.5 md:gap-3">
            <div className="flex items-center justify-between rounded-2xl bg-gold-soft/60 px-4 py-3">
              <span className="text-xs md:text-sm font-bold text-gold-ink">目前累積分潤</span>
              <span className="font-mono text-lg md:text-xl font-semibold text-gold-ink">NT$ {(task.earningsTotal || 0).toLocaleString()}</span>
            </div>
            <button
              onClick={() => handleGoToDetail(task)}
              className="w-full bg-brand text-white py-3 md:py-3.5 rounded-full font-bold text-xs md:text-sm hover:bg-brand-dark transition-colors active:scale-95 flex items-center justify-center gap-1.5 md:gap-2"
            >
              查看詳情
            </button>
          </div>
        );
      case 5: {
        const daysUntilRemoval = getDaysUntilRemoval(task.deadline);
        return (
          <div className="flex flex-col gap-2.5 md:gap-3">
            <div className="flex items-center justify-between px-1 md:px-2">
              <span className="text-xs md:text-sm font-bold text-muted">獲得分潤</span>
              <span className="font-mono text-lg md:text-xl font-semibold text-gold">NT$ {(task.earningsTotal || 0).toLocaleString()}</span>
            </div>

            <button onClick={() => handleGoToDetail(task)} className="w-full bg-white border border-edge text-muted py-3 md:py-3.5 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm hover:bg-mist hover:text-ink transition-all flex items-center justify-center gap-1.5 md:gap-2">
              <Search size={16}/> 查看詳情
            </button>

            {daysUntilRemoval !== null && (
              <p className="text-[10px] font-bold text-muted text-center">
                {daysUntilRemoval > 0
                  ? `任務詳情與聊天室將於 ${daysUntilRemoval} 天後自動移除`
                  : '任務詳情與聊天室已超過顯示期限'}
              </p>
            )}
          </div>
        );
      }
      default: return null;
    }
  };

  const getStageCount = (stageId) => {
    switch(stageId) {
      case 1: return stageCounts.qualification;
      case 3: return stageCounts.publishing;
      case 4: return stageCounts.promoting;
      case 5: return stageCounts.completed;
      default: return 0;
    }
  };

  const visibleTasks = tasks;

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto pb-12 md:pb-20">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <h2 className="text-2xl md:text-[28px] font-display font-bold text-ink">我的接案</h2>
      </div>

      <div className="bg-white border-2 border-brand-pale rounded-[1.5rem] md:rounded-[1.75rem_4.5rem_1.75rem_1.75rem] px-5 py-5 md:px-8 md:py-6 mb-5 md:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h3 className="text-brand-dark font-bold text-base md:text-lg">賺取分潤超簡單，跟著進度走！</h3>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[11px] md:text-sm font-bold text-brand-dark/80">
          <span className="flex items-center gap-1.5 md:gap-2"><span className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-brand-soft text-brand flex items-center justify-center text-[11px] md:text-xs">1</span> 申請接案</span>
          <ChevronRight size={14} className="text-edge" />
          <span className="flex items-center gap-1.5 md:gap-2"><span className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-brand-soft text-brand flex items-center justify-center text-[11px] md:text-xs">2</span> 發文並上傳連結</span>
          <ChevronRight size={14} className="text-edge" />
          <span className="flex items-center gap-1.5 md:gap-2"><span className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gold-soft text-gold-ink flex items-center justify-center text-[11px] md:text-xs">3</span> 發布貼文賺獎金</span>
        </div>
      </div>

      {/* 分頁列 (Tabs) */}
      <div className="bg-white p-1.5 rounded-[1.25rem] md:rounded-3xl mb-6 md:mb-8 flex justify-start md:justify-between overflow-x-auto hide-scrollbar gap-1">
        {STAGES.map((stage) => {
          const Icon = stage.icon;
          const isActive = activeStage === stage.id;
          const count = getStageCount(stage.id);

          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              className={`flex-shrink-0 min-w-[105px] md:flex-1 md:min-w-[140px] flex flex-col items-center justify-center py-3 md:py-4 rounded-2xl transition-colors relative ${isActive ? 'bg-brand-soft' : 'hover:bg-cream'}`}
            >
              {count > 0 && (
                <span className="absolute top-2 right-4 md:top-3 md:right-8 w-4 h-4 md:w-5 md:h-5 bg-brand text-white text-[9px] md:text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                  {count}
                </span>
              )}
              <Icon size={18} className={`mb-1.5 md:mb-2 md:w-5 md:h-5 ${isActive ? 'text-brand' : 'text-muted'}`} />
              <span className={`text-xs md:text-sm font-bold mb-0.5 ${isActive ? 'text-brand' : 'text-ink'}`}>{stage.label}</span>
              <span className="text-[9px] md:text-[10px] font-bold text-muted tracking-wider">{stage.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-end mb-4 md:mb-6 px-1 md:px-2 gap-3 md:gap-4">
        {activeStage !== 1 && (
          <h3 className="text-lg md:text-xl font-bold text-ink">
            {STAGES.find(s => s.id === activeStage)?.label}
          </h3>
        )}

        {activeStage === 1 && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setApplySubTab('unapplied')}
              className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-xl md:rounded-full font-bold text-xs md:text-sm transition-colors ${
                applySubTab === 'unapplied'
                  ? 'bg-brand text-white'
                  : 'bg-white text-muted hover:text-brand'
              }`}
            >
              未申請
            </button>
            <button
              onClick={() => setApplySubTab('applied')}
              className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-xl md:rounded-full font-bold text-xs md:text-sm transition-colors ${
                applySubTab === 'applied'
                  ? 'bg-brand text-white'
                  : 'bg-white text-muted hover:text-brand'
              }`}
            >
              已申請
            </button>
          </div>
        )}

      </div>

      {loading ? (
        <div className="py-20 text-center text-muted font-bold text-sm md:text-base">載入中...</div>
      ) : activeStage === 1 && applySubTab === 'unapplied' ? (
        /* 未申請清單 */
        <div className="bg-white rounded-[1.5rem] md:rounded-[1.75rem] overflow-hidden">
          <div className="flex justify-between items-center border-b border-edge px-4 md:px-10 py-3 md:py-4 text-xs md:text-sm font-bold text-muted">
            <div>可申請的案件</div>
            <div className="hidden sm:block">動作</div>
          </div>
          <div className="flex flex-col">
            {availableCampaigns.length > 0 ? (
              availableCampaigns.map((campaign, i) => (
                <div
                  key={campaign.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-10 py-4 md:py-6 gap-4 sm:gap-0 hover:bg-mist transition-colors ${
                    i !== availableCampaigns.length - 1 ? 'border-b border-edge' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-6 flex-1 pr-0 md:pr-8">
                    <div className="w-[72px] h-[52px] md:w-[88px] md:h-[64px] bg-cream rounded-xl flex-shrink-0 flex items-center justify-center border border-edge overflow-hidden">
                      {isValidImageUrl(campaign.image) ? (
                        <img src={campaign.image} alt={campaign.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-muted/50" size={20} />
                      )}
                    </div>
                    <div className="font-bold text-ink leading-snug text-sm md:text-base">
                      {campaign.name}
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-full sm:w-[120px] text-center sm:text-right">
                    <button
                      onClick={() => handleApply(campaign)}
                      className="w-full sm:w-auto bg-brand text-white px-5 md:px-7 py-2.5 md:py-3 rounded-full text-xs md:text-sm font-bold hover:bg-brand-dark transition-colors active:scale-95"
                    >
                      申請案件
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 md:px-10 py-16 text-center text-muted font-bold text-sm md:text-base">
                目前沒有可申請的案件
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 任務卡片 Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {visibleTasks.map((task) => (
            <div key={task.id} className={`bg-white rounded-[1.5rem] md:rounded-[1.75rem] p-5 md:p-6 border-2 ${task.isRejected ? 'border-brand-pale bg-brand-softer' : 'border-transparent'} hover:shadow-[0_16px_40px_rgba(80,71,133,0.08)] transition-shadow flex flex-col h-full`}>
              <div className="flex justify-between items-start mb-5 md:mb-6">
                <div>
                  <span className="text-[9px] md:text-[10px] font-black text-muted tracking-widest uppercase bg-mist px-2 py-1 rounded-md mb-2 inline-block">
                    {task.vendor}
                  </span>
                  {task.deadline && (
                    <div className="flex items-center gap-1 md:gap-1.5 text-brand text-[11px] md:text-xs font-bold mt-1">
                      <Calendar size={12} className="md:w-3.5 md:h-3.5" />
                      <span>截止: {task.deadline}</span>
                    </div>
                  )}
                </div>
                {task.isExpired ? (
                  <span className="text-[9px] md:text-[10px] font-black px-2 py-1 rounded-md shrink-0 bg-cream text-muted">
                    已過期
                  </span>
                ) : task.stage === 5 && task.endReason ? (
                  <span className={`text-[9px] md:text-[10px] font-black px-2 py-1 rounded-md shrink-0 ${
                    task.endReason === 'expired' ? 'bg-cream text-muted' : 'bg-brand-soft text-brand'
                  }`}>
                    {task.endReason === 'expired' ? '已過期' : task.endReason === 'admin_closed' ? '平台終止' : '自行取消'}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-3 md:gap-4 mb-5 md:mb-6">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-cream rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 border border-edge">
                  {isValidImageUrl(task.campaignImage) ? (
                    <img src={task.campaignImage} alt={task.productName} className="w-full h-full object-cover rounded-xl md:rounded-2xl" />
                  ) : (
                    <ImageIcon size={20} className="md:w-6 md:h-6 text-muted/50" />
                  )}
                </div>
                <h4 className={`text-sm md:text-[15px] font-bold leading-snug line-clamp-2 ${task.isRejected ? 'text-muted line-through' : 'text-ink'}`}>
                  {task.productName}
                </h4>
              </div>

              <div className="mt-auto pt-4 border-t border-mist">
                {renderCardAction(task)}
              </div>
            </div>
          ))}

          {visibleTasks.length === 0 && (
            <div className="col-span-full py-16 md:py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl md:rounded-[2rem] border border-edge border-dashed">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-mist rounded-full flex items-center justify-center mb-3 md:mb-4">
                <CheckCircle2 size={20} className="md:w-6 md:h-6 text-muted" />
              </div>
              <p className="text-ink font-bold text-sm md:text-base">這個階段目前沒有案件喔！</p>
            </div>
          )}
        </div>
      )}

      {/* 拒絕原因彈出視窗 */}
      {viewingReason && (
        <div
          className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4"
          onClick={() => setViewingReason(null)}
        >
          <div
            className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-edge"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-soft rounded-full flex items-center justify-center mb-4 text-brand">
              <XCircle size={20} className="md:w-6 md:h-6" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-ink mb-1">
              {viewingReason.type === 'revising' ? '文案退回，請修改' : '申請未通過'}
            </h3>
            <p className="text-[10px] md:text-xs font-bold text-muted mb-4">{viewingReason.productName}</p>
            <div className="bg-mist rounded-xl md:rounded-2xl p-4 md:p-5 text-xs md:text-sm text-ink leading-relaxed mb-5 md:mb-6 whitespace-pre-wrap max-h-[40vh] overflow-y-auto">
              {viewingReason.rejectReason || '廠商未填寫原因'}
            </div>
            <button
              onClick={() => setViewingReason(null)}
              className="w-full bg-brand text-white py-2.5 md:py-3 rounded-full font-bold text-xs md:text-sm hover:bg-brand-dark transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      )}

      {/* 申請成功彈出視窗 */}
      {appliedCampaign && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300 p-4"
          onClick={() => setAppliedCampaign(null)}
        >
          <div
            className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-8 md:p-12 max-w-md w-full shadow-2xl text-center animate-in zoom-in-95 duration-300 border border-edge"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 md:mb-6 flex justify-center">
              <CheckCircle2 size={48} className="md:w-16 md:h-16 text-brand" />
            </div>
            <h4 className="text-xl md:text-2xl font-black text-ink mb-6 md:mb-8 leading-snug">
              {appliedCampaign.name}<br />已申請成功
            </h4>
            <button
              onClick={() => setAppliedCampaign(null)}
              className="bg-brand text-white w-full py-3.5 md:py-4 rounded-full font-bold text-base md:text-lg hover:bg-brand-dark transition-colors active:scale-95"
            >
              確認
            </button>
          </div>
        </div>
      )}
    </div>
  );
}