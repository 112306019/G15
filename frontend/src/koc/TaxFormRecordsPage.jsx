import React, { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import api from '../api/index';

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function FormRow({ form }) {
  return (
    <div className="grid grid-cols-5 px-8 py-5 items-center text-sm border-b border-edge last:border-0 hover:bg-mist transition-colors">
      <div className="font-black text-brand">NT$ {(form.amount || 0).toLocaleString()}</div>
      <div className="text-muted font-medium">{formatDateTime(form.submitted_at)}</div>
      <div className="text-muted font-medium">{form.reviewed_at ? formatDateTime(form.reviewed_at) : '-'}</div>
      <div>
        <a
          href={`/tax-form-print/${form.form_id}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs font-bold text-muted hover:text-brand"
        >
          查看勞報單 <FileText size={10} />
        </a>
      </div>
      <div>
        <a
          href={form.cloud_link_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs font-bold text-muted hover:text-brand"
        >
          查看已提交連結 <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}

function FormsTable({ records, emptyText }) {
  return (
    <div className="w-full bg-white rounded-3xl border border-edge shadow-sm overflow-hidden">
      <div className="grid grid-cols-5 px-8 py-4 bg-mist border-b border-edge text-muted text-sm font-bold">
        <span>金額</span>
        <span>申報時間</span>
        <span>審核時間</span>
        <span>勞報單</span>
        <span>連結</span>
      </div>
      {records.length === 0 ? (
        <div className="py-12 text-center text-muted font-bold">{emptyText}</div>
      ) : (
        records.map((form) => <FormRow key={form.form_id} form={form} />)
      )}
    </div>
  );
}

export default function TaxFormRecordsPage({ onBack }) {
  const user_id = localStorage.getItem('userId');
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [activeTab, setActiveTab] = useState('reviewing'); // 'reviewing' | 'completed'

  useEffect(() => {
    async function fetchRecords() {
      try {
        setLoading(true);
        const res = await api.get('/koc/revenue/getRemunerationForms', {
          params: { user_id },
        });
        if (res.data.success) {
          setForms(res.data.forms || []);
        }
      } catch (err) {
        console.error('載入勞報單紀錄失敗', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecords();
  }, [user_id]);

  const reviewingForms = forms.filter((f) => f.status === 'pending_review');
  const completedForms = forms.filter((f) => f.status === 'approved');

  return (
    <div className="max-w-5xl animate-in fade-in duration-500">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-muted hover:text-brand transition-colors font-bold text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回我的收益
      </button>

      <h2 className="text-[28px] font-display font-bold mb-6 text-ink">勞報單紀錄</h2>

      <div className="flex gap-2 w-full sm:w-auto mb-6">
        <button
          onClick={() => setActiveTab('reviewing')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${
            activeTab === 'reviewing'
              ? 'bg-brand text-white'
              : 'bg-white border border-edge text-muted hover:bg-cream'
          }`}
        >
          已送出審核中（{reviewingForms.length}）
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${
            activeTab === 'completed'
              ? 'bg-brand text-white'
              : 'bg-white border border-edge text-muted hover:bg-cream'
          }`}
        >
          已完成（{completedForms.length}）
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted font-bold">載入中...</div>
      ) : activeTab === 'reviewing' ? (
        <FormsTable records={reviewingForms} emptyText="目前沒有審核中的勞報單" />
      ) : (
        <FormsTable records={completedForms} emptyText="目前沒有已完成的勞報單" />
      )}
    </div>
  );
}
