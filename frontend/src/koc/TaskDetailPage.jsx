import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Edit3, AlertCircle, Info, Calendar, Ticket, Loader2, Ban, X, Copy, Check, MessageCircle } from 'lucide-react';
import api from '../api/index';
import { buildPromoLink } from '../config';

function StatTile({ label, value }) {
  return (
    <div className="bg-[#F5F0E8] rounded-xl p-3 xl:p-4 border border-[#E2DDD4]">
      <p className="text-[10px] xl:text-xs font-bold text-[#8C8880] mb-1">{label}</p>
      <p className="text-sm xl:text-lg font-black text-[#C8522A]">{value}</p>
    </div>
  );
}

function AnalyticsBarChart({ data, gradientClass }) {
  const maxValue = Math.max(...data.map(d => d.y_value), 1);
  return (
    <div className="h-full w-full flex items-end gap-3 border-l-2 border-b-2 border-[#E2DDD4] relative pt-8 pl-8 overflow-x-auto hide-scrollbar">
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-1 text-[10px] text-[#8C8880] font-bold">
        <span>{maxValue}</span>
        <span>
          {(() => {
            const mid = Math.round(maxValue * 0.5);
            return mid > 0 && mid < maxValue ? mid : '';
          })()}
        </span>
        <span className="translate-y-2">0</span>
      </div>
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group min-w-[20px] md:min-w-[30px]">
          <span className="text-[9px] md:text-[10px] text-[#1A1A18] font-bold mb-1">
            {item.y_value}
          </span>
          <div
            className={`w-2.5 md:w-3 ${gradientClass} rounded-t-full transition-all group-hover:scale-x-125`}
            style={{ height: `${maxValue > 0 ? (item.y_value / maxValue) * 100 : 0}%` }}
          />
          <span className="text-[9px] text-[#8C8880] mt-3 font-bold rotate-45 origin-left whitespace-nowrap">
            {item.x_label}
          </span>
        </div>
      ))}
    </div>
  );
}

