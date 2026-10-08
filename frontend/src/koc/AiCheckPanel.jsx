import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle, X } from 'lucide-react';
import api from '../api/index';
import { getErrorMessage } from '../errorMessage';

const RISK_STYLES = {
  none: { label: '低風險', className: 'text-[#1A1A18]' },
  low: { label: '輕微風險', className: 'text-[#B89B6A]' },
  medium: { label: '中度風險', className: 'text-[#C8522A]' },
  high: { label: '高風險', className: 'text-[#D93025]' },
};

// 使用前的免責條款：內容與版本由後端提供（constants.AI_CHECK_TERMS），同意紀錄存在資料庫
function TermsModal({ terms, onAgree, onClose, agreeing, error }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="fixed inset-0 bg-[#1A1A18]/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
      <div className="relative bg-white rounded-[1.5rem] p-6 xl:p-8 max-w-lg w-full shadow-2xl border border-[#E2DDD4] max-h-[90vh] overflow-y-auto">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1.5 text-[#8C8880] hover:text-[#1A1A18]">
          <X size={18} />
        </button>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-full bg-[#FDF0ED] text-[#C8522A] flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <h3 className="text-lg xl:text-xl font-bold text-[#1A1A18]">{terms.title}</h3>
        </div>
        <p className="text-xs text-[#8C8880] mb-3">使用 AI 文案檢測前，請詳閱並同意以下條款：</p>
        <ol className="list-decimal pl-5 space-y-2.5 text-[13px] xl:text-sm text-[#1A1A18] leading-relaxed mb-5">
          {terms.terms.map((item, index) => <li key={index}>{item}</li>)}
        </ol>
        <label className="flex items-start gap-2.5 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#C8522A] shrink-0"
          />
          <span className="text-xs xl:text-sm font-bold text-[#1A1A18]">
            我已閱讀並同意以上條款，了解檢測結果僅供參考，文案內容由我自行負責。
          </span>
        </label>
        {error && (
          <div className="mb-4 bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl p-3 text-xs font-bold text-[#C8522A]">{error}</div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white border border-[#E2DDD4] text-[#8C8880] py-3 rounded-xl font-bold text-xs xl:text-sm hover:bg-[#F8F9FA]"
          >
            不同意
          </button>
          <button
            type="button"
            onClick={onAgree}
            disabled={!checked || agreeing}
            className="flex-[2] bg-[#1A1A18] text-[#F5F0E8] py-3 rounded-xl font-bold text-xs xl:text-sm hover:bg-[#C8522A] transition-all disabled:opacity-50"
          >
            {agreeing ? '處理中...' : '同意並開始檢測'}
          </button>
        </div>
        <p className="text-[10px] text-[#8C8880] mt-3 text-center">條款版本 {terms.terms_version}・同意一次即可，條款更新時會再請您確認</p>
      </div>
    </div>
  );
}

function AiCheckResult({ result }) {
  const risk = RISK_STYLES[result.risk_level] || { label: result.risk_level, className: 'text-[#1A1A18]' };
  const analysis = result.ai_analysis;
  return (
    <div className="bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl p-4 space-y-3 text-[13px] xl:text-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[#1A1A18]">合規分數</span>
        <span className={`font-black text-base ${risk.className}`}>{result.score} 分・{risk.label}</span>
      </div>

      {result.violations?.length > 0 && (
        <div>
          <div className="font-bold text-[#D93025] mb-1.5">可能違規的用詞（{result.violations.length}）</div>
          <div className="space-y-1.5">
            {result.violations.map((v, i) => (
              <div key={i} className="text-xs bg-[#FFF0F0] text-[#D93025] px-2.5 py-1.5 rounded-lg">
                <span className="font-bold">「{v.word}」</span>{v.label ? ` — ${v.label}` : ''}
                {v.law_ref && <span className="block text-[11px] opacity-80 mt-0.5">{v.law_ref}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {result.gray_areas?.length > 0 && (
        <div>
          <div className="font-bold text-[#8A6D1F] mb-1.5">灰色地帶（{result.gray_areas.length}）</div>
          {result.gray_areas.map((g, i) => (
            <div key={i} className="text-xs bg-[#FDF6E3] text-[#6B5A2C] px-2.5 py-1.5 rounded-lg mb-1.5">
              <span className="font-bold text-[#8A6D1F]">「{g.phrase}」</span> — {g.reason}
            </div>
          ))}
        </div>
      )}

      {analysis && (
        <div>
          <div className="font-bold text-[#1A1A18] mb-1">AI 整體評估</div>
          <p className="text-[#8C8880] text-xs leading-relaxed">{analysis.overall_assessment}</p>
          {analysis.suggestions?.length > 0 && (
            <>
              <div className="font-bold text-[#1A1A18] mt-2 mb-1">修改建議</div>
              <ul className="list-disc list-inside text-xs text-[#8C8880] space-y-1">
                {analysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </>
          )}
          {analysis.compliant_alternatives?.length > 0 && (
            <>
              <div className="font-bold text-[#1A1A18] mt-2 mb-1">可以改用的說法</div>
              <ul className="list-disc list-inside text-xs text-[#8C8880] space-y-1">
                {analysis.compliant_alternatives.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {!result.violations?.length && !result.gray_areas?.length && (
        <p className="text-xs text-[#8C8880]">沒有偵測到明顯的違規用詞。</p>
      )}
      <p className="text-[10px] text-[#8C8880] border-t border-[#E2DDD4] pt-2">
        檢測結果僅供參考，不代表文案沒有法律風險；文案內容由您自行負責。結果不會保存，也不會提供給廠商。
      </p>
    </div>
  );
}

/**
 * KOC 自用的 AI 文案檢測。第一次使用（或條款改版後）會先跳出條款同意視窗。
 * 檢測請求一律經過後端，後端會再檢查同意紀錄，前端彈窗只是使用流程。
 */
export default function AiCheckPanel({ missionId, text }) {
  const userId = localStorage.getItem('userId');
  const [terms, setTerms] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  const [agreeing, setAgreeing] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runCheck = async () => {
    setChecking(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/koc/aiCheck/analyze', {
        User_id: userId,
        KOCMission_id: missionId,
        text,
      });
      setResult(res.data.result);
    } catch (err) {
      if (err.response?.data?.need_consent) {
        // 條款剛好改版：重新讀條款並請 KOC 再同意一次
        setTerms(null);
        await openCheck();
        return;
      }
      setError(getErrorMessage(err, 'AI 文案檢測失敗，請稍後再試'));
    } finally {
      setChecking(false);
    }
  };

  const openCheck = async () => {
    if (!text.trim()) {
      setError('請先輸入要檢測的文案');
      return;
    }
    setError('');
    try {
      const res = await api.get('/koc/aiCheck/terms', { params: { User_id: userId } });
      setTerms(res.data);
      if (res.data.agreed) {
        await runCheck();
      } else {
        setTermsError('');
        setShowTerms(true);
      }
    } catch (err) {
      setError(getErrorMessage(err, '無法讀取使用條款，請稍後再試'));
    }
  };

  const handleAgree = async () => {
    setAgreeing(true);
    setTermsError('');
    try {
      await api.post('/koc/aiCheck/consent', {
        User_id: userId,
        terms_version: terms.terms_version,
      });
      setShowTerms(false);
      await runCheck();
    } catch (err) {
      setTermsError(getErrorMessage(err, '同意紀錄儲存失敗，請稍後再試'));
    } finally {
      setAgreeing(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={openCheck}
        disabled={checking}
        className="w-full bg-white border-2 border-[#C8522A] text-[#C8522A] py-3 rounded-xl font-bold hover:bg-[#FDF0ED] transition-all text-xs xl:text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {checking ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
        {checking ? 'AI 檢測中...' : 'AI 文案檢測（自行檢查法規風險）'}
      </button>

      {error && (
        <div className="flex items-start gap-2 bg-[#FDF0ED] border border-[#C8522A]/20 rounded-xl p-3 text-xs font-bold text-[#C8522A]">
          <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {result && <AiCheckResult result={result} />}

      {showTerms && terms && (
        <TermsModal
          terms={terms}
          onAgree={handleAgree}
          onClose={() => setShowTerms(false)}
          agreeing={agreeing}
          error={termsError}
        />
      )}
    </div>
  );
}
