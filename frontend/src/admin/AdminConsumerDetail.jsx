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
          `http://127.0.0.1:8000/api/platform/consumers?User_id=${id}`,
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
          });
        }

        // 拉訂單資料
        const orderRes = await fetch(
          `http://127.0.0.1:8000/api/platform/consumer/orders?User_id=${id}`,
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
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#8C8880] font-bold">載入中...</p>
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
            <span className="text-2xl font-black text-[#1A1A18] mt-1">{orders.length || 0} 筆</span>
          </div>
          <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-[#E2DDD4] flex flex-col justify-center items-center text-center">
            <CreditCard size={24} className="text-[#C8522A] mb-2" />
            <span className="text-sm font-bold text-[#8C8880]">總消費金額</span>
            <span className="text-2xl font-black text-[#C8522A] mt-1">NT$ {orders.reduce((sum, o) => sum + o.totalAmount, 0)?.toLocaleString() || 0}</span>
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