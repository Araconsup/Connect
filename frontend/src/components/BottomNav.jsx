import React, { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Icon from './Icon'
import LoveNotePanel from './LoveNotePanel'

const items = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/reels', icon: 'reels', label: 'Reels' },
  { to: '/upload', icon: 'upload', label: 'Create' },
  { to: '/chat', icon: 'chat', label: 'Chat' },
  { to: '/music', icon: 'music', label: 'Music' },
]

export default function BottomNav() {
  const [username, setUsername] = useState(localStorage.getItem('username') || 'guest')
  const [noteOpen, setNoteOpen] = useState(false)

  useEffect(() => {
    const sync = () => setUsername(localStorage.getItem('username') || 'guest')
    window.addEventListener('login', sync)
    window.addEventListener('logout', sync)
    window.addEventListener('connect-session-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('login', sync)
      window.removeEventListener('logout', sync)
      window.removeEventListener('connect-session-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return (
    <>
      <aside className="site-rail refined-site-rail" aria-label="Primary navigation">
        <div className="site-rail-top">
          <Link to="/" className="rail-brand" aria-label="Go to home">
            <span className="rail-brand-mark"><Icon name="spark" size={18} /></span>
            <span className="rail-brand-copy">
              <strong>Connect</strong>
              <small>simple studio</small>
            </span>
          </Link>

          <button type="button" className="btn btn-chip btn-animated rail-love-note" onClick={() => setNoteOpen(true)}>
            For My Dear Z
          </button>
        </div>

        <nav className="rail-links" aria-label="Main sections">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <Link className="rail-profile" to={`/profile/${username}`} aria-label="Open your profile">
          <span className="rail-profile-dot" />
          <div>
            <strong>@{username}</strong>
            <small>Signed in</small>
          </div>
        </Link>
      </aside>

      <nav className="mobile-dock refined-mobile-dock" aria-label="Primary navigation mobile">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `dock-link ${isActive ? 'active' : ''}`}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button type="button" className="dock-link dock-love" onClick={() => setNoteOpen(true)}>
          <Icon name="spark" />
          <span>Z</span>
        </button>
      </nav>

      <LoveNotePanel open={noteOpen} onClose={() => setNoteOpen(false)} />
    </>
  )
}
