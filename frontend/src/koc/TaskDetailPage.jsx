import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Smile, Send, CheckCircle2, Edit3, AlertCircle, Info, Calendar, Ticket, Loader2 } from 'lucide-react';
import api from '../api/index';
import { getOrCreateChatRoom, getChatHistory, sendChatMessage } from '../api/koc';

function formatMessageTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

export default function TaskDetailPage({ task, onBack }) {
  const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copyText, setCopyText] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 推廣中畫面用的成效數據（優惠碼使用次數 + 銷量圖表）
  const [chartData, setChartData] = useState([]);
  const [usageCount, setUsageCount] = useState(0);
  const [chartPeriod, setChartPeriod] = useState('month');
  const [chartLoading, setChartLoading] = useState(true);

  // 聊天室相關狀態
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);

  // 載入任務詳情
  useEffect(() => {
    if (!task) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.get('/koc/mission/getDetail', {
          params: { KOCMission_id: task.id }
        });
        if (res.data.success) {
          setDetail(res.data);
          // 如果有草稿內容，預填進文字框
          setCopyText(res.data.draft_content || '');
        }
      } catch (err) {
        console.error('載入任務詳情失敗', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [task]);

  // 建立/取得聊天室，並每 5 秒輪詢一次歷史訊息
  useEffect(() => {
    if (!task) return;
    let intervalId;
    let cancelled = false;

    const fetchHistory = async (currentRoomId) => {
      try {
        const res = await getChatHistory(currentRoomId);
        if (res.data.success && !cancelled) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.error('載入聊天室訊息失敗', err);
      }
    };

    const initChatRoom = async () => {
      try {
        const res = await getOrCreateChatRoom(task.id);
        if (res.data.success && !cancelled) {
          setRoomId(res.data.room_id);
          await fetchHistory(res.data.room_id);
          intervalId = setInterval(() => fetchHistory(res.data.room_id), 5000);
        }
      } catch (err) {
        console.error('建立聊天室失敗', err);
      }
    };

    setRoomId(null);
    setMessages([]);
    initChatRoom();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [task]);

  // 有新訊息時自動捲到最下面
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 推廣中（stage=3）才需要撈優惠碼使用次數與銷量圖表
  useEffect(() => {
    if (!task || detail?.stage !== 3) return;

    let cancelled = false;
    const fetchAnalytics = async () => {
      setChartLoading(true);
      try {
        const res = await api.get('/koc/analytics/getDetail', {
          params: { KOCMission_id: task.id, period: chartPeriod }
        });
        if (cancelled) return;
        if (res.data.success) {
          setChartData(res.data.chart_data);
          setUsageCount(res.data.usage_count);
        }
      } catch (err) {
        if (!cancelled) console.error('載入銷售數據失敗', err);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    };
    fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, [task, detail?.stage, chartPeriod]);

  const handleSendMessage = async () => {
    const content = chatInput.trim();
    if (!content || !roomId || sendingMessage) return;
    setSendingMessage(true);
    try {
      const res = await sendChatMessage({
        room_id: roomId,
        sender_role: 'koc',
        sender_id: user_id,
        content,
      });
      if (res.data.success) {
        setMessages(prev => [...prev, res.data.message]);
        setChatInput('');
      } else {
        alert(res.data.err || '傳送失敗');
      }
    } catch (err) {
      console.error('傳送訊息失敗', err);
      alert('傳送失敗，請稍後再試');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!task) return null;
  if (loading || !detail) return (
    <div className="flex items-center justify-center h-64 text-[#8C8880] font-bold">
      載入中...
    </div>
  );

  // API 回傳 0=writing, 1=reviewing, 2=publishing, 3=promoting, 4=completed
  const STAGE_NUM_TO_KEY = ['writing', 'reviewing', 'publishing', 'promoting', 'completed'];
  const stage = STAGE_NUM_TO_KEY[detail.stage];
  const vendorFeedback = detail?.vendor_feedback;
  const draftContent = detail?.draft_content;
  const promoCode = detail?.promotion_code || task.promoCode || null;
  const deadline = task.deadline || detail?.deadline;
  const earningsTotal = detail?.earnings_total || 0;

  // 畫面邏輯
  const isEditable = stage === 'writing' || (stage === 'reviewing' && vendorFeedback);  // 撰寫中，或已繳交被退回
  const isReviewing = stage === 'reviewing' && !vendorFeedback;                          // 已繳交，廠商審核中
  const isWaitUpload = stage === 'publishing';                                           // 上傳作品
  const isPromoting = stage === 'promoting';                                             // 推廣中
  const isCompleted = stage === 'completed';                                             // 已結案

  // 推廣中圖表的 Y 軸最大值（動態調整）
  const chartMaxValue = Math.max(...chartData.map(d => d.y_value), 1);

  // 儲存草稿
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await api.post('/koc/mission/saveDraft', {
        KOCMission_id: task.id,
        submission_type: '0',
        text_content: copyText,
      });
      if (res.data.success) {
        alert('草稿已成功儲存！');
      } else {
        alert(res.data.err || '儲存失敗');
      }
    } catch (err) {
      console.error('儲存草稿失敗:', err);
      alert('草稿儲存失敗，請稍後再試。');
    } finally {
      setIsSaving(false);
    }
  };

  // 提交文案
  const handleSubmitCopy = async () => {
    if (!copyText.trim()) {
      alert('請輸入文案內容');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/koc/mission/submit', {
        KOCMission_id: task.id,
        submission_type: '0',
        text_content: copyText,
      });
      if (res.data.success) {
        setShowModal(false);
        // 更新 detail 狀態，讓畫面切換到「審核中」
        setDetail(prev => ({ ...prev, stage: 1, vendor_feedback: null }));
        alert('文案已送出審核！');
      } else {
        alert(res.data.err || '提交失敗');
      }
    } catch (err) {
      console.error('提交失敗', err);
      alert('提交失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 提交連結
  const handleSubmitLink = async () => {
    if (!linkText.trim()) return alert('請輸入連結！');
    setIsSubmitting(true);
    try {
      const res = await api.post('/koc/mission/submit', {
        KOCMission_id: task.id,
        submission_type: '1',
        content_url: linkText,
      });
      if (res.data.success) {
        alert('已成功提交連結，優惠碼已生效，開始推廣囉！');
        // 跳回任務列表，並通知 HomePage 切換到「推廣中」分頁 (activeStage = 4)
        onBack(4);
      } else {
        alert(res.data.err || '提交失敗');
      }
    } catch (err) {
      console.error('提交連結失敗', err);
      alert('提交失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] max-w-[1400px] mx-auto animate-in fade-in duration-300 gap-8 pb-8">
      
      {/* 左側：主要內容區 */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <button onClick={() => onBack(task.stage)} className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          返回接案中心
        </button>

        <div className="mb-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-xs font-black text-[#8C8880] tracking-widest uppercase mb-2 block">{task.vendor}</span>
              <h2 className="text-[32px] font-serif font-black text-[#1A1A18] tracking-tight leading-tight">
                {task.productName}
              </h2>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold border flex items-center gap-2 ${
              isCompleted
                ? 'bg-[#F5F0E8] text-[#8C8880] border-[#E2DDD4]'
                : 'bg-green-50 text-green-600 border-green-100'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-[#8C8880]' : 'bg-green-600 animate-pulse'}`}></span>
              {isCompleted ? '已完成' : '執行中'}
            </div>
          </div>

          <div className="bg-[#1A1A18] rounded-3xl p-6 flex justify-between items-center shadow-lg border border-[#E2DDD4]/20">
            <div className="flex items-center gap-8 text-[#F5F0E8]">
              <div>
                <p className="text-[#8C8880] text-xs font-bold mb-1">任務截止日</p>
                <p className="font-mono font-bold flex items-center gap-2">
                  <Calendar size={14}/> {deadline || '未設定'}
                </p>
              </div>
              <div className="w-px h-8 bg-[#8C8880]/30"></div>
              <div>
                <p className="text-[#8C8880] text-xs font-bold mb-1">專屬優惠碼</p>
                <p className="font-mono font-black text-[#C8522A] tracking-wider">{promoCode || '無'}</p>
              </div>
              <div className="w-px h-8 bg-[#8C8880]/30"></div>
              <div>
                <p className="text-[#8C8880] text-xs font-bold mb-1">{isPromoting ? '目前累積分潤' : '預估分潤收益'}</p>
                <p className="font-bold">
                  {isPromoting ? `NT$ ${earningsTotal.toLocaleString()}` : `NT$ ${task.reward || '依實際轉換計算'}`}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm p-10 flex flex-col overflow-y-auto">
          
          {/* 情境 1：可以填寫/修改文案 */}
          {isEditable && (
            <div className="animate-in fade-in duration-500 max-w-2xl mx-auto w-full mt-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#F5F0E8] rounded-full flex items-center justify-center text-[#1A1A18]">
                  <Edit3 size={18} />
                </div>
                <h3 className="text-2xl font-bold text-[#1A1A18]">撰寫文案草稿</h3>
              </div>

              {vendorFeedback && (
                <div className="mb-6 bg-[#FDF0ED] border border-[#FDF0ED] rounded-2xl px-6 py-5 flex gap-3 shadow-sm">
                  <AlertCircle size={20} className="text-[#C8522A] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#C8522A] font-black text-xs uppercase tracking-wider mb-1 block">廠商要求修改</span>
                    <span className="text-sm text-[#1A1A18] font-bold leading-relaxed">{vendorFeedback}</span>
                  </div>
                </div>
              )}
              
              <div
                onClick={() => setShowModal(true)}
                className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl p-6 min-h-[160px] cursor-pointer hover:border-[#C8522A] hover:bg-white transition-all group flex flex-col justify-center items-center gap-3 shadow-sm"
              >
                <Edit3 size={24} className="text-[#8C8880] group-hover:text-[#C8522A] transition-colors" />
                <span className="text-[#8C8880] font-bold group-hover:text-[#1A1A18] transition-colors">
                  {draftContent
                    ? '偵測到您有儲存的草稿，點此繼續編輯...'
                    : (vendorFeedback ? '點此修改您的文案草稿...' : '點擊開始撰寫您的文案草稿...')}
                </span>
                {draftContent && (
                  <span className="text-xs text-[#8C8880] bg-[#F5F0E8] px-3 py-1 rounded-md line-clamp-1 max-w-md">
                    目前內容：{draftContent}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 情境 2：廠商審核中 */}
          {isReviewing && (
            <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="w-24 h-24 bg-[#FDF0ED] rounded-full flex items-center justify-center mb-6 shadow-inner border border-[#C8522A]/20">
                <CheckCircle2 size={48} className="text-[#C8522A]" />
              </div>
              <h3 className="text-2xl font-bold text-[#1A1A18] mb-3">文案已送出審核</h3>
              <p className="text-[#8C8880] font-medium leading-relaxed">
                廠商正在確認您的文案內容。<br/>審核通過後，任務將會自動移至「作品上傳」階段。
              </p>
            </div>
          )}

          {/* 情境 3：上傳作品 */}
          {isWaitUpload && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full mt-4">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[#FDF0ED] rounded-full flex items-center justify-center text-[#C8522A]">
                  <CheckCircle2 size={18} />
                </div>
                <h3 className="text-2xl font-bold text-[#1A1A18]">文案審核已通過！</h3>
              </div>

              <div className="bg-[#F8F9FA] rounded-2xl p-8 border border-[#E2DDD4]">
                <p className="text-[#1A1A18] font-bold mb-6 flex items-center gap-2">
                  <Info size={16} className="text-[#C8522A]" /> 優惠碼已生效！請將完成的貼文發佈至社群，並上傳作品連結。
                </p>
                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="請上傳貼文連結 (例如: https://instagram.com/...)"
                    className="w-full bg-white border border-[#E2DDD4] rounded-xl px-5 py-4 text-sm text-[#1A1A18] placeholder:text-[#8C8880] font-medium outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all shadow-sm"
                  />
                  <button
                    onClick={handleSubmitLink}
                    disabled={isSubmitting}
                    className="w-full bg-[#1A1A18] text-[#F5F0E8] py-4 rounded-xl font-bold transition-all hover:bg-[#C8522A] shadow-md text-sm tracking-widest disabled:opacity-50"
                  >
                    確認上傳作品連結
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 情境 4：推廣中 */}
          {isPromoting && (
            <div className="animate-in fade-in duration-500 max-w-2xl mx-auto w-full mt-4">
              <h3 className="text-2xl font-bold text-[#1A1A18] mb-3 text-center">已繳交作品連結，推廣進行中！</h3>
              <p className="text-[#8C8880] font-medium leading-relaxed mb-8 text-center">
                活動截止日後，任務將自動結案並計算最終分潤
              </p>

              <div className="flex items-center justify-between mb-6">
                <p className="text-[#1A1A18] font-black text-lg flex items-center gap-3">
                  <span className="w-2 h-8 bg-[#1A1A18] rounded-full"></span>
                  優惠碼使用次數：<span className="text-[#C8522A]">{usageCount}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartPeriod('week')}
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                      chartPeriod === 'week'
                        ? 'bg-[#1A1A18] text-white'
                        : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
                    }`}
                  >
                    週
                  </button>
                  <button
                    onClick={() => setChartPeriod('month')}
                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                      chartPeriod === 'month'
                        ? 'bg-[#1A1A18] text-white'
                        : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
                    }`}
                  >
                    月
                  </button>
                </div>
              </div>

              <div className="bg-[#F8F9FA] rounded-2xl p-8 border border-[#E2DDD4]">
                {chartLoading ? (
                  <div className="h-56 flex items-center justify-center text-[#8C8880] font-bold">
                    載入中...
                  </div>
                ) : (
                  <div className="h-56 w-full flex items-end gap-3 border-l-2 border-b-2 border-[#E2DDD4] relative pt-8 pl-10 overflow-x-auto">
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-1 text-[10px] text-[#8C8880] font-bold">
                      <span>{chartMaxValue}</span>
                      <span>
                        {(() => {
                          const mid = Math.round(chartMaxValue * 0.5);
                          // 使用次數是整數，最大值太小時中間刻度會跟最大值或 0 重複，這種情況就不顯示
                          return mid > 0 && mid < chartMaxValue ? mid : '';
                        })()}
                      </span>
                      <span className="translate-y-2">0</span>
                    </div>
                    {chartData.map((item, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group min-w-[20px]">
                        <div
                          className="w-2.5 bg-gradient-to-t from-[#D6714E] to-[#C8522A] rounded-t-full transition-all group-hover:from-[#A64220] group-hover:scale-x-125"
                          style={{ height: `${chartMaxValue > 0 ? (item.y_value / chartMaxValue) * 100 : 0}%` }}
                        />
                        <span className="text-[9px] text-[#8C8880] mt-3 font-bold rotate-45 origin-left whitespace-nowrap">
                          {item.x_label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 情境 5：已完成 */}
          {isCompleted && (
            <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="w-24 h-24 bg-[#F5F0E8] rounded-full flex items-center justify-center mb-6 shadow-inner border border-[#E2DDD4]">
                <CheckCircle2 size={48} className="text-[#8C8880]" />
              </div>
              <h3 className="text-2xl font-bold text-[#1A1A18] mb-3">任務已完成</h3>
              <p className="text-[#8C8880] font-medium leading-relaxed mb-8">
                感謝您的合作！這個任務已經順利結案，分潤將依實際轉換計算，完成後會出現在您的收益明細中。
              </p>
              <button
                onClick={() => onBack(task.stage)}
                className="bg-[#1A1A18] text-[#F5F0E8] px-8 py-3.5 rounded-2xl font-bold text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-md"
              >
                返回接案中心
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 右側：聊天室 */}
      <div className="w-[380px] bg-[#F5F0E8] rounded-[2rem] p-4 flex flex-col relative shrink-0 shadow-sm border border-[#E2DDD4]">
        <div className="bg-white rounded-t-[1.5rem] p-5 border-b border-[#E2DDD4] flex items-center gap-4 shadow-sm z-10">
          <div className="w-10 h-10 bg-[#F5F0E8] rounded-full flex items-center justify-center border border-[#E2DDD4]">
            <User size={20} className="text-[#8C8880]" />
          </div>
          <div>
            <span className="font-bold text-[#1A1A18] block">{task.vendor || '廠商'}</span>
            <span className="text-[10px] text-[#8C8880] font-bold">線上客服</span>
          </div>
        </div>
        <div className="flex-1 bg-white p-6 overflow-y-auto flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="text-center text-xs text-[#8C8880] my-4 font-bold">您已加入聊天室，可隨時與廠商聯繫</div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.message_id}
              className={`flex flex-col ${msg.sender_role === 'koc' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                  msg.sender_role === 'koc'
                    ? 'bg-[#1A1A18] text-[#F5F0E8] rounded-br-md'
                    : 'bg-[#F5F0E8] text-[#1A1A18] rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-[#8C8880] font-bold mt-1 px-1">
                {formatMessageTime(msg.created_at)}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="bg-[#F5F0E8] p-4 rounded-b-[1.5rem]">
          <div className="bg-white rounded-full flex items-center px-4 py-2 gap-3 shadow-sm border border-[#E2DDD4] focus-within:border-[#1A1A18] transition-colors">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="傳送訊息..."
              disabled={!roomId}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#8C8880] disabled:opacity-50"
            />
            <Smile size={20} className="text-[#8C8880] cursor-pointer hover:text-[#1A1A18]" />
            <button
              onClick={handleSendMessage}
              disabled={!roomId || !chatInput.trim() || sendingMessage}
              className="bg-[#1A1A18] text-[#F5F0E8] p-2 rounded-full hover:bg-[#C8522A] shadow-md disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 文案撰寫彈出視窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1A1A18]/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E2DDD4]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1A1A18]">編輯文案草稿</h3>
            </div>

            {vendorFeedback && (
              <div className="mb-6 bg-[#FDF0ED] text-[#C8522A] px-6 py-4 rounded-2xl text-sm font-bold border border-[#FDF0ED] leading-relaxed shadow-sm">
                <span className="text-xs uppercase tracking-tighter block mb-1 opacity-80">廠商要求修改：</span>
                {vendorFeedback}
              </div>
            )}

            <textarea
              value={copyText}
              onChange={(e) => setCopyText(e.target.value)}
              placeholder="請輸入欲發佈的圖文內容草稿...."
              className="w-full h-64 bg-[#F8F9FA] border border-[#E2DDD4] rounded-[1.5rem] p-6 outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 resize-none mb-6 text-[#1A1A18] leading-relaxed transition-all placeholder:text-[#8C8880] font-medium shadow-inner"
            />

            <div className="flex justify-between items-end mb-8 bg-[#F5F0E8] p-4 rounded-xl border border-[#E2DDD4]">
              <div className="text-xs font-bold text-[#8C8880] space-y-1.5 ml-2">
                <p className="text-[#1A1A18] mb-1">發佈規範：</p>
                <p>• 文案長度建議大於 50 字</p>
                <p>• 請務必包含專屬優惠碼：
                  <span className="text-[#C8522A] bg-white px-2 py-0.5 rounded-md border border-[#E2DDD4] ml-1">
                    {promoCode || '無'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowModal(false)}
                disabled={isSaving || isSubmitting}
                className="flex-1 bg-white border border-[#E2DDD4] text-[#8C8880] py-3.5 rounded-xl font-bold hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all text-sm disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={isSaving || isSubmitting}
                className="flex-1 bg-white border-2 border-[#1A1A18] text-[#1A1A18] py-3.5 rounded-xl font-bold hover:bg-[#1A1A18] hover:text-[#F5F0E8] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                {isSaving ? '儲存中...' : '儲存草稿'}
              </button>
              <button
                onClick={handleSubmitCopy}
                disabled={isSaving || isSubmitting}
                className="flex-[2] bg-[#1A1A18] text-[#F5F0E8] py-3.5 rounded-xl font-bold hover:bg-[#C8522A] transition-all shadow-lg text-sm tracking-widest disabled:opacity-50"
              >
                {isSubmitting ? '送出中...' : '確認送出審核'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}