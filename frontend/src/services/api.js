import { notify } from './notify'
import {
  appendPostComment,
  clearSession,
  ensureUser,
  getCurrentUsername,
  getLikedTrackIds,
  getPostComments,
  getSession,
  isTrackLiked,
  readState,
  setCurrentUser,
  setSession,
  setLikedTrackIds,
  toggleLikedTrackId,
  writeState,
} from './store'
import { buildCoverData } from './assets'

const DEFAULT_API_PORT = import.meta.env.VITE_API_PORT || '8000'

function resolveBrowserHostOrigin(port = DEFAULT_API_PORT) {
  if (typeof window === 'undefined' || !window.location) return `http://127.0.0.1:${port}`
  const { protocol, hostname, port: currentPort } = window.location
  const safeProtocol = protocol === 'https:' ? 'https:' : 'http:'
  const effectivePort = String(port || '').trim()
  if (!hostname) return `http://127.0.0.1:${effectivePort || '8000'}`
  if (currentPort && effectivePort && currentPort === effectivePort) {
    return `${safeProtocol}//${hostname}:${currentPort}`
  }
  if (currentPort === '80' || currentPort === '443') {
    return `${safeProtocol}//${hostname}`
  }
  return `${safeProtocol}//${hostname}:${effectivePort || '8000'}`
}

const DEFAULT_API_ORIGIN = import.meta.env.VITE_API_ORIGIN || resolveBrowserHostOrigin()
const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || `${DEFAULT_API_ORIGIN.replace(/\/+$/, '')}/api`

export const API_ORIGIN = DEFAULT_API_ORIGIN
export const API_BASE = DEFAULT_API_BASE
export const API_ENDPOINTS = {
  posts: import.meta.env.VITE_API_POSTS || `${API_BASE.replace(/\/+$/, '')}/posts/?format=json`,
  reels: import.meta.env.VITE_API_REELS || `${API_BASE.replace(/\/+$/, '')}/reels/?format=json`,
  connects: import.meta.env.VITE_API_CONNECTS || `${API_BASE.replace(/\/+$/, '')}/connects/?format=json`,
  musics: import.meta.env.VITE_API_MUSICS || `${API_BASE.replace(/\/+$/, '')}/musics/?format=json`,
  users: import.meta.env.VITE_API_USERS || `${API_BASE.replace(/\/+$/, '')}/users/?format=json`,
}

function authHeader(token) {
  if (!token) return {}
  const raw = String(token).startsWith('Bearer ') ? String(token).slice(7) : String(token)
  return { Authorization: `Bearer ${raw}` }
}

function getToken() {
  return localStorage.getItem('token') || ''
}

async function tryRefreshToken() {
  const refresh = localStorage.getItem('refresh')
  if (!refresh || String(refresh).startsWith('local-')) return null
  try {
    const res = await fetch(apiUrl('/token/refresh/'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    const newAccess = data?.access || data?.token || data?.auth_token || null
    if (newAccess) {
      localStorage.setItem('token', newAccess)
      if (data?.refresh) localStorage.setItem('refresh', data.refresh)
      // notify app that token changed
      window.dispatchEvent(new Event('login'))
      return newAccess
    }
  } catch (err) {
    // ignore and return null
  }
  return null
}

function emitContentChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('connect-content-updated'))
}

function nextId(prefix = 'item') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function sortNewest(a, b) {
  return new Date(b.created_at || 0) - new Date(a.created_at || 0)
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

function apiUrl(path = '') {
  if (!path) return API_BASE
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const cleanPath = String(path).startsWith('/') ? String(path) : `/${path}`
  return `${stripTrailingSlash(API_BASE)}${cleanPath}`
}

function normalizeEndpoint(endpoint) {
  return String(endpoint || '').split('?')[0].replace(/\/+$/, '')
}

function endpointFor(resource) {
  return normalizeEndpoint(API_ENDPOINTS[resource] || '')
}

function endpointCollectionUrl(resource) {
  return API_ENDPOINTS[resource] || ''
}

function hasUsableJwtToken() {
  const token = getToken()
  if (!token) return false
  const raw = String(token).startsWith('Bearer ') ? String(token).slice(7) : String(token)
  if (!raw || String(raw).startsWith('local-')) return false
  const parts = raw.split('.')
  if (parts.length !== 3) return true
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload?.exp) return true
    return Number(payload.exp) * 1000 > Date.now()
  } catch {
    return false
  }
}

