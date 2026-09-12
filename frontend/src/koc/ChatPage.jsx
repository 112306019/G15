import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  Send,
  Search,
  Tag,
  Loader2,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'

import {
  getKocChatrooms,
  getChatHistory,
  sendChatMessage,
  markKocChatroomRead
} from '../api/koc'


function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

const avatarCls = [
  'bg-[#F5F0E8] text-[#1A1A18]',
  'bg-[#FDF0ED] text-[#C8522A]',
  'bg-[#E2DDD4] text-[#1A1A18]',
  'bg-[#1A1A18] text-[#F5F0E8]',
  'bg-[#B89B6A] text-white'
]

function Avatar({ name = '?', size = 'md' }) {
  const idx = (name.charCodeAt(0) || 0) % avatarCls.length
  const sz = size === 'sm' ? 'w-8 h-8 md:w-10 md:h-10 text-xs md:text-sm' : size === 'lg' ? 'w-12 h-12 md:w-16 md:h-16 text-lg md:text-xl' : 'w-10 h-10 md:w-12 md:h-12 text-sm md:text-base'
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold shrink-0 border border-[#E2DDD4]/50 shadow-sm', sz, avatarCls[idx])}>
      {name.slice(0, 1)}
    </div>
  )
}


const stageLabels = {
  writing: '撰寫文案',
  reviewing: '文案審核中',
  publishing: '上傳作品',
  promoting: '推廣中',
  completed: '任務完成'
}


function getTimeValue(value) {
  if (!value) return 0

  const timestamp = new Date(value).getTime()

  return Number.isNaN(timestamp)
    ? 0
    : timestamp
}


function formatTime(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit'
  })
}


function formatMessageDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const today = new Date()

  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  if (isToday) {
    return formatTime(value)
  }

  return date.toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit'
  })
}


function groupRoomsByVendor(rooms) {
  const map = {}

  rooms.forEach(room => {
    const vendorId =
      room.vendorId ||
      `unknown-${room.roomId}`

    if (!map[vendorId]) {
      map[vendorId] = {
        vendorId,
        vendorName:
          room.vendorName ||
          room.vendorId ||
          '未命名廠商',

        rooms: []
      }
    }

    map[vendorId].rooms.push(room)
  })

  return Object.values(map)
    .map(group => ({
      ...group,

      rooms: [...group.rooms].sort(
        (left, right) =>
          getTimeValue(
            right.lastMessageTime ||
            right.createdAt
          ) -
          getTimeValue(
            left.lastMessageTime ||
            left.createdAt
          )
      )
    }))
    .sort((left, right) => {
      const leftLatest =
        left.rooms[0]?.lastMessageTime ||
        left.rooms[0]?.createdAt

      const rightLatest =
        right.rooms[0]?.lastMessageTime ||
        right.rooms[0]?.createdAt

      return (
        getTimeValue(rightLatest) -
        getTimeValue(leftLatest)
      )
    })
}


