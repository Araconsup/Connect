import React from 'react'
import { Link } from 'react-router-dom'
import { avatarUrl } from '../services/assets'
import Icon from './Icon'

export default function ProfileModal({ user, onClose }) {
  if (!user) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card profile-modal-card" role="dialog" aria-modal="true" aria-label={`Profile of ${user.username}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close btn-animated" type="button" onClick={onClose} aria-label="Close profile">
          <Icon name="close" />
        </button>

        <div className="profile-modal-hero">
          <img src={avatarUrl(user)} alt="" className="profile-modal-avatar" />
          <div>
            <div className="eyebrow"><Icon name="profile" size={16} /> Profile preview</div>
            <h3>@{user.username}</h3>
            <p>{user.bio || 'A profile with quiet elegance.'}</p>
          </div>
        </div>

        <div className="profile-modal-grid">
          <div><span>Location</span><strong>{user.location || 'Anywhere'}</strong></div>
          <div><span>Pronouns</span><strong>{user.pronouns || '—'}</strong></div>
          <div><span>Website</span><strong>{user.website || '—'}</strong></div>
          <div><span>Joined</span><strong>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}</strong></div>
        </div>

        <div className="profile-modal-actions">
          <Link className="btn btn-primary btn-animated" to={`/profile/${user.username}`} onClick={onClose}>Open profile</Link>
          <button className="btn btn-ghost btn-animated" type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/profile/${user.username}`)}>Copy link</button>
        </div>
      </div>
    </div>
  )
}
