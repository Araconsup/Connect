import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import GlobalMusicPlayer from './components/GlobalMusicPlayer'
import Notifications from './components/Notifications'
import { MusicPlayerProvider, useMusicPlayer } from './context/MusicPlayerContext'
import { getLocalSession, setAuthFromStorage } from './services/api'

const Login = React.lazy(() => import('./pages/Login'))
const Home = React.lazy(() => import('./pages/Home'))
const Reels = React.lazy(() => import('./pages/Reels'))
const Upload = React.lazy(() => import('./pages/Upload'))
const Chat = React.lazy(() => import('./pages/Chat'))
const Profile = React.lazy(() => import('./pages/Profile'))
const Music = React.lazy(() => import('./pages/Music'))

function LoadingScreen() {
  return (
    <div className="page-shell">
      <div className="surface empty-state loading-card">
        <span className="loading-orb" />
        <span>Loading…</span>
      </div>
    </div>
  )
}

function AppContent() {
  const location = useLocation()
  const { currentTrack } = useMusicPlayer()
  const pathname = location.pathname.toLowerCase()
  const isReelsRoute = pathname.includes('/reels')
  const showGlobalPlayer = Boolean(currentTrack) && location.pathname !== '/music' && !isReelsRoute

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  const shellClass = useMemo(() => {
    return `app-shell-root with-sidebar ${showGlobalPlayer ? 'with-global-player' : ''} ${isReelsRoute ? 'is-reels-route' : ''}`
  }, [showGlobalPlayer, isReelsRoute])

  return (
    <div className={shellClass}>
      <Notifications />
      {showGlobalPlayer && <GlobalMusicPlayer />}
      <main className={location.pathname === '/reels' ? 'app-main app-main-reels' : 'app-main'}>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/music" element={<Music />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    const sync = () => {
      setAuthFromStorage()
      setToken(localStorage.getItem('token'))
    }

    const sessionSync = () => {
      setToken(localStorage.getItem('token'))
    }

    window.addEventListener('login', sync)
    window.addEventListener('logout', sync)
    window.addEventListener('storage', sync)
    window.addEventListener('connect-session-change', sessionSync)
    sync()

    return () => {
      window.removeEventListener('login', sync)
      window.removeEventListener('logout', sync)
      window.removeEventListener('storage', sync)
      window.removeEventListener('connect-session-change', sessionSync)
    }
  }, [])

  if (!token) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/*" element={<Login />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <MusicPlayerProvider>
      <AppContent />
    </MusicPlayerProvider>
  )
}
