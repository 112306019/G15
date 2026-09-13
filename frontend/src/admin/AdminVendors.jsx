import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, Building2, Mail, Clock, User } from 'lucide-react';
import { getAdminVendorList } from '../api/platform';

export default function AdminVendors() {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 新增搜尋關鍵字狀態
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await getAdminVendorList();

        const vendorData = response.data.vendors.map((vendor) => ({
          id: vendor.Vendor_id,
          companyName: vendor.Company_name,
          contact: vendor.Contact_name,
          email: vendor.Email,
          taxId: vendor.Tax_ID,
          status: vendor.Status,
          createdAt: vendor.Created_at
            ? new Date(vendor.Created_at).toLocaleDateString('zh-TW')
            : '-',
        }));

        setVendors(vendorData);
      } catch (err) {
        console.error('取得廠商列表失敗：', err);
        setError(err.response?.data?.err || '取得廠商列表失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  // 實作搜尋過濾邏輯
  const filteredVendors = vendors.filter((vendor) => {
    if (!keyword.trim()) return true;
    const kw = keyword.trim().toLowerCase();
    return (
      vendor.companyName?.toLowerCase().includes(kw) ||
      vendor.taxId?.toLowerCase().includes(kw)
    );
  });

  // 抽出狀態標籤組件，避免重複代碼
  const renderStatusBadge = (status) => {
    const styleMap = {
      approved: { bg: 'bg-[#FDF0ED]', text: 'text-[#C8522A]', border: 'border-[#C8522A]/20', dot: 'bg-[#C8522A]', label: '已通過' },
      pending: { bg: 'bg-[#F5F0E8]', text: 'text-[#B89B6A]', border: 'border-[#B89B6A]/30', dot: 'bg-[#B89B6A]', label: '待審核' },
      rejected: { bg: 'bg-[#F8F9FA]', text: 'text-[#8C8880]', border: 'border-[#E2DDD4]', dot: 'bg-[#8C8880]', label: '已拒絕' },
    };
    const currentStyle = styleMap[status] || { bg: 'bg-[#F8F9FA]', text: 'text-[#8C8880]', border: 'border-[#E2DDD4]', dot: 'bg-[#8C8880]', label: '未知狀態' };

    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${currentStyle.dot}`} />
        {currentStyle.label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* 頂部標題與搜尋區 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-3">
            合作廠商管理
            <span className="text-[10px] md:text-xs font-bold bg-[#F5F0E8] text-[#8C8880] px-2.5 py-1 rounded-md tracking-wider font-sans border border-[#E2DDD4]">
              共 {filteredVendors.length} 家
            </span>
          </h1>
          <p className="text-[#8C8880] mt-1.5 md:mt-2 text-xs md:text-sm font-medium">檢視平台所有合作廠商的資料與帳號狀態。</p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8880]" />
            <input 
              type="text" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜尋公司名稱、統編..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-xs md:text-sm outline-none focus:border-[#C8522A] focus:ring-2 focus:ring-[#C8522A]/10 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center justify-center w-10 h-10 shrink-0 bg-white border border-[#E2DDD4] rounded-xl text-[#1A1A18] hover:bg-[#F8F9FA] hover:border-[#1A1A18] transition-all shadow-sm">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* 列表內容區塊 */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        
        <div className="md:hidden flex flex-col divide-y divide-[#E2DDD4]">
          {loading && <div className="p-10 text-center text-sm font-bold text-[#8C8880]">載入中...</div>}
          {!loading && error && <div className="p-10 text-center text-sm font-bold text-red-500">{error}</div>}
          {!loading && !error && filteredVendors.length === 0 && (
            <div className="p-10 text-center text-sm font-bold text-[#8C8880]">目前沒有符合條件的廠商</div>
          )}

          {!loading && !error && filteredVendors.map((vendor) => (
            <div key={vendor.id} className="p-4 sm:p-5 hover:bg-[#F5F0E8]/30 transition-colors">
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-serif font-black shadow-sm shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-[#1A1A18] text-sm leading-tight">{vendor.companyName}</div>
                    <div className="text-[11px] font-medium text-[#8C8880] mt-0.5">統編: {vendor.taxId}</div>
                  </div>
                </div>
                {renderStatusBadge(vendor.status)}
              </div>

              <div className="bg-[#F8F9FA] rounded-xl p-3.5 mb-4 flex flex-col gap-2.5 border border-[#E2DDD4]/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C8880] flex items-center gap-1.5"><User size={13}/> 聯絡人</span>
                  <span className="font-bold text-[#1A1A18]">{vendor.contact}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C8880] flex items-center gap-1.5"><Mail size={13}/> 信箱</span>
                  <span className="font-bold text-[#1A1A18] truncate max-w-[150px]">{vendor.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C8880] flex items-center gap-1.5"><Clock size={13}/> 註冊時間</span>
                  <span className="font-bold text-[#1A1A18]">{vendor.createdAt}</span>
                </div>
              </div>

              <button 
                onClick={() => navigate(`/admin/vendors/${vendor.id}`)}
                className="w-full flex items-center justify-center gap-1.5 bg-white border border-[#E2DDD4] text-[#1A1A18] px-4 py-2.5 rounded-xl text-xs font-bold hover:border-[#1A1A18] hover:bg-[#F5F0E8] transition-all shadow-sm"
              >
                管理詳細資訊 <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#F8F9FA] border-b border-[#E2DDD4]">
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">公司資訊</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">聯絡人</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">註冊時間</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">狀態</th>
                <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD4]">
              {loading && (
                <tr><td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">載入中...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-red-500">{error}</td></tr>
              )}
              {!loading && !error && filteredVendors.length === 0 && (
                <tr><td colSpan="5" className="px-6 py-16 text-center text-sm font-bold text-[#8C8880]">目前沒有符合條件的廠商</td></tr>
              )}

              {!loading && !error && filteredVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-[#F5F0E8]/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-serif font-black shadow-sm shrink-0">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-[#1A1A18]">{vendor.companyName}</div>
                        <div className="text-xs font-medium text-[#8C8880] mt-0.5">統編: {vendor.taxId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[#1A1A18]">{vendor.contact}</div>
                    <div className="text-xs font-medium text-[#8C8880] mt-0.5">{vendor.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[#8C8880]">{vendor.createdAt}</td>
                  <td className="px-6 py-4">
                    {renderStatusBadge(vendor.status)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => navigate(`/admin/vendors/${vendor.id}`)}
                      className="inline-flex items-center gap-1 bg-white border border-[#E2DDD4] text-[#1A1A18] px-4 py-2 rounded-lg text-xs font-bold hover:border-[#1A1A18] hover:shadow-sm transition-all"
                    >
                      管理 <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}