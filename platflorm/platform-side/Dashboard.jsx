import React from 'react';

// 🌟 關鍵 1：在這裡的括號加上 { setCurrentPage }，接住客廳傳來的遙控器
export default function Dashboard({ setCurrentPage }) {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      
      {/* 頂部歡迎區塊 */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">平台總覽</h1>
          <p className="text-gray-500 mt-2">歡迎回來！以下是今日的平台營運與待辦數據。</p>
        </div>
        <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
          最後更新時間：剛剛
        </div>
      </div>

      {/* 數據卡片區 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">總註冊 KOC</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">1,245</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xl">👥</div>
          </div>
          <div className="mt-4 text-sm text-green-500 font-medium">↑ 較上月成長 12%</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">進行中任務</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">38</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-xl">📋</div>
          </div>
          <div className="mt-4 text-sm text-green-500 font-medium">↑ 較上月成長 5%</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">本月平台營收</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">$320k</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-xl">💰</div>
          </div>
          <div className="mt-4 text-sm text-green-500 font-medium">↑ 較上月成長 8%</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium">待審核項目</p>
              <h3 className="text-3xl font-bold text-orange-500 mt-2">12</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-xl">⏳</div>
          </div>
          <div className="mt-4 text-sm text-orange-500 font-medium">需盡快處理</div>
        </div>
      </div>

      {/* 下方佈局：圖表 (左) 與 待辦事項 (右) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        
        {/* 左側圖表區塊 */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">平台流量與媒合趨勢</h2>
            <select className="text-sm border-gray-300 rounded-md border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer bg-gray-50">
              <option>近 7 天</option>
              <option>近 30 天</option>
              <option>今年度</option>
            </select>
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center min-h-[300px]">
            <span className="text-4xl mb-3">📈</span>
            <p className="text-gray-400 font-medium">數據圖表載入區塊</p>
            <p className="text-xs text-gray-400 mt-1">(可串接 Chart.js 或 Recharts 顯示折線圖)</p>
          </div>
        </div>

        {/* 右側待辦事項列表 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">最新待辦審核</h2>
            <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-1 rounded-full">3 筆急件</span>
          </div>
          
          <div className="space-y-3 flex-1">
            {/* 待辦事項 1 */}
            <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors group">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-bold text-gray-800">王大寶</p>
                  <p className="text-xs text-gray-500 mt-0.5">KOC 身份申請</p>
                </div>
              </div>
              {/* 🌟 關鍵 2：加上 onClick 事件，跳轉到 'user' */}
              <button 
                onClick={() => setCurrentPage('user')} 
                className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-black hover:text-white transition-colors"
              >
                前往
              </button>
            </div>

            {/* 待辦事項 2 */}
            <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors group">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-bold text-gray-800">春季彩妝新品...</p>
                  <p className="text-xs text-gray-500 mt-0.5">任務上架申請</p>
                </div>
              </div>
              {/* 🌟 關鍵 3：加上 onClick 事件，跳轉到 'task' */}
              <button 
                onClick={() => setCurrentPage('task')} 
                className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-black hover:text-white transition-colors"
              >
                前往
              </button>
            </div>

            {/* 待辦事項 3 */}
            <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors group">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-bold text-gray-800">美味餐飲企業</p>
                  <p className="text-xs text-gray-500 mt-0.5">廠商註冊申請</p>
                </div>
              </div>
              {/* 🌟 關鍵 4：加上 onClick 事件，跳轉到 'vendor' */}
              <button 
                onClick={() => setCurrentPage('vendor')} 
                className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-black hover:text-white transition-colors"
              >
                前往
              </button>
            </div>
          </div>

          <button className="w-full mt-4 py-2.5 text-sm font-medium text-gray-500 hover:text-black border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            查看全部待辦清單 →
          </button>
        </div>
        
      </div>
    </div>
  );
}