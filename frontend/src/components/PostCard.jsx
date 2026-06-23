import React, { memo, useEffect, useMemo, useState } from 'react'
import { blockUser, commentPost, fullUrl, likePost, reportPost } from '../services/api'
import { getPostComments } from '../services/store'
import { avatarUrl } from '../services/assets'
import Icon from './Icon'

function collectMedia(post) {
  const mediaSource = Array.isArray(post?.media_files)
    ? post.media_files
    : Array.isArray(post?.media)
      ? post.media
      : post?.media
        ? [post.media]
        : post?.images
          ? post.images
          : post?.files
            ? post.files
            : []

  return mediaSource
    .map((media, index) => {
      if (!media) return null
      if (typeof media === 'string') {
        return { key: `${post?.id || 'post'}-${index}`, src: fullUrl(media), kind: 'image' }
      }

      const url = media.url || media.file || media.path || media.src || media.media || media.image || media.video || media.audio || media.asset
      if (!url) return null
      const mime = String(media.type || media.mime_type || media.content_type || media.kind || '').toLowerCase()
      const isVideo = mime.includes('video') || /\.(mp4|webm|mov|m4v)$/i.test(url)
      return {
        key: media.id || `${post?.id || 'post'}-${index}`,
        src: fullUrl(url),
        kind: isVideo ? 'video' : 'image',
      }
    })
    .filter(Boolean)
}

function PostCard({ post, onOpenProfile }) {
  const initialLikeCount = Number(post?.likes_count ?? post?.likes ?? 0)
  const [liked, setLiked] = useState(Boolean(post?.liked))
  const [bookmarked, setBookmarked] = useState(Boolean(post?.bookmarked))
  const [busy, setBusy] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState([])
  const [likeCount, setLikeCount] = useState(initialLikeCount)

  const author = post?.user?.username || post?.author?.username || post?.username || 'unknown'
  const avatar = avatarUrl(post?.user || post?.author || post)
  const bodyText = post?.caption || post?.text || ''
  const mediaItems = useMemo(() => collectMedia(post), [post])
  const tags = useMemo(() => (Array.isArray(post?.tags) ? post.tags : []), [post])
  const commentCount = Number(post?.comments_count || post?.comments || 0) + comments.length
  const resourceKind = post?.kind || (mediaItems.length ? 'post' : 'connect')

  useEffect(() => {
    setLiked(Boolean(post?.liked))
    setBookmarked(Boolean(post?.bookmarked))
    setLikeCount(Number(post?.likes_count ?? post?.likes ?? 0))
    setComments(getPostComments(post?.id))
  }, [post?.id, post?.liked, post?.bookmarked, post?.likes_count, post?.likes])

  const handleLike = async () => {
    if (busy) return
    setBusy(true)
    const previousLiked = liked
    const previousCount = likeCount
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikeCount(Math.max(0, likeCount + (nextLiked ? 1 : -1)))
    try {
      const result = await likePost(post.id, resourceKind)
      if (typeof result?.liked === 'boolean') setLiked(result.liked)
      if (Number.isFinite(Number(result?.count))) setLikeCount(Math.max(0, Number(result.count)))
    } catch (e) {
      console.error('Like failed', e)
      setLiked(previousLiked)
      setLikeCount(previousCount)
    } finally {
      setBusy(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${author}`
    try {
      await navigator.clipboard.writeText(url)
    } catch (e) {
      console.error(e)
    }
  }

  const handleReport = async () => {
    try {
      await reportPost(post.id, resourceKind)
    } catch (e) {
      console.error(e)
    }
  }

  const handleBlock = async () => {
    try {
      if (author !== 'unknown') await blockUser(author)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    const text = commentText.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      await commentPost(post.id, text, resourceKind)
      setComments(getPostComments(post.id))
      setCommentText('')
      setCommentOpen(true)
    } catch (e) {
      console.error('Comment failed', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`surface post-card refined-post-card ${mediaItems.length ? 'post-card-media' : ''}`}>
      <header className="card-head">
        <button type="button" className="avatar-wrap" onClick={() => onOpenProfile?.(post?.user || post?.author)} aria-label={`Open ${author} profile`}>
          <img src={avatar || '/default-avatar.svg'} alt="" className="avatar" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.src = '/default-avatar.svg' }} />
        </button>
        <button type="button" className="card-meta card-meta-button" onClick={() => onOpenProfile?.(post?.user || post?.author)}>
          <strong>@{author}</strong>
          <span>{post?.created_at ? new Date(post.created_at).toLocaleString() : 'Just now'}</span>
        </button>
      </header>

      <div className="post-body">
        {bodyText && <p>{bodyText}</p>}

        {tags.length > 0 && (
          <div className="tag-row" aria-label="Tags">
            {tags.map((tag) => <span key={tag} className="tag-chip">#{tag}</span>)}
          </div>
        )}

        {mediaItems.length === 1 && mediaItems[0].kind === 'image' && (
          <img src={mediaItems[0].src} alt="post media" className="post-media" loading="lazy" decoding="async" />
        )}
        {mediaItems.length === 1 && mediaItems[0].kind === 'video' && (
          <video src={mediaItems[0].src} controls playsInline preload="metadata" className="post-media" />
        )}

        {mediaItems.length > 1 && (
          <div className="media-grid" aria-label="Post media gallery">
            {mediaItems.map((item) => (
              <div key={item.key} className={`media-tile ${item.kind}`}>
                {item.kind === 'video' ? (
                  <video src={item.src} controls playsInline preload="metadata" />
                ) : (
                  <img src={item.src} alt="post media" loading="lazy" decoding="async" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="card-actions refined-card-actions">
        <button className={`btn btn-ghost post-action ${liked ? 'active' : ''}`} type="button" onClick={handleLike} aria-pressed={liked}>
          <Icon name={liked ? 'heartFill' : 'heart'} size={16} />
          <span>Like {likeCount}</span>
        </button>
        <button className={`btn btn-ghost post-action ${commentOpen ? 'active' : ''}`} type="button" onClick={() => setCommentOpen((v) => !v)} aria-pressed={commentOpen}>
          <Icon name="chat" size={16} />
          <span>Comment {commentCount}</span>
        </button>
        <button className={`btn btn-ghost post-action ${bookmarked ? 'active' : ''}`} type="button" onClick={() => setBookmarked((v) => !v)}>
          <Icon name={bookmarked ? 'bookmarkFill' : 'bookmark'} size={16} />
          <span>Save</span>
        </button>
        <button className="btn btn-ghost post-action" type="button" onClick={handleShare}>
          <Icon name="share" size={16} />
          <span>Share</span>
        </button>
      </footer>

      {commentOpen && (
        <section className="post-comments-panel">
          <div className="post-comments-head">
            <strong>Comments</strong>
            <button type="button" className="mini-chip btn-animated" onClick={() => setCommentOpen(false)}>Close</button>
          </div>

          <form className="post-comment-form" onSubmit={handleSubmitComment}>
            <input
              className="text-input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
            />
            <button type="submit" className="btn btn-primary btn-animated" disabled={!commentText.trim() || busy}>
              Send
            </button>
          </form>

          <div className="post-comment-list">
            {comments.length === 0 && <div className="empty-state compact-empty">No comments yet.</div>}
            {comments.map((comment) => (
              <article key={comment.id} className="post-comment-item">
                <div>
                  <strong>@{comment.username || 'You'}</strong>
                  <p>{comment.text}</p>
                </div>
                <span>{comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}</span>
              </article>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}

export default memo(PostCard)
