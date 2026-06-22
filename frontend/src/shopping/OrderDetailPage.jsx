import React, { useState } from "react";
import { ArrowLeft, FileText, Box, Truck, Heart, Smartphone } from "lucide-react";

export default function OrderDetailPage({ onBack }) {
  // 0:已確認 1:出貨中 2:運送中 3:抵達
  const [step, setStep] = useState(1);
  const fillWidth = ["0%", "33%", "66%", "100%"][step] ?? "33%";

  const steps = [
    { label: "已確認訂單", icon: FileText },
    { label: "廠商出貨中", icon: Box },
    { label: "運送中", icon: Truck },
    { label: "抵達", icon: Heart },
  ];

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl">
      
      {/* 🟢 帶有 Hover 動效的高質感返回按鍵 */}
      <button 
        onClick={onBack} 
        className="mb-6 flex items-center gap-2 text-[#8C8880] hover:text-[#C8522A] transition-colors font-bold text-sm group w-fit"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        返回訂單列表
      </button>

      <h2 className="text-[28px] font-serif font-bold text-[#1A1A18] mb-8">訂單細節</h2>

      {/* 🟢 頂部：訂單摘要卡片 */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between rounded-[2.5rem] border border-[#E2DDD4] bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
        <div>
          <div className="mb-2 font-mono text-2xl font-bold text-[#1A1A18]">#20260712001</div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-[#8C8880]">
            <span>1 件商品</span>
            <span>•</span>
            <span>訂購於 12 七月, 2026</span>
            <span>11:54 PM</span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 font-mono text-4xl font-black text-[#C8522A]">$2700.00</div>
      </div>

      <p className="mb-10 text-sm font-bold text-[#8C8880]">
        商品預計於 <strong className="text-[#1A1A18] tracking-wider">2026/07/18</strong> 抵達
      </p>

      {/* 🟢 物流進度條 (Tracker) 套用品牌色 */}
      <div className="relative mb-16 px-4">
        {/* 底色軌道 (拿鐵色) */}
        <div className="absolute left-10 right-10 top-[22px] h-1.5 rounded-full bg-[#F5F0E8]" />
        {/* 進度軌道 (焦糖橘) */}
        <div
          className="absolute left-10 top-[22px] h-1.5 rounded-full bg-[#C8522A] transition-all duration-700 ease-out"
          style={{ width: `calc(${fillWidth} - 2rem)` }}
        />

        <div className="relative z-10 flex items-start justify-between">
          {steps.map((s, i) => {
            const DotIcon = s.icon;
            const isDone = i < step;
            const isActive = i === step;
            return (
              <div key={s.label} className="flex flex-col items-center gap-4 w-24 group">
                {/* 圓點與 Icon */}
                <div
                  className={`grid h-12 w-12 place-items-center rounded-full border-4 transition-all duration-500 bg-white ${
                    isDone 
                        ? "border-[#C8522A] bg-[#C8522A] text-white shadow-[0_0_15px_rgba(200,82,42,0.3)]" 
                        : isActive 
                            ? "border-[#C8522A] text-[#C8522A] shadow-sm" 
                            : "border-[#E2DDD4] text-[#8C8880]"
                  }`}
                >
                  <DotIcon size={20} className={isDone ? "text-white" : ""} />
                </div>
                {/* 狀態文字 */}
                <div className={`text-sm text-center font-bold transition-colors ${i <= step ? "text-[#1A1A18]" : "text-[#8C8880]"}`}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* 測試用按鈕 (Demo) */}
        <div className="mt-10 flex justify-center gap-4">
            <button onClick={() => setStep((v) => Math.max(0, v - 1))} className="text-xs text-[#8C8880] hover:text-[#1A1A18] font-bold px-5 py-2.5 border border-[#E2DDD4] rounded-full hover:bg-[#F8F9FA] transition-colors">上一步 (測試)</button>
            <button onClick={() => setStep((v) => Math.min(3, v + 1))} className="text-xs text-[#8C8880] hover:text-[#1A1A18] font-bold px-5 py-2.5 border border-[#E2DDD4] rounded-full hover:bg-[#F8F9FA] transition-colors">下一步 (測試)</button>
        </div>
      </div>

      {/* 🟢 訂單動態 (Timeline) */}
      <div className="mb-8 rounded-[2rem] border border-[#E2DDD4] bg-white p-8 shadow-sm">
        <h3 className="mb-8 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#C8522A] rounded-full inline-block"></span>
          訂單詳情
        </h3>
        <div className="flex flex-col ml-4">
          {[
            { status: "包裹配送中", date: "17 七月, 2026 at 5:32 AM", active: true },
            { status: "已確認訂單", date: "14 七月, 2026 at 7:32 PM", active: false },
            { status: "已收到訂單,廠商將於確認後安排出貨", date: "12 七月, 2026 at 11:58 PM", active: false },
          ].map((item, idx, arr) => (
            <div key={idx} className="relative flex gap-6 pb-8 last:pb-0">
              {idx !== arr.length - 1 && (
                <div className="absolute left-[11px] top-8 h-full w-[2px] bg-[#E2DDD4]" />
              )}
              <div className={`mt-1 h-6 w-6 rounded-full border-4 flex-shrink-0 z-10 bg-white transition-colors ${item.active ? 'border-[#C8522A]' : 'border-[#E2DDD4]'}`} />
              <div>
                <div className={`mb-1 text-base font-bold ${item.active ? 'text-[#1A1A18]' : 'text-[#8C8880]'}`}>{item.status}</div>
                <div className="text-sm font-medium text-[#8C8880]/70">{item.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🟢 商品目錄 (Items) */}
      <div className="mb-8 rounded-[2rem] border border-[#E2DDD4] bg-white p-8 shadow-sm overflow-hidden">
        <h3 className="mb-6 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#1A1A18] rounded-full inline-block"></span>
          商品目錄 (01)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#E2DDD4]">
              <tr className="text-xs font-bold text-[#8C8880] tracking-wider">
                <th className="pb-4 pr-4">商品名稱</th>
                <th className="pb-4 px-4 text-center">價格</th>
                <th className="pb-4 px-4 text-center">數量</th>
                <th className="pb-4 pl-4 text-right">小計</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#F5F0E8] last:border-0 hover:bg-[#F8F9FA] transition-colors">
                <td className="py-6 pr-4">
                  <div className="flex items-center gap-5">
                    <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-[#F5F0E8] flex items-center justify-center border border-[#E2DDD4]">
                       <Smartphone size={24} className="text-[#8C8880]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#B89B6A] mb-1 tracking-widest uppercase">硬碟</div>
                      <div className="text-sm font-bold text-[#1A1A18] max-w-sm leading-relaxed">
                        Transcend 創見 ESD260C 250GB USB3.1/Type C 雙介面外接SSD行動固態硬碟-晶燦銀
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-6 px-4 text-center font-mono text-sm font-bold text-[#8C8880]">NTD$ 2700</td>
                <td className="py-6 px-4 text-center font-mono text-sm font-bold text-[#8C8880]">x1</td>
                <td className="py-6 pl-4 text-right font-mono text-base font-black text-[#C8522A]">NTD$ 2700</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 🟢 收件資訊 */}
      <div className="rounded-[2rem] border border-[#E2DDD4] bg-[#F8F9FA] p-8 shadow-sm">
        <h3 className="mb-6 text-lg font-bold text-[#1A1A18] flex items-center gap-3">
          <span className="w-1.5 h-6 bg-[#8C8880] rounded-full inline-block"></span>
          收件資訊
        </h3>
        <div className="space-y-4 text-sm font-medium">
            <div className="flex"><span className="w-24 text-[#8C8880]">姓名</span><span className="text-[#1A1A18] font-bold">Kevin Gilbert</span></div>
            <div className="flex"><span className="w-24 text-[#8C8880]">地址</span><span className="text-[#1A1A18] font-bold">台北市大安區忠孝東路...</span></div>
            <div className="flex"><span className="w-24 text-[#8C8880]">手機號碼</span><span className="text-[#1A1A18] font-bold">+1-202-555-0118</span></div>
            <div className="flex"><span className="w-24 text-[#8C8880]">郵件</span><span className="text-[#1A1A18] font-bold">kevin.gilbert@gmail.com</span></div>
        </div>
      </div>

    </div>
  );
}