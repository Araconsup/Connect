import { getChat, setChat } from './store'

const CHAT_THREADS_KEY = 'connect-chat-threads-v1'
const PUBLIC_ROOM_KEY = 'public'
const PRIVATE_ROOM_PREFIX = 'dm:'

function safeParse(value, fallback) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function safeReadJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWriteJson(key, value) {
  if (typeof window === 'undefined') return value
  localStorage.setItem(key, JSON.stringify(value))
  return value
}

function cleanUsername(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function uniqueId(prefix = 'msg') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function getCurrentUsername() {
  return cleanUsername(localStorage.getItem('username')) || 'guest'
}

export function makePublicRoomKey() {
  return PUBLIC_ROOM_KEY
}

export function makePrivateRoomKey(usernameA, usernameB) {
  const names = [cleanUsername(usernameA), cleanUsername(usernameB)].filter(Boolean)
  const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  if (unique.length < 2) return PUBLIC_ROOM_KEY
  return `${PRIVATE_ROOM_PREFIX}${unique.join('|')}`
}

export function isPrivateRoomKey(roomKey) {
  return String(roomKey || '').startsWith(PRIVATE_ROOM_PREFIX)
}

export function getPeerFromRoomKey(roomKey, currentUsername) {
  const key = String(roomKey || '')
  if (!isPrivateRoomKey(key)) return null
  const names = key.slice(PRIVATE_ROOM_PREFIX.length).split('|').filter(Boolean)
  const cleanCurrent = cleanUsername(currentUsername)
  return names.find((name) => name !== cleanCurrent) || names[0] || null
}

function getThreadStore() {
  return safeReadJson(CHAT_THREADS_KEY, [])
}

function setThreadStore(next) {
  safeWriteJson(CHAT_THREADS_KEY, Array.isArray(next) ? next : [])
  return next
}

export function getChatThreads() {
  return Array.isArray(getThreadStore()) ? getThreadStore() : []
}

export function upsertChatThread(thread) {
  const clean = thread?.roomKey ? String(thread.roomKey) : ''
  if (!clean) return getChatThreads()
  const current = getChatThreads()
  const nextThread = {
    roomKey: clean,
    type: thread.type || (isPrivateRoomKey(clean) ? 'private' : 'public'),
    title: thread.title || '',
    participants: Array.isArray(thread.participants) ? thread.participants.filter(Boolean) : [],
    lastMessageAt: thread.lastMessageAt || thread.updatedAt || new Date().toISOString(),
    lastMessageText: thread.lastMessageText || '',
    unread: Number(thread.unread || 0),
    pinned: Boolean(thread.pinned),
  }
  const next = [nextThread, ...current.filter((item) => item.roomKey !== clean)]
  return setThreadStore(next)
}

export function removeChatThread(roomKey) {
  const clean = String(roomKey || '')
  if (!clean) return getChatThreads()
  return setThreadStore(getChatThreads().filter((item) => item.roomKey !== clean))
}

export function getMessagesForRoom(roomKey) {
  return Array.isArray(getChat(roomKey)) ? getChat(roomKey) : []
}

function dedupeMessages(messages) {
  const seen = new Set()
  return (Array.isArray(messages) ? messages : []).filter((message) => {
    const dedupeKey = String(message?.client_id || message?.client_message_id || message?.id || '')
    if (!dedupeKey) return true
    if (seen.has(dedupeKey)) return false
    seen.add(dedupeKey)
    return true
  })
}

export function sortChatMessages(messages) {
  return (Array.isArray(messages) ? messages : []).slice().sort((a, b) => {
    const aTime = new Date(a?.created_at || 0).getTime()
    const bTime = new Date(b?.created_at || 0).getTime()
    if (aTime === bTime) return String(a?.id || '').localeCompare(String(b?.id || ''))
    return aTime - bTime
  })
}

export function dedupeChatMessages(messages) {
  return dedupeMessages(messages)
}

export function mergeChatMessages(existing = [], incoming = []) {
  return sortChatMessages(dedupeMessages([...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]))
}

export function normalizeChatMessage(payload, roomKey, currentUsername, fallbackPeer = null) {
  const senderUsername = cleanUsername(payload?.user?.username || payload?.username || payload?.sender?.username || 'guest') || 'guest'
  const createdAt = payload?.created_at || new Date().toISOString()
  const text = String(payload?.text || payload?.message || '').trim()
  const recipientUsername = cleanUsername(payload?.to || payload?.recipient_username || fallbackPeer || '')
  const clientId = cleanUsername(payload?.client_id || payload?.client_message_id || payload?.id || uniqueId('client'))
  const privateMessage = Boolean(payload?.private || isPrivateRoomKey(roomKey) || recipientUsername)

  return {
    id: String(payload?.id || clientId),
    client_id: clientId,
    room: roomKey,
    text,
    message: text,
    private: privateMessage,
    created_at: createdAt,
    user: {
      id: payload?.user?.id || senderUsername,
      username: senderUsername,
    },
    sender: {
      id: payload?.sender?.id || senderUsername,
      username: senderUsername,
    },
    recipient_username: recipientUsername,
    to: recipientUsername,
    mine: cleanUsername(senderUsername).toLowerCase() === cleanUsername(currentUsername).toLowerCase(),
  }
}

export function appendMessageToRoom(roomKey, message, meta = {}) {
  const cleanRoom = String(roomKey || PUBLIC_ROOM_KEY)
  const current = getMessagesForRoom(cleanRoom)
  const next = dedupeMessages([message, ...current].slice(0, 400)).sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime()
    const bTime = new Date(b.created_at || 0).getTime()
    if (aTime === bTime) return String(a.id || '').localeCompare(String(b.id || ''))
    return aTime - bTime
  })
  setChat(cleanRoom, next)

  const participants = Array.isArray(meta.participants) ? meta.participants.filter(Boolean) : []
  const lastMessageAt = message?.created_at || new Date().toISOString()
  const lastMessageText = String(message?.text || '').trim()
  const existing = getChatThreads().find((thread) => thread.roomKey === cleanRoom)
  const thread = {
    roomKey: cleanRoom,
    type: meta.type || existing?.type || (isPrivateRoomKey(cleanRoom) ? 'private' : 'public'),
    title: meta.title ?? existing?.title ?? '',
    participants: participants.length ? participants : existing?.participants || [],
    lastMessageAt,
    lastMessageText,
    unread: message?.mine ? existing?.unread || 0 : (existing?.unread || 0) + 1,
    pinned: existing?.pinned || false,
  }
  upsertChatThread(thread)
  return next
}

