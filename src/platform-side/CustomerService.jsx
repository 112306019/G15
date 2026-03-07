import React, { useState } from 'react';

// 模擬資料庫
const initialContacts = [
  { id: 'C001', name: '王美美', role: 'KOC', avatar: '美', unread: 2, time: '10:30' },
  { id: 'C002', name: '美味餐飲企業', role: '廠商', avatar: '餐', unread: 0, time: '昨天' }
];

const initialMessages = {
  'C001': [
    { sender: 'user', text: '你好，我想請問關於春季彩妝任務的審核進度？', time: '10:25' },
    { sender: 'user', text: '我已經補上之前漏掉的 Instagram 連結了！', time: '10:30' }
  ],
  'C002': [
    { sender: 'user', text: '請問我們這期的撥款大約什麼時候會下來？', time: '昨天 15:00' },
    { sender: 'admin', text: '您好！本期的款項預計會在下週三統一匯出喔！', time: '昨天 15:15' }
  ]
};

export default function CustomerService() {
  const [contacts, setContacts] = useState(initialContacts);
  const [messages, setMessages] = useState(initialMessages);
  const [activeChatId, setActiveChatId] = useState(null);
  const [inputText, setInputText] = useState('');

  // 選擇聊天室並清除未讀
  const handleSelectChat = (id) => {
    setActiveChatId(id);
    setContacts(contacts.map(c => c.id === id ? { ...c, unread: 0 } : c));
  };

  // 傳送訊息
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatId) return;

    const newMsg = { sender: 'admin', text: inputText, time: '剛剛' };
    setMessages({
      ...messages,
      [activeChatId]: [...messages[activeChatId], newMsg]
    });
    setInputText('');
  };

  const activeContact = contacts.find(c => c.id === activeChatId);
  const activeMessages = activeChatId ? messages[activeChatId] : [];

  return (
    // 使用 calc 計算高度，減去頂部導覽列的高度，讓聊天室不會爆版
    <div className="max-w-7xl mx-auto w-full p-6 flex gap-6" style={{ height: 'calc(100vh - 80px)' }}>
      
      {/* 左側：聯絡人列表 */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-gray-100 bg-gray-50 shrink-0">
          <h2 className="text-xl font-bold">訊息中心</h2>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {contacts.map(contact => {
            const msgs = messages[contact.id];
            const lastMsg = msgs[msgs.length - 1]?.text || '';
            const isActive = activeChatId === contact.id;

            return (
              <div key={contact.id} onClick={() => handleSelectChat(contact.id)}
                className={`p-4 cursor-pointer transition-colors ${isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center font-bold shrink-0">{contact.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-sm font-bold text-gray-800 truncate">{contact.name}</h4>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{contact.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500 truncate pr-2">{lastMsg}</p>
                      {contact.unread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{contact.unread}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右側：聊天視窗 */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full relative">
        {!activeChatId ? (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10 rounded-xl">
            <div className="text-center text-gray-400">
              <p className="text-4xl mb-3">💬</p><p>請從左側選擇一個對話開始客服服務</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-100 shrink-0 flex justify-between items-center bg-white rounded-t-xl z-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">{activeContact.avatar}</div>
                <div><h3 className="font-bold text-gray-800">{activeContact.name}</h3><p className="text-xs text-blue-500 font-medium">{activeContact.role}</p></div>
              </div>
              <button className="text-sm text-gray-500 border border-gray-200 px-3 py-1 rounded hover:bg-gray-50">結案</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 z-0">
              {activeMessages.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}>
                  <div className={`${msg.sender === 'user' ? 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm' : 'bg-black text-white rounded-tr-sm'} rounded-2xl px-4 py-2 max-w-[70%] text-sm shadow-sm`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 mx-1">{msg.time}</span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 shrink-0 bg-white rounded-b-xl z-0">
              <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                <input type="text" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="輸入回覆訊息..." value={inputText} onChange={(e) => setInputText(e.target.value)} />
                <button type="submit" className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">傳送</button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}