import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import api from '../api/index';

function toRocDate(isoDateOrNow) {
  const d = isoDateOrNow ? new Date(isoDateOrNow) : new Date();
  const rocYear = d.getFullYear() - 1911;
  return `${rocYear} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

// 扣繳規則：給付金額達 20,000 元才扣，居住者扣繳 10%、非居住者扣繳 20%；
// 二代健保補充保費同樣以 20,000 元為門檻，達門檻扣 2.11%。
const WITHHOLDING_THRESHOLD = 20000;
const RESIDENT_WITHHOLDING_RATE = 0.1;
const NON_RESIDENT_WITHHOLDING_RATE = 0.2;
const NHI_SUPPLEMENT_RATE = 0.0211;

function computeTaxes(amount, residency) {
  const reachedThreshold = amount >= WITHHOLDING_THRESHOLD;

  const withholdingRate = residency === 'non_resident'
    ? NON_RESIDENT_WITHHOLDING_RATE
    : RESIDENT_WITHHOLDING_RATE;

  const withholdingTax = reachedThreshold ? Math.round(amount * withholdingRate) : 0;
  const nhiSupplement = reachedThreshold ? Math.round(amount * NHI_SUPPLEMENT_RATE) : 0;
  const netAmount = amount - withholdingTax - nhiSupplement;

  return { withholdingTax, nhiSupplement, netAmount };
}

function Field({ label, value, className = '' }) {
  return (
    <div className={`flex border-b border-[#E2DDD4] ${className}`}>
      <div className="w-32 shrink-0 bg-[#FDF0ED] px-4 py-3 text-sm font-bold text-[#1A1A18]">
        {label}
      </div>
      <div className="flex-1 px-4 py-3 text-sm text-[#1A1A18]">{value || ''}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-8 first:mt-0">
      <span className="w-1.5 h-5 bg-[#C8522A] rounded-full inline-block" />
      <h3 className="text-base font-bold text-[#1A1A18]">{children}</h3>
    </div>
  );
}

