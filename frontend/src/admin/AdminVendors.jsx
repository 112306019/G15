import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, Building2 } from 'lucide-react';
import { getAdminVendorList } from '../api/platform';

export default function AdminVendors() {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

        setError(
          err.response?.data?.err ||
          '取得廠商列表失敗'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#1A1A18] tracking-tight flex items-center gap-3">
            合作廠商管理
            <span className="text-xs font-bold bg-[#F8F9FA] text-[#8C8880] px-2.5 py-1 rounded-md tracking-wider font-sans border border-[#E2DDD4]">
              共 {vendors.length} 家
            </span>
          </h1>
          <p className="text-[#8C8880] mt-2 font-medium">檢視平台所有合作廠商的資料與帳號狀態。</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8880]" />
            <input 
              type="text" 
              placeholder="搜尋公司名稱、統編..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2DDD4] rounded-xl text-sm outline-none focus:border-[#C8522A] focus:ring-2 focus:ring-[#C8522A]/10 transition-all shadow-sm"
            />
          </div>
          <button className="flex items-center justify-center w-10 h-10 bg-white border border-[#E2DDD4] rounded-xl text-[#1A1A18] hover:bg-[#F8F9FA] hover:border-[#1A1A18] transition-all shadow-sm">
            <Filter size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-[#F5F0E8]/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A1A18] text-[#F5F0E8] flex items-center justify-center font-serif font-black shadow-sm">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-[#1A1A18]">{vendor.companyName}</div>
                        <div className="text-xs font-medium text-[#8C8880]">統編: {vendor.taxId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[#1A1A18]">{vendor.contact}</div>
                    <div className="text-xs font-medium text-[#8C8880] mt-0.5">{vendor.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-[#8C8880]">{vendor.createdAt}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border ${
                        vendor.status === 'approved'
                          ? 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20'
                          : vendor.status === 'pending'
                          ? 'bg-[#F5F0E8] text-[#B89B6A] border-[#B89B6A]/30'
                          : 'bg-[#F8F9FA] text-[#8C8880] border-[#E2DDD4]'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          vendor.status === 'approved'
                            ? 'bg-[#C8522A]'
                            : vendor.status === 'pending'
                            ? 'bg-[#B89B6A]'
                            : 'bg-[#8C8880]'
                        }`}
                      />

                      {vendor.status === 'approved'
                        ? '已通過'
                        : vendor.status === 'pending'
                        ? '待審核'
                        : vendor.status === 'rejected'
                        ? '已拒絕'
                        : '未知狀態'}
                    </span>
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