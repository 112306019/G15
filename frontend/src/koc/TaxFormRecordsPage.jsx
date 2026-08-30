import React, { useEffect, useState } from 'react';
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
    <div className="w-full bg-white rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
      <div className="grid grid-cols-5 px-10 py-5 bg-[#F8F9FA] border-b border-[#E2DDD4] text-[#8C8880] text-sm font-bold">
        <span>案件</span>
        <span>廠商</span>
        <span>金額</span>
        <span>狀態</span>
        <span>操作</span>
      </div>

      <div className="flex flex-col">
        {records.length === 0 ? (
          <div className="py-12 text-center text-[#8C8880] font-bold">{emptyText}</div>
        ) : (
          records.map((record, index) => {
            const badge = TAX_FORM_BADGE[record.taxFormStatus] || TAX_FORM_BADGE.not_submitted;

            return (
              <div
                key={record.id}
                className={`grid grid-cols-5 px-10 py-6 items-center text-sm transition-colors hover:bg-[#F8F9FA] ${
                  index !== records.length - 1 ? 'border-b border-[#E2DDD4]' : ''
                }`}
              >
                <div className="font-bold text-[#1A1A18]">{record.productName}</div>
                <div className="text-[#8C8880] font-medium">{record.vendor}</div>
                <div className="font-bold text-[#C8522A]">
                  NT$ {(record.earningsTotal || 0).toLocaleString()}
                </div>
                <div>
                  <span className={`inline-block px-3 py-1.5 rounded-md text-xs font-bold ${badge.cls}`}>
                    {badge.label}
                  </span>
                  {record.taxFormStatus === 'rejected' && record.taxFormRejectReason && (
                    <div className="text-[10px] text-red-500 mt-1 max-w-[160px]">
                      {record.taxFormRejectReason}
                    </div>
                  )}
                  {record.taxFormUrl && (
                    <a
                      href={record.taxFormUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] text-[#8C8880] hover:text-[#C8522A] mt-1"
                    >
                      查看已提交連結 <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-start">
                  {record.taxFormStatus !== 'approved' && (
                    <button
                      onClick={() => onUpload(record)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A18] hover:text-[#C8522A]"
                    >
                      <FileText size={14} />
                      {record.taxFormStatus === 'not_submitted' ? '上傳連結' : '檢視/修改連結'}
                    </button>
                  )}
                  <a
                    href={onOpenPrint(record.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-[#8C8880] hover:text-[#C8522A]"
                  >
                    <Printer size={14} />
                    開啟勞報單
                  </a>
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
    <div className="max-w-5xl animate-in fade-in duration-500">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回我的收益
      </button>

      <h2 className="text-[28px] font-serif font-bold mb-10 text-[#1A1A18]">勞報單紀錄</h2>

      {loading ? (
        <div className="py-16 text-center text-[#8C8880] font-bold">載入中...</div>
      ) : records.length === 0 ? (
        <div className="py-16 text-center text-[#8C8880] font-bold">目前沒有已結案的案件</div>
      ) : (
        <div className="space-y-10">
          <div>
            <h3 className="text-lg font-bold text-[#1A1A18] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#C8522A] rounded-full inline-block" />
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
            <h3 className="text-lg font-bold text-[#1A1A18] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#8C8880] rounded-full inline-block" />
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
