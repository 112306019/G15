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
  AlertCircle
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
  const sz = size === 'sm' ? 'w-10 h-10 text-sm' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-base'
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

      if (
        !selectedRoomStillExists &&
        mappedRooms.length > 0
      ) {
        const firstRoom =
          mappedRooms[0]

        setActiveVendorId(
          firstRoom.vendorId
        )

        setActiveRoomId(
          firstRoom.roomId
        )
      }

      if (mappedRooms.length === 0) {
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
    <div className="flex h-[calc(100vh-65px)] bg-white">

      {/* 左側：廠商聊天室清單 */}
      <div className="w-72 border-r border-[#E2DDD4] flex flex-col bg-white shrink-0">
        <div className="px-4 py-4 border-b border-[#E2DDD4]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#1A1A18] text-sm">
              聊天室
            </h2>

            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <span className="bg-[#C8522A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}

              <button
                type="button"
                onClick={loadChatrooms}
                disabled={roomLoading}
                className="p-1.5 rounded-full text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#C8522A] disabled:opacity-50"
                title="重新整理聊天室"
              >
                <RefreshCw
                  size={14}
                  className={cn(
                    roomLoading
                      ? 'animate-spin'
                      : ''
                  )}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-3 py-2">
            <Search
              size={13}
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
              className="bg-transparent text-xs text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none w-full"
            />
          </div>
        </div>


        <div className="flex-1 overflow-y-auto">
          {roomLoading ? (
            <div className="py-16 text-center">
              <Loader2
                size={18}
                className="animate-spin mx-auto text-[#C8522A]"
              />

              <div className="text-xs font-bold text-[#8C8880] mt-3">
                聊天室載入中...
              </div>
            </div>
          ) : error ? (
            <div className="px-5 py-10 text-center">
              <AlertCircle
                size={22}
                className="mx-auto text-red-500 mb-3"
              />

              <div className="text-xs font-bold text-red-600">
                {error}
              </div>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <MessageCircle
                size={26}
                className="mx-auto text-[#E2DDD4] mb-3"
              />

              <div className="text-xs font-bold text-[#8C8880]">
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
                      gap-3 px-4 py-4
                      text-left border-l-2
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
                      <span className="text-xs font-bold text-[#1A1A18] truncate">
                        {group.vendorName}
                      </span>

                      <span className="text-[10px] text-[#8C8880] shrink-0">
                        {formatMessageDate(
                          latestRoom
                            ?.lastMessageTime
                        )}
                      </span>
                    </div>

                    <div className="text-[10px] text-[#8C8880] mt-1 truncate">
                      {latestRoom
                        ?.lastMessage ||
                        `${group.rooms.length} 個任務聊天室`}
                    </div>

                    <div className="text-[9px] font-mono text-[#8C8880] mt-1">
                      {group.vendorId}
                    </div>
                  </div>

                  {unreadCount > 0 && (
                    <span className="bg-[#C8522A] text-white text-[10px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center shrink-0">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>


      {/* 右側：對話內容 */}
      <div className="flex-1 flex flex-col bg-[#F8F9FA] min-w-0">

        {!activeRoom ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8C8880]">
            <MessageCircle
              size={42}
              className="mb-4 text-[#E2DDD4]"
            />

            <div className="text-sm font-bold">
              請選擇聊天室
            </div>

            <div className="text-xs mt-2">
              選擇左側廠商開始溝通
            </div>
          </div>
        ) : (
          <>
            {/* 廠商資訊 */}
            <div className="bg-white border-b border-[#E2DDD4] px-6 py-4 flex items-center gap-4 shrink-0">
              <Avatar
                name={
                  activeRoom.vendorName ||
                  activeGroup?.vendorName ||
                  '?'
                }
                size="lg"
              />

              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#1A1A18]">
                  {activeRoom.vendorName}
                </div>

                <div className="text-xs text-[#8C8880] mt-1">
                  {activeRoom.vendorId}
                  {' · '}
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
                className="p-2 rounded-full text-[#8C8880] hover:bg-[#F5F0E8] hover:text-[#C8522A] disabled:opacity-50"
                title="重新整理訊息"
              >
                <RefreshCw
                  size={16}
                  className={cn(
                    messageLoading
                      ? 'animate-spin'
                      : ''
                  )}
                />
              </button>
            </div>


            {/* 任務聊天室 Tabs */}
            <div className="bg-white border-b border-[#E2DDD4] px-6 flex gap-1 shrink-0 overflow-x-auto">
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
                        flex items-center gap-2
                        px-4 py-3 text-xs
                        font-semibold border-b-2
                        transition-all
                        whitespace-nowrap
                      `,
                      activeRoomId ===
                        room.roomId
                        ? 'border-[#C8522A] text-[#C8522A]'
                        : 'border-transparent text-[#8C8880] hover:text-[#1A1A18]'
                    )}
                  >
                    <Tag size={11} />

                    <span className="font-bold">
                      {room.campaignName}
                    </span>

                    <span className="font-mono text-[10px]">
                      #{room.kocMissionId}
                    </span>

                    {room.unreadCount > 0 && (
                      <span className="bg-[#C8522A] text-white text-[9px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                        {room.unreadCount}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>


            {/* 任務資訊 */}
            <div className="bg-[#FDF0ED] border-b border-[#C8522A]/10 px-6 py-2.5 flex items-center gap-3 text-xs text-[#C8522A] shrink-0">
              <span className="font-bold">
                {activeRoom.campaignName}
              </span>

              <span>·</span>

              <span>
                任務 #
                {activeRoom.kocMissionId}
              </span>

              <span>·</span>

              <span className="font-bold">
                {stageLabels[
                  activeRoom.missionStage
                ] ||
                  activeRoom.missionStage ||
                  '未知階段'}
              </span>
            </div>


            {/* 錯誤訊息 */}
            {messageError && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs font-bold text-red-600">
                {messageError}
              </div>
            )}


            {/* 訊息區 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {messageLoading &&
              messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <Loader2
                    size={20}
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
                        'flex',
                        isKoc
                          ? 'justify-end'
                          : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          `
                            max-w-[75%]
                            sm:max-w-md
                            px-4 py-2.5
                            rounded-2xl
                            text-sm
                            leading-relaxed
                            whitespace-pre-wrap
                            break-words
                          `,
                          isKoc
                            ? 'bg-[#1A1A18] text-white rounded-br-sm'
                            : 'bg-white border border-[#E2DDD4] text-[#1A1A18] shadow-sm rounded-bl-sm'
                        )}
                      >
                        {message.content}

                        <div
                          className={cn(
                            'text-[10px] mt-1',
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
                  <Tag
                    size={28}
                    className="mb-3 text-[#E2DDD4]"
                  />

                  <p className="text-sm font-bold">
                    尚無訊息
                  </p>

                  <p className="text-xs mt-2">
                    開始與廠商溝通吧
                  </p>
                </div>
              )}

              <div ref={bottomRef} />
            </div>


            {/* 輸入區 */}
            <div className="bg-white border-t border-[#E2DDD4] px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
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
                  placeholder="輸入訊息…（Enter 送出，Shift + Enter 換行）"
                  className="flex-1 max-h-32 resize-none bg-[#F8F9FA] border border-[#E2DDD4] rounded-xl px-4 py-3 text-sm text-[#1A1A18] placeholder:text-[#8C8880]/60 outline-none focus:ring-4 focus:ring-[#C8522A]/10 focus:border-[#C8522A] transition-all disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={
                    !input.trim() ||
                    sending
                  }
                  className="bg-[#1A1A18] text-white p-3 rounded-xl hover:bg-[#C8522A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {sending ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={17} />
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
