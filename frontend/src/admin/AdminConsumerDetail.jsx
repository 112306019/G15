import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Calendar,
  ShoppingBag, AlertTriangle, User, Package, CreditCard
} from 'lucide-react';

export default function AdminConsumerDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [consumer, setConsumer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("admin_token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 拉使用者資料
        const userRes = await fetch(
          `${API_BASE_URL}/api/platform/consumers?User_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const userData = await userRes.json();
        if (Array.isArray(userData) && userData.length > 0) {
          const u = userData[0];
          setConsumer({
            id: u.User_id,
            name: u.Name,
            email: u.Email,
            phone: u.Phone,
            status: "active",
            createdAt: u.Created_At
              ? new Date(u.Created_At).toLocaleDateString("zh-TW")
              : "-",
            usedPromoCodes: 0 // 假設後端未來會提供，先預設 0
          });
        }

        // 拉訂單資料
        const orderRes = await fetch(
          `${API_BASE_URL}/api/platform/consumer/orders?User_id=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const orderData = await orderRes.json();
        if (Array.isArray(orderData)) {
          setOrders(orderData.map((o) => ({
            orderId: o.Order_id,
            promotionCode: o.Promotion_code,
            totalAmount: parseFloat(o.total_amount),
            orderStatus: o.order_status,
            paymentStatus: o.payment_status,
            shippingStatus: o.shipping_status,
            createdAt: o.created_at
              ? new Date(o.created_at).toLocaleString("zh-TW")
              : "-",
          })));
        }
      } catch (err) {
        console.error("載入失敗", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#8C8880] font-bold text-sm">載入中...</p>
      </div>
    );
  }

  if (!consumer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in p-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#F8F9FA] text-[#8C8880] rounded-full flex items-center justify-center mb-4 border border-[#E2DDD4]">
          <AlertTriangle size={24} />
        </div>
        <p className="text-[#1A1A18] font-bold text-base sm:text-lg mb-2">找不到使用者資料</p>
        <p className="text-[#8C8880] text-xs sm:text-sm mb-6 text-center">這筆資料可能已被移除或存取路徑錯誤。</p>
        <button
          onClick={() => navigate('/admin/consumers')}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#1A1A18] text-[#F5F0E8] rounded-full text-xs sm:text-sm font-bold tracking-wider hover:bg-[#C8522A] transition-all shadow-md hover:-translate-y-0.5"
        >
          <ArrowLeft size={16} className="w-4 h-4" /> 返回使用者列表
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-500 relative pb-10">
      
      <button 
        onClick={() => navigate('/admin/consumers')} 
        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-[#E2DDD4] text-[#8C8880] hover:text-[#1A1A18] hover:border-[#1A1A18] shadow-sm hover:shadow-md rounded-full font-bold text-xs sm:text-sm transition-all mb-2 sm:mb-4 group w-fit"
      >
        <ArrowLeft size={16} className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:-translate-x-0.5" /> 
        返回使用者列表
      </button>
      
      <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-[#E2DDD4] p-5 sm:p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 md:w-64 md:h-64 bg-[#F8F9FA] rounded-full mix-blend-multiply filter blur-[60px] md:blur-[80px] opacity-70"></div>

        {/* --- 使用者個人資料區塊 --- */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-10 pb-6 sm:pb-8 md:pb-10 border-b border-[#E2DDD4] relative z-10">
          
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#F8F9FA] border-2 sm:border-4 border-[#E2DDD4] rounded-full flex items-center justify-center text-3xl sm:text-4xl text-[#1A1A18] font-serif font-black shadow-sm shrink-0">
            {consumer.name?.charAt(0) || '?'}
          </div>
          
          <div className="flex-1 min-w-0 w-full">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-black text-[#1A1A18] flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 truncate">
              {consumer.name}
              <span className="text-[9px] sm:text-[10px] font-sans font-bold bg-[#F8F9FA] text-[#8C8880] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md tracking-widest border border-[#E2DDD4] shrink-0">
                ID: {consumer.id}
              </span>
            </h2>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs sm:text-sm font-bold text-[#8C8880]">
              <div className="flex items-center gap-1.5 text-[#1A1A18]">
                <Mail size={16} className="text-[#8C8880] w-4 h-4" /> 
                <span className="truncate">{consumer.email}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:border-l sm:border-[#E2DDD4] sm:pl-4">
                <Phone size={16} className="text-[#8C8880] w-4 h-4" /> 
                <span>{consumer.phone || '未提供'}</span>
              </div>
            </div>

            <div className="mt-4 sm:mt-5 flex gap-2 sm:gap-3 items-center flex-wrap">
              <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-md border tracking-widest inline-flex items-center gap-1.5 ${
                consumer.status === 'active' 
                  ? 'bg-white text-[#1A1A18] border-[#1A1A18] shadow-sm' 
                  : 'bg-[#F8F9FA] text-[#8C8880] border-[#E2DDD4]'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${consumer.status === 'active' ? 'bg-[#1A1A18]' : 'bg-[#8C8880]'}`}></div>
                {consumer.status === 'active' ? '帳號正常' : '已停權'}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-[#8C8880] flex items-center gap-1">
                <Calendar size={12} className="sm:w-3.5 sm:h-3.5" /> 註冊於 {consumer.createdAt}
              </span>
            </div>
          </div>
        </div>

        {/* --- 統計數據區塊 --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 relative z-10 mb-8 sm:mb-10">
          <div className="bg-[#F8F9FA] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#E2DDD4] flex flex-col justify-center items-center text-center">
            <ShoppingBag size={20} className="text-[#1A1A18] mb-1.5 sm:mb-2 sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm font-bold text-[#8C8880]">累積訂單數</span>
            <span className="text-xl sm:text-2xl font-black text-[#1A1A18] mt-1">{orders.length || 0} 筆</span>
          </div>
          <div className="bg-[#F8F9FA] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#E2DDD4] flex flex-col justify-center items-center text-center">
            <CreditCard size={20} className="text-[#C8522A] mb-1.5 sm:mb-2 sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm font-bold text-[#8C8880]">總消費金額</span>
            <span className="text-xl sm:text-2xl font-black text-[#C8522A] mt-1">NT$ {orders.reduce((sum, o) => sum + o.totalAmount, 0)?.toLocaleString() || 0}</span>
          </div>
          <div className="bg-[#F8F9FA] rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#E2DDD4] flex flex-col justify-center items-center text-center sm:col-span-2 md:col-span-1">
            <User size={20} className="text-[#B89B6A] mb-1.5 sm:mb-2 sm:w-6 sm:h-6" />
            <span className="text-xs sm:text-sm font-bold text-[#8C8880]">使用推薦碼次數</span>
            <span className="text-xl sm:text-2xl font-black text-[#1A1A18] mt-1">{consumer.usedPromoCodes || 0} 次</span>
          </div>
        </div>

        {/* --- 訂單明細紀錄 --- */}
        <div className="space-y-4 sm:space-y-6 relative z-10 pt-6 sm:pt-8 border-t border-[#E2DDD4]">
          <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1A1A18] flex items-center gap-2">
            <Package size={18} className="text-[#1A1A18] sm:w-5 sm:h-5" />
            歷史訂單紀錄
          </h3>
          
          <div className="md:hidden flex flex-col gap-3">
            {orders && orders.length > 0 ? (
              orders.map((order, idx) => (
                <div key={idx} className="bg-[#F8F9FA] rounded-xl p-4 border border-[#E2DDD4]">
                  <div className="flex justify-between items-start mb-3 border-b border-[#E2DDD4]/50 pb-3">
                    <div>
                      <div className="text-[10px] font-bold text-[#8C8880] mb-0.5">訂單編號</div>
                      <div className="font-bold text-[#1A1A18] text-sm">{order.orderId}</div>
                      <div className="text-[10px] text-[#8C8880] mt-0.5">{order.createdAt}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-[#1A1A18]">NT$ {order.totalAmount.toLocaleString()}</span>
                      <div className="text-[10px] font-bold text-[#8C8880] mt-1">
                        {order.orderStatus === 'completed' ? '已完成' : '進行中'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-1 rounded-md border uppercase tracking-widest ${
                        order.paymentStatus === 'paid' ? 'bg-[#F5F0E8] text-[#B89B6A] border-[#B89B6A]/30' : 'bg-[#E2DDD4] text-[#8C8880]'
                      }`}>
                        {order.paymentStatus === 'paid' ? '已付款' : '未付款'}
                      </span>
                      <span className={`px-2 py-1 rounded-md border uppercase tracking-widest ${
                        order.shippingStatus === 'shipped' ? 'bg-[#FDF0ED] text-[#C8522A] border-[#C8522A]/20' : 'bg-white text-[#8C8880] border-[#E2DDD4]'
                      }`}>
                        {order.shippingStatus === 'shipped' ? '已出貨' : '處理中'}
                      </span>
                    </div>
                    <div className="text-[#C8522A] bg-white border border-[#C8522A]/20 px-2 py-1 rounded-md">
                      {order.promotionCode || '無推薦碼'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs sm:text-sm font-bold text-[#8C8880]">
                該用戶目前尚無訂單紀錄
              </div>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse bg-[#F8F9FA] rounded-2xl overflow-hidden border border-[#E2DDD4] whitespace-nowrap">
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
                {orders && orders.length > 0 ? (
                  orders.map((order, idx) => (
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
                        <span className={`inline-block whitespace-nowrap text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest uppercase ${
                          order.paymentStatus === 'paid' ? 'bg-[#F5F0E8] text-[#B89B6A] border-[#B89B6A]/30' : 'bg-[#E2DDD4] text-[#8C8880]'
                        }`}>
                          {order.paymentStatus === 'paid' ? '已付款' : '未付款'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block whitespace-nowrap text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest uppercase ${
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