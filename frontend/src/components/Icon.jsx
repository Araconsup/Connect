import React from 'react'

export default function Icon({ name, size = 20 }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className: 'app-icon',
  }

  switch (name) {
    case 'home':
      return <svg {...props}><path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
    case 'reels':
      return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v10M16 7v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    case 'upload':
      return <svg {...props}><path d="M12 3v12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><rect x="3" y="15" width="18" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/></svg>
    case 'chat':
      return <svg {...props}><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
    case 'music':
      return <svg {...props}><path d="M9 17V5l10-2v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="18" r="2" stroke="currentColor" strokeWidth="1.4"/></svg>
    case 'profile':
      return <svg {...props}><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    case 'spark':
      return <svg {...props}><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
    case 'play':
      return <svg {...props}><path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor"/></svg>
    case 'pause':
      return <svg {...props}><path d="M7 5.5h3.5v13H7v-13zm6.5 0H17v13h-3.5v-13z" fill="currentColor"/></svg>
    case 'prev':
      return <svg {...props}><path d="M6 5.5v13h2.8V13l9 5.5V5.5l-9 5.5v-5.5H6z" fill="currentColor"/></svg>
    case 'next':
      return <svg {...props}><path d="M18 5.5v13h-2.8V13l-9 5.5V5.5l9 5.5v-5.5H18z" fill="currentColor"/></svg>
    case 'volume':
      return <svg {...props}><path d="M11 5.5 7.2 9H4v6h3.2L11 18.5v-13z" fill="currentColor"/><path d="M15.2 8.1a4.8 4.8 0 0 1 0 7.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M17.5 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    case 'volumeMute':
      return <svg {...props}><path d="M11 5.5 7.2 9H4v6h3.2L11 18.5v-13z" fill="currentColor"/><path d="M16 9l4 4m0-4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
    case 'search':
      return <svg {...props}><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    case 'share':
      return <svg {...props}><path d="M5 12l14-8-4 8 4 8-14-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
    case 'bookmark':
      return <svg {...props}><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
    case 'bookmarkFill':
      return <svg {...props}><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1z" fill="currentColor"/></svg>
    case 'heart':
      return <svg {...props}><path d="M12 20s-7-4.4-8.8-9.1C1.7 7.1 3.7 4 7.2 4c1.8 0 3.3.9 4.8 2.6C13.5 4.9 15 4 16.8 4c3.5 0 5.5 3.1 4 6.9C19 15.6 12 20 12 20z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
    case 'heartFill':
      return <svg {...props}><path d="M12 20s-7-4.4-8.8-9.1C1.7 7.1 3.7 4 7.2 4c1.8 0 3.3.9 4.8 2.6C13.5 4.9 15 4 16.8 4c3.5 0 5.5 3.1 4 6.9C19 15.6 12 20 12 20z" fill="currentColor"/></svg>
    case 'send':
      return <svg {...props}><path d="M4 11.5 20 4l-5.5 16-2.6-6.4L4 11.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
    case 'close':
      return <svg {...props}><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
    case 'more':
      return <svg {...props}><circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/></svg>
    case 'edit':
      return <svg {...props}><path d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M13 7l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    case 'check':
      return <svg {...props}><path d="M5 12.5 9.2 17 19 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    case 'copy':
      return <svg {...props}><rect x="8" y="8" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/><rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/></svg>
    case 'globe':
      return <svg {...props}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.4"/><path d="M3.8 12h16.4M12 3.5c2.5 2.2 3.8 5 3.8 8.5S14.5 18.8 12 20.5M12 3.5c-2.5 2.2-3.8 5-3.8 8.5S9.5 18.8 12 20.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
    case 'lock':
      return <svg {...props}><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M8 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    case 'eye':
      return <svg {...props}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.4"/></svg>
    case 'eyeOff':
      return <svg {...props}><path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M7.5 7.7C4.5 9.4 2.6 12 2.5 12c0 0 3.5 6 9.5 6 2 0 3.7-.5 5.1-1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    default:
      return null
  }
}
