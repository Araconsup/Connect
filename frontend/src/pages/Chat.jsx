import React, { useEffect, useMemo, useRef, useState } from 'react'
import ProfileModal from '../components/ProfileModal'
import Icon from '../components/Icon'
import { avatarUrl } from '../services/assets'
import { connectToChat } from '../services/ws'
import { fetchChatRoom, getProfile, sendChatMessage } from '../services/api'
import { getChat, setChat } from '../services/store'
import {
  PUBLIC_ROOM_KEY,
  appendMessageToRoom,
  getChatThreads,
  getCurrentUsername,
  getMessagesForRoom,
  getPeerFromRoomKey,
  makePrivateRoomKey,
  makePublicRoomKey,
  markThreadRead,
  mergeChatMessages,
  normalizeChatMessage,
  syncThread,
} from '../services/chat'

const CHAT_TAB_KEY = 'connect-chat-tab-v1'
const CHAT_PEER_KEY = 'connect-chat-peer-v1'

function safeParse(value, fallback) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function formatTime(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

function buildThreadLabel(thread, currentUsername) {
  if (!thread) return 'Direct message'
  if (thread.roomKey === PUBLIC_ROOM_KEY) return 'Public chat'
  const peer = getPeerFromRoomKey(thread.roomKey, currentUsername) || thread.title || 'Direct message'
  return peer ? `@${peer}` : 'Direct message'
}

export default function Chat() {
  const username = getCurrentUsername()
  const [tab, setTab] = useState(() => localStorage.getItem(CHAT_TAB_KEY) || 'public')
  const [selectedPeer, setSelectedPeer] = useState(() => safeParse(localStorage.getItem(CHAT_PEER_KEY), null))
  const [messages, setMessages] = useState(() => getChat(PUBLIC_ROOM_KEY))
  const [text, setText] = useState('')
  const [ws, setWs] = useState(null)
  const [profileUser, setProfileUser] = useState(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [threads, setThreads] = useState(() => getChatThreads())
  const [activeRoomLabel, setActiveRoomLabel] = useState('Public chat')
  const listRef = useRef(null)

  const currentRoomKey = useMemo(() => {
    if (tab === 'public') return makePublicRoomKey()
    if (selectedPeer?.username) return makePrivateRoomKey(username, selectedPeer.username)
    return ''
  }, [tab, selectedPeer, username])

  const people = useMemo(() => {
    const seen = new Map()
    getMessagesForRoom(PUBLIC_ROOM_KEY).forEach((msg) => {
      const user = msg.user || msg.sender || {}
      if (!user.username) return
      if (user.username === username) return
      seen.set(user.username, user)
    })
    return Array.from(seen.values()).slice(0, 8)
  }, [username, messages])

  const privateThreads = useMemo(() => {
    return threads.filter((thread) => thread.roomKey !== PUBLIC_ROOM_KEY).sort((a, b) => {
      const aTime = new Date(a.lastMessageAt || 0).getTime()
      const bTime = new Date(b.lastMessageAt || 0).getTime()
      return bTime - aTime
    })
  }, [threads])

  const refreshRoom = (roomKey) => {
    if (!roomKey) {
      setMessages([])
      setActiveRoomLabel('Direct message')
      setThreads(getChatThreads())
      return
    }
    const cache = getChat(roomKey)
    setMessages(cache)
    const nextThreads = getChatThreads()
    setThreads(nextThreads)
    const thread = nextThreads.find((item) => item.roomKey === roomKey)
    if (roomKey === PUBLIC_ROOM_KEY) setActiveRoomLabel('Public chat')
    else setActiveRoomLabel(thread ? buildThreadLabel(thread, username) : 'Direct message')
  }

  useEffect(() => {
    localStorage.setItem(CHAT_TAB_KEY, tab)
    if (tab === 'public') {
      setSelectedPeer(null)
      localStorage.removeItem(CHAT_PEER_KEY)
    }
  }, [tab])

  useEffect(() => {
    if (selectedPeer) {
      localStorage.setItem(CHAT_PEER_KEY, JSON.stringify(selectedPeer))
      setTab('private')
    }
  }, [selectedPeer])

  useEffect(() => {
    let cancelled = false
    refreshRoom(currentRoomKey)
    if (!currentRoomKey) return () => { cancelled = true }

    const hydrate = async () => {
      try {
        const payload = await fetchChatRoom(currentRoomKey)
        const remoteMessages = Array.isArray(payload?.messages)
          ? payload.messages.map((message) => normalizeChatMessage(message, currentRoomKey, username, selectedPeer?.username))
          : []
        const localMessages = getChat(currentRoomKey)
        const merged = mergeChatMessages(localMessages, remoteMessages)
        if (cancelled) return
        setChat(currentRoomKey, merged)
        setMessages(merged)
        setThreads(getChatThreads())
      } catch {
        if (cancelled) return
        setMessages(getChat(currentRoomKey))
      }
    }

    hydrate()
    markThreadRead(currentRoomKey)
    syncThread(currentRoomKey, {
      title: currentRoomKey === PUBLIC_ROOM_KEY ? 'Public chat' : buildThreadLabel({ roomKey: currentRoomKey }, username),
      participants: currentRoomKey === PUBLIC_ROOM_KEY ? [] : [username, selectedPeer?.username].filter(Boolean),
      type: currentRoomKey === PUBLIC_ROOM_KEY ? 'public' : 'private',
      unread: 0,
    })

    return () => {
      cancelled = true
    }
  }, [currentRoomKey, username, selectedPeer])

  useEffect(() => {
    if (!currentRoomKey) {
      setWs(null)
      setMessages([])
      setConnected(false)
      return () => {}
    }

    const socket = connectToChat(
      (payload) => {
        const normalized = normalizeChatMessage(payload, currentRoomKey, username, selectedPeer?.username)
        const meta = {
          type: currentRoomKey === PUBLIC_ROOM_KEY ? 'public' : 'private',
          title: currentRoomKey === PUBLIC_ROOM_KEY ? 'Public chat' : buildThreadLabel({ roomKey: currentRoomKey }, username),
          participants: currentRoomKey === PUBLIC_ROOM_KEY ? [] : [username, selectedPeer?.username].filter(Boolean),
        }
        const next = appendMessageToRoom(currentRoomKey, normalized, meta)
        setMessages(next)
        setThreads(getChatThreads())
      },
      () => {
        setConnected(true)
        setError('')
      },
      currentRoomKey,
      {
        onError: () => setError('Chat connection failed.'),
        onClose: () => setConnected(false),
      }
    )
    setWs(socket)

    const syncFromStorage = (event) => {
      const room = event?.detail?.room
      if (!room || room === currentRoomKey) {
        refreshRoom(currentRoomKey)
      }
    }
    const storageSync = (event) => {
      const key = event.key || ''
      if (key === `connect-chat-v4:${currentRoomKey}` || key === 'connect-chat-threads-v1') {
        refreshRoom(currentRoomKey)
      }
    }

    window.addEventListener('connect-chat-update', syncFromStorage)
    window.addEventListener('storage', storageSync)
    return () => {
      socket && socket.close()
      window.removeEventListener('connect-chat-update', syncFromStorage)
      window.removeEventListener('storage', storageSync)
    }
  }, [currentRoomKey, username, selectedPeer])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, currentRoomKey])

  const openProfile = async (user) => {
    if (!user?.username) return
    try {
      const profile = await getProfile(user.username)
      setProfileUser(profile)
    } catch {
      setProfileUser(user)
    }
  }

  const openPrivateChat = (user) => {
    if (!user?.username || user.username === username) return
    setSelectedPeer(user)
    setTab('private')
  }

  const handleSend = async () => {
    const body = text.trim()
    if (!body) return
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const privateMode = tab === 'private' && selectedPeer?.username
    const payload = {
      client_id: clientId,
      message: body,
      text: body,
      username,
      user: { username },
      private: Boolean(privateMode),
      to: privateMode ? selectedPeer.username : '',
      created_at: new Date().toISOString(),
      room: currentRoomKey,
    }
    const meta = {
      type: currentRoomKey === PUBLIC_ROOM_KEY ? 'public' : 'private',
      title: currentRoomKey === PUBLIC_ROOM_KEY ? 'Public chat' : buildThreadLabel({ roomKey: currentRoomKey }, username),
      participants: currentRoomKey === PUBLIC_ROOM_KEY ? [] : [username, selectedPeer?.username].filter(Boolean),
    }

    try {
      const saved = await sendChatMessage(currentRoomKey, body, {
        clientId,
        to: privateMode ? selectedPeer.username : '',
        private: Boolean(privateMode),
      })
      const savedMessage = saved?.message || saved
      const normalized = normalizeChatMessage(savedMessage || payload, currentRoomKey, username, selectedPeer?.username)
      const next = appendMessageToRoom(currentRoomKey, normalized, meta)
      setMessages(next)
      setThreads(getChatThreads())
    } catch {
      const normalized = normalizeChatMessage(payload, currentRoomKey, username, selectedPeer?.username)
      const next = appendMessageToRoom(currentRoomKey, normalized, meta)
      setMessages(next)
      setThreads(getChatThreads())
    }

    setText('')
  }

  return (
    <div className="page-shell chat-shell page-fade-in">
      <section className="page-hero surface chat-hero">
        <div className="hero-copy">
          <div className="eyebrow">Chat</div>
          <h1>{tab === 'public' ? 'Public room' : activeRoomLabel}</h1>
          <p>Public chat, direct messages, and local offline history all live in one place.</p>
        </div>
        <div className="hero-note">{connected ? 'Connected' : 'Connecting…'}{error ? ` · ${error}` : ''}</div>
      </section>

      <section className="chat-tabs surface">
        <button type="button" className={`btn btn-chip btn-animated ${tab === 'public' ? 'active' : ''}`} onClick={() => setTab('public')}>
          Public chat
        </button>
        <button type="button" className={`btn btn-chip btn-animated ${tab === 'private' ? 'active' : ''}`} onClick={() => setTab('private')}>
          Direct messages
        </button>
        <div className="chat-tabs-spacer" />
        {tab === 'private' && selectedPeer?.username ? (
          <div className="chat-active-peer">
            <img src={avatarUrl(selectedPeer)} alt="" className="person-avatar" />
            <div>
              <strong>@{selectedPeer.username}</strong>
              <span>Direct message</span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="chat-layout">
        <aside className="surface chat-people">
          <div className="section-header">
            <div>
              <span className="muted-text">{tab === 'public' ? 'People' : 'Private threads'}</span>
              <h3>{tab === 'public' ? 'People in the public room' : 'Your direct messages'}</h3>
            </div>
          </div>

          {tab === 'public' ? (
            <div className="people-list">
              {people.length ? people.map((person) => (
                <button key={person.username} type="button" className="person-row btn-animated" onClick={() => openPrivateChat(person)}>
                  <img src={avatarUrl(person)} alt="" className="person-avatar" />
                  <div>
                    <strong>@{person.username}</strong>
                    <span>Open a direct message</span>
                  </div>
                </button>
              )) : (
                <div className="empty-state chat-empty">
                  <strong>No one else yet</strong>
                  <span>Say hello and people will show up here.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="thread-list">
              {privateThreads.length ? privateThreads.map((thread) => {
                const peerName = getPeerFromRoomKey(thread.roomKey, username) || thread.title || 'Direct message'
                const isActive = thread.roomKey === currentRoomKey
                return (
                  <button
                    key={thread.roomKey}
                    type="button"
                    className={`thread-row btn-animated ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedPeer({ username: peerName })}
                  >
                    <img src={avatarUrl({ username: peerName })} alt="" className="person-avatar" />
                    <div>
                      <strong>@{peerName}</strong>
                      <span>{thread.lastMessageText || 'Tap to continue the conversation'}</span>
                    </div>
                  </button>
                )
              }) : (
                <div className="empty-state chat-empty">
                  <strong>No direct messages yet</strong>
                  <span>Select someone from the public room to start a direct message.</span>
                </div>
              )}
            </div>
          )}
        </aside>

        <div className="chat-column">
          <section className="surface chat-thread" ref={listRef} aria-live="polite" aria-label="Chat messages">
            {messages.map((m) => (
              <button key={m.client_id || m.id} type="button" className={`chat-row ${m.mine ? 'mine' : ''}`} onClick={() => openProfile(m.user)}>
                <img src={avatarUrl(m.user)} alt="" className="chat-avatar" />
                <div className="chat-bubble">
                  <div className="chat-row-head">
                    <strong>@{m.user?.username || 'guest'}</strong>
                    <span>{formatTime(m.created_at)}</span>
                  </div>
                  <p>{m.text}</p>
                </div>
              </button>
            ))}
            {!messages.length && (
              <div className="empty-state chat-empty chat-thread-empty">
                <strong>No messages here yet</strong>
                <span>{tab === 'public' ? 'Start the public room with the first message.' : 'Choose someone to open a direct message.'}</span>
              </div>
            )}
          </section>

          <section className="surface chat-compose">
            <div className="chat-compose-row">
              <input
                className="text-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={tab === 'public' ? 'Message everyone in the public room' : selectedPeer?.username ? `Message @${selectedPeer.username}` : 'Choose someone to start a direct message'}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
              />
              <button type="button" className="btn btn-primary btn-animated" onClick={handleSend} disabled={!text.trim() || (tab === 'private' && !selectedPeer?.username)}>
                <Icon name="send" size={16} />
                <span>Send</span>
              </button>
            </div>
            <p className="form-help">Messages are saved locally too, so chats stay available even when the connection drops.</p>
          </section>
        </div>
      </section>

      {profileUser && <ProfileModal user={profileUser} onClose={() => setProfileUser(null)} />}
    </div>
  )
}
