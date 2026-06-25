import React, { memo, useEffect, useRef, useState } from 'react'
import { avatarUrl, coverUrl } from '../services/assets'
import { likePost } from '../services/api'
import Icon from './Icon'

function formatShortTime(value) {
  if (!Number.isFinite(value) || value < 0) return '0:00'
  const minutes = Math.floor(value / 60)
  const seconds = String(Math.floor(value % 60)).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function VideoReel({ reel, index = 0, total = 1, onOpenProfile }) {
  const initialLikeCount = Number(reel?.likes_count ?? reel?.likes ?? 0)
  const [liked, setLiked] = useState(Boolean(reel?.liked))
  const [bookmarked, setBookmarked] = useState(Boolean(reel?.bookmarked))
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(Boolean(reel?.muted ?? true))
  const [progress, setProgress] = useState(0)
  const [showHeart, setShowHeart] = useState(false)
  const [likes, setLikes] = useState(initialLikeCount)
  const timerRef = useRef(null)

  const authorName = reel?.user?.username || reel?.author?.username || reel?.username || 'unknown'
  const avatar = avatarUrl(reel?.user || reel?.author || reel)
  const caption = reel?.caption || reel?.text || ''
  const musicLabel = reel?.music || 'Original audio'
  const shares = Number(reel?.shares_count || reel?.shares || 0)
  const poster = coverUrl(reel, reel?.caption || 'Reel')

  useEffect(() => {
    setLiked(Boolean(reel?.liked))
    setBookmarked(Boolean(reel?.bookmarked))
    setMuted(Boolean(reel?.muted ?? true))
    setLikes(Number(reel?.likes_count ?? reel?.likes ?? 0))
  }, [reel?.id, reel?.liked, reel?.bookmarked, reel?.muted, reel?.likes_count, reel?.likes])

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setProgress((value) => (value >= 100 ? 0 : value + (paused ? 0 : 0.9)))
    }, 90)
    return () => window.clearInterval(timerRef.current)
  }, [paused])

  const handleTap = () => {
    setPaused((value) => !value)
  }

  const toggleLike = async (event) => {
    event.stopPropagation()
    const previousLiked = liked
    const previousLikes = likes
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikes(Math.max(0, likes + (nextLiked ? 1 : -1)))
    setShowHeart(true)
    window.setTimeout(() => setShowHeart(false), 650)
    try {
      const result = await likePost(reel.id, 'reel')
      if (typeof result?.liked === 'boolean') setLiked(result.liked)
      if (Number.isFinite(Number(result?.count))) setLikes(Math.max(0, Number(result.count)))
    } catch (error) {
      console.error(error)
      setLiked(previousLiked)
      setLikes(previousLikes)
    }
  }

  return (
    <article className={`surface reel-stage refined-reel-stage ${paused ? 'is-paused' : ''}`} aria-label={`Reel ${index + 1} of ${total}`} onClick={handleTap}>
      <img src={poster} alt="" className="reel-backdrop" />
      <div className="reel-gradient reel-gradient-top" />
      <div className="reel-gradient reel-gradient-bottom" />

      <div className="reel-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="reel-shell">
        <div className="reel-top-meta">
          <div className="reel-badge">
            <span className="reel-live-dot" />
            <span>Reels</span>
          </div>
          <span className="reel-counter">{index + 1}/{total}</span>
        </div>

        <div className="reel-hero-copy">
          <button type="button" className="reel-author" onClick={(event) => { event.stopPropagation(); onOpenProfile?.(reel?.user || reel?.author) }}>
            <img src={avatar || '/default-avatar.svg'} alt="" className="reel-avatar" />
            <div>
              <strong>@{authorName}</strong>
              <span>{reel?.created_at ? new Date(reel.created_at).toLocaleDateString() : 'Now playing'}</span>
            </div>
          </button>

          {caption ? <p className="reel-caption">{caption}</p> : <p className="reel-caption muted">Tap to pause.</p>}

          <div className="reel-audio-chip" aria-label="Audio information">
            <Icon name="music" size={16} />
            <span>{musicLabel}</span>
          </div>
        </div>

        <aside className="reel-actions" aria-label="Reel actions" onClick={(event) => event.stopPropagation()}>
          <button type="button" className={`reel-action ${liked ? 'active' : ''}`} onClick={toggleLike} aria-label={liked ? 'Unlike reel' : 'Like reel'}>
            <span className="reel-action-icon">{liked ? '♥' : '♡'}</span>
            <span>{likes}</span>
          </button>

          <button type="button" className={`reel-action ${bookmarked ? 'active' : ''}`} onClick={() => setBookmarked((value) => !value)} aria-label={bookmarked ? 'Remove save' : 'Save reel'}>
            <span className="reel-action-icon">⌁</span>
            <span>Save</span>
          </button>

          <button type="button" className="reel-action" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Unmute video' : 'Mute video'}>
            <span className="reel-action-icon">{muted ? '🔇' : '🔊'}</span>
            <span>{muted ? 'Muted' : 'Sound'}</span>
          </button>

          <button type="button" className="reel-action" aria-label="Share reel">
            <span className="reel-action-icon">↗</span>
            <span>{shares}</span>
          </button>
        </aside>

        <button
          type="button"
          className="reel-play-toggle btn-animated"
          onClick={(event) => {
            event.stopPropagation()
            setPaused((value) => !value)
          }}
          aria-label={paused ? 'Play video' : 'Pause video'}
        >
          {paused ? 'Play' : 'Pause'}
        </button>

        {showHeart && <div className="reel-heart" aria-hidden="true">♥</div>}
        <div className="reel-time">{formatShortTime(progress)}</div>
      </div>
    </article>
  )
}

export default memo(VideoReel)
