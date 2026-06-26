const DEFAULT_WS_BASE = (typeof window !== 'undefined' && window.location)
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8000/ws`
  : 'ws://127.0.0.1:8000/ws'
const WS_BASE = import.meta.env.VITE_WS_BASE || DEFAULT_WS_BASE

function eventKey(room) {
  return `connect-chat-message:${room}`
}

function localSocket(room, onMessage, onOpen, handlers = {}) {
  let closedByUser = false
  let open = false

  const listener = (event) => {
    if (closedByUser) return
    onMessage?.(event.detail)
  }

  window.addEventListener(eventKey(room), listener)

  queueMicrotask(() => {
    if (closedByUser) return
    open = true
    onOpen?.()
  })

  return {
    get readyState() {
      if (closedByUser) return WebSocket.CLOSED
      return open ? WebSocket.OPEN : WebSocket.CONNECTING
    },
    send(payload) {
      if (closedByUser) return
      let parsed = {}
      try {
        parsed = typeof payload === 'string' ? JSON.parse(payload) : (payload || {})
      } catch {
        parsed = { message: String(payload || '') }
      }
      const outgoing = {
        ...parsed,
        created_at: parsed.created_at || new Date().toISOString(),
        private: Boolean(parsed.private),
      }
      window.dispatchEvent(new CustomEvent(eventKey(room), { detail: outgoing }))
    },
    close() {
      closedByUser = true
      window.removeEventListener(eventKey(room), listener)
      handlers.onClose?.()
    },
  }
}

export function connectToChat(onMessage, onOpen, room = 'public', handlers = {}) {
  const base = WS_BASE.replace(/\/+$/, '')
  const token = localStorage.getItem('token') || ''
  const raw = token && String(token).startsWith('Bearer ') ? String(token).slice(7) : token
  const hasToken = raw && raw.includes('.') && !String(raw).startsWith('local-')
  let wsUrl = `${base}/chat/${encodeURIComponent(room)}/`
  if (hasToken) wsUrl += `?token=${encodeURIComponent(raw)}`

  try {
    const socket = new WebSocket(wsUrl)
    socket.onopen = () => onOpen?.()
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        onMessage?.(payload)
      } catch {
        onMessage?.({ message: event.data })
      }
    }
    socket.onerror = () => handlers.onError?.()
    socket.onclose = () => handlers.onClose?.()
    return socket
  } catch {
    return localSocket(room, onMessage, onOpen, handlers)
  }
}
