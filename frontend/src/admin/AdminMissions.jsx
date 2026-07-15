import React, { useState } from 'react';
import { Search, Filter, ClipboardList, TrendingUp, CheckCircle, Clock, Edit } from 'lucide-react';

export default function AdminMissions() {
  const [activeTab, setActiveTab] = useState('missions');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);

  // 模擬資料：KOC 任務進度 (對應 GET /admin/influencer/missions)
  const [missions] = useState([
    { kocMissionId: 'KM-1001', influencerName: '王大寶', brandName: '星姿態美妝', stage: '圖文審核中', deadline: '2026-07-20', status: '進行中' },
    { kocMissionId: 'KM-1002', influencerName: '李小華', brandName: '美味餐飲企業', stage: '已上線', deadline: '2026-07-15', status: '已完成' },
    { kocMissionId: 'KM-1003', influencerName: '陳阿神', brandName: '潮流行銷公司', stage: '商品寄送中', deadline: '2026-07-25', status: '進行中' },
  ]);

  // 模擬資料：成效追蹤與優惠碼 (對應 GET /admin/performance & GET /admin/coupons)
  const [performances] = useState([
    { trackingId: 'TRK-901', promotionCode: 'DABAO50', influencerName: '王大寶', orderId: 'ORD-260714-001', amount: 2500, status: '待結算' },
    { trackingId: 'TRK-902', promotionCode: 'HUA-LOVE', influencerName: '李小華', orderId: 'ORD-260710-088', amount: 4200, status: '已分潤' },
  ]);

  const handleUpdateClick = (mission) => {
    setSelectedMission(mission);
    setShowUpdateModal(true);
  };

  const submitStageUpdate = (e) => {
    e.preventDefault();
    // 這裡未來會串接 PATCH /admin/kocmission/stage/update API
    alert(`已成功更新任務 ${selectedMission.kocMissionId} 的階段！`);
    setShowUpdateModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 relative">
      
      {/* 🟢 狀態更新 Modal */}
      {showUpdateModal && selectedMission && (
        <div className="fixed inset-0 bg-[#1A1A18]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-[#E2DDD4]">
            <div className="w-12 h-12 rounded-full bg-[#F5F0E8] text-[#B89B6A] flex items-center justify-center mb-4 mx-auto">
              <Edit size={24} />
            </div>
            <h3 className="text-xl font-serif font-black text-[#1A1A18] text-center mb-2">更新任務階段</h3>
            <p className="text-[#8C8880] text-center text-sm mb-6">
              任務編號：{selectedMission.kocMissionId}
            </p>
            <form onSubmit={submitStageUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#8C8880] mb-2">選擇新階段</label>
                <select className="w-full bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm font-bold text-[#1A1A18] outline-none focus:border-[#C8522A]">
                  <option>圖文審核中</option>
                  <option>已上線</option>
                  <option>退回修改</option>
                  <option>結案撥款</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowUpdateModal(false)} className="flex-1 px-4 py-3 bg-white border border-[#E2DDD4] text-[#8C8880] rounded-xl font-bold text-sm hover:bg-[#F8F9FA]">取消</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-[#1A1A18] text-white rounded-xl font-bold text-sm hover:bg-[#333]">確認更新</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 頂部標題 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-[#1A1A18] tracking-tight">任務與活動追蹤</h1>
          <p className="text-[#8C8880] mt-2 font-medium">管理 KOC 的接案進度與推薦碼轉換成效。</p>
        </div>
      </div>

      {/* 🟢 頁籤切換區 */}
      <div className="flex gap-4 border-b border-[#E2DDD4] pb-px">
        <button 
          onClick={() => setActiveTab('missions')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'missions' ? 'border-[#C8522A] text-[#C8522A]' : 'border-transparent text-[#8C8880] hover:text-[#1A1A18]'
          }`}
        >
          <ClipboardList size={18} /> KOC 任務進度
        </button>
        <button 
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'performance' ? 'border-[#C8522A] text-[#C8522A]' : 'border-transparent text-[#8C8880] hover:text-[#1A1A18]'
          }`}
        >
          <TrendingUp size={18} /> 成效與分潤追蹤
        </button>
      </div>

      {/* 🟢 任務進度表格 (Missions) */}
      {activeTab === 'missions' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-4 border-b border-[#E2DDD4] flex justify-end bg-[#F8F9FA]">
             <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8880]" />
              <input type="text" placeholder="搜尋任務編號或 KOC..." className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2DDD4] rounded-lg text-sm outline-none focus:border-[#C8522A]" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">任務編號 / KOC</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">合作廠商</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">目前階段 (Stage)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">截止時間</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {missions.map((mission) => (
                  <tr key={mission.kocMissionId} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-black text-[#1A1A18] text-sm">{mission.kocMissionId}</div>
                      <div className="text-xs font-bold text-[#C8522A] mt-1">{mission.influencerName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#8C8880]">{mission.brandName}</td>
                    <td className="px-6 py-4">
                      <span className="bg-white border border-[#E2DDD4] px-3 py-1.5 rounded-md text-sm font-bold text-[#1A1A18] shadow-sm">
                        {mission.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-[#8C8880] flex items-center gap-1.5 mt-2">
                      <Clock size={14} /> {mission.deadline}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleUpdateClick(mission)}
                        className="inline-flex items-center gap-1.5 bg-[#1A1A18] text-[#F5F0E8] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#333] transition-all"
                      >
                        更新階段
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🟢 成效追蹤表格 (Performance) */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-[#E2DDD4] overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="p-4 border-b border-[#E2DDD4] bg-[#F8F9FA]">
            <p className="text-sm font-bold text-[#8C8880]">追蹤由推薦碼 (Promotion Code) 帶來的實際轉換訂單</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-[#E2DDD4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">追蹤編號 / 推薦碼</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">歸屬 KOC</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">綁定訂單</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">分潤金額</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#8C8880] uppercase">分潤狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DDD4]">
                {performances.map((perf) => (
                  <tr key={perf.trackingId} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#8C8880] text-xs">{perf.trackingId}</div>
                      <div className="text-sm font-black text-[#1A1A18] mt-1">{perf.promotionCode}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#C8522A]">{perf.influencerName}</td>
                    <td className="px-6 py-4 text-sm font-bold text-[#1A1A18]">{perf.orderId}</td>
                    <td className="px-6 py-4 font-black text-[#1A1A18] text-sm">NT$ {perf.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md border tracking-widest uppercase ${
                        perf.status === '已分潤' ? 'bg-[#F5F0E8] text-[#B89B6A] border-[#B89B6A]/30' : 'bg-[#E2DDD4] text-[#8C8880]'
                      }`}>
                        {perf.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}