export default function ChatPage() {
  const userId =
    localStorage.getItem('userId')

  const bottomRef = useRef(null)

  const [rooms, setRooms] =
    useState([])

  const [
    activeVendorId,
    setActiveVendorId
  ] = useState(null)

  const [
    activeRoomId,
    setActiveRoomId
  ] = useState(null)

  const [
    messagesByRoom,
    setMessagesByRoom
  ] = useState({})

  const [input, setInput] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [
    roomLoading,
    setRoomLoading
  ] = useState(true)

  const [
    messageLoading,
    setMessageLoading
  ] = useState(false)

  const [sending, setSending] =
    useState(false)

  const [error, setError] =
    useState('')

  const [
    messageError,
    setMessageError
  ] = useState('')


  const groupedVendors =
    useMemo(
      () => groupRoomsByVendor(rooms),
      [rooms]
    )


  const filteredVendors =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase()

      if (!keyword) {
        return groupedVendors
      }

      return groupedVendors.filter(group => {
        const matchesVendor =
          group.vendorId
            ?.toLowerCase()
            .includes(keyword) ||
          group.vendorName
            .toLowerCase()
            .includes(keyword)

        const matchesRoom =
          group.rooms.some(room =>
            room.campaignName
              ?.toLowerCase()
              .includes(keyword)
          )

        return matchesVendor || matchesRoom
      })
    }, [groupedVendors, search])


  const activeGroup =
    groupedVendors.find(
      group =>
        group.vendorId === activeVendorId
    ) || null


  const activeRoom =
    rooms.find(
      room =>
        room.roomId === activeRoomId
    ) || null


  const messages =
    activeRoomId
      ? messagesByRoom[activeRoomId] || []
      : []


  const totalUnread =
    rooms.reduce(
      (sum, room) =>
        sum +
        Number(room.unreadCount || 0),
      0
    )

  // 手機版判斷是否顯示聊天清單 (當沒選中房間時顯示)
  const showListOnMobile = !activeRoomId;

  useEffect(() => {
    loadChatrooms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])


  useEffect(() => {
    if (!activeRoomId) return

    loadMessages(activeRoomId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId])


  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth'
    })
  }, [messages, activeRoomId])


  async function loadChatrooms() {
    if (!userId) {
      setError('尚未登入 KOC 帳號')
      setRoomLoading(false)
      return
    }

    try {
      setRoomLoading(true)
      setError('')

      const response =
        await getKocChatrooms(
          userId
        )

      if (
        response.data?.success === false
      ) {
        throw new Error(
          response.data.err ||
          '聊天室清單載入失敗'
        )
      }

      const roomData =
        response.data?.chatrooms || []

      const mappedRooms =
        roomData.map(room => ({
          roomId:
            room.room_id,

          kocMissionId:
            room.kocmission_id,

          vendorId:
            room.vendor_id || '',

          vendorName:
            room.vendor_name ||
            room.vendor_id ||
            '未命名廠商',

          campaignId:
            room.campaign_id || '',

          campaignName:
            room.campaign_name ||
            '未命名活動',

          missionStage:
            room.mission_stage || '',

          lastMessage:
            room.last_message || '',

          lastMessageTime:
            room.last_message_time ||
            room.created_at,

          lastSenderRole:
            room.last_sender_role,

          unreadCount:
            Number(
              room.unread_count || 0
            ),

          createdAt:
            room.created_at
        }))

      setRooms(mappedRooms)

      const selectedRoomStillExists =
        mappedRooms.some(
          room =>
            room.roomId ===
            activeRoomId
        )

      // 避免手機版一進來就切到對話，只在有選擇房間時才切換。
      // 在電腦版可能可以預設選中第一間，但在手機版最好停在列表頁。
      // 所以如果原本有選中的房間且還存在，就保持；否則清空選擇（停在列表）。
      if (!selectedRoomStillExists) {
        setActiveVendorId(null)
        setActiveRoomId(null)
      }
    } catch (requestError) {
      console.error(
        '聊天室清單載入失敗：',
        requestError
      )

      const apiError =
        requestError.response?.data?.err

      setError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : requestError.message ||
              '聊天室清單載入失敗'
      )
    } finally {
      setRoomLoading(false)
    }
  }


  async function loadMessages(roomId) {
    if (!roomId) return

    try {
      setMessageLoading(true)
      setMessageError('')

      const response =
        await getChatHistory(
          roomId
        )

      if (
        response.data?.success === false
      ) {
        throw new Error(
          response.data.err ||
          '聊天室訊息載入失敗'
        )
      }

      const messageData =
        response.data?.messages || []

      const mappedMessages =
        messageData.map(message => ({
          messageId:
            message.message_id,

          roomId,

          senderRole:
            message.sender_role,

          senderId:
            message.sender_id,

          content:
            message.content,

          isRead:
            Boolean(message.is_read),

          createdAt:
            message.created_at
        }))

      setMessagesByRoom(previous => ({
        ...previous,
        [roomId]: mappedMessages
      }))

      await markRoomRead(roomId)
    } catch (requestError) {
      console.error(
        '聊天室訊息載入失敗：',
        requestError
      )

      const apiError =
        requestError.response?.data?.err

      setMessageError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : requestError.message ||
              '聊天室訊息載入失敗'
      )
    } finally {
      setMessageLoading(false)
    }
  }


  async function markRoomRead(roomId) {
    try {
      await markKocChatroomRead({
        user_id: userId,
        room_id: roomId
      })

      setRooms(previous =>
        previous.map(room =>
          room.roomId === roomId
            ? {
                ...room,
                unreadCount: 0
              }
            : room
        )
      )
    } catch (requestError) {
      console.error(
        '標記聊天室已讀失敗：',
        requestError
      )
    }
  }


  function selectVendor(vendorId) {
    const group =
      groupedVendors.find(
        item =>
          item.vendorId === vendorId
      )

    if (!group) return

    const firstRoom =
      group.rooms[0]

    setActiveVendorId(vendorId)

    if (firstRoom) {
      setActiveRoomId(
        firstRoom.roomId
      )
    }
  }


  function selectRoom(room) {
    setActiveVendorId(room.vendorId)
    setActiveRoomId(room.roomId)
  }


  async function sendMessage() {
    const content =
      input.trim()

    if (
      !content ||
      !activeRoomId ||
      sending
    ) {
      return
    }

    try {
      setSending(true)
      setMessageError('')

      const response =
        await sendChatMessage({
          room_id: activeRoomId,
          sender_role: 'koc',
          sender_id: userId,
          content
        })

      if (
        response.data?.success === false
      ) {
        throw new Error(
          response.data.err ||
          '訊息發送失敗'
        )
      }

      const message =
        response.data?.message

      if (!message) {
        throw new Error(
          '後端未回傳訊息資料'
        )
      }

      const newMessage = {
        messageId:
          message.message_id,

        roomId:
          activeRoomId,

        senderRole:
          message.sender_role,

        senderId:
          message.sender_id,

        content:
          message.content,

        isRead:
          Boolean(message.is_read),

        createdAt:
          message.created_at
      }

      setMessagesByRoom(previous => ({
        ...previous,

        [activeRoomId]: [
          ...(
            previous[
              activeRoomId
            ] || []
          ),
          newMessage
        ]
      }))

      setRooms(previous =>
        previous.map(room =>
          room.roomId === activeRoomId
            ? {
                ...room,
                lastMessage:
                  newMessage.content,

                lastMessageTime:
                  newMessage.createdAt,

                lastSenderRole:
                  newMessage.senderRole
              }
            : room
        )
      )

      setInput('')
    } catch (requestError) {
      console.error(
        '訊息發送失敗：',
        requestError
      )

      const apiError =
        requestError.response?.data?.err

      setMessageError(
        typeof apiError === 'string'
          ? apiError
          : apiError
            ? JSON.stringify(apiError)
            : requestError.message ||
              '訊息發送失敗'
      )
    } finally {
      setSending(false)
    }
  }


  function handleInputKeyDown(event) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault()
      sendMessage()
    }
  }


  return (
    <div className="flex h-[calc(100dvh-60px)] md:h-[calc(100vh-65px)] bg-white max-w-7xl mx-auto border-x border-[#E2DDD4] shadow-sm relative overflow-hidden">

      {/* ======================= */}
      {/* 左側：廠商聊天室清單     */}
      {/* ======================= */}
      <div className={cn(
        "border-r border-[#E2DDD4] flex flex-col bg-white shrink-0 absolute md:relative inset-0 md:inset-auto z-10 transition-transform duration-300 md:w-72 md:translate-x-0",
        showListOnMobile ? "translate-x-0 w-full" : "-translate-x-full md:block"
      )}>
        <div className="px-4 py-3 md:py-4 border-b border-[#E2DDD4] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#1A1A18] text-sm md:text-base">
              聊天室
            </h2>

            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <span className="bg-[#C8522A] text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}

              <button
                type="button"
                onClick={loadChatrooms}
                disabled={roomLoading}
                className="p-1.5 md:p-2 rounded-full text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#C8522A] disabled:opacity-50 transition-colors"
                title="重新整理聊天室"
              >
                <RefreshCw
                  size={14}
                  className={cn(
                    roomLoading ? 'animate-spin' : '',
                    "md:w-4 md:h-4"
                  )}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-3 py-2">
            <Search
              size={14}
              className="text-[#8C8880]"
            />

            <input
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="搜尋廠商或活動…"
              className="bg-transparent text-[13px] md:text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none w-full"
            />
          </div>
        </div>


        <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-0">
          {roomLoading ? (
            <div className="py-16 text-center">
              <Loader2
                size={20}
                className="animate-spin mx-auto text-[#C8522A]"
              />

              <div className="text-xs md:text-sm font-bold text-[#8C8880] mt-3">
                聊天室載入中...
              </div>
            </div>
          ) : error ? (
            <div className="px-5 py-10 text-center">
              <AlertCircle
                size={24}
                className="mx-auto text-red-500 mb-3"
              />

              <div className="text-xs md:text-sm font-bold text-red-600">
                {error}
              </div>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <MessageCircle
                size={32}
                className="mx-auto text-[#E2DDD4] mb-3"
              />

              <div className="text-xs md:text-sm font-bold text-[#8C8880]">
                尚無聊天室
              </div>
            </div>
          ) : (
            filteredVendors.map(group => {
              const isActive =
                group.vendorId ===
                activeVendorId

              const unreadCount =
                group.rooms.reduce(
                  (sum, room) =>
                    sum +
                    room.unreadCount,
                  0
                )

              const latestRoom =
                group.rooms[0]

              return (
                <button
                  type="button"
                  key={group.vendorId}
                  onClick={() =>
                    selectVendor(
                      group.vendorId
                    )
                  }
                  className={cn(
                    `
                      w-full flex items-center
                      gap-3 md:gap-4 px-4 py-3.5 md:py-4
                      text-left border-l-4
                      transition-colors
                    `,
                    isActive
                      ? 'bg-[#FDF0ED] border-[#C8522A]'
                      : 'hover:bg-[#F8F9FA] border-transparent'
                  )}
                >
                  <Avatar
                    name={group.vendorName}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm md:text-base font-bold text-[#1A1A18] truncate">
                        {group.vendorName}
                      </span>

                      <span className="text-[10px] md:text-[11px] font-medium text-[#8C8880] shrink-0">
                        {formatMessageDate(
                          latestRoom
                            ?.lastMessageTime
                        )}
                      </span>
                    </div>

                    <div className="text-[11px] md:text-xs text-[#8C8880] mt-1 truncate">
                      {latestRoom
                        ?.lastMessage ||
                        `${group.rooms.length} 個任務聊天室`}
                    </div>

                    <div className="text-[9px] md:text-[10px] font-mono font-medium text-[#E2DDD4] mt-1">
                      ID: {group.vendorId}
                    </div>
                  </div>

                  {unreadCount > 0 && (
                    <span className="bg-[#C8522A] text-white text-[10px] md:text-xs font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>


      {/* ======================= */}
      {/* 右側：對話內容           */}
      {/* ======================= */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#F8F9FA] min-w-0 absolute md:relative inset-0 md:inset-auto z-0 transition-transform duration-300",
        showListOnMobile ? "translate-x-full md:translate-x-0" : "translate-x-0"
      )}>

        {!activeRoom ? (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center text-[#8C8880]">
            <MessageCircle
              size={48}
              className="mb-4 text-[#E2DDD4]"
            />

            <div className="text-base font-bold text-[#1A1A18]">
              請選擇聊天室
            </div>

            <div className="text-sm mt-2 font-medium">
              選擇左側廠商開始溝通
            </div>
          </div>
        ) : (
          <>
            {/* 廠商資訊標頭 */}
            <div className="bg-white border-b border-[#E2DDD4] px-4 md:px-6 py-2.5 md:py-4 flex items-center gap-3 shrink-0 shadow-sm z-10">
              <button 
                onClick={() => {
                  setActiveRoomId(null);
                  setActiveVendorId(null);
                }}
                className="md:hidden p-1.5 -ml-2 mr-1 rounded-full text-[#8C8880] hover:bg-[#F5F0E8] transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              <Avatar
                name={
                  activeRoom.vendorName ||
                  activeGroup?.vendorName ||
                  '?'
                }
                size="sm"
              />

              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#1A1A18] text-[13px] md:text-base leading-tight">
                  {activeRoom.vendorName}
                </div>

                <div className="text-[10px] md:text-xs font-medium text-[#8C8880] mt-0.5 truncate">
                  {activeRoom.campaignName}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadMessages(
                    activeRoom.roomId
                  )
                }
                disabled={messageLoading}
                className="p-1.5 md:p-2 rounded-full text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#C8522A] disabled:opacity-50 transition-colors"
                title="重新整理訊息"
              >
                <RefreshCw
                  size={16}
                  className={cn(
                    messageLoading ? 'animate-spin' : ''
                  )}
                />
              </button>
            </div>


            {/* 任務聊天室 Tabs (若該廠商有多個任務) */}
            {(activeGroup?.rooms || []).length > 1 && (
              <div className="bg-white border-b border-[#E2DDD4] px-4 md:px-6 flex gap-2 shrink-0 overflow-x-auto hide-scrollbar">
                {(activeGroup?.rooms || []).map(
                  room => (
                    <button
                      type="button"
                      key={room.roomId}
                      onClick={() =>
                        selectRoom(room)
                      }
                      className={cn(
                        `
                          flex items-center gap-1.5 md:gap-2
                          px-3 md:px-4 py-2.5 md:py-3 text-[11px] md:text-xs
                          font-bold border-b-2
                          transition-all
                          whitespace-nowrap
                        `,
                        activeRoomId ===
                          room.roomId
                          ? 'border-[#C8522A] text-[#C8522A]'
                          : 'border-transparent text-[#8C8880] hover:text-[#1A1A18]'
                      )}
                    >
                      <Tag size={10} className="md:w-[12px] md:h-[12px]" />

                      <span>
                        {room.campaignName}
                      </span>

                      {room.unreadCount > 0 && (
                        <span className="bg-[#C8522A] text-white text-[9px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                          {room.unreadCount}
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}


            {/* 任務狀態標籤 */}
            <div className="bg-[#FDF0ED] border-b border-[#C8522A]/10 px-4 md:px-6 py-2 flex flex-wrap md:flex-nowrap items-center gap-2 text-[10px] md:text-xs text-[#C8522A] shrink-0">
              <span className="font-bold truncate max-w-[150px] md:max-w-[200px]">
                {activeRoom.campaignName}
              </span>

              <span className="hidden md:inline">·</span>

              <span className="hidden sm:inline font-mono">
                任務 #{activeRoom.kocMissionId}
              </span>

              <span className="hidden sm:inline">·</span>

              <span className="font-bold px-2 py-0.5 bg-white rounded-md shadow-sm border border-[#C8522A]/20">
                {stageLabels[
                  activeRoom.missionStage
                ] ||
                  activeRoom.missionStage ||
                  '未知階段'}
              </span>
            </div>


            {/* 錯誤訊息 */}
            {messageError && (
              <div className="mx-4 md:mx-6 mt-3 md:mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs font-bold text-red-600">
                {messageError}
              </div>
            )}


            {/* 對話訊息區 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 md:px-6 py-4 md:py-5 space-y-3 md:space-y-4">
              {messageLoading &&
              messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <Loader2
                    size={24}
                    className="animate-spin text-[#C8522A]"
                  />

                  <div className="text-xs font-bold text-[#8C8880] mt-3">
                    訊息載入中...
                  </div>
                </div>
              ) : messages.length > 0 ? (
                messages.map(message => {
                  const isKoc =
                    message.senderRole ===
                    'koc'

                  return (
                    <div
                      key={message.messageId}
                      className={cn(
                        'flex w-full',
                        isKoc
                          ? 'justify-end'
                          : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          `
                            max-w-[85%]
                            sm:max-w-[75%]
                            md:max-w-md
                            px-3.5 py-2.5
                            md:px-4 md:py-3
                            rounded-2xl
                            text-[13px] md:text-sm
                            leading-relaxed
                            whitespace-pre-wrap
                            break-words
                            shadow-sm
                          `,
                          isKoc
                            ? 'bg-[#1A1A18] text-white rounded-br-sm'
                            : 'bg-white border border-[#E2DDD4] text-[#1A1A18] rounded-bl-sm'
                        )}
                      >
                        {message.content}

                        <div
                          className={cn(
                            'text-[9px] md:text-[10px] mt-1 md:mt-1.5 font-medium',
                            isKoc
                              ? 'text-white/50 text-right'
                              : 'text-[#8C8880]'
                          )}
                        >
                          {formatTime(
                            message.createdAt
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-[#8C8880]">
                  <MessageCircle
                    size={36}
                    className="mb-3 text-[#E2DDD4]"
                  />

                  <p className="text-sm font-bold text-[#1A1A18]">
                    尚無訊息
                  </p>

                  <p className="text-xs mt-1.5 font-medium">
                    開始與廠商溝通吧
                  </p>
                </div>
              )}

              <div ref={bottomRef} />
            </div>


            {/* 輸入區 */}
            <div className="bg-white border-t border-[#E2DDD4] px-3 md:px-6 py-2.5 md:py-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-end gap-2 md:gap-3">
                <textarea
                  rows={1}
                  value={input}
                  onChange={event =>
                    setInput(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleInputKeyDown
                  }
                  disabled={sending}
                  placeholder="輸入訊息…"
                  className="flex-1 max-h-24 md:max-h-32 min-h-[40px] md:min-h-[48px] resize-none bg-[#F8F9FA] border border-[#E2DDD4] rounded-2xl px-4 py-2.5 md:py-3 text-[13px] md:text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:ring-4 focus:ring-[#C8522A]/10 focus:border-[#C8522A] transition-all disabled:opacity-60 custom-scrollbar"
                />

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={
                    !input.trim() ||
                    sending
                  }
                  className="bg-[#1A1A18] text-white h-[40px] w-[40px] md:h-[48px] md:w-[48px] rounded-full flex items-center justify-center hover:bg-[#C8522A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
                >
                  {sending ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={18} className="-ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}