export default function TaxFormPrintView() {
  const { kocmissionId } = useParams();
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [residency, setResidency] = useState('resident');

  // 這個頁面通常是從勞報單彈窗用 target="_blank" 開新分頁進來的，
  // 分頁裡沒有上一頁的瀏覽紀錄，navigate(-1) 不會有反應。
  // 先試著直接關掉這個分頁，瀏覽器不允許關閉的話（例如不是分頁開的），
  // 就退回接案首頁，確保按鈕一定有反應。
  const handleBack = () => {
    window.close();
    navigate('/home');
  };

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');

        const res = await api.get('/koc/mission/taxFormData', {
          params: { User_id: userId, kocmission_id: kocmissionId },
        });

        if (!res.data.success) {
          throw new Error(res.data.err || '資料載入失敗');
        }

        setData(res.data);
      } catch (err) {
        const apiError = err.response?.data?.err;
        setError(
          typeof apiError === 'string'
            ? apiError
            : apiError
              ? JSON.stringify(apiError)
              : err.message || '資料載入失敗'
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId, kocmissionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 size={24} className="animate-spin text-[#C8522A]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] gap-4">
        <p className="text-sm font-bold text-[#C8522A]">{error || '找不到資料'}</p>
        <button
          onClick={handleBack}
          className="px-6 py-3 bg-[#1A1A18] text-white rounded-xl text-sm font-bold"
        >
          返回
        </button>
      </div>
    );
  }

  const period =
    data.campaign_start_date && data.campaign_end_date
      ? `${data.campaign_start_date} ~ ${data.campaign_end_date}`
      : '';

  const amount = data.amount || 0;
  const { withholdingTax, nhiSupplement, netAmount } = computeTaxes(amount, residency);

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-10 px-4">
      {/* 工具列：畫面上看得到，列印時會被 @media print 隱藏 */}
      <div className="no-print max-w-[210mm] mx-auto mb-4 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm"
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#1A1A18] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#C8522A] transition-all"
        >
          <Printer size={16} />
          列印 / 儲存為 PDF
        </button>
      </div>

      {/* 表單本體 */}
      <div className="tax-form-sheet max-w-[210mm] mx-auto bg-white shadow-sm border border-[#E2DDD4] p-10">
        <div className="flex items-start justify-between border-b-2 border-[#C8522A] pb-4 mb-6">
          <h1 className="text-2xl font-serif font-black text-[#1A1A18] tracking-[0.5em]">
            勞務報酬單
          </h1>
          <span className="text-xs font-bold text-[#8C8880] whitespace-nowrap mt-2">
            製表日期：{toRocDate()}
          </span>
        </div>

        {/* 給付單位 */}
        <SectionLabel>給付單位</SectionLabel>
        <div className="border border-[#E2DDD4] rounded-xl overflow-hidden">
          <div className="flex border-b border-[#E2DDD4]">
            <Field label="公司名稱" value="" className="flex-1 border-b-0" />
            <Field label="統一編號" value="" className="flex-1 border-b-0 border-l" />
          </div>
          <Field label="公司地址" value="" className="border-b-0" />
        </div>

        {/* 所得人資料 */}
        <SectionLabel>所得人資料</SectionLabel>
        <div className="border border-[#E2DDD4] rounded-xl overflow-hidden">
          <div className="flex border-b border-[#E2DDD4]">
            <Field label="姓名" value="" className="flex-1 border-b-0" />
            <Field label="身分證字號" value="" className="flex-1 border-b-0 border-l" />
            <Field label="國籍" value="" className="flex-1 border-b-0 border-l" />
          </div>
          <div className="flex border-b border-[#E2DDD4]">
            <Field label="聯絡電話" value={data.koc_phone} className="flex-1 border-b-0" />
            <Field label="電子郵件" value={data.koc_email} className="flex-1 border-b-0 border-l" />
          </div>
          <Field label="戶籍地址" value={data.koc_address} />
          <div className="flex border-b border-[#E2DDD4]">
            <Field label="申報類別" value="9A 執行業務所得" className="flex-1 border-b-0" />
            <Field label="執行業務類別" value="第90項 其他" className="flex-1 border-b-0 border-l" />
            <Field label="費用率" value="0%" className="flex-1 border-b-0 border-l" />
          </div>
          <Field label="勞務內容" value={data.campaign_name} />
          <Field label="勞務期間" value={period} className="border-b-0" />
        </div>

        {/* 試算與簽章區 */}
        <div className="flex gap-6 mt-8">
          <div className="flex-1 border-2 border-[#C8522A]/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-[#1A1A18]">給付金額試算</h4>
              <div className="no-print flex items-center gap-3 text-xs font-bold text-[#8C8880]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={residency === 'resident'}
                    onChange={() => setResidency('resident')}
                    className="accent-[#C8522A]"
                  />
                  居住者
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={residency === 'non_resident'}
                    onChange={() => setResidency('non_resident')}
                    className="accent-[#C8522A]"
                  />
                  非居住者
                </label>
              </div>
            </div>
            <p className="hidden print:block text-xs font-bold text-[#8C8880] mb-3">
              身分別：{residency === 'resident' ? '居住者' : '非居住者'}
            </p>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8C8880] font-bold">給付總金額</span>
                <span className="font-bold text-[#1A1A18]">
                  {amount.toLocaleString()} 元
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C8880] font-bold">
                  代扣所得稅（{residency === 'resident' ? '10%' : '20%'}）
                </span>
                <span className="font-bold text-[#1A1A18]">
                  {withholdingTax.toLocaleString()} 元
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C8880] font-bold">二代健保費（2.11%）</span>
                <span className="font-bold text-[#1A1A18]">
                  {nhiSupplement.toLocaleString()} 元
                </span>
              </div>
              <div className="border-t border-dashed border-[#E2DDD4] pt-2.5 flex justify-between">
                <span className="text-[#1A1A18] font-bold">實際支付金額</span>
                <span className="font-black text-[#C8522A]">
                  {netAmount.toLocaleString()} 元
                </span>
              </div>
            </div>
            {amount < WITHHOLDING_THRESHOLD && (
              <p className="mt-3 text-[10px] text-[#8C8880]">
                ※ 給付金額未達 {WITHHOLDING_THRESHOLD.toLocaleString()} 元門檻，暫不扣繳。
              </p>
            )}
          </div>

          <div className="flex-1 border border-[#E2DDD4] rounded-2xl p-5">
            <h4 className="text-sm font-bold text-[#1A1A18] mb-1">所得人簽章</h4>
            <p className="text-xs text-[#8C8880] mb-4">上述資料經本人確認無誤（簽名或蓋章）</p>
            <div className="h-24" />
          </div>
        </div>

        {/* 領款資訊 */}
        <SectionLabel>領款資訊</SectionLabel>
        <div className="border border-[#E2DDD4] rounded-xl overflow-hidden">
          <div className="flex border-b border-[#E2DDD4]">
            <div className="w-32 shrink-0 bg-[#FDF0ED] px-4 py-3 text-sm font-bold text-[#1A1A18]">
              付款方式
            </div>
            <div className="flex-1 px-4 py-3 text-sm text-[#1A1A18] flex gap-6">
              {['現金', '支票', '匯款', '其他'].map((option) => (
                <span key={option} className="flex items-center gap-1.5">
                  <span className="w-4 h-4 border border-[#8C8880] inline-block" />
                  {option}
                </span>
              ))}
            </div>
          </div>
          <div className="flex">
            <Field label="銀行 / 分行" value="" className="flex-1 border-b-0" />
            <Field label="戶名" value="" className="flex-1 border-b-0 border-l" />
            <Field label="帳號" value="" className="flex-1 border-b-0 border-l" />
          </div>
        </div>

        {/* 附件區 */}
        <SectionLabel>附件</SectionLabel>
        <div className="flex gap-6">
          <div className="flex-1 h-32 border-2 border-dashed border-[#E2DDD4] rounded-xl flex items-center justify-center text-sm text-[#8C8880] font-bold">
            身分證影本正面
          </div>
          <div className="flex-1 h-32 border-2 border-dashed border-[#E2DDD4] rounded-xl flex items-center justify-center text-sm text-[#8C8880] font-bold">
            身分證影本反面
          </div>
        </div>

        {/* 頁尾備註 */}
        <p className="mt-8 text-[10px] text-[#8C8880] leading-relaxed">
          ※ 本表試算金額達 {WITHHOLDING_THRESHOLD.toLocaleString()} 元：居住者代扣所得稅 10%、
          非居住者代扣所得稅 20%，並加扣二代健保補充保費 2.11%；未達門檻不扣繳。
          實際扣繳金額仍請依給付當年度公告之稅法規定為準，如有疑義請洽會計／財務人員確認，
          給付後請依規定辦理扣繳申報，本表僅供簽收憑證使用。
        </p>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .tax-form-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 10mm !important;
            width: 210mm;
            margin: 0 auto;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}
