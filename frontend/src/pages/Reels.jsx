import React, { useEffect, useMemo, useState } from 'react'
import VideoReel from '../components/VideoReel'
import ProfileModal from '../components/ProfileModal'
import { fetchReels, getProfile } from '../services/api'

export default function Reels() {
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('for-you')
  const [profileUser, setProfileUser] = useState(null)

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchReels()
        if (alive) setReels(Array.isArray(data) ? data : [])
      } catch {
        if (alive) setReels([])
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    const refresh = () => load()
    window.addEventListener('connect-content-updated', refresh)
    return () => {
      alive = false
      window.removeEventListener('connect-content-updated', refresh)
    }
  }, [])

  const visibleReels = useMemo(() => {
    if (tab === 'saved') return reels.filter((reel) => reel.bookmarked)
    return reels
  }, [reels, tab])

  const openProfile = async (user) => {
    if (!user?.username) return
    try {
      const profile = await getProfile(user.username)
      setProfileUser(profile)
    } catch {
      setProfileUser(user)
    }
  }

  return (
    <div className="page-shell reels-shell page-fade-in">
      <header className="surface reels-topbar">
        <div className="hero-copy">
          <div className="eyebrow">Reels</div>
          <h1>Vertical stories with polished motion.</h1>
          <p>Designed to feel swipeable, immersive, and easy to control with one hand.</p>
        </div>

        <div className="segment-switcher reels-tabs">
          <button type="button" className={`btn btn-chip btn-animated ${tab === 'for-you' ? 'active' : ''}`} onClick={() => setTab('for-you')} aria-selected={tab === 'for-you'}>For you</button>
          <button type="button" className={`btn btn-chip btn-animated ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')} aria-selected={tab === 'saved'}>Saved</button>
        </div>
      </header>

      <main className="reels-feed" aria-busy={loading ? 'true' : 'false'}>
        {loading && (
          <div className="reels-empty-screen">
            <div className="reels-loader" aria-hidden="true" />
            <p>Loading short-form feed…</p>
          </div>
        )}

        {!loading && visibleReels.length === 0 && (
          <div className="reels-empty-screen">
            <h2>No reels yet</h2>
            <p>When videos are available, they will appear here in a full-screen swipe feed.</p>
          </div>
        )}

        {visibleReels.map((reel, index) => (
          <VideoReel key={reel.id || index} reel={reel} index={index} total={visibleReels.length} onOpenProfile={openProfile} />
        ))}
      </main>

      {profileUser && <ProfileModal user={profileUser} onClose={() => setProfileUser(null)} />}
    </div>
  )
}
