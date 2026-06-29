import React, { useEffect, useState } from 'react'
import { setNotifyHandler } from '../services/notify'

export default function Notifications() {
  const [items, setItems] = useState([])

  useEffect(() => {
    setNotifyHandler((n) => {
      if (!n) return
      const id = Date.now() + Math.random()
      setItems((prev) => [...prev, { id, ...n }])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id))
      }, 3800)
    })
    return () => setNotifyHandler(null)
  }, [])

  return (
    <div className="toast-stack" aria-live="polite" aria-label="Notifications">
      {items.map((it) => (
        <div key={it.id} className={`toast toast-${it.type || 'info'}`}>
          <div className="toast-dot" />
          <p>{it.message}</p>
        </div>
      ))}
    </div>
  )
}
