import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Phone, Calendar, 
  ShoppingBag, AlertTriangle, User, Package, CreditCard
} from 'lucide-react';

export default function AdminConsumerDetail({ consumer }) {
  const navigate = useNavigate();

  // 如果沒有傳入資料，顯示找不到的狀態
  if (!consumer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in">
        <div className="w-16 h-16 bg-[#F8F9FA] text-[#8C8880] rounded-full flex items-center justify-center mb-4 border border-[#E2DDD4]">
          <AlertTriangle size={24} />
        </div>
        <p className="text-[#1A1A18] font-bold text-lg mb-2">找不到使用者資料</p>
        <p className="text-[#8C8880] text-sm mb-6">這筆資料可能已被移除或存取路徑錯誤。</p>
        <button 
          onClick={() => navigate('/admin/consumers')} 
          className="flex items-center gap-2 bg-[#1A1A18] text-[#F5F0E8] px-6 py-3 rounded-full text-sm font-bold tracking-wider hover:bg-[#C8522A] transition-all shadow-md hover:-translate-y-0.5"
        >
          <ArrowLeft size={16} /> 返回使用者列表
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* 🟢 頂部：返回按鈕 */}
      <button 
        onClick={() => navigate('/admin/consumers')} 
        className="flex items-center gap-2 text-[#8C8880] hover:text-[#1A1A18] transition-colors font-bold text-sm mb-4"
      >
        <ArrowLeft size={16} /> 返回使用者列表
      </button>
      
      {/* 🟢 主要資訊卡片 */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F8F9FA] rounded-full mix-blend-multiply filter blur-[80px] opacity-70"></div>

        {/* --- 使用者個人資料區塊 --- */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-10 pb-10 border-b border-[#E2DDD4] relative z-10">
          
          <div className="w-24 h-24 bg-[#F8F9FA] border border-[#E2DDD4] rounded-full flex items-center justify-center text-4xl text-[#1A1A18] font-serif font-black shadow-sm">
            {consumer.name.charAt(0)}
          </div>
          
          <div className="flex-1">
            <h2 className="text-3xl font-serif font-black text-[#1A1A18] flex items-center gap-3 mb-2">
              {consumer.name}
              <span className="text-[10px] font-sans font-bold bg-[#F8F9FA] text-[#8C8880] px-2 py-1 rounded-md tracking-widest border border-[#E2DDD4]">
                ID: {consumer.id}
              </span>
            </h2>
            
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm font-bold text-[#8C8880]">
              <div className="flex items-center gap-1.5 text-[#1A1A18]">
                <Mail size={16} className="text-[#8C8880]" /> 
                <span>{consumer.email}</span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-[#E2DDD4] pl-4">
                <Phone size={16} className="text-[#8C8880]" /> 
                <span>{consumer.phone}</span>
              </div>
            </div>

            <div className="mt-5 flex gap-3 items-center">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-md border tracking-widest ${
                consumer.status === 'active' 
                  ? 'bg-white text-[#1A1A18] border-[#1A1A18]' 
                  : 'bg-[#F8F9FA] text-[#8C8880] border-[#E2DDD4]'
              }`}>
                {consumer.status === 'active' ? '✅ 帳號正常' : '🚫 已停權'}
              </span>
              <span className="text-xs font-bold text-[#8C8880] ml-2 flex items-center gap-1">
                <Calendar size={14} /> 註冊於 {consumer.createdAt}
              </span>
            </div>
          </div>
        </div>

        {/* --- 統計數據區塊 --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 mb-10">
          <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-[#E2DDD4] flex flex-col justify-center items-center text-center">
            <ShoppingBag size={24} className="text-[#1A1A18] mb-2" />
            <span className="text-sm font-bold text-[#8C8880]">累積訂單數</span>
            <span className="text-2xl font-black text-[#1A1A18] mt-1">{consumer.totalOrders || 0} 筆</span>
          </div>
          <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-[#E2DDD4] flex flex-col justify-center items-center text-center">
            <CreditCard size={24} className="text-[#C8522A] mb-2" />
            <span className="text-sm font-bold text-[#8C8880]">總消費金額</span>
            <span className="text-2xl font-black text-[#C8522A] mt-1">NT$ {consumer.totalSpent?.toLocaleString() || 0}</span>
          </div>
          <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-[#E2DDD4] flex flex-col justify-center items-center text-center">
            <User size={24} className="text-[#B89B6A] mb-2" />
            <span className="text-sm font-bold text-[#8C8880]">使用推薦碼次數</span>
            <span className="text-2xl font-black text-[#1A1A18] mt-1">{consumer.usedPromoCodes || 0} 次</span>
          </div>
        </div>

        {/* --- 訂單明細紀錄 --- */}
        <div className="space-y-6 relative z-10 pt-8 border-t border-[#E2DDD4]">
          <h3 className="font-serif font-bold text-xl text-[#1A1A18] flex items-center gap-2">
            <Package size={20} className="text-[#1A1A18]" />
            歷史訂單紀錄
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-[#F8F9FA] rounded-2xl overflow-hidden border border-[#E2DDD4]">
              <thead>
                <tr className="border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">訂單編號 / 時間</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">推薦碼</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">總金額</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">付款狀態</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">出貨狀態</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase tracking-wider">訂單狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {consumer.orders && consumer.orders.length > 0 ? (
                  consumer.orders.map((order, idx) => (
                    <tr key={idx} className="hover:bg-white transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1A1A18] text-sm">{order.orderId}</div>
                        <div className="text-xs text-[#8C8880] mt-1">{order.createdAt}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#C8522A]">
                        {order.promotionCode || '-'}
                      </td>
                      <td className="px-6 py-4 font-black text-[#1A1A18] text-sm">
                        NT$ {order.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest uppercase ${
                          order.paymentStatus === 'paid' ? 'bg-[#F5F0E8] text-[#B89B6A] border-[#B89B6A]/30' : 'bg-[#E2DDD4] text-[#8C8880]'
                        }`}>
                          {order.paymentStatus === 'paid' ? '已付款' : '未付款'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest uppercase ${
                          order.shippingStatus === 'shipped' ? 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20' : 'bg-white text-[#8C8880] border-[#E2DDD4]'
                        }`}>
                          {order.shippingStatus === 'shipped' ? '已出貨' : '處理中'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#1A1A18]">
                        {order.orderStatus === 'completed' ? '已完成' : '進行中'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-sm font-bold text-[#8C8880]">
                      該用戶目前尚無訂單紀錄
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