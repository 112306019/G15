import React, { useState, useEffect } from 'react';
import { Search, Calendar, Image as ImageIcon, ChevronRight, CheckCircle2, Edit3, Clock, Upload, TrendingUp, XCircle, Trash2, AlertCircle, RotateCcw, Ticket } from 'lucide-react';
import api from '../api/index';

const STAGES = [
  { id: 1, label: '資格審核', icon: Clock, desc: '等待廠商確認' },
  { id: 2, label: '撰寫文案', icon: Edit3, desc: '請提交草稿' },
  { id: 3, label: '文案審核', icon: Search, desc: '廠商審閱中' },
  { id: 4, label: '待發佈', icon: Upload, desc: '請上傳連結' },
  { id: 5, label: '已結案', icon: CheckCircle2, desc: '任務完成' },
];

// stage 對照表
const STAGE_MAP = {
  1: null,        // 資格審核：從 Application 撈
  2: 0,           // 撰寫文案：stage=0(writing)
  3: 1,           // 文案審核：stage=1(reviewing)
  4: 2,           // 待發佈：stage=2(publishing)
  5: 3,           // 已結案：stage=3(completed)
};

const user_id = 'U00001';   // 暫時寫死，等登入機制做好再改
const koc_id = 'KOC00001';  // 暫時寫死

export default function HomePage({ onNavigate }) {
  const [activeStage, setActiveStage] = useState(1);
  const [stageCounts, setStageCounts] = useState({
    qualification: 0,
    writing: 0,
    reviewing: 0,
    publishing: 0,
    completed: 0,
  });
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

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
    const fetchTasks = async () => {
      setLoading(true);
      setTasks([]);
      try {
        if (activeStage === 1) {
          // 資格審核：撈 pending + rejected 的 Application
          const [pendingRes, rejectedRes] = await Promise.all([
            api.get('/koc/application/getlist', { params: { User_id: user_id, status: 0 } }),
            api.get('/koc/application/getlist', { params: { User_id: user_id, status: 2 } }),
          ]);

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
          // 其他四個分頁：撈 KOCMission
          const stage = STAGE_MAP[activeStage];
          const res = await api.get('/koc/mission/getlist', {
            params: { User_id: user_id, stage }
          });
          if (res.data.success) {
            setTasks(res.data.missions.map(m => ({
              id: m.KOCMission_id,
              productName: m.campaign_name,
              campaignImage: m.campaign_image,
              vendor: m.vendor_name,    
              deadline: m.deadline,   
              stage: activeStage,
              promoCode: null,
            })));
          }
        }
      } catch (err) {
        console.error('載入任務失敗', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [activeStage]);

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

  const renderCardAction = (task) => {
    switch(task.stage) {
      case 1:
        if (task.isRejected) {
          return (
            <div className="flex flex-col gap-2">
              <div className="bg-[#FDF0ED] text-[#C8522A] p-3 rounded-xl text-xs font-bold border border-[#FDF0ED] flex items-start gap-2">
                <XCircle size={14} className="shrink-0 mt-0.5" />
                <span>抱歉，資格未符。<br/><span className="text-[#8C8880] font-normal">{task.rejectReason}</span></span>
              </div>
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
          <button onClick={() => handleGoToDetail(task)} className="w-full bg-white border border-[#E2DDD4] text-[#8C8880] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all flex items-center justify-center gap-2">
            <Search size={16}/> 查看審核進度
          </button>
        );
      case 4:
        return (
          <button onClick={() => handleGoToDetail(task)} className="w-full bg-[#C8522A] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#1A1A18] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2">
            <Upload size={16}/> 提交貼文連結
          </button>
        );
      case 5:
        return (
          <div className="flex items-center justify-between px-2">
            <span className="text-sm font-bold text-[#8C8880]">獲得分潤</span>
            <span className="text-xl font-black text-[#1A1A18]">NT$ {task.reward || 0}</span>
          </div>
        );
      default: return null;
    }
  };

  // 分頁數量對照
  const getStageCount = (stageId) => {
    switch(stageId) {
      case 1: return stageCounts.qualification;
      case 2: return stageCounts.writing;
      case 3: return stageCounts.reviewing;
      case 4: return stageCounts.publishing;
      case 5: return stageCounts.completed;
      default: return 0;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">

      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[28px] font-serif font-bold text-[#1A1A18]">任務管理</h2>
        <button onClick={() => onNavigate('analysis')} className="bg-white border border-[#E2DDD4] text-[#1A1A18] px-6 py-3 rounded-full font-bold text-sm hover:border-[#1A1A18] hover:shadow-md transition-all flex items-center gap-2 group">
          <div className="w-6 h-6 bg-[#FDF0ED] rounded-full flex items-center justify-center group-hover:bg-[#C8522A] transition-colors">
            <TrendingUp size={14} className="text-[#C8522A] group-hover:text-white transition-colors" />
          </div>
          進入成效分析看板
        </button>
      </div>

      <div className="bg-[#1A1A18] rounded-[2rem] p-8 mb-10 flex items-center justify-between shadow-xl relative overflow-hidden border border-[#E2DDD4]">
        <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-[#C8522A]/20 to-transparent"></div>
        <div className="relative z-10">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span className="text-[#C8522A]">💡</span> 賺取分潤超簡單，跟著進度走！
          </h3>
          <div className="flex items-center gap-4 text-sm font-bold text-[#F5F0E8]/80">
            <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">1</span> 申請任務</span>
            <ChevronRight size={14} className="text-[#8C8880]" />
            <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">2</span> 撰寫文案</span>
            <ChevronRight size={14} className="text-[#8C8880]" />
            <span className="flex items-center gap-1.5"><span className="w-6 h-6 rounded-full bg-[#C8522A] flex items-center justify-center text-white text-xs shadow-md">3</span> 發布貼文賺獎金</span>
          </div>
        </div>
        <button onClick={() => onNavigate('apply')} className="relative z-10 bg-white text-[#1A1A18] px-8 py-3.5 rounded-full font-bold text-sm hover:bg-[#F5F0E8] transition-all shadow-md active:scale-95">
          前往探索新任務
        </button>
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

      <div className="flex justify-between items-end mb-6 px-2">
        <h3 className="text-xl font-bold text-[#1A1A18] flex items-center gap-2">
          {STAGES.find(s => s.id === activeStage)?.label}
          <span className="text-[#8C8880] text-sm">({tasks.length})</span>
        </h3>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#8C8880] font-bold">載入中...</div>
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
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-[#F5F0E8] rounded-2xl flex items-center justify-center shrink-0 border border-[#E2DDD4]">
                  {task.campaignImage ? (
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
    </div>
  );
}