export function fullUrl(pathOrUrl) {
  if (!pathOrUrl) return pathOrUrl
  if (
    pathOrUrl.startsWith('http://')
    || pathOrUrl.startsWith('https://')
    || pathOrUrl.startsWith('blob:')
    || pathOrUrl.startsWith('data:')
    || pathOrUrl.startsWith('file:')
  ) return pathOrUrl
  if (pathOrUrl.startsWith('/')) return `${stripTrailingSlash(API_ORIGIN)}${pathOrUrl}`
  return `${stripTrailingSlash(API_ORIGIN)}/${pathOrUrl}`
}

export function setAuthFromStorage() {
  // Keep compatibility with existing callers — return the current access token (or null)
  const t = getToken()
  return t || null
}

async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    auth = true,
  } = options

  const token = getToken()
  const rawToken = token && String(token).startsWith('Bearer ') ? String(token).slice(7) : token
  const shouldAttachAuth = auth && rawToken && !String(rawToken).startsWith('local-')
  const init = {
    method,
    headers: {
      ...headers,
      ...(shouldAttachAuth ? authHeader(rawToken) : {}),
    },
    credentials: 'include',
  }

  if (body instanceof FormData) {
    init.body = body
  } else if (body !== undefined && body !== null) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  let response = await fetch(apiUrl(path), init)
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok && response.status === 401 && !options._retry) {
    const newAccess = await tryRefreshToken()
    if (newAccess) {
      // retry the original request with the new token once
      const retryInit = {
        ...init,
        headers: {
          ...init.headers,
          ...(authHeader(newAccess)),
        },
      }
      options._retry = true
      response = await fetch(apiUrl(path), retryInit)
      const ct2 = response.headers.get('content-type') || ''
      const payload2 = ct2.includes('application/json') ? await response.json().catch(() => null) : await response.text().catch(() => '')
      if (!response.ok) {
        const error = new Error('Request failed')
        error.status = response.status
        error.payload = payload2
        throw error
      }
      return payload2
    }
  }

  if (!response.ok) {
    const error = new Error('Request failed')
    error.status = response.status
    error.payload = payload
    // clear session on 401/403 to force re-login when refresh failed
    if (response.status === 401 || response.status === 403) {
      try { clearSession() } catch (e) {}
    }
    throw error
  }

  return payload
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.posts)) return payload.posts
  if (Array.isArray(payload?.reels)) return payload.reels
  if (Array.isArray(payload?.tracks)) return payload.tracks
  if (Array.isArray(payload?.music)) return payload.music
  if (Array.isArray(payload?.feed)) return payload.feed
  if (Array.isArray(payload?.messages)) return payload.messages
  return []
}

function normalizeUser(user, fallbackUsername = 'guest') {
  if (!user || typeof user !== 'object' || Array.isArray(user)) return ensureUser(fallbackUsername)
  const username = String(user.username || user.name || fallbackUsername || 'guest').trim() || 'guest'
  return {
    id: user.id || user.pk || username,
    username,
    bio: user.bio || user.about || '',
    avatar: user.avatar || user.profile_pic || user.profile_picture || user.avatar_url || user.image || user.profile_image || '',
    background: user.background || user.cover || user.banner || user.banner_image || '',
    pronouns: user.pronouns || '',
    location: user.location || '',
    website: user.website || user.link || '',
    created_at: user.created_at || user.date_joined || user.joined_at || new Date().toISOString(),
    ...user,
    username,
  }
}

function normalizeMediaItem(item, index = 0, owner = null) {
  if (!item) return null
  if (typeof item === 'string') {
    return { id: `${owner?.id || 'media'}-${index}`, url: fullUrl(item), type: 'image/*' }
  }

  const url = item.url || item.file || item.path || item.src || item.media || item.image || item.video || item.audio || item.asset
  const type = item.type || item.mime_type || item.content_type || item.kind || 'image/*'
  if (!url) return null

  return {
    id: item.id || item.pk || `${owner?.id || 'media'}-${index}`,
    url: fullUrl(url),
    type,
    ...item,
  }
}

