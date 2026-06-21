const DEFAULT_API_PORT = import.meta.env.VITE_API_PORT || '8000'

function resolveBrowserHostOrigin(port = DEFAULT_API_PORT) {
  if (typeof window === 'undefined' || !window.location) return `http://127.0.0.1:${port}`
  const { protocol, hostname, port: currentPort } = window.location
  const safeProtocol = protocol === 'https:' ? 'https:' : 'http:'
  const effectivePort = String(port || '').trim() || '8000'
  if (!hostname) return `http://127.0.0.1:${effectivePort}`
  if (currentPort && currentPort === effectivePort) return `${safeProtocol}//${hostname}:${currentPort}`
  if (currentPort === '80' || currentPort === '443') return `${safeProtocol}//${hostname}`
  return `${safeProtocol}//${hostname}:${effectivePort}`
}

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || resolveBrowserHostOrigin()

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function hashText(text = '') {
  let h = 0
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function pickPalette(seed) {
  const palettes = [
    ['#7dd3fc', '#a78bfa', '#0ea5e9'],
    ['#67e8f9', '#34d399', '#0f766e'],
    ['#fda4af', '#fb7185', '#be185d'],
    ['#fde68a', '#fb923c', '#ea580c'],
    ['#c4b5fd', '#818cf8', '#4338ca'],
    ['#86efac', '#4ade80', '#15803d'],
  ]
  return palettes[seed % palettes.length]
}

export function publicAsset(path) {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) return path
  if (path === '/default-avatar.svg' || path.startsWith('/icons/') || path.startsWith('/favicon') || path.startsWith('/manifest')) return path
  const origin = String(API_ORIGIN || '').replace(/\/+$/, '')
  if (path.startsWith('/')) return `${origin}${path}`
  return `${origin}/${path}`
}

export function svgDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function buildAvatarData(name = 'User') {
  const seed = hashText(name || 'user')
  const [a, b, c] = pickPalette(seed)
  const initials = String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || 'U'

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${a}" />
          <stop offset="55%" stop-color="${b}" />
          <stop offset="100%" stop-color="${c}" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="64" fill="url(#g)"/>
      <circle cx="128" cy="104" r="42" fill="white" fill-opacity="0.22"/>
      <path d="M50 214c20-43 51-64 78-64s58 21 78 64" fill="white" fill-opacity="0.18"/>
      <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle"
            font-family="Inter,Arial,sans-serif" font-size="72" font-weight="800" fill="white">${initials}</text>
    </svg>
  `)
}

export function buildCoverData(title = 'Connect', subtitle = 'studio') {
  const seed = hashText(`${title}-${subtitle}`)
  const [a, b, c] = pickPalette(seed)
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${a}" />
          <stop offset="50%" stop-color="${b}" />
          <stop offset="100%" stop-color="${c}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="20%" r="80%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="960" height="540" rx="54" fill="url(#bg)"/>
      <rect width="960" height="540" rx="54" fill="url(#glow)"/>
      <circle cx="730" cy="150" r="130" fill="rgba(255,255,255,0.12)"/>
      <circle cx="220" cy="380" r="170" fill="rgba(255,255,255,0.08)"/>
      <text x="64" y="408" font-family="Inter,Arial,sans-serif" font-size="68" font-weight="800" fill="white">${title}</text>
      <text x="64" y="458" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="600" fill="rgba(255,255,255,0.86)">${subtitle}</text>
    </svg>
  `)
}

export function avatarUrl(user) {
  const candidate = user?.avatar || user?.profile_pic || user?.profile_picture || user?.avatar_url || user?.image || user?.profile_image
  return publicAsset(candidate || buildAvatarData(user?.username || user?.name || 'User'))
}

export function coverUrl(item, fallbackTitle = 'Connect') {
  const candidate = item?.cover || item?.poster || item?.image || item?.thumbnail || item?.artwork
  return publicAsset(candidate || buildCoverData(item?.title || fallbackTitle, item?.artist || item?.username || 'studio'))
}
