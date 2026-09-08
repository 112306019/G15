import React, { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, FileText, Loader2 } from 'lucide-react';
import api from '../api/index';
import TaxFormModal from './TaxFormModal';

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function FormRow({ form }) {
  return (
    <div className="grid grid-cols-4 px-8 py-5 items-center text-sm border-b border-[#E2DDD4] last:border-0 hover:bg-[#F8F9FA] transition-colors">
      <div className="font-black text-[#C8522A]">NT$ {(form.amount || 0).toLocaleString()}</div>
      <div className="text-[#8C8880] font-medium">{formatDateTime(form.submitted_at)}</div>
      <div className="text-[#8C8880] font-medium">{form.reviewed_at ? formatDateTime(form.reviewed_at) : '-'}</div>
      <div>
        <a
          href={form.cloud_link_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs font-bold text-[#8C8880] hover:text-[#C8522A]"
        >
          查看已提交連結 <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

function FormsTable({ title, dotClassName, records, emptyText }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-[#1A1A18] mb-4 flex items-center gap-2">
        <span className={`w-1.5 h-5 rounded-full inline-block ${dotClassName}`} />
        {title}（{records.length}）
      </h3>
      <div className="w-full bg-white rounded-3xl border border-[#E2DDD4] shadow-sm overflow-hidden">
        <div className="grid grid-cols-4 px-8 py-4 bg-[#F8F9FA] border-b border-[#E2DDD4] text-[#8C8880] text-sm font-bold">
          <span>金額</span>
          <span>申報時間</span>
          <span>審核時間</span>
          <span>連結</span>
        </div>
        {records.length === 0 ? (
          <div className="py-12 text-center text-[#8C8880] font-bold">{emptyText}</div>
        ) : (
          records.map((form) => <FormRow key={form.form_id} form={form} />)
        )}
      </div>
    </div>
  );
}

export default function TaxFormRecordsPage({ onBack }) {
  const user_id = localStorage.getItem('userId');
  const [loading, setLoading] = useState(true);
  const [undeclaredAmount, setUndeclaredAmount] = useState(0);
  const [forms, setForms] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRecords() {
    try {
      setLoading(true);
      const res = await api.get('/koc/revenue/getRemunerationForms', {
        params: { user_id },
      });
      if (res.data.success) {
        setUndeclaredAmount(res.data.undeclared_amount || 0);
        setForms(res.data.forms || []);
      }
    } catch (err) {
      console.error('載入勞報單紀錄失敗', err);
    } finally {
      setLoading(false);
    }
  }

  const openForm = forms.find((f) => f.status !== 'approved') || null;
  const reviewingForms = forms.filter((f) => f.status === 'pending_review');
  const completedForms = forms.filter((f) => f.status === 'approved');

  const isResubmit = openForm?.status === 'rejected';
  const modalAmount = isResubmit ? openForm.amount : undeclaredAmount;

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
      ) : (
        <div className="space-y-10">
          {/* 尚未申報金額 */}
          <div className="bg-white rounded-[2rem] border border-[#E2DDD4] shadow-sm p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-sm font-bold tracking-widest text-[#8C8880] mb-2">尚未申報金額</h3>
              <p className="text-3xl font-black text-[#1A1A18]">
                <span className="text-lg font-bold text-[#8C8880] mr-1">NT$</span>
                {undeclaredAmount.toLocaleString()}
              </p>
              {openForm?.status === 'rejected' && openForm.reject_reason && (
                <div className="mt-3 text-xs font-bold text-[#C8522A] max-w-md">
                  上一張勞報單被退回：{openForm.reject_reason}
                </div>
              )}
            </div>

            {openForm?.status === 'pending_review' ? (
              <div className="flex items-center gap-2 text-sm font-bold text-[#8C8880] bg-[#F5F0E8] px-6 py-3 rounded-2xl">
                <Loader2 size={16} />
                有一張勞報單審核中，請等候結果
              </div>
            ) : openForm?.status === 'rejected' ? (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 bg-[#C8522A] text-white px-8 py-4 rounded-2xl text-sm font-bold hover:bg-[#1A1A18] transition-all active:scale-95 shadow-md"
              >
                <FileText size={18} />
                重新提交
              </button>
            ) : undeclaredAmount > 0 ? (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 bg-[#1A1A18] text-[#F5F0E8] px-8 py-4 rounded-2xl text-sm font-bold hover:bg-[#C8522A] transition-all active:scale-95 shadow-md"
              >
                <FileText size={18} />
                申報勞務報酬單
              </button>
            ) : (
              <div className="text-sm font-bold text-[#8C8880]">目前沒有可申報的分潤</div>
            )}
          </div>

          <FormsTable
            title="已送出審核中"
            dotClassName="bg-[#C8522A]"
            records={reviewingForms}
            emptyText="目前沒有審核中的勞報單"
          />

          <FormsTable
            title="已完成"
            dotClassName="bg-green-600"
            records={completedForms}
            emptyText="目前沒有已完成的勞報單"
          />
        </div>
      )}

      {modalOpen && (
        <TaxFormModal
          amount={modalAmount}
          isResubmit={isResubmit}
          rejectReason={openForm?.reject_reason}
          userId={user_id}
          onClose={() => setModalOpen(false)}
          onSubmitted={() => fetchRecords()}
        />
      )}
    </div>
  );
}
