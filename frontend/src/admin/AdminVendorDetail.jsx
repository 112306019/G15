import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Wallet, ShieldAlert, CheckCircle, 
  AlertTriangle, Building2, Megaphone, Calendar
} from 'lucide-react';

export default function AdminVendorDetail({ vendor }) {
  const navigate = useNavigate();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState(''); 

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in">
        <div className="w-16 h-16 bg-[#F8F9FA] text-[#8C8880] rounded-full flex items-center justify-center mb-4 border border-[#E2DDD4]">
          <AlertTriangle size={24} />
        </div>
        <p className="text-[#1A1A18] font-bold text-lg mb-2">找不到廠商資料</p>
        <button onClick={() => navigate('/admin/vendors')} className="text-[#C8522A] text-sm font-bold mt-4 hover:underline">返回列表</button>
      </div>
    );
  }

  const handleActionClick = (type) => {
    setActionType(type);
    setShowConfirmModal(true);
  };

  const executeAction = () => {
    // 這裡對接 API: POST /admin/vendor/audit
    setShowConfirmModal(false);
    setTimeout(() => {
      alert(`已成功對【${vendor.companyName}】執行操作！系統已記錄操作日誌。`);
      navigate('/admin/vendors');
    }, 300);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 relative">
      
      {/* 🟢 操作確認 Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-[#1A1A18]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E2DDD4]">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 mx-auto ${
              actionType === 'suspend' || actionType === 'reject' ? 'bg-[#FDF0ED] text-[#C8522A]' : 'bg-[#F5F0E8] text-[#B89B6A]'
            }`}>
              {actionType === 'suspend' || actionType === 'reject' ? <ShieldAlert size={28} /> : <CheckCircle size={28} />}
            </div>
            <h3 className="text-2xl font-serif font-black text-[#1A1A18] text-center mb-3">
              {actionType === 'approve' && '確認核准入駐？'}
              {actionType === 'reject' && '確認退回申請？'}
              {actionType === 'suspend' && '確認停權此廠商？'}
              {actionType === 'reactivate' && '確認恢復權限？'}
            </h3>
            <p className="text-[#8C8880] text-center text-sm mb-8 font-medium leading-relaxed">
              即將對 <span className="font-bold text-[#1A1A18]">{vendor.companyName}</span> 執行此操作，系統將自動記錄審核操作日誌並發送通知。
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-3.5 bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#F8F9FA] rounded-xl font-bold transition-colors text-sm">取消</button>
              <button onClick={executeAction} className={`flex-1 px-4 py-3.5 text-white rounded-xl font-bold transition-all shadow-md text-sm ${
                actionType === 'suspend' || actionType === 'reject' ? 'bg-[#C8522A] hover:bg-[#A64220]' : 'bg-[#1A1A18] hover:bg-[#333]'
              }`}>確認執行</button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 頂部：返回按鈕 */}
      <button onClick={() => navigate('/admin/vendors')} className="flex items-center gap-2 text-[#8C8880] hover:text-[#1A1A18] transition-colors font-bold text-sm mb-4">
        <ArrowLeft size={16} /> 返回廠商列表
      </button>
      
      {/* 🟢 廠商卡片 */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5F0E8] rounded-full mix-blend-multiply filter blur-[80px] opacity-70"></div>

        {/* --- 廠商標題區 --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10 pb-10 border-b border-[#E2DDD4] relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-[#1A1A18] rounded-[1.5rem] flex items-center justify-center text-[#F5F0E8] shadow-md border-4 border-[#F8F9FA]">
              <Building2 size={40} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-3xl font-serif font-black text-[#1A1A18] mb-2">{vendor.companyName}</h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-sans font-bold bg-[#F8F9FA] text-[#8C8880] px-2 py-1 rounded-md tracking-widest border border-[#E2DDD4]">
                  ID: {vendor.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest ${
                  vendor.status === 'active' ? 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20' : 
                  vendor.status === 'applying' ? 'bg-[#F5F0E8] text-[#B89B6A] border-[#B89B6A]/30' :
                  'bg-[#F8F9FA] text-[#8C8880] border-[#E2DDD4]'
                }`}>
                  {vendor.status === 'active' ? '🟢 已啟用' : vendor.status === 'applying' ? '⏳ 審核中' : '⚫️ 已停權'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {vendor.status === 'applying' && (
              <>
                <button onClick={() => handleActionClick('approve')} className="px-6 py-3 bg-[#1A1A18] text-[#F5F0E8] rounded-xl font-bold hover:bg-[#333] transition-all shadow-md text-sm">核准入駐</button>
                <button onClick={() => handleActionClick('reject')} className="px-6 py-3 bg-white border border-[#E2DDD4] text-[#C8522A] rounded-xl font-bold hover:bg-[#FDF0ED] transition-colors text-sm">退回申請</button>
              </>
            )}
            {vendor.status === 'active' && (
              <button onClick={() => handleActionClick('suspend')} className="px-6 py-3 bg-white border border-[#E2DDD4] text-[#C8522A] rounded-xl font-bold hover:bg-[#FDF0ED] transition-colors text-sm">停權帳號</button>
            )}
            {vendor.status === 'suspended' && (
              <button onClick={() => handleActionClick('reactivate')} className="px-6 py-3 bg-[#1A1A18] text-[#F5F0E8] rounded-xl font-bold hover:bg-[#333] transition-all shadow-md text-sm">恢復權限</button>
            )}
          </div>
        </div>

        {/* --- 基本資料 & 錢包狀態 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10 mb-10">
          <div className="space-y-6">
            <h3 className="font-serif font-bold text-xl text-[#1A1A18] flex items-center gap-2">
              <FileText size={20} className="text-[#8C8880]" />
              企業聯絡資訊
            </h3>
            <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-[#E2DDD4] space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#8C8880]">主要聯絡人</span>
                <span className="text-sm font-bold text-[#1A1A18]">{vendor.contactName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#8C8880]">電子信箱</span>
                <span className="text-sm font-bold text-[#1A1A18]">{vendor.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#8C8880]">統一編號</span>
                <span className="text-sm font-bold text-[#1A1A18]">{vendor.taxId}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-[#E2DDD4] border-dashed">
                <span className="text-sm font-bold text-[#8C8880]">註冊日期</span>
                <span className="text-sm font-bold text-[#1A1A18]">{vendor.createdAt}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <h3 className="font-serif font-bold text-xl text-[#1A1A18] flex items-center gap-2">
              <Wallet size={20} className="text-[#C8522A]" />
              錢包與財務狀態
            </h3>
            <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-[#E2DDD4] space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#8C8880]">廠商錢包編號</span>
                <span className="text-sm font-bold text-[#1A1A18]">{vendor.walletId || '未建立'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#8C8880]">帳戶餘額 (退款/儲值)</span>
                <span className="text-lg font-black text-[#C8522A]">NT$ {vendor.balance?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-[#E2DDD4] border-dashed">
                <span className="text-sm font-bold text-[#8C8880]">錢包狀態</span>
                <span className="text-sm font-bold text-[#1A1A18]">正常可用</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- 活動與預算紀錄 --- */}
        <div className="space-y-6 relative z-10 pt-8 border-t border-[#E2DDD4]">
          <h3 className="font-serif font-bold text-xl text-[#1A1A18] flex items-center gap-2">
            <Megaphone size={20} className="text-[#B89B6A]" />
            進行中活動與預算
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-[#F8F9FA] rounded-2xl overflow-hidden border border-[#E2DDD4]">
              <thead>
                <tr className="border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">活動名稱</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">活動預算</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">獎勵類型</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">活動走期</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {vendor.campaigns && vendor.campaigns.length > 0 ? (
                  vendor.campaigns.map((campaign) => (
                    <tr key={campaign.campaignId} className="hover:bg-white transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1A1A18] text-sm">{campaign.name}</div>
                        <div className="text-xs text-[#8C8880] mt-1">ID: {campaign.campaignId}</div>
                      </td>
                      <td className="px-6 py-4 font-black text-[#1A1A18] text-sm">
                        NT$ {campaign.budget.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#8C8880]">
                        <span className="bg-white border border-[#E2DDD4] px-2 py-1 rounded-md">{campaign.rewardType}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-[#8C8880]">
                        <div className="flex items-center gap-1"><Calendar size={12}/> {campaign.startDate}</div>
                        <div className="flex items-center gap-1 mt-1 text-[#1A1A18]">至 {campaign.endDate}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest uppercase ${
                          campaign.status === 'active' ? 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20' : 'bg-[#E2DDD4] text-[#8C8880]'
                        }`}>
                          {campaign.status === 'active' ? '招募中' : '已結案'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-sm font-bold text-[#8C8880]">
                      目前尚無任何活動紀錄
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}