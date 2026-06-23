import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import LoveNotePanel from '../components/LoveNotePanel'
import PostCard from '../components/PostCard'
import ProfileModal from '../components/ProfileModal'
import { fetchFeed, getProfile } from '../services/api'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [profileUser, setProfileUser] = useState(null)
  const [loveNoteOpen, setLoveNoteOpen] = useState(false)

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchFeed()
        if (alive) setPosts(Array.isArray(data) ? data : [])
      } catch {
        if (alive) setPosts([])
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

  const stats = useMemo(() => {
    const mediaPosts = posts.filter((post) => Array.isArray(post?.media_files) ? post.media_files.length > 0 : Boolean(post?.media || post?.image || post?.file || post?.media_url || post?.image_url || post?.file_url))
    const connectPosts = posts.filter((post) => post?.kind === 'connect' || Boolean(post?.text && !post?.caption))
    return { total: posts.length, media: mediaPosts.length, connects: connectPosts.length }
  }, [posts])

  const visiblePosts = useMemo(() => {
    if (tab === 'media') return posts.filter((post) => Array.isArray(post?.media_files) ? post.media_files.length > 0 : Boolean(post?.media || post?.image || post?.file || post?.media_url || post?.image_url || post?.file_url))
    if (tab === 'connects') return posts.filter((post) => post?.kind === 'connect' || Boolean(post?.text && !post?.caption))
    return posts
  }, [posts, tab])

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
    <div className="page-shell home-shell page-fade-in">
      <section className="surface page-hero home-hero refined-home-hero hero-entrance">
        <div className="hero-copy">
          <div className="eyebrow"><Icon name="spark" size={16} /> Quiet feed</div>
          <h1>A simple, polished feed with a softer motion language.</h1>
          <p>Cleaner layout, left-side desktop navigation, and a more focused home screen.</p>
        </div>

        <div className="hero-spotlight">
          <div className="hero-stats hero-stats-tight" aria-label="Feed summary">
            <div><strong>{loading ? '…' : stats.total}</strong><span>Posts</span></div>
            <div><strong>{loading ? '…' : stats.media}</strong><span>Media</span></div>
            <div><strong>{loading ? '…' : stats.connects}</strong><span>Notes</span></div>
          </div>
        </div>

        <div className="action-row">
          <button type="button" className="btn btn-primary btn-animated" onClick={() => setLoveNoteOpen(true)}>For My Dear Z</button>
          <Link className="btn btn-ghost btn-animated" to="/music">Music</Link>
          <Link className="btn btn-ghost btn-animated" to="/upload">Create</Link>
        </div>
      </section>

      <div className="segment-switcher surface compact-segment refined-switcher">
        <button type="button" className={`btn btn-chip btn-animated ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All</button>
        <button type="button" className={`btn btn-chip btn-animated ${tab === 'media' ? 'active' : ''}`} onClick={() => setTab('media')}>Media</button>
        <button type="button" className={`btn btn-chip btn-animated ${tab === 'connects' ? 'active' : ''}`} onClick={() => setTab('connects')}>Notes</button>
      </div>

      <section className="content-stack home-feed" aria-busy={loading} aria-live="polite">
        {!loading && visiblePosts.length === 0 && <div className="surface empty-state">No content yet. When the API returns posts, they will appear here.</div>}
        {visiblePosts.map((p) => <PostCard key={`${p.kind || 'item'}-${p.id}`} post={p} onOpenProfile={openProfile} />)}
      </section>

      {profileUser && <ProfileModal user={profileUser} onClose={() => setProfileUser(null)} />}
      <LoveNotePanel open={loveNoteOpen} onClose={() => setLoveNoteOpen(false)} />
    </div>
  )
}
