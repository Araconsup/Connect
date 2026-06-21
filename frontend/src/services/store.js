import { buildAvatarData, buildCoverData } from './assets'

const STORAGE_KEY = 'connect-state-v4'
const SESSION_KEY = 'connect-session-v4'
const THEME_KEY = 'connect-theme-v4'
const CHAT_KEY = 'connect-chat-v4'
const LIKED_TRACKS_KEY = 'connect-liked-tracks-v1'
const POST_COMMENTS_KEY = 'connect-post-comments-v1'

function safeParse(value, fallback) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function nowIso(offsetMs = 0) {
  return new Date(Date.now() - offsetMs).toISOString()
}

function id(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
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

function makeUser(username, overrides = {}) {
  const name = String(username || 'guest').trim() || 'guest'
  return {
    id: id('user'),
    username: name,
    bio: 'A quiet place for strong ideas.',
    avatar: buildAvatarData(name),
    background: buildCoverData(name, 'profile background'),
    pronouns: 'they/them',
    location: 'Everywhere',
    website: '',
    created_at: nowIso(1000 * 60 * 60 * 24 * 30),
    ...overrides,
    username: overrides.username || name,
  }
}

function ensureEmptyState() {
  return {
    users: {},
    feed: [],
    reels: [],
    tracks: [],
    chat: [],
    blockedUsers: [],
    session: null,
  }
}

export function readState() {
  if (typeof window === 'undefined') return ensureEmptyState()
  const stored = safeParse(localStorage.getItem(STORAGE_KEY), null)
  const state = stored ? { ...ensureEmptyState(), ...stored } : ensureEmptyState()
  state.users = { ...(stored?.users || {}) }
  state.feed = Array.isArray(state.feed) ? state.feed : []
  state.reels = Array.isArray(state.reels) ? state.reels : []
  state.tracks = Array.isArray(state.tracks) ? state.tracks : []
  state.chat = Array.isArray(state.chat) ? state.chat : []
  state.blockedUsers = Array.isArray(state.blockedUsers) ? state.blockedUsers : []
  return state
}

export function writeState(nextState) {
  if (typeof window === 'undefined') return nextState
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
  return nextState
}

export function getSession() {
  if (typeof window === 'undefined') return null
  return safeParse(localStorage.getItem(SESSION_KEY), null)
}

export function setSession(session) {
  if (typeof window === 'undefined') return session
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new Event('connect-session-change'))
  return session
}

export function getTheme() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(THEME_KEY) || 'theme-midnight'
}

export function setTheme(theme) {
  if (typeof window === 'undefined') return theme
  if (theme) localStorage.setItem(THEME_KEY, theme)
  else localStorage.removeItem(THEME_KEY)
  window.dispatchEvent(new Event('connect-theme-change'))
  return theme
}

export function getChat(room = 'public') {
  if (typeof window === 'undefined') return []
  return safeParse(localStorage.getItem(`${CHAT_KEY}:${room}`), null) || []
}

export function setChat(room, chat) {
  if (typeof window === 'undefined') return chat
  localStorage.setItem(`${CHAT_KEY}:${room}`, JSON.stringify(chat))
  window.dispatchEvent(new CustomEvent('connect-chat-update', { detail: { room } }))
  return chat
}

export function getCurrentUsername() {
  return getSession()?.username || localStorage.getItem('username') || 'guest'
}

export function ensureUser(username) {
  const state = readState()
  const clean = String(username || '').trim() || 'guest'
  if (!state.users[clean]) state.users[clean] = makeUser(clean)
  return state.users[clean]
}

export function updateProfileRecord(username, patch = {}) {
  const state = readState()
  const clean = String(username || '').trim() || 'guest'
  const user = state.users[clean] || makeUser(clean)
  state.users[clean] = { ...user, ...patch, username: patch.username || user.username }
  writeState(state)
  return state.users[clean]
}

export function setCurrentUser(username) {
  const state = readState()
  const clean = String(username || '').trim() || 'guest'
  const user = ensureUser(clean)
  state.session = { username: clean }
  state.users[clean] = user
  writeState(state)
  setSession({ username: clean })
  localStorage.setItem('username', clean)
  return user
}

export function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem('token')
  localStorage.removeItem('refresh')
  localStorage.removeItem('username')
  window.dispatchEvent(new Event('logout'))
}


export function getLikedTrackIds() {
  return Array.from(new Set(safeReadJson(LIKED_TRACKS_KEY, []).map((id) => String(id)).filter(Boolean)))
}

export function setLikedTrackIds(ids) {
  const unique = Array.from(new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)).filter(Boolean)))
  safeWriteJson(LIKED_TRACKS_KEY, unique)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('connect-content-updated'))
  return unique
}

export function toggleLikedTrackId(trackId) {
  const clean = String(trackId || '').trim()
  if (!clean) return false
  const ids = getLikedTrackIds()
  const exists = ids.includes(clean)
  const next = exists ? ids.filter((id) => id !== clean) : [clean, ...ids]
  setLikedTrackIds(next)
  return !exists
}

export function isTrackLiked(trackId) {
  const clean = String(trackId || '').trim()
  if (!clean) return false
  return getLikedTrackIds().includes(clean)
}

export function getPostComments(postId) {
  const clean = String(postId || '').trim()
  if (!clean) return []
  return Array.isArray(safeReadJson(`${POST_COMMENTS_KEY}:${clean}`, []))
    ? safeReadJson(`${POST_COMMENTS_KEY}:${clean}`, [])
    : []
}

export function setPostComments(postId, comments) {
  const clean = String(postId || '').trim()
  if (!clean) return []
  const next = Array.isArray(comments) ? comments : []
  safeWriteJson(`${POST_COMMENTS_KEY}:${clean}`, next)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('connect-content-updated'))
  return next
}

export function appendPostComment(postId, comment) {
  const clean = String(postId || '').trim()
  if (!clean) return []
  const current = getPostComments(clean)
  const next = [comment, ...current].slice(0, 50)
  return setPostComments(clean, next)
}
