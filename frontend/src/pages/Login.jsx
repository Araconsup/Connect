import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { login } from '../services/api'
import { notify } from '../services/notify'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const nav = useNavigate()

  const heroFacts = useMemo(() => ['Cleaner login flow', 'Direct API connection', 'Soft motion, simpler layout'], [])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await login(username, password)
      if (res.success) {
        notify('Signed in', 'success')
        nav('/')
      } else {
        const message = typeof res.error === 'string' ? res.error : 'Login failed'
        setError(message)
        notify(message, 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell refined-auth-shell login-landing">
      <section className="auth-panel auth-hero refined-auth-hero hero-entrance">
        <div className="eyebrow"><Icon name="spark" size={16} /> Connect</div>
        <h1>A lighter, calmer way to sign in.</h1>
        <p>One clean panel for the whole app: feed, reels, chat, music, and profile tools.</p>

        <div className="hero-badges" aria-label="Highlights">
          {heroFacts.map((fact) => <span key={fact} className="hero-badge">{fact}</span>)}
        </div>
      </section>

      <form className="auth-panel auth-card refined-auth-card" onSubmit={submit}>
        <div className="brand-mark">C</div>
        <h2>Welcome back</h2>
        <p className="muted">Sign in to continue.</p>

        <label className="field-label" htmlFor="username">Username</label>
        <input id="username" className="text-input" autoComplete="username" inputMode="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />

        <label className="field-label" htmlFor="password">Password</label>
        <div className="input-with-action">
          <input id="password" className="text-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="button" className="input-action btn-animated" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
          </button>
        </div>

        <button className="btn btn-primary btn-full btn-animated" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="auth-hint">Use the same account that owns your feed, reels, and profile content.</div>
        {error && <div className="form-error" role="status">{error}</div>}
      </form>
    </div>
  )
}
