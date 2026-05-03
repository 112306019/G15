import React, { useMemo, useState } from "react";
import { ArrowLeft, Check, FileText, Box, Truck, Heart, Smartphone, Briefcase } from "lucide-react";

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
    // 🟢 移除最外層的 min-h-screen 和 grid 排版，因為 App.jsx 已經排好了！
    <div className="animate-in fade-in duration-500 max-w-4xl">
      
      {/* 🟢 返回按鈕 */}
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition-colors hover:text-slate-800"
      >
        <ArrowLeft size={18} />
        返回訂單列表
      </button>

      <h2 className="text-3xl font-bold text-slate-800 mb-8">訂單細節</h2>

      {/* 🟢 頂部：訂單摘要卡片 */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
        <div>
          <div className="mb-2 font-mono text-2xl font-bold text-slate-800">#20260712001</div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-gray-400">
            <span>1 件商品</span>
            <span>•</span>
            <span>訂購於 12 七月, 2026</span>
            <span>11:54 PM</span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 font-mono text-4xl font-black text-slate-800">$2700.00</div>
      </div>

      <p className="mb-10 text-sm font-bold text-gray-400">
        商品預計於 <strong className="text-slate-800 tracking-wider">2026/07/18</strong> 抵達
      </p>

      {/* 🟢 物流進度條 (Tracker) [cite: 780-785] */}
      <div className="relative mb-16 px-4">
        {/* 底色軌道 */}
        <div className="absolute left-10 right-10 top-[22px] h-1.5 rounded-full bg-gray-100" />
        {/* 進度軌道 */}
        <div
          className="absolute left-10 top-[22px] h-1.5 rounded-full bg-slate-800 transition-all duration-700 ease-out"
          style={{ width: `calc(${fillWidth} - 2rem)` }}
        />

        <div className="relative z-10 flex items-start justify-between">
          {steps.map((s, i) => {
            const DotIcon = s.icon;
            const isDone = i < step;
            const isActive = i === step;
            return (
              <div key={s.label} className="flex flex-col items-center gap-4 w-24">
                {/* 圓點與 Icon */}
                <div
                  className={`grid h-12 w-12 place-items-center rounded-full border-4 transition-all duration-500 bg-white ${
                    isDone 
                        ? "border-slate-800 bg-slate-800 text-white" 
                        : isActive 
                            ? "border-slate-800 text-slate-800" 
                            : "border-gray-100 text-gray-300"
                  }`}
                >
                  <DotIcon size={20} className={isDone ? "text-white" : ""} />
                </div>
                {/* 狀態文字 */}
                <div className={`text-sm text-center font-bold ${i <= step ? "text-slate-800" : "text-gray-400"}`}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* 測試用按鈕 (Demo) */}
        <div className="mt-10 flex justify-center gap-4">
            <button onClick={() => setStep((v) => Math.max(0, v - 1))} className="text-xs text-gray-400 hover:text-black font-bold px-4 py-2 border rounded-full">上一步 (測試)</button>
            <button onClick={() => setStep((v) => Math.min(3, v + 1))} className="text-xs text-gray-400 hover:text-black font-bold px-4 py-2 border rounded-full">下一步 (測試)</button>
        </div>
      </div>

      {/* 🟢 訂單動態 (Timeline) [cite: 785-790] */}
      <div className="mb-8 rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
        <h3 className="mb-8 text-lg font-bold text-slate-800">訂單詳情</h3>
        <div className="flex flex-col ml-4">
          {[
            { status: "包裹配送中", date: "17 七月, 2026 at 5:32 AM", active: true },
            { status: "已確認訂單", date: "14 七月, 2026 at 7:32 PM", active: false },
            { status: "已收到訂單,廠商將於確認後安排出貨", date: "12 七月, 2026 at 11:58 PM", active: false },
          ].map((item, idx, arr) => (
            <div key={idx} className="relative flex gap-6 pb-8 last:pb-0">
              {idx !== arr.length - 1 && (
                <div className="absolute left-[11px] top-8 h-full w-[2px] bg-gray-100" />
              )}
              <div className={`mt-1 h-6 w-6 rounded-full border-4 flex-shrink-0 z-10 bg-white ${item.active ? 'border-slate-800' : 'border-gray-200'}`} />
              <div>
                <div className={`mb-1 text-base font-bold ${item.active ? 'text-slate-800' : 'text-gray-500'}`}>{item.status}</div>
                <div className="text-sm font-medium text-gray-400">{item.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🟢 商品目錄 (Items) [cite: 791-800] */}
      <div className="mb-8 rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
        <h3 className="mb-6 text-lg font-bold text-slate-800">商品目錄(01)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-gray-100">
              <tr className="text-xs font-bold text-gray-400 tracking-wider">
                <th className="pb-4 pr-4">商品名稱</th>
                <th className="pb-4 px-4 text-center">價格</th>
                <th className="pb-4 px-4 text-center">數量</th>
                <th className="pb-4 pl-4 text-right">小計</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="py-6 pr-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 flex-shrink-0 rounded-2xl bg-gray-100 flex items-center justify-center">
                       <Smartphone size={24} className="text-gray-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-pink-500 mb-1 tracking-widest uppercase">硬碟</div>
                      <div className="text-sm font-bold text-slate-700 max-w-sm leading-relaxed">
                        Transcend 創見 ESD260C 250GB USB3.1/Type C 雙介面外接SSD行動固態硬碟-晶燦銀
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-6 px-4 text-center font-mono text-sm font-bold text-gray-500">NTD$ 2700</td>
                <td className="py-6 px-4 text-center font-mono text-sm font-bold text-gray-500">x1</td>
                <td className="py-6 pl-4 text-right font-mono text-base font-black text-slate-800">NTD$ 2700</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 🟢 收件資訊 [cite: 801-807] */}
      <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
        <h3 className="mb-6 text-lg font-bold text-slate-800">收件資訊</h3>
        <div className="space-y-4 text-sm font-medium">
            <div className="flex"><span className="w-24 text-gray-400">姓名</span><span className="text-slate-800 font-bold">Kevin Gilbert</span></div>
            <div className="flex"><span className="w-24 text-gray-400">地址</span><span className="text-slate-800 font-bold">台北市大安區忠孝東路...</span></div>
            <div className="flex"><span className="w-24 text-gray-400">手機號碼</span><span className="text-slate-800 font-bold">+1-202-555-0118</span></div>
            <div className="flex"><span className="w-24 text-gray-400">郵件</span><span className="text-slate-800 font-bold">kevin.gilbert@gmail.com</span></div>
        </div>
      </div>

    </div>
  );
}