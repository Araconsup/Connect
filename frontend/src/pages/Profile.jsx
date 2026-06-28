import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import PostCard from '../components/PostCard'
import VideoReel from '../components/VideoReel'
import { avatarUrl, coverUrl } from '../services/assets'
import { fetchFeed, fetchReels, getProfile, logout, updateProfile } from '../services/api'
import { getTheme, setTheme } from '../services/store'

function applyThemeClass(nextTheme) {
  const classes = ['theme-dark-ghost', 'theme-emerald', 'theme-sand', 'theme-violet', 'theme-midnight', 'theme-coral', 'theme-aurora', 'theme-pearl']
  document.documentElement.classList.remove(...classes)
  if (nextTheme) document.documentElement.classList.add(nextTheme)
  if (nextTheme) setTheme(nextTheme)
  else setTheme('')
}

export default function Profile() {
  const { username: routeUsername } = useParams()
  const username = routeUsername || localStorage.getItem('username') || 'guest'
  const currentUser = localStorage.getItem('username') || 'guest'
  const isOwnProfile = username === currentUser || username === 'me'

  const [user, setUser] = useState(null)
  const [bio, setBio] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [theme, setThemeState] = useState(getTheme() || '')
  const [feed, setFeed] = useState([])
  const [reels, setReels] = useState([])
  const [activeTab, setActiveTab] = useState('posts')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)
      setError('')

      const [profileRes, feedRes, reelsRes] = await Promise.allSettled([getProfile(username), fetchFeed(), fetchReels()])
      if (!alive) return

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        const u = profileRes.value
        setUser(u)
        setBio(u?.bio || '')
        setNewUsername('')
      } else if (profileRes.status === 'rejected') {
        setError(profileRes.reason?.response?.status === 401 ? 'Your session expired. Sign in again.' : 'Unable to load profile.')
      }
      if (feedRes.status === 'fulfilled') setFeed(Array.isArray(feedRes.value) ? feedRes.value : [])
      if (reelsRes.status === 'fulfilled') setReels(Array.isArray(reelsRes.value) ? reelsRes.value : [])
      setLoading(false)
    }

    load()
    const refresh = () => load()
    window.addEventListener('connect-content-updated', refresh)
    return () => {
      alive = false
      window.removeEventListener('connect-content-updated', refresh)
    }
  }, [username])

  const scopedFeed = useMemo(() => {
    const uname = String(user?.username || username || '').toLowerCase()
    return feed.filter((item) => String(item?.user?.username || item?.author?.username || '').toLowerCase() === uname)
  }, [feed, user, username])

  const scopedReels = useMemo(() => {
    const uname = String(user?.username || username || '').toLowerCase()
    return reels.filter((item) => String(item?.user?.username || item?.author?.username || item?.username || '').toLowerCase() === uname)
  }, [reels, user, username])

  const mediaItems = useMemo(() => scopedFeed.filter((post) => Array.isArray(post?.media_files) ? post.media_files.length > 0 : Boolean(post?.media || post?.image || post?.file || post?.media_url || post?.image_url || post?.file_url)), [scopedFeed])
  const connectItems = useMemo(() => scopedFeed.filter((post) => post?.kind === 'connect' || Boolean(post?.text && !post?.caption)), [scopedFeed])
  const items = useMemo(() => {
    if (activeTab === 'media') return mediaItems
    if (activeTab === 'reels') return scopedReels
    if (activeTab === 'connects') return connectItems
    return scopedFeed
  }, [activeTab, connectItems, mediaItems, scopedFeed, scopedReels])

  const backgroundStyle = useMemo(() => ({ backgroundImage: user?.background ? `url(${coverUrl({ cover: user.background })})` : 'none' }), [user?.background])
  const profileDirty = useMemo(() => bio !== (user?.bio || '') || newUsername.trim().length > 0, [bio, newUsername, user?.bio])
  const passwordDirty = Boolean(oldPassword || newPassword)
  const themeOptions = [
    { id: '', label: 'Aquamatic' },
    { id: 'theme-dark-ghost', label: 'Graphite' },
    { id: 'theme-emerald', label: 'Emerald' },
    { id: 'theme-sand', label: 'Sand' },
    { id: 'theme-violet', label: 'Violet' },
    { id: 'theme-midnight', label: 'Midnight' },
    { id: 'theme-coral', label: 'Coral' },
    { id: 'theme-aurora', label: 'Aurora' },
    { id: 'theme-pearl', label: 'Pearl' },
  ]

  const saveProfile = async () => {
    try {
      if (!user) return
      setSavingProfile(true)
      const updated = await updateProfile(user.id, { bio, username: newUsername.trim() || undefined })
      if (updated) {
        setUser(updated)
        setBio(updated?.bio || '')
        setNewUsername('')
        if (updated?.username) localStorage.setItem('username', updated.username)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingProfile(false)
    }
  }

  const resetProfile = () => {
    setBio(user?.bio || '')
    setNewUsername('')
  }

  const doChangePassword = async () => {
    try {
      if (!user || !newPassword) return
      setSavingPassword(true)
      await updateProfile(user.id, { old_password: oldPassword, password: newPassword })
      setOldPassword('')
      setNewPassword('')
    } catch (e) {
      console.error(e)
    } finally {
      setSavingPassword(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <div className="page-shell"><div className="surface empty-state">Loading...</div></div>
  if (!user) return <div className="page-shell"><div className="surface empty-state">{error || 'Profile not available'}</div></div>

  return (
    <div className="page-shell profile-shell page-fade-in">
      <section className="surface profile-hero refined-profile-hero" style={backgroundStyle}>
        <div className="profile-hero-main">
          <img src={avatarUrl(user)} className="profile-avatar" alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.src = '/default-avatar.svg' }} />
          <div className="profile-hero-copy">
            <div className="profile-topline">
              <div className="eyebrow"><Icon name="profile" size={16} /> @{user.username}</div>
              {isOwnProfile && <span className="mini-chip profile-own-chip">Your profile</span>}
            </div>
            <h1>{user.username}</h1>
            <p className="profile-bio">{user.bio || 'No bio yet. Add a line that feels like you.'}</p>
            <div className="profile-actions">
              <button className="btn btn-primary btn-animated" type="button" onClick={copyLink}>Copy link</button>
              <Link className="btn btn-ghost btn-animated" to="/chat">Message</Link>
              <Link className="btn btn-ghost btn-animated" to="/upload">Create post</Link>
              {isOwnProfile && (
                <button className="btn btn-danger btn-animated" type="button" onClick={logout}>Sign out</button>
              )}
            </div>
          </div>
        </div>

        <div className="profile-hero-aside">
          <div className="profile-stat-card"><strong>{scopedFeed.length}</strong><span>Posts</span></div>
          <div className="profile-stat-card"><strong>{mediaItems.length}</strong><span>Media</span></div>
          <div className="profile-stat-card"><strong>{connectItems.length}</strong><span>Connects</span></div>
          <div className="profile-stat-card"><strong>{scopedReels.length}</strong><span>Reels</span></div>
        </div>
      </section>

      <section className="surface profile-insights refined-insights">
        <div><span className="muted-text">Profile status</span><strong>{isOwnProfile ? 'Editable' : 'Viewing mode'}</strong></div>
        <div><span className="muted-text">Theme</span><strong>{themeOptions.find((option) => option.id === theme)?.label || 'Aquamatic'}</strong></div>
        <div><span className="muted-text">View</span><strong>{activeTab}</strong></div>
      </section>

      <section className="surface segment-switcher compact-segment">
        <button type="button" className={`btn btn-chip btn-animated ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>Posts</button>
        <button type="button" className={`btn btn-chip btn-animated ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}>Media</button>
        <button type="button" className={`btn btn-chip btn-animated ${activeTab === 'connects' ? 'active' : ''}`} onClick={() => setActiveTab('connects')}>Connects</button>
        <button type="button" className={`btn btn-chip btn-animated ${activeTab === 'reels' ? 'active' : ''}`} onClick={() => setActiveTab('reels')}>Reels</button>
      </section>

      <section className="content-stack profile-stream">
        {items.length === 0 && <div className="surface empty-state">Nothing here yet.</div>}
        {activeTab === 'reels'
          ? items.map((reel, index) => <VideoReel key={reel.id || index} reel={reel} index={index} total={items.length} />)
          : items.map((p) => <PostCard key={`${p.kind || 'item'}-${p.id}`} post={p} />)}
      </section>

      {isOwnProfile && (
        <div className="grid-two profile-grid">
          <section className="surface form-card profile-form-card refined-form-card">
            <div className="section-header">
              <div>
                <span className="muted-text">Identity</span>
                <h3>Edit profile</h3>
              </div>
              <span className="mini-chip">Saved to your account</span>
            </div>
            <p className="form-help">Keep this short and clear so the profile reads well on small screens.</p>
            <label className="field-label">Bio</label>
            <textarea className="text-area" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
            <label className="field-label">Username</label>
            <input className="text-input" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Change username" />
            <div className="action-row">
              <button className="btn btn-primary btn-animated" type="button" onClick={saveProfile} disabled={!profileDirty || savingProfile}>
                Save profile
              </button>
              <button className="btn btn-ghost btn-animated" type="button" onClick={resetProfile}>Reset</button>
            </div>
          </section>

          <section className="surface form-card profile-form-card refined-form-card">
            <div className="section-header">
              <div>
                <span className="muted-text">Security</span>
                <h3>Change password</h3>
              </div>
              <Icon name="lock" />
            </div>
            <label className="field-label">Current password</label>
            <input className="text-input" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            <label className="field-label">New password</label>
            <input className="text-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div className="action-row">
              <button className="btn btn-primary btn-animated" type="button" onClick={doChangePassword} disabled={!passwordDirty || savingPassword}>
                Update password
              </button>
            </div>
          </section>

          <section className="surface form-card profile-form-card refined-form-card theme-panel">
            <div className="section-header">
              <div>
                <span className="muted-text">Theme</span>
                <h3>Choose a finish</h3>
              </div>
              <Icon name="spark" />
            </div>
            <div className="theme-grid">
              {themeOptions.map((option) => (
                <button
                  key={option.id || 'default'}
                  type="button"
                  className={`theme-option ${theme === option.id ? 'active' : ''} btn-animated`}
                  onClick={() => {
                    setThemeState(option.id)
                    applyThemeClass(option.id)
                    setTheme(option.id)
                  }}
                >
                  <strong>{option.label}</strong>
                  <span>{option.id ? option.id.replace('theme-', '') : 'default'}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