function normalizePost(item) {
  const user = normalizeUser(item?.user || item?.author || item?.owner || item?.profile || item?.account, 'guest')
  const mediaSource = Array.isArray(item?.media_files)
    ? item.media_files
    : Array.isArray(item?.media)
      ? item.media
      : item?.media
        ? [item.media]
        : item?.images
          ? item.images
          : item?.files
            ? item.files
            : []

  const media_files = mediaSource
    .map((media, index) => normalizeMediaItem(media, index, item))
    .filter(Boolean)

  const caption = String(item?.caption ?? item?.text ?? item?.body ?? item?.title ?? '').trim()

  return {
    ...item,
    id: item?.id ?? item?.pk ?? nextId('post'),
    kind: item?.kind || (caption && !media_files.length ? 'connect' : 'post'),
    user,
    caption,
    text: item?.text ?? caption,
    tags: Array.isArray(item?.tags) ? item.tags : String(item?.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
    likes_count: Number(item?.likes_count ?? item?.likes ?? 0),
    comments_count: Number(item?.comments_count ?? item?.comment_count ?? item?.comments ?? 0),
    liked: Boolean(item?.liked || item?.is_liked),
    bookmarked: Boolean(item?.bookmarked || item?.saved),
    created_at: item?.created_at || item?.published_at || item?.timestamp || new Date().toISOString(),
    media_files,
  }
}

function normalizeReel(item) {
  const reel = normalizePost({ ...item, kind: 'reel' })
  return {
    ...reel,
    kind: 'reel',
    likes: Number(item?.likes ?? item?.likes_count ?? reel.likes_count ?? 0),
    comments: Number(item?.comments ?? item?.comments_count ?? reel.comments_count ?? 0),
    shares: Number(item?.shares ?? 0),
    muted: Boolean(item?.muted ?? true),
    poster: fullUrl(item?.poster || item?.thumbnail || item?.cover || (reel.media_files?.[0]?.url || '')),
    music: item?.music || item?.track || '',
  }
}

function normalizeTrack(item) {
  const user = normalizeUser(item?.user || item?.artist_user || item?.owner, item?.artist || 'artist')
  return {
    ...item,
    id: item?.id ?? item?.pk ?? nextId('track'),
    kind: 'music',
    user,
    title: String(item?.title || item?.name || 'Untitled track'),
    artist: String(item?.artist || item?.artist_name || user.username || 'Unknown artist'),
    cover: fullUrl(item?.cover || item?.artwork || item?.thumbnail || ''),
    file: fullUrl(item?.file || item?.audio || item?.url || ''),
    toneSeed: Number(item?.toneSeed ?? item?.tone_seed ?? 0),
    duration: Number(item?.duration ?? item?.length ?? 0) || 180,
    created_at: item?.created_at || new Date().toISOString(),
  }
}

function decorateTracksWithLikes(items) {
  const likedIds = new Set(getLikedTrackIds())
  return items.map((track) => ({
    ...track,
    liked: likedIds.has(String(track.id)),
  }))
}

function makeCommentItem(postId, text) {
  const username = getCurrentUsername()
  return {
    id: nextId('comment'),
    post_id: postId,
    username,
    text,
    created_at: new Date().toISOString(),
  }
}

function pickFirstSuccessful(results) {
  return results.find((item) => item.ok)?.value
}

async function fetchCollection(paths, normalizer) {
  const attempts = await Promise.allSettled(paths.map((path) => request(path)))
  const successful = pickFirstSuccessful(attempts.map((result) => {
    if (result.status !== 'fulfilled') return { ok: false }
    const items = unwrapList(result.value)
    return { ok: true, value: items.map(normalizer).filter(Boolean).sort(sortNewest) }
  }))
  if (successful) return successful
  throw new Error('No collection endpoint available')
}

function normalizeFormValue(input) {
  if (input instanceof FormData) {
    const obj = {}
    for (const [key, value] of input.entries()) obj[key] = value
    return obj
  }
  return input && typeof input === 'object' ? input : {}
}

function getCaptionLike(obj) {
  return String(obj.caption || obj.text || obj.title || '').trim()
}

function uploadMediaFile(file) {
  if (!file) return null
  try {
    return URL.createObjectURL(file)
  } catch {
    return null
  }
}

function localCreatePost(payload, kind = 'post') {
  const state = readState()
  const username = getCurrentUsername()
  const user = ensureUser(username)
  const mediaSrc = uploadMediaFile(payload.media || payload.file || payload.image || payload.video || payload.audio)
  const item = {
    id: nextId(kind),
    kind,
    user,
    caption: getCaptionLike(payload) || (kind === 'connect' ? 'New thought' : 'Fresh post'),
    text: getCaptionLike(payload),
    tags: String(payload.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    likes_count: 0,
    comments_count: 0,
    liked: false,
    bookmarked: false,
    created_at: new Date().toISOString(),
    media_files: mediaSrc
      ? [{ id: nextId('media'), url: mediaSrc, type: payload.media?.type || payload.file?.type || payload.image?.type || payload.video?.type || payload.audio?.type || 'image/*' }]
      : [],
  }

  if (kind === 'reel') {
    const reel = {
      ...item,
      kind: 'reel',
      likes: 0,
      comments: 0,
      shares: 0,
      muted: true,
      poster: buildCoverData(getCaptionLike(payload) || 'Reel', username),
      music: payload.music || 'Connect Loop',
    }
    state.reels = [reel, ...(state.reels || [])]
    writeState(state)
    emitContentChange()
    return reel
  }

  state.feed = [item, ...(state.feed || [])]
  writeState(state)
  emitContentChange()
  return item
}

function localUploadMusic(payload) {
  const state = readState()
  const username = getCurrentUsername()
  const user = ensureUser(username)
  const audioFile = payload.file || payload.audio || payload.track
  const track = {
    id: nextId('track'),
    kind: 'music',
    user,
    title: String(payload.title || audioFile?.name || 'Untitled track').replace(/\.[^/.]+$/, ''),
    artist: String(payload.artist || username),
    cover: payload.cover
      ? (typeof payload.cover === 'string' ? payload.cover : uploadMediaFile(payload.cover))
      : buildCoverData(payload.title || 'New track', username),
    file: uploadMediaFile(audioFile),
    toneSeed: Math.floor(Math.random() * 1000),
    duration: 180,
    created_at: new Date().toISOString(),
  }
  state.tracks = [track, ...(state.tracks || [])]
  writeState(state)
  emitContentChange()
  return track
}

function localUpdateProfile(data) {
  const state = readState()
  const username = getCurrentUsername()
  const current = state.users?.[username] || ensureUser(username)
  const nextUsername = String(data?.username || current.username).trim() || current.username
  const updated = {
    ...current,
    ...data,
    username: nextUsername,
  }
  delete updated.old_password
  delete updated.password
  state.users[nextUsername] = updated
  if (nextUsername !== username) {
    delete state.users[username]
    state.session = { username: nextUsername }
    localStorage.setItem('username', nextUsername)
    setSession({ username: nextUsername, at: Date.now() })
    window.dispatchEvent(new Event('login'))
  }
  writeState(state)
  emitContentChange()
  notify('Profile saved.', 'success')
  return updated
}

export async function login(username, password) {
  const clean = String(username || '').trim()
  if (!clean || !password) {
    return { success: false, error: 'Enter a username and password.' }
  }

  const endpoints = ['/auth/login/', '/auth/token/', '/login/', '/token/']
  for (const path of endpoints) {
    try {
      const payload = await request(path, { method: 'POST', auth: false, body: { username: clean, password } })
      const token = payload?.access || payload?.token || payload?.key || payload?.auth_token || ''
      if (token) localStorage.setItem('token', token)
      if (payload?.refresh) localStorage.setItem('refresh', payload.refresh)
      localStorage.setItem('username', clean)
      setSession({ username: clean, at: Date.now() })
      setCurrentUser(clean)
      window.dispatchEvent(new Event('login'))
      notify(`Welcome back, ${clean}.`, 'success')
      return { success: true, token, user: payload?.user || ensureUser(clean) }
    } catch {
      // try next endpoint
    }
  }

  const user = ensureUser(clean)
  localStorage.setItem('token', `local-${clean}`)
  localStorage.setItem('refresh', `local-refresh-${clean}`)
  localStorage.setItem('username', clean)
  setSession({ username: clean, at: Date.now() })
  setCurrentUser(clean)
  window.dispatchEvent(new Event('login'))
  notify(`Welcome back, ${clean}.`, 'success')
  return { success: true, token: `local-${clean}`, user }
}

export function logout() {
  clearSession()
  window.dispatchEvent(new Event('logout'))
  notify('Signed out.', 'info')
}

export async function fetchFeed() {
  try {
    const [posts, connects] = await Promise.allSettled([request(endpointCollectionUrl('posts')), request(endpointCollectionUrl('connects'))])
    const merged = []
    for (const result of [posts, connects]) {
      if (result.status !== 'fulfilled') continue
      merged.push(...unwrapList(result.value).map(normalizePost))
    }
    if (merged.length) return merged.sort(sortNewest)
    throw new Error('No feed data')
  } catch {
    const state = readState()
    const blocked = new Set(state.blockedUsers || [])
    return (state.feed || [])
      .filter((item) => item?.user?.username && !blocked.has(item.user.username))
      .map(normalizePost)
      .sort(sortNewest)
  }
}

export async function fetchReels() {
  try {
    const payload = await request(endpointCollectionUrl('reels'))
    const items = unwrapList(payload).map(normalizeReel).filter(Boolean)
    if (items.length) return items.sort(sortNewest)
    throw new Error('No reels data')
  } catch {
    const state = readState()
    const blocked = new Set(state.blockedUsers || [])
    return (state.reels || [])
      .filter((item) => item?.user?.username && !blocked.has(item.user.username))
      .map(normalizeReel)
      .sort(sortNewest)
  }
}

export async function fetchMusic() {
  try {
    const payload = await request(endpointCollectionUrl('musics'))
    const items = decorateTracksWithLikes(unwrapList(payload).map(normalizeTrack).filter(Boolean))
    if (items.length) return items.sort((a, b) => (a.order || 0) - (b.order || 0))
    throw new Error('No music data')
  } catch {
    const state = readState()
    return decorateTracksWithLikes((state.tracks || []).map(normalizeTrack)).sort((a, b) => (a.order || 0) - (b.order || 0))
  }
}

function toProfilePaths(username) {
  const clean = String(username || '').trim()
  const base = normalizeEndpoint(endpointFor('users'))
  if (!clean) return [base, `${base}/me`]
  return [
    `${base}/${encodeURIComponent(clean)}/`,
    `${base}/?username=${encodeURIComponent(clean)}`,
    `${base}/?search=${encodeURIComponent(clean)}`,
  ]
}

export async function getProfile(username) {
  const clean = String(username || getCurrentUsername()).trim() || 'guest'
  for (const path of toProfilePaths(clean)) {
    try {
      const payload = await request(path)
      const candidate = Array.isArray(payload) ? payload[0] : payload?.results?.[0] || payload?.data || payload
      if (candidate) return normalizeUser(candidate, clean)
    } catch {
      // try next path
    }
  }

  const state = readState()
  const user = state.users?.[clean]
  if (user) return normalizeUser(user, clean)
  return ensureUser(clean)
}

export async function updateProfile(userId, data) {
  const username = getCurrentUsername()
  const cleanId = userId ? encodeURIComponent(String(userId)) : ''
  const paths = cleanId
    ? [`/users/${cleanId}/`, `/profiles/${cleanId}/`, '/users/me/', '/profile/me/']
    : ['/users/me/', '/profile/me/']

  for (const path of paths) {
    try {
      const payload = await request(path, { method: 'PATCH', body: data })
      const candidate = Array.isArray(payload) ? payload[0] : payload?.data || payload
      if (candidate) {
        const normalized = normalizeUser(candidate, username)
        emitContentChange()
        notify('Profile saved.', 'success')
        return normalized
      }
    } catch {
      // try next path
    }
  }

  return localUpdateProfile(data)
}

export async function createPost(formData) {
  const payload = normalizeFormValue(formData)
  try {
    const remote = await request('/posts/', { method: 'POST', body: formData instanceof FormData ? formData : payload })
    emitContentChange()
    notify('Post published.', 'success')
    return normalizePost(remote)
  } catch {
    return localCreatePost(payload, 'post')
  }
}

export async function createReel(formData) {
  const payload = normalizeFormValue(formData)
  try {
    const remote = await request('/reels/', { method: 'POST', body: formData instanceof FormData ? formData : payload })
    emitContentChange()
    notify('Reel published.', 'success')
    return normalizeReel(remote)
  } catch {
    return localCreatePost(payload, 'reel')
  }
}

export async function uploadMusic(formData) {
  const payload = normalizeFormValue(formData)
  try {
    const remote = await request('/musics/', { method: 'POST', body: formData instanceof FormData ? formData : payload })
    emitContentChange()
    notify('Music added to library.', 'success')
    return normalizeTrack(remote)
  } catch {
    return localUploadMusic(payload)
  }
}

export async function createConnect(data) {
  const payload = normalizeFormValue(data)
  try {
    const remote = await request('/connects/', { method: 'POST', body: payload })
    emitContentChange()
    notify('Thought posted.', 'success')
    return normalizePost({ ...remote, kind: 'connect' })
  } catch {
    return localCreatePost(payload, 'connect')
  }
}

function extractLikeState(remote, kind) {
  const countKeys = kind === 'reel' ? ['likes', 'likes_count'] : ['likes_count', 'likes']
  const nextCount = countKeys
    .map((key) => remote?.[key])
    .find((value) => Number.isFinite(Number(value)))
  const liked = typeof remote?.liked === 'boolean'
    ? remote.liked
    : typeof remote?.is_liked === 'boolean'
      ? remote.is_liked
      : null
  return {
    liked,
    count: Number.isFinite(Number(nextCount)) ? Number(nextCount) : null,
  }
}

function toggleLikeInCollection(collection, id, kind, remote = null) {
  return collection.map((item) => {
    if (String(item.id) !== String(id)) return item
    const key = kind === 'reel' ? 'likes' : 'likes_count'
    const currentLiked = Boolean(item.liked)
    const fallbackLiked = !currentLiked
    const { liked: remoteLiked, count: remoteCount } = extractLikeState(remote, kind)
    const nextLiked = remoteLiked ?? fallbackLiked
    const nextCount = Number.isFinite(remoteCount)
      ? Math.max(0, remoteCount)
      : Math.max(0, Number(item[key] || 0) + (nextLiked ? 1 : -1))

    return {
      ...item,
      liked: nextLiked,
      [key]: nextCount,
    }
  })
}

export async function likePost(postId, kind = 'post') {
  const base = kind === 'reel' || kind === 'reels' ? 'reels' : 'posts'
  const paths = [`/${base}/${postId}/like/`, `/${base}/${postId}/likes/`, `/${base}/${postId}/toggle-like/`]
  for (const path of paths) {
    try {
      const remote = await request(path, { method: 'POST', body: {} })
      const state = readState()
      const outcome = extractLikeState(remote, kind === 'reel' || kind === 'reels' ? 'reel' : 'post')
      if (kind === 'reel' || kind === 'reels') state.reels = toggleLikeInCollection(state.reels || [], postId, 'reel', remote)
      else state.feed = toggleLikeInCollection(state.feed || [], postId, 'post', remote)
      writeState(state)
      emitContentChange()
      return { success: true, remote, liked: outcome.liked, count: outcome.count }
    } catch {
      // try next path
    }
  }

  const state = readState()
  const current = kind === 'reel' || kind === 'reels' ? state.reels || [] : state.feed || []
  const updated = toggleLikeInCollection(current, postId, kind === 'reel' || kind === 'reels' ? 'reel' : 'post')
  if (kind === 'reel' || kind === 'reels') state.reels = updated
  else state.feed = updated
  writeState(state)
  emitContentChange()
  const nextItem = updated.find((item) => String(item.id) === String(postId))
  return {
    success: true,
    liked: Boolean(nextItem?.liked),
    count: Number(nextItem?.likes || nextItem?.likes_count || 0),
  }
}

export async function toggleTrackLike(trackId) {
  const clean = String(trackId || '').trim()
  if (!clean) return { success: false, liked: false }
  const liked = toggleLikedTrackId(clean)
  emitContentChange()
  return { success: true, liked }
}

export function fetchLikedTracksFromCache(tracks = []) {
  const likedIds = new Set(getLikedTrackIds())
  return tracks.filter((track) => likedIds.has(String(track?.id)))
}

export async function commentPost(postId, text, kind = 'post') {
  const cleanText = String(text || '').trim()
  if (!cleanText) return { success: false }

  const base = kind === 'reel' || kind === 'reels' ? 'reels' : 'posts'
  const comment = makeCommentItem(postId, cleanText)
  const paths = [`/${base}/${postId}/comments/`, `/${base}/${postId}/comment/`]
  for (const path of paths) {
    try {
      await request(path, { method: 'POST', body: { text: cleanText } })
      appendPostComment(postId, comment)
      emitContentChange()
      return { success: true }
    } catch {
      // try next path
    }
  }

  const state = readState()
  if (kind === 'reel' || kind === 'reels') {
    state.reels = (state.reels || []).map((item) => item.id === postId ? { ...item, comments: Number(item.comments || 0) + 1 } : item)
  } else {
    state.feed = (state.feed || []).map((item) => item.id === postId ? { ...item, comments_count: Number(item.comments_count || 0) + 1 } : item)
  }
  appendPostComment(postId, comment)
  writeState(state)
  emitContentChange()
  return { success: true }
}

export async function reportPost(postId, kind = 'post') {
  const base = kind === 'reel' || kind === 'reels' ? 'reels' : 'posts'
  for (const path of [`/${base}/${postId}/report/`, '/reports/']) {
    try {
      await request(path, { method: 'POST', body: { id: postId, kind } })
      notify('Thanks for the report.', 'info')
      return { success: true }
    } catch {
      // try next path
    }
  }
  notify('Thanks for the report.', 'info')
  return { success: true }
}

export async function blockUser(username) {
  const clean = String(username || '').trim()
  if (!clean) return { success: false }
  for (const path of [`/users/${encodeURIComponent(clean)}/block/`, '/block/']) {
    try {
      await request(path, { method: 'POST', body: { username: clean } })
      notify(`Blocked @${clean}.`, 'warn')
      emitContentChange()
      return { success: true }
    } catch {
      // try next path
    }
  }

  const state = readState()
  const blocked = new Set(state.blockedUsers || [])
  blocked.add(clean)
  state.blockedUsers = Array.from(blocked)
  writeState(state)
  notify(`Blocked @${clean}.`, 'warn')
  emitContentChange()
  return { success: true }
}

export function getLocalSession() {
  return getSession()
}


export async function fetchChatRoom(roomKey, limit = 150) {
  const clean = String(roomKey || 'public').trim() || 'public'
  const query = `chat/messages/?room=${encodeURIComponent(clean)}&limit=${encodeURIComponent(String(limit))}`
  const needsAuth = clean !== 'public' && hasUsableJwtToken()
  return request(query, { auth: needsAuth })
}

export async function sendChatMessage(roomKey, text, options = {}) {
  const cleanRoom = String(roomKey || 'public').trim() || 'public'
  const bodyText = String(text || '').trim()
  if (!bodyText) throw new Error('Message text is required.')
  if (!hasUsableJwtToken()) {
    throw new Error('Authentication required.')
  }

  const body = {
    room: cleanRoom,
    text: bodyText,
    message: bodyText,
    client_id: options.clientId || options.client_id || '',
    client_message_id: options.clientId || options.client_id || '',
    to: options.to || '',
    recipient_username: options.to || '',
    private: Boolean(options.private),
  }

  return request('chat/messages/', { method: 'POST', body, auth: true })
}
