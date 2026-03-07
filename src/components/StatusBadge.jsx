import React from 'react';

// 我們設定一個 type 來決定顏色，children 則是標籤裡面的文字
export default function StatusBadge({ type = 'default', children, className = '' }) {
  // 把所有可能會用到的顏色組合定義在這裡
  const colorStyles = {
    success: 'bg-green-100 text-green-600', // 成功、啟用、完成
    warning: 'bg-orange-100 text-orange-600', // 審核中、待處理、進行中
    danger: 'bg-red-100 text-red-600', // 停權、取消、失敗
    info: 'bg-blue-100 text-blue-600', // 招募中、提示
    purple: 'bg-purple-100 text-purple-600', // KOC 專屬
    default: 'bg-gray-100 text-gray-600', // 已結案、一般狀態
  };

  return (
    <span 
      className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap inline-block ${colorStyles[type]} ${className}`}
    >
      {children}
    </span>
  );
}