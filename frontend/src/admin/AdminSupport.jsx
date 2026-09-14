import React, { useEffect, useState } from 'react';
import { Headset, Loader2, Send, Store, User, ArrowLeft } from 'lucide-react';

import {
  getAdminSupportRooms,
  getAdminSupportMessages,
  sendAdminSupportMessage,
  markAdminSupportRead,
} from '../api/platform';

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminSupport() {
  const adminId = localStorage.getItem('admin_id');

  const [participantType, setParticipantType] = useState('vendor');
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState('');

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageError, setMessageError] = useState('');

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadRooms(participantType);
    setSelectedRoom(null);
    setMessages([]);
  }, [participantType]);

  async function loadRooms(type) {
    try {
      setRoomsLoading(true);
      setRoomsError('');

      const response = await getAdminSupportRooms(type);

      if (response.data?.success === false) {
        throw new Error(response.data.err || '聊天室列表載入失敗');
      }

      setRooms(response.data?.rooms || []);
    } catch (error) {
      const apiError = error.response?.data?.err;
      setRoomsError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message || '聊天室列表載入失敗'
      );
    } finally {
      setRoomsLoading(false);
    }
  }

  async function openRoom(room) {
    setSelectedRoom(room);
    setMessageError('');

    try {
      setMessagesLoading(true);

      const response = await getAdminSupportMessages(room.room_id);

      if (response.data?.success === false) {
        throw new Error(response.data.err || '聊天室訊息載入失敗');
      }

      setMessages(response.data?.messages || []);

      if (room.unread_count > 0) {
        await markAdminSupportRead(room.room_id);
        setRooms((previous) =>
          previous.map((r) =>
            r.room_id === room.room_id ? { ...r, unread_count: 0 } : r
          )
        );
      }
    } catch (error) {
      const apiError = error.response?.data?.err;
      setMessageError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message || '聊天室訊息載入失敗'
      );
    } finally {
      setMessagesLoading(false);
    }
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || !selectedRoom || sending || !adminId) return;

    try {
      setSending(true);
      setMessageError('');

      const response = await sendAdminSupportMessage({
        room_id: selectedRoom.room_id,
        admin_id: adminId,
        content,
      });

      if (response.data?.success === false) {
        throw new Error(response.data.err || '訊息送出失敗');
      }

      const message = response.data.message;
      setMessages((previous) => [...previous, message]);
      setInput('');

      setRooms((previous) =>
        previous.map((r) =>
          r.room_id === selectedRoom.room_id
            ? { ...r, last_message: message.content, last_message_time: message.created_at, last_sender_role: 'admin' }
            : r
        )
      );
    } catch (error) {
      const apiError = error.response?.data?.err;
      setMessageError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : error.message || '訊息送出失敗'
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-6 md:pb-10 h-full flex flex-col">
      
      <div className="mb-4 md:mb-6 shrink-0">
        <h2 className="text-2xl md:text-3xl font-serif font-black text-[#1A1A18]">客服聊天室</h2>
        <p className="text-[#8C8880] mt-1.5 md:mt-2 text-xs md:text-sm font-medium">即時回覆廠商與消費者的問題及需求。</p>
      </div>

      <div className="flex gap-4 md:gap-6 h-[75vh] md:h-[70vh]">
        
        {/* 分頁 + 聊天室列表 */}
        <div className={`w-full md:w-80 shrink-0 flex-col rounded-[1.5rem] md:rounded-[2rem] border border-[#E2DDD4] bg-white shadow-sm overflow-hidden ${selectedRoom ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex border-b border-[#E2DDD4] shrink-0">
            <button
              type="button"
              onClick={() => setParticipantType('vendor')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3.5 text-xs sm:text-sm font-bold transition-colors ${
                participantType === 'vendor'
                  ? 'text-[#C8522A] border-b-2 border-[#C8522A]'
                  : 'text-[#8C8880] hover:text-[#1A1A18]'
              }`}
            >
              <Store size={16} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              廠商端
            </button>
            <button
              type="button"
              onClick={() => setParticipantType('user')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3.5 text-xs sm:text-sm font-bold transition-colors ${
                participantType === 'user'
                  ? 'text-[#C8522A] border-b-2 border-[#C8522A]'
                  : 'text-[#8C8880] hover:text-[#1A1A18]'
              }`}
            >
              <User size={16} className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              消費者
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {roomsError && (
              <div className="m-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-600">
                {roomsError}
              </div>
            )}

            {roomsLoading ? (
              <div className="h-full flex flex-col items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-[#C8522A]" />
              </div>
            ) : rooms.length > 0 ? (
              rooms.map((room) => (
                <button
                  key={room.room_id}
                  type="button"
                  onClick={() => openRoom(room)}
                  className={`w-full text-left px-4 sm:px-5 py-3 sm:py-4 border-b border-[#F5F0E8] transition-colors ${
                    selectedRoom?.room_id === room.room_id ? 'bg-[#FDF0ED]' : 'hover:bg-[#F8F9FA]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-[#1A1A18] truncate">
                      {room.participant_name || room.participant_id}
                    </span>
                    {room.unread_count > 0 && (
                      <span className="shrink-0 bg-[#C8522A] text-white text-[9px] sm:text-[10px] w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full font-bold">
                        {room.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] sm:text-xs text-[#8C8880] truncate">
                    {room.last_message || '尚無訊息'}
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 text-[#8C8880]">
                <Headset size={24} className="mb-2 text-[#E2DDD4]" />
                <p className="text-xs sm:text-sm font-bold">目前沒有聊天室</p>
              </div>
            )}
          </div>
        </div>

        {/* 聊天面板 */}
        <div className={`flex-1 flex-col rounded-[1.5rem] md:rounded-[2rem] border border-[#E2DDD4] bg-white shadow-sm overflow-hidden ${!selectedRoom ? 'hidden md:flex' : 'flex'}`}>
          {!selectedRoom ? (
            <div className="h-full flex flex-col items-center justify-center text-[#8C8880]">
              <Headset size={36} className="mb-3 text-[#E2DDD4]" />
              <p className="text-sm font-bold">請從左側選擇一個聊天室</p>
            </div>
          ) : (
            <>
              {/* 聊天對象標題列 */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E2DDD4] shrink-0 bg-[#F8F9FA] flex items-center gap-3">
                <button 
                  className="md:hidden p-1.5 -ml-1.5 text-[#8C8880] hover:text-[#1A1A18] hover:bg-[#E2DDD4] rounded-lg transition-colors"
                  onClick={() => setSelectedRoom(null)}
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <div className="text-sm font-bold text-[#1A1A18]">
                    {selectedRoom.participant_name || selectedRoom.participant_id}
                  </div>
                  <div className="text-[10px] sm:text-xs text-[#8C8880] mt-0.5">
                    {participantType === 'vendor' ? '廠商' : '消費者'}・{selectedRoom.participant_id}
                  </div>
                </div>
              </div>

              {messageError && (
                <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-600">
                  {messageError}
                </div>
              )}

              {/* 訊息顯示區塊 */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4 custom-scrollbar bg-white">
                {messagesLoading ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-[#C8522A]" />
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((message) => {
                    const isMine = message.sender_role === 'admin';

                    return (
                      <div key={message.message_id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] md:max-w-md px-3.5 sm:px-4 py-2.5 rounded-2xl text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            isMine
                              ? 'bg-[#1A1A18] text-white rounded-br-sm shadow-md'
                              : 'bg-[#F8F9FA] border border-[#E2DDD4] text-[#1A1A18] rounded-bl-sm'
                          }`}
                        >
                          {message.content}
                          <div className={`text-[9px] sm:text-[10px] mt-1.5 ${isMine ? 'text-white/50 text-right' : 'text-[#8C8880]'}`}>
                            {formatTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-[#8C8880]">
                    <p className="text-xs sm:text-sm font-bold">尚無對話紀錄</p>
                  </div>
                )}
              </div>

              {/* 訊息輸入區塊 */}
              <div className="bg-white border-t border-[#E2DDD4] px-4 sm:px-6 py-3 sm:py-4 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    placeholder="輸入訊息…（Enter 送出，Shift + Enter 換行）"
                    className="flex-1 max-h-24 sm:max-h-32 resize-none bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:ring-4 focus:ring-[#C8522A]/10 focus:border-[#C8522A] transition-all disabled:opacity-60 custom-scrollbar"
                  />

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="bg-[#1A1A18] text-white p-2.5 sm:p-3 rounded-xl hover:bg-[#C8522A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin sm:w-4 sm:h-4" /> : <Send size={16} className="sm:w-4 sm:h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}