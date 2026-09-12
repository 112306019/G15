import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, FileText, Printer } from 'lucide-react';
import api from '../api/index';
import TaxFormModal from './TaxFormModal';

const TAX_FORM_BADGE = {
  not_submitted: { label: '待上傳勞報單', cls: 'bg-[#F5F0E8] text-[#8C8880]' },
  pending_review: { label: '勞報單審核中', cls: 'bg-[#FDF0ED] text-[#C8522A]' },
  rejected: { label: '勞報單退回', cls: 'bg-red-50 text-red-600' },
  approved: { label: '審核通過 (待撥款)', cls: 'bg-green-50 text-green-700' },
};

// 待填寫：還沒交過連結、或交了被退回需要重新處理
// 已填寫：交出去了，不管審核中還是已通過，KOC 這邊該做的事都做完了
const PENDING_STATUSES = ['not_submitted', 'rejected'];

function RecordsTable({ records, emptyText, onUpload, onOpenPrint }) {
  return (
    <div className="w-full bg-white rounded-2xl md:rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
      {/* 電腦版表頭 (手機版隱藏) */}
      <div className="hidden md:grid grid-cols-5 px-10 py-5 bg-[#F8F9FA] border-b border-[#E2DDD4] text-[#8C8880] text-sm font-bold">
        <span>案件</span>
        <span>廠商</span>
        <span>金額</span>
        <span>狀態</span>
        <span>操作</span>
      </div>

      <div className="flex flex-col">
        {records.length === 0 ? (
          <div className="py-12 text-center text-[#8C8880] font-bold text-sm md:text-base">{emptyText}</div>
        ) : (
          records.map((record, index) => {
            const badge = TAX_FORM_BADGE[record.taxFormStatus] || TAX_FORM_BADGE.not_submitted;

            return (
              <div
                key={record.id}
                className={`px-5 py-4 md:px-10 md:py-6 transition-colors hover:bg-[#F8F9FA] ${
                  index !== records.length - 1 ? 'border-b border-[#E2DDD4]' : ''
                }`}
              >
                {/* ======== 手機版排版 ======== */}
                <div className="md:hidden flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="font-bold text-[#1A1A18] text-sm leading-snug mb-1">{record.productName}</div>
                      <div className="text-[11px] text-[#8C8880] font-medium">{record.vendor}</div>
                    </div>
                    <div className="font-bold text-[#C8522A] whitespace-nowrap">
                      NT$ {(record.earningsTotal || 0).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-[#F8F9FA] rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {record.taxFormUrl && (
                        <a
                          href={record.taxFormUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] text-[#8C8880] hover:text-[#C8522A]"
                        >
                          查看連結 <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {record.taxFormStatus === 'rejected' && record.taxFormRejectReason && (
                      <div className="text-[11px] text-red-500 font-medium">
                        原因：{record.taxFormRejectReason}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-1">
                    {record.taxFormStatus !== 'approved' && (
                      <button
                        onClick={() => onUpload(record)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#1A1A18] text-[#F5F0E8] py-2.5 rounded-xl text-xs font-bold hover:bg-[#C8522A]"
                      >
                        <FileText size={14} />
                        {record.taxFormStatus === 'not_submitted' ? '上傳連結' : '修改連結'}
                      </button>
                    )}
                    <a
                      href={onOpenPrint(record.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-[#E2DDD4] text-[#8C8880] py-2.5 rounded-xl text-xs font-bold hover:text-[#1A1A18] hover:bg-[#F8F9FA]"
                    >
                      <Printer size={14} />
                      開啟勞報單
                    </a>
                  </div>
                </div>

                {/* ======== 電腦版排版 ======== */}
                <div className="hidden md:grid grid-cols-5 items-center text-sm gap-4">
                  <div className="font-bold text-[#1A1A18] pr-4">{record.productName}</div>
                  <div className="text-[#8C8880] font-medium">{record.vendor}</div>
                  <div className="font-bold text-[#C8522A]">
                    NT$ {(record.earningsTotal || 0).toLocaleString()}
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1.5 rounded-md text-xs font-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {record.taxFormStatus === 'rejected' && record.taxFormRejectReason && (
                      <div className="text-[10px] text-red-500 mt-1.5 max-w-[160px] leading-tight">
                        {record.taxFormRejectReason}
                      </div>
                    )}
                    {record.taxFormUrl && (
                      <a
                        href={record.taxFormUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-[#8C8880] hover:text-[#C8522A] mt-1.5"
                      >
                        查看已提交連結 <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-2.5 items-start">
                    {record.taxFormStatus !== 'approved' && (
                      <button
                        onClick={() => onUpload(record)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A18] hover:text-[#C8522A] transition-colors"
                      >
                        <FileText size={14} />
                        {record.taxFormStatus === 'not_submitted' ? '上傳連結' : '檢視/修改連結'}
                      </button>
                    )}
                    <a
                      href={onOpenPrint(record.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold text-[#8C8880] hover:text-[#C8522A] transition-colors"
                    >
                      <Printer size={14} />
                      開啟勞報單
                    </a>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function TaxFormRecordsPage({ onBack }) {
  const user_id = localStorage.getItem('userId');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [taxFormTask, setTaxFormTask] = useState(null);

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRecords() {
    try {
      setLoading(true);
      const res = await api.get('/koc/mission/getlist', {
        params: { User_id: user_id, stage: 4 },
      });
      if (res.data.success) {
        setRecords(res.data.missions.map(m => ({
          id: m.KOCMission_id,
          productName: m.campaign_name,
          vendor: m.vendor_name,
          earningsTotal: m.earnings_total,
          taxFormStatus: m.tax_form_status || 'not_submitted',
          taxFormUrl: m.tax_form_url || null,
          taxFormRejectReason: m.tax_form_reject_reason || null,
        })));
      }
    } catch (err) {
      console.error('載入勞報單紀錄失敗', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmitted = (newStatus, newUrl) => {
    setRecords(previous =>
      previous.map(r =>
        r.id === taxFormTask.id
          ? { ...r, taxFormStatus: newStatus, taxFormUrl: newUrl, taxFormRejectReason: null }
          : r
      )
    );
  };

  const pendingRecords = records.filter(r => PENDING_STATUSES.includes(r.taxFormStatus));
  const submittedRecords = records.filter(r => !PENDING_STATUSES.includes(r.taxFormStatus));

  return (
    <div className="max-w-5xl animate-in fade-in duration-500 p-4 md:p-0 mx-auto">
      <button
        onClick={onBack}
        className="mb-4 md:mb-6 flex items-center gap-1.5 md:gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-xs md:text-sm group w-fit bg-white md:bg-transparent px-3 md:px-0 py-1.5 md:py-0 rounded-full border border-[#E2DDD4] md:border-transparent shadow-sm md:shadow-none"
      >
        <ArrowLeft size={16} className="md:w-4 md:h-4 transition-transform group-hover:-translate-x-1" />
        返回我的收益
      </button>

      <h2 className="text-2xl md:text-[28px] font-serif font-bold mb-6 md:mb-10 text-[#1A1A18]">勞報單紀錄</h2>

      {loading ? (
        <div className="py-16 text-center text-[#8C8880] font-bold text-sm md:text-base">載入中...</div>
      ) : records.length === 0 ? (
        <div className="py-16 text-center text-[#8C8880] font-bold text-sm md:text-base">目前沒有已結案的案件</div>
      ) : (
        <div className="space-y-8 md:space-y-10">
          <div>
            <h3 className="text-base md:text-lg font-bold text-[#1A1A18] mb-3 md:mb-4 flex items-center gap-2 px-1">
              <span className="w-1.5 h-4 md:h-5 bg-[#C8522A] rounded-full inline-block" />
              待填寫（{pendingRecords.length}）
            </h3>
            <RecordsTable
              records={pendingRecords}
              emptyText="目前沒有待填寫的勞報單"
              onUpload={setTaxFormTask}
              onOpenPrint={id => `/tax-form-print/${id}`}
            />
          </div>

          <div>
            <h3 className="text-base md:text-lg font-bold text-[#1A1A18] mb-3 md:mb-4 flex items-center gap-2 px-1">
              <span className="w-1.5 h-4 md:h-5 bg-[#8C8880] rounded-full inline-block" />
              已填寫（{submittedRecords.length}）
            </h3>
            <RecordsTable
              records={submittedRecords}
              emptyText="目前沒有已填寫的勞報單"
              onUpload={setTaxFormTask}
              onOpenPrint={id => `/tax-form-print/${id}`}
            />
          </div>
        </div>
      )}

      {taxFormTask && (
        <TaxFormModal
          task={taxFormTask}
          userId={user_id}
          onClose={() => setTaxFormTask(null)}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  );
}