export function syncThread(roomKey, patch = {}) {
  const cleanRoom = String(roomKey || '')
  if (!cleanRoom) return getChatThreads()
  const current = getChatThreads()
  const currentThread = current.find((thread) => thread.roomKey === cleanRoom) || {}
  return setThreadStore([
    {
      ...currentThread,
      roomKey: cleanRoom,
      type: patch.type || currentThread.type || (isPrivateRoomKey(cleanRoom) ? 'private' : 'public'),
      title: patch.title ?? currentThread.title ?? '',
      participants: Array.isArray(patch.participants) ? patch.participants.filter(Boolean) : currentThread.participants || [],
      lastMessageAt: patch.lastMessageAt || currentThread.lastMessageAt || new Date().toISOString(),
      lastMessageText: patch.lastMessageText ?? currentThread.lastMessageText ?? '',
      unread: Number.isFinite(patch.unread) ? patch.unread : currentThread.unread || 0,
      pinned: Boolean(patch.pinned ?? currentThread.pinned),
    },
    ...current.filter((thread) => thread.roomKey !== cleanRoom),
  ])
}

export function markThreadRead(roomKey) {
  const cleanRoom = String(roomKey || '')
  if (!cleanRoom) return getChatThreads()
  return syncThread(cleanRoom, { unread: 0 })
}

export function clearChatCache(roomKey) {
  if (!roomKey) return
  if (typeof window === 'undefined') return
  localStorage.removeItem(`connect-chat-v4:${roomKey}`)
}

export { PUBLIC_ROOM_KEY }
