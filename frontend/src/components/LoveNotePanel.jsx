import React, { useEffect } from 'react'
import Icon from './Icon'

const poem = [
  'Z, you are the quiet in a world that moves too fast,',
  'the soft light that makes my heart feel at ease.',
  'In your laughter, I find a reason to linger;',
  'in your kindness, a place where love can stay.',
  'No grand speech is needed for what I feel—',
  'just the simple truth that loving you feels gentle,',
  'and every day with you feels a little more like home.',
].join('\n')

export default function LoveNotePanel({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop love-note-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-card love-note-panel"
        role="dialog"
        aria-modal="true"
        aria-label="A note for Z"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close btn-animated" onClick={onClose} aria-label="Close note">
          <Icon name="close" />
        </button>

        <div className="love-note-header">
          <div className="eyebrow"><Icon name="spark" size={16} /> For My Dear Z</div>
          <h2>For My Dear Z</h2>
          <p>A quiet note, wrapped in a small poem.</p>
        </div>

        <div className="love-note-card">
          {poem.split('\n').map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>
    </div>
  )
}