// 成效分析：推廣中／已完成的任務共用同一份區塊，資料來自 GET /koc/analytics/getDetail
function AnalyticsSection({
  usageCount, totalCommission, clickCount, epc,
  chartData, clickChartData, chartPeriod, setChartPeriod, chartLoading,
}) {
  return (
    <div className="mt-6 xl:mt-8 w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 xl:mb-6 gap-3 sm:gap-0">
        <p className="text-[#1A1A18] font-black text-base xl:text-lg flex items-center gap-2 xl:gap-3">
          <span className="hidden sm:block w-1.5 h-6 xl:w-2 xl:h-8 bg-[#1A1A18] rounded-full"></span>
          推廣效益分析
        </p>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setChartPeriod('week')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-xs font-bold transition-all ${
              chartPeriod === 'week'
                ? 'bg-[#1A1A18] text-white'
                : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
            }`}
          >
            週
          </button>
          <button
            onClick={() => setChartPeriod('month')}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-xs font-bold transition-all ${
              chartPeriod === 'month'
                ? 'bg-[#1A1A18] text-white'
                : 'bg-white border border-[#E2DDD4] text-[#8C8880] hover:bg-[#F5F0E8]'
            }`}
          >
            月
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 xl:gap-4 mb-4 xl:mb-6">
        <StatTile label="成功帶貨數量" value={usageCount} />
        <StatTile label="累積分潤" value={`NT$ ${totalCommission.toLocaleString()}`} />
        <StatTile label="連結點擊次數" value={clickCount} />
      </div>

      <div className="bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl xl:rounded-2xl px-4 py-3 xl:px-6 xl:py-4 mb-4 xl:mb-6 text-center">
        <p className="text-xs xl:text-sm font-bold text-[#1A1A18]">
          你的連結每被點擊一次，平均就能幫你賺進 <span className="text-[#C8522A] font-black">NT$ {epc}</span> 元！
        </p>
      </div>

      <div className="bg-[#F8F9FA] rounded-xl xl:rounded-2xl p-4 xl:p-8 border border-[#E2DDD4] mb-4 xl:mb-6">
        <p className="text-sm xl:text-base font-bold text-[#1A1A18] mb-3">銷量走勢</p>
        <div className="h-64 md:h-72">
          {chartLoading ? (
            <div className="h-full flex items-center justify-center text-[#8C8880] font-bold text-sm">載入中...</div>
          ) : (
            <AnalyticsBarChart data={chartData} gradientClass="bg-gradient-to-t from-[#D6714E] to-[#C8522A]" />
          )}
        </div>
      </div>

      <div className="bg-[#F8F9FA] rounded-xl xl:rounded-2xl p-4 xl:p-8 border border-[#E2DDD4]">
        <p className="text-sm xl:text-base font-bold text-[#1A1A18] mb-3">點擊次數</p>
        <div className="h-64 md:h-72">
          {chartLoading ? (
            <div className="h-full flex items-center justify-center text-[#8C8880] font-bold text-sm">載入中...</div>
          ) : (
            <AnalyticsBarChart data={clickChartData} gradientClass="bg-gradient-to-t from-[#D9C08F] to-[#B89B6A]" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function TaskDetailPage({ task, onBack }) {
  const navigate = useNavigate();
  const user_id = localStorage.getItem('userId'); // 每次渲染重新讀取，避免登入前就被凍結
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copyText, setCopyText] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // 推廣中／已完成畫面用的成效分析數據（出單數、累積分潤、點擊數、EPC、銷量與點擊走勢圖）
  const [chartData, setChartData] = useState([]);
  const [clickChartData, setClickChartData] = useState([]);
  const [usageCount, setUsageCount] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [epc, setEpc] = useState(0);
  const [chartPeriod, setChartPeriod] = useState('month');
  const [chartLoading, setChartLoading] = useState(true);

  // 載入任務詳情
  useEffect(() => {
    if (!task) return;
    const fetchDetail = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await api.get('/koc/mission/getDetail', {
          params: { KOCMission_id: task.id }
        });
        if (res.data.success) {
          setDetail(res.data);
          // 如果有草稿內容，預填進文字框
          setCopyText(res.data.draft_content || '');
        } else {
          setLoadError(res.data.err || '任務載入失敗');
        }
      } catch (err) {
        console.error('載入任務詳情失敗', err);
        setLoadError('任務載入失敗，請稍後再試');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [task]);

  // 推廣中（stage=3）或已完成（stage=4）都要撈成效分析：出單數、累積分潤、點擊數、EPC、兩張走勢圖
  useEffect(() => {
    if (!task || (detail?.stage !== 3 && detail?.stage !== 4)) return;

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
          setClickChartData(res.data.click_chart_data || []);
          setUsageCount(res.data.usage_count);
          setTotalCommission(res.data.total_commision);
          setClickCount(res.data.click_count ?? 0);
          setEpc(res.data.epc ?? 0);
        }
      } catch (err) {
        if (!cancelled) console.error('載入成效分析失敗', err);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    };
    fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, [task, detail?.stage, chartPeriod]);

  if (!task) return null;

  if (loadError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-[#8C8880] font-bold">
      <p>{loadError}</p>
      <button
        onClick={() => onBack(task.stage)}
        className="bg-[#1A1A18] text-[#F5F0E8] px-6 py-3 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all"
      >
        返回接案中心
      </button>
    </div>
  );

  if (loading || !detail) return (
    <div className="flex items-center justify-center h-64 text-[#8C8880] font-bold text-sm md:text-base">
      載入中...
    </div>
  );

  // API 回傳 0=writing, 1=reviewing, 2=publishing, 3=promoting, 4=completed
  const STAGE_NUM_TO_KEY = ['writing', 'reviewing', 'publishing', 'promoting', 'completed'];
  const stage = STAGE_NUM_TO_KEY[detail.stage];
  const vendorFeedback = detail?.vendor_feedback;
  const draftContent = detail?.draft_content;
  const promoCode = detail?.promotion_code || task.promoCode || null;

  const handleCopyPromoLink = () => {
    if (!promoCode) return;
    navigator.clipboard.writeText(buildPromoLink(promoCode));
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  const deadline = task.deadline || detail?.deadline;
  const earningsTotal = detail?.earnings_total || 0;

  // 畫面邏輯
  const isEditable = stage === 'writing' || (stage === 'reviewing' && vendorFeedback);  // 撰寫中，或已繳交被退回
  const isReviewing = stage === 'reviewing' && !vendorFeedback;                          // 已繳交，廠商審核中
  const isWaitUpload = stage === 'publishing';                                           // 上傳作品
  const isPromoting = stage === 'promoting';                                             // 推廣中
  const isCompleted = stage === 'completed';                                             // 已結案

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

  // KOC 自行取消尚未結束的任務
  const handleCancelMission = async () => {
    setCancelling(true);
    try {
      const res = await api.post('/koc/mission/cancel', {
        User_id: user_id,
        kocmission_id: task.id,
      });

      if (!res.data.success) {
        alert(res.data.err || '取消失敗，請稍後再試');
        return;
      }

      setShowCancelModal(false);

      if (res.data.suspended) {
        const untilText = res.data.suspended_until
          ? new Date(res.data.suspended_until).toLocaleDateString('zh-TW')
          : '';
        alert(`接案已取消。由於違規次數已達 ${res.data.max_violation_count} 次，您的接案權限已被凍結${untilText ? `至 ${untilText}` : ''}。`);
      } else {
        alert('接案已取消。');
      }

      // 跳回接案中心，並切到「已結束」分頁 (activeStage = 5)
      onBack(5);
    } catch (err) {
      console.error('取消任務失敗', err);
      alert('取消失敗，請稍後再試');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-4xl mx-auto animate-in fade-in duration-300 gap-6 p-4 xl:p-0 pb-12 xl:pb-8">

      <div className="flex flex-col">

        <button onClick={() => onBack(task.stage)} className="mb-4 xl:mb-6 flex items-center gap-1.5 xl:gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-xs xl:text-sm group w-fit bg-white xl:bg-transparent px-3 xl:px-0 py-1.5 xl:py-0 rounded-full border border-[#E2DDD4] xl:border-transparent shadow-sm xl:shadow-none">
          <ArrowLeft size={16} className="xl:w-4 xl:h-4 transition-transform group-hover:-translate-x-1" />
          返回接案中心
        </button>

        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-4 gap-3 sm:gap-0">
            <div>
              <span className="text-[10px] xl:text-xs font-black text-[#8C8880] tracking-widest uppercase mb-1.5 xl:mb-2 block">{task.vendor}</span>
              <h2 className="text-2xl xl:text-[32px] font-serif font-black text-[#1A1A18] tracking-tight leading-tight">
                {task.productName}
              </h2>
            </div>
            <div className={`w-fit px-3 xl:px-4 py-1 xl:py-1.5 rounded-full text-xs xl:text-sm font-bold border flex items-center gap-1.5 xl:gap-2 ${
              isCompleted
                ? 'bg-[#F5F0E8] text-[#8C8880] border-[#E2DDD4]'
                : 'bg-green-50 text-green-600 border-green-100'
            }`}>
              <span className={`w-1.5 h-1.5 xl:w-2 xl:h-2 rounded-full ${isCompleted ? 'bg-[#8C8880]' : 'bg-green-600 animate-pulse'}`}></span>
              {isCompleted ? '已完成' : '執行中'}
            </div>
          </div>

          <div className="bg-[#1A1A18] rounded-2xl xl:rounded-3xl p-5 xl:p-6 shadow-lg border border-[#E2DDD4]/20">
            <div className="grid grid-cols-2 md:flex md:items-center gap-4 xl:gap-8 text-[#F5F0E8]">
              <div>
                <p className="text-[#8C8880] text-[10px] xl:text-xs font-bold mb-1">任務截止日</p>
                <p className="font-mono text-sm xl:text-base font-bold flex items-center gap-1.5 xl:gap-2">
                  <Calendar size={14} className="xl:w-4 xl:h-4"/> {deadline || '未設定'}
                </p>
              </div>
              <div className="hidden md:block w-px h-8 bg-[#8C8880]/30"></div>
              <div>
                <p className="text-[#8C8880] text-[10px] xl:text-xs font-bold mb-1">專屬優惠碼</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm xl:text-base font-black text-[#C8522A] tracking-wider">{promoCode || '無'}</p>
                  {promoCode && (
                    <button
                      type="button"
                      onClick={handleCopyPromoLink}
                      className="flex items-center gap-1 text-[10px] xl:text-xs font-bold text-[#F5F0E8] bg-[#C8522A] hover:bg-[#C8522A]/80 px-2 py-1 rounded-full transition-all"
                    >
                      {linkCopied ? <Check size={12} /> : <Copy size={12} />}
                      {linkCopied ? '已複製' : '複製推廣連結'}
                    </button>
                  )}
                </div>
              </div>
              <div className="hidden md:block w-px h-8 bg-[#8C8880]/30"></div>
              <div className="col-span-2 md:col-span-1 border-t border-[#8C8880]/30 md:border-0 pt-3 md:pt-0">
                <p className="text-[#8C8880] text-[10px] xl:text-xs font-bold mb-1">{isPromoting ? '目前累積分潤' : '預估分潤收益'}</p>
                <p className="font-bold text-sm xl:text-base">
                  {isPromoting ? `NT$ ${earningsTotal.toLocaleString()}` : `NT$ ${task.reward || '依實際轉換計算'}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={() => navigate(`/chat?mission=${task.id}`)}
              className="flex items-center gap-1.5 text-xs xl:text-sm font-bold text-[#8C8880] hover:text-[#C8522A] transition-colors bg-white border border-[#E2DDD4] px-4 py-2 rounded-full"
            >
              <MessageCircle size={14} />
              發送訊息給廠商
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl xl:rounded-[2rem] border border-[#E2DDD4] shadow-sm p-6 xl:p-10 flex flex-col overflow-y-auto custom-scrollbar min-h-[400px]">
          
          {/* 情境 1：可以填寫/修改文案 */}
          {isEditable && (
            <div className="animate-in fade-in duration-500 max-w-2xl mx-auto w-full mt-2 xl:mt-4 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 xl:gap-3 mb-4 xl:mb-6">
                <div className="w-8 h-8 xl:w-10 xl:h-10 bg-[#F5F0E8] rounded-full flex items-center justify-center text-[#1A1A18]">
                  <Edit3 size={16} className="xl:w-[18px] xl:h-[18px]" />
                </div>
                <h3 className="text-xl xl:text-2xl font-bold text-[#1A1A18]">撰寫文案草稿</h3>
              </div>

              {vendorFeedback && (
                <div className="mb-4 xl:mb-6 bg-[#FDF0ED] border border-[#FDF0ED] rounded-xl xl:rounded-2xl px-4 xl:px-6 py-4 xl:py-5 flex gap-2.5 xl:gap-3 shadow-sm">
                  <AlertCircle size={18} className="text-[#C8522A] shrink-0 mt-0.5 xl:w-5 xl:h-5" />
                  <div>
                    <span className="text-[#C8522A] font-black text-[10px] xl:text-xs uppercase tracking-wider mb-1 block">廠商要求修改</span>
                    <span className="text-xs xl:text-sm text-[#1A1A18] font-bold leading-relaxed">{vendorFeedback}</span>
                  </div>
                </div>
              )}
              
              <div
                onClick={() => setShowModal(true)}
                className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl xl:rounded-2xl p-5 xl:p-6 min-h-[140px] xl:min-h-[160px] cursor-pointer hover:border-[#C8522A] hover:bg-white transition-all group flex flex-col justify-center items-center gap-2.5 xl:gap-3 shadow-sm text-center"
              >
                <Edit3 size={20} className="text-[#8C8880] group-hover:text-[#C8522A] transition-colors xl:w-6 xl:h-6" />
                <span className="text-sm xl:text-base text-[#8C8880] font-bold group-hover:text-[#1A1A18] transition-colors">
                  {draftContent
                    ? '偵測到您有儲存的草稿，點此繼續編輯...'
                    : (vendorFeedback ? '點此修改您的文案草稿...' : '點擊開始撰寫您的文案草稿...')}
                </span>
                {draftContent && (
                  <span className="text-[10px] xl:text-xs text-[#8C8880] bg-[#F5F0E8] px-2.5 py-1 rounded-md line-clamp-2 xl:line-clamp-1 max-w-md">
                    目前內容：{draftContent}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 情境 2：廠商審核中 */}
          {isReviewing && (
            <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="w-16 h-16 xl:w-24 xl:h-24 bg-[#FDF0ED] rounded-full flex items-center justify-center mb-4 xl:mb-6 shadow-inner border border-[#C8522A]/20">
                <CheckCircle2 size={32} className="text-[#C8522A] xl:w-12 xl:h-12" />
              </div>
              <h3 className="text-xl xl:text-2xl font-bold text-[#1A1A18] mb-2 xl:mb-3">文案已送出審核</h3>
              <p className="text-xs xl:text-sm text-[#8C8880] font-medium leading-relaxed">
                廠商正在確認您的文案內容。<br/>審核通過後，任務將會自動移至「作品上傳」階段。
              </p>
            </div>
          )}

          {/* 情境 3：上傳作品 */}
          {isWaitUpload && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full mt-2 xl:mt-4 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 xl:gap-3 mb-6 xl:mb-8">
                <div className="w-8 h-8 xl:w-10 xl:h-10 bg-[#FDF0ED] rounded-full flex items-center justify-center text-[#C8522A]">
                  <CheckCircle2 size={16} className="xl:w-[18px] xl:h-[18px]" />
                </div>
                <h3 className="text-xl xl:text-2xl font-bold text-[#1A1A18]">文案審核已通過！</h3>
              </div>

              <div className="bg-[#F8F9FA] rounded-xl xl:rounded-2xl p-5 xl:p-8 border border-[#E2DDD4]">
                <p className="text-[#1A1A18] font-bold text-xs xl:text-sm mb-4 xl:mb-6 flex items-start gap-1.5 xl:gap-2 leading-relaxed">
                  <Info size={16} className="text-[#C8522A] shrink-0 mt-0.5" /> 優惠碼已生效！請將完成的貼文發佈至社群，並上傳作品連結。
                </p>
                <div className="flex flex-col gap-3 xl:gap-4">
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="請上傳貼文連結 (例如: https://instagram.com/...)"
                    className="w-full bg-white border border-[#E2DDD4] rounded-xl px-4 py-3 xl:px-5 xl:py-4 text-xs xl:text-sm text-[#1A1A18] placeholder:text-[#8C8880] font-medium outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 transition-all shadow-sm"
                  />
                  <button
                    onClick={handleSubmitLink}
                    disabled={isSubmitting}
                    className="w-full bg-[#1A1A18] text-[#F5F0E8] py-3.5 xl:py-4 rounded-xl font-bold transition-all hover:bg-[#C8522A] shadow-md text-xs xl:text-sm tracking-widest disabled:opacity-50"
                  >
                    確認上傳作品連結
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 情境 4：推廣中 */}
          {isPromoting && (
            <div className="animate-in fade-in duration-500 max-w-2xl mx-auto w-full mt-2 xl:mt-4 flex-1 flex flex-col">
              <h3 className="text-xl xl:text-2xl font-bold text-[#1A1A18] mb-2 xl:mb-3 text-center">已繳交作品連結，推廣進行中！</h3>
              <p className="text-[11px] xl:text-sm text-[#8C8880] font-medium leading-relaxed text-center">
                活動截止日後，任務將自動結案並計算最終分潤
              </p>

              <AnalyticsSection
                usageCount={usageCount}
                totalCommission={totalCommission}
                clickCount={clickCount}
                epc={epc}
                chartData={chartData}
                clickChartData={clickChartData}
                chartPeriod={chartPeriod}
                setChartPeriod={setChartPeriod}
                chartLoading={chartLoading}
              />
            </div>
          )}

          {/* 情境 5：已完成 */}
          {isCompleted && (
            <div className="animate-in fade-in duration-500 max-w-2xl mx-auto w-full mt-2 xl:mt-4 flex-1 flex flex-col">
              <div className="flex flex-col items-center text-center max-w-md mx-auto">
                <div className="w-16 h-16 xl:w-24 xl:h-24 bg-[#F5F0E8] rounded-full flex items-center justify-center mb-4 xl:mb-6 shadow-inner border border-[#E2DDD4]">
                  <CheckCircle2 size={32} className="text-[#8C8880] xl:w-12 xl:h-12" />
                </div>
                <h3 className="text-xl xl:text-2xl font-bold text-[#1A1A18] mb-2 xl:mb-3">任務已完成</h3>
                <p className="text-xs xl:text-sm text-[#8C8880] font-medium leading-relaxed">
                  感謝您的合作！這個任務已經順利結案，分潤將依實際轉換計算，完成後會出現在您的收益明細中。
                </p>
              </div>

              <AnalyticsSection
                usageCount={usageCount}
                totalCommission={totalCommission}
                clickCount={clickCount}
                epc={epc}
                chartData={chartData}
                clickChartData={clickChartData}
                chartPeriod={chartPeriod}
                setChartPeriod={setChartPeriod}
                chartLoading={chartLoading}
              />

              <div className="flex justify-center mt-6 xl:mt-8">
                <button
                  onClick={() => onBack(task.stage)}
                  className="bg-[#1A1A18] text-[#F5F0E8] px-6 xl:px-8 py-3 xl:py-3.5 rounded-xl xl:rounded-2xl font-bold text-xs xl:text-sm hover:bg-[#C8522A] transition-all active:scale-95 shadow-md w-full sm:w-auto"
                >
                  返回接案中心
                </button>
              </div>
            </div>
          )}
        </div>

        {!isCompleted && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-[#E2DDD4] bg-white text-sm font-bold text-[#8C8880] hover:border-[#C8522A] hover:text-[#C8522A] transition-colors"
            >
              <Ban size={16} />
              取消接案
            </button>
          </div>
        )}
      </div>

      {/* 文案撰寫彈出視窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1A1A18]/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-[1.5rem] xl:rounded-[2rem] p-6 xl:p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E2DDD4] max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
            <div className="flex justify-between items-center mb-4 xl:mb-6 shrink-0">
              <h3 className="text-lg xl:text-xl font-bold text-[#1A1A18]">編輯文案草稿</h3>
              <button onClick={() => setShowModal(false)} className="xl:hidden p-1 text-[#8C8880] hover:text-[#1A1A18]">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {vendorFeedback && (
                <div className="mb-4 xl:mb-6 bg-[#FDF0ED] text-[#C8522A] px-4 xl:px-6 py-3 xl:py-4 rounded-xl xl:rounded-2xl text-[13px] xl:text-sm font-bold border border-[#FDF0ED] leading-relaxed shadow-sm">
                  <span className="text-[10px] xl:text-xs uppercase tracking-tighter block mb-1 opacity-80">廠商要求修改：</span>
                  {vendorFeedback}
                </div>
              )}

              <textarea
                value={copyText}
                onChange={(e) => setCopyText(e.target.value)}
                placeholder="請輸入欲發佈的圖文內容草稿...."
                className="w-full min-h-[200px] xl:h-64 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl xl:rounded-[1.5rem] p-4 xl:p-6 outline-none focus:border-[#C8522A] focus:ring-4 focus:ring-[#C8522A]/10 resize-none mb-4 xl:mb-6 text-[13px] xl:text-sm text-[#1A1A18] leading-relaxed transition-all placeholder:text-[#8C8880] font-medium shadow-inner custom-scrollbar"
              />

              <div className="flex justify-between items-end mb-6 xl:mb-8 bg-[#F5F0E8] p-3 xl:p-4 rounded-xl border border-[#E2DDD4]">
                <div className="text-[10px] xl:text-xs font-bold text-[#8C8880] space-y-1 xl:space-y-1.5 ml-1 xl:ml-2">
                  <p className="text-[#1A1A18] mb-0.5 xl:mb-1">發佈規範：</p>
                  <p>• 文案長度建議大於 50 字</p>
                  <p className="flex flex-wrap items-center gap-1">• 請務必包含專屬優惠碼：
                    <span className="text-[#C8522A] bg-white px-2 py-0.5 rounded-md border border-[#E2DDD4]">
                      {promoCode || '無'}
                    </span>
                  </p>
                  {promoCode && (
                    <p className="flex flex-wrap items-center gap-1">• 或直接分享推廣連結：
                      <button
                        type="button"
                        onClick={handleCopyPromoLink}
                        className="flex items-center gap-1 text-[#C8522A] bg-white px-2 py-0.5 rounded-md border border-[#E2DDD4] hover:border-[#C8522A] transition-all"
                      >
                        {linkCopied ? <Check size={11} /> : <Copy size={11} />}
                        {linkCopied ? '已複製' : '複製連結'}
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 xl:gap-4 shrink-0 pt-2">
              <button
                onClick={handleSaveDraft}
                disabled={isSaving || isSubmitting}
                className="flex-1 bg-white border-2 border-[#1A1A18] text-[#1A1A18] py-3 xl:py-3.5 rounded-xl font-bold hover:bg-[#1A1A18] hover:text-[#F5F0E8] transition-all text-xs xl:text-sm flex items-center justify-center gap-2 disabled:opacity-50 order-2 sm:order-1"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                {isSaving ? '儲存中...' : '儲存草稿'}
              </button>
              <button
                onClick={handleSubmitCopy}
                disabled={isSaving || isSubmitting}
                className="flex-[2] bg-[#1A1A18] text-[#F5F0E8] py-3 xl:py-3.5 rounded-xl font-bold hover:bg-[#C8522A] transition-all shadow-lg text-xs xl:text-sm tracking-widest disabled:opacity-50 order-1 sm:order-2"
              >
                {isSubmitting ? '送出中...' : '確認送出審核'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 取消任務確認視窗 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-[#1A1A18]/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E2DDD4]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#FDF0ED] flex items-center justify-center shrink-0">
                <AlertCircle size={20} className="text-[#C8522A]" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A18]">確定要取消這個接案嗎？</h3>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-xs text-amber-800 leading-relaxed">
              取消接案將會被記錄一次違規（任務放到過期沒完成也算違規），累計達 5 次，將凍結您的接案權限 3 個月（凍結期間無法申請新案件，進行中的任務不受影響）。
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 bg-white border border-[#E2DDD4] text-[#8C8880] py-3.5 rounded-2xl font-bold text-sm hover:bg-[#F8F9FA] hover:text-[#1A1A18] transition-all disabled:opacity-50"
              >
                再想想
              </button>
              <button
                onClick={handleCancelMission}
                disabled={cancelling}
                className="flex-1 bg-[#C8522A] text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-[#1A1A18] transition-all active:scale-95 shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling && <Loader2 size={16} className="animate-spin" />}
                確認取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}