import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createConnect, createPost, createReel, uploadMusic } from '../services/api'
import { formatFileSize, getMediaKind, pictureToObjectUrl, readAudioMetadata, revokeObjectUrl } from '../services/media'
import Icon from '../components/Icon'

function splitTags(value) {
  return String(value || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export default function Upload() {
  const [tab, setTab] = useState('file')
  const [file, setFile] = useState(null)
  const [tweet, setTweet] = useState('')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverBlob, setCoverBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [tags, setTags] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [status, setStatus] = useState(null)
  const [dropActive, setDropActive] = useState(false)
  const [publishMode, setPublishMode] = useState('auto')
  const fileRef = useRef(null)

  useEffect(() => () => revokeObjectUrl(coverPreview), [coverPreview])
  useEffect(() => () => revokeObjectUrl(previewUrl), [previewUrl])

  const kind = useMemo(() => getMediaKind(file), [file])
  const tagsList = useMemo(() => splitTags(tags), [tags])
  const isAudio = kind === 'audio'
  const isVisual = kind === 'image' || kind === 'video'

  const clearPreview = () => {
    revokeObjectUrl(previewUrl)
    revokeObjectUrl(coverPreview)
    setPreviewUrl(null)
    setCoverPreview(null)
    setCoverBlob(null)
  }

  const loadFile = async (picked) => {
    if (!picked) return
    setFile(picked)
    setStatus(null)
    clearPreview()
    setTitle('')
    setArtist('')

    if (picked.type.startsWith('audio/')) {
      const metadata = await readAudioMetadata(picked)
      setTitle(metadata.title || picked.name.replace(/\.[^/.]+$/, ''))
      setArtist(metadata.artist || '')
      if (metadata.picture) {
        const preview = pictureToObjectUrl(metadata.picture)
        if (preview) setCoverPreview(preview)
        if (metadata.picture?.data) {
          try {
            const byteArray = new Uint8Array(metadata.picture.data)
            setCoverBlob(new Blob([byteArray], { type: metadata.picture.format || 'image/jpeg' }))
          } catch (error) {}
        }
      }
      return
    }

    setTitle(picked.name.replace(/\.[^/.]+$/, ''))
    if (picked.type.startsWith('image/') || picked.type.startsWith('video/')) {
      const nextUrl = URL.createObjectURL(picked)
      setPreviewUrl(nextUrl)
    }
  }

  const onChangeFile = (e) => {
    const picked = e.target.files?.[0]
    if (picked) loadFile(picked)
  }

  const onDrop = async (e) => {
    e.preventDefault()
    setDropActive(false)
    const picked = e.dataTransfer.files?.[0]
    if (picked) await loadFile(picked)
  }

  const addTag = () => {
    const next = tagInput.trim()
    if (!next) return
    const merged = new Set([...tagsList, ...splitTags(next)])
    setTags(Array.from(merged).join(', '))
    setTagInput('')
  }

  const removeTag = (tag) => {
    setTags(tagsList.filter((t) => t !== tag).join(', '))
  }

  const resetAll = () => {
    setFile(null)
    setTitle('')
    setArtist('')
    setTags('')
    setTagInput('')
    setStatus(null)
    clearPreview()
    if (fileRef.current) fileRef.current.value = ''
  }

  const submitFile = async () => {
    if (!file) return
    const fd = new FormData()
    const detectedKind = file.type.split('/')[0]
    const effectiveMode = publishMode === 'auto'
      ? (detectedKind === 'video' ? 'reel' : detectedKind === 'image' ? 'post' : detectedKind === 'audio' ? 'music' : 'post')
      : publishMode

    try {
      setStatus('Uploading the full file...')
      const tagsValue = tagsList.join(', ')
      let successMessage = 'Uploaded.'
      if (effectiveMode === 'music' || detectedKind === 'audio') {
        fd.append('file', file)
        fd.append('title', title || file.name)
        if (artist) fd.append('artist', artist)
        if (coverBlob) fd.append('cover', coverBlob, 'cover.jpg')
        if (tagsValue) fd.append('tags', tagsValue)
        await uploadMusic(fd)
        successMessage = 'Music uploaded. Metadata applied.'
      } else if (effectiveMode === 'reel' || detectedKind === 'video') {
        fd.append('video', file)
        fd.append('caption', title || '')
        if (tagsValue) fd.append('tags', tagsValue)
        await createReel(fd)
        successMessage = 'Reel uploaded.'
      } else {
        fd.append('media', file)
        fd.append('caption', title || '')
        if (tagsValue) fd.append('tags', tagsValue)
        await createPost(fd)
        successMessage = 'Post uploaded.'
      }
      resetAll()
      setStatus(successMessage)
    } catch (e) {
      setStatus(e?.response?.status === 401 ? 'Upload failed: sign in again.' : 'Upload failed')
    }
  }

  const submitTweet = async () => {
    try {
      await createConnect({ text: tweet, tags: tagsList })
      setStatus('Posted')
      setTweet('')
    } catch (e) {
      setStatus(e?.response?.status === 401 ? 'Post failed: sign in again.' : 'Post failed')
    }
  }

  return (
    <div className="page-shell upload-shell page-fade-in">
      <section className="page-hero surface">
        <div className="hero-copy">
          <div className="eyebrow">Create</div>
          <h1>Create content and send it straight to the API.</h1>
          <p>Choose a file, let the app detect what it is, and auto-fill metadata before publishing.</p>
        </div>
        <div className="hero-note">Audio becomes music, video becomes reels, and images become posts.</div>
      </section>

      <div className="grid-two">
        <section
          className={`surface file-drop ${dropActive ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDropActive(true) }}
          onDragLeave={() => setDropActive(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Choose a file to upload"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click() }}
        >
          <input ref={fileRef} type="file" hidden onChange={onChangeFile} />
          <div className="drop-icon">+</div>
          <h3>Drop your file here</h3>
          <p>Or tap to choose from your device.</p>
          <button className="btn btn-primary btn-animated" type="button" onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}>Choose file</button>
          {file && <div className="file-meta">{file.name} · {formatFileSize(file.size)}</div>}
        </section>

        <section className="surface form-card">
          <div className="segment-switcher" role="tablist" aria-label="Upload mode">
            <button type="button" className={`btn btn-chip btn-animated ${tab === 'file' ? 'active' : ''}`} onClick={() => setTab('file')} aria-pressed={tab === 'file'}>File</button>
            <button type="button" className={`btn btn-chip btn-animated ${tab === 'tweet' ? 'active' : ''}`} onClick={() => setTab('tweet')} aria-pressed={tab === 'tweet'}>Text</button>
          </div>

          {tab === 'file' ? (
            <>
              {file && (
                <div className="upload-preview">
                  {isAudio && coverPreview ? (
                    <img src={coverPreview} alt="" className="cover-preview" />
                  ) : isVisual && previewUrl ? (
                    file.type.startsWith('image/') ? <img src={previewUrl} alt="" className="cover-preview" /> : <video src={previewUrl} controls className="cover-preview" />
                  ) : null}
                  <div>
                    <strong>{file.name}</strong>
                    <p className="muted">{kind.toUpperCase()} · {formatFileSize(file.size)}</p>
                  </div>
                </div>
              )}

              {isAudio && (
                <div className="grid-two compact-grid">
                  <div>
                    <label className="field-label" htmlFor="track-title">Title</label>
                    <input id="track-title" className="text-input" placeholder="Track title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="track-artist">Artist</label>
                    <input id="track-artist" className="text-input" placeholder="Artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
                  </div>
                </div>
              )}

              {!isAudio && (
                <>
                  <label className="field-label" htmlFor="caption-title">Caption / title</label>
                  <input id="caption-title" className="text-input" placeholder="Add a caption" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <label className="field-label" htmlFor="publish-mode">Publish mode</label>
                  <select id="publish-mode" className="text-input" value={publishMode} onChange={(e) => setPublishMode(e.target.value)}>
                    <option value="auto">Auto detect</option>
                    <option value="post">Post</option>
                    <option value="reel">Reel</option>
                    <option value="music">Music</option>
                  </select>
                </>
              )}

              <label className="field-label" htmlFor="tags">Tags</label>
              <div className="tag-input-row">
                <input id="tags" className="text-input" placeholder="Add tags, separated by commas" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>

              <div className="tag-row">
                {tagsList.map((tag) => (
                  <button key={tag} type="button" className="tag-chip tag-chip-button" onClick={() => removeTag(tag)}>
                    #{tag} <Icon name="close" size={12} />
                  </button>
                ))}
              </div>

              <div className="action-row">
                <button type="button" className="btn btn-primary btn-animated" onClick={submitFile} disabled={!file}>
                  Publish
                </button>
                <button type="button" className="btn btn-ghost btn-animated" onClick={resetAll}>
                  Clear
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="field-label" htmlFor="tweet">Text post</label>
              <textarea id="tweet" className="text-area" placeholder="Share a thought" value={tweet} onChange={(e) => setTweet(e.target.value)} />
              <label className="field-label" htmlFor="tweet-tags">Tags</label>
              <input id="tweet-tags" className="text-input" placeholder="Separate with commas" value={tags} onChange={(e) => setTags(e.target.value)} />
              <div className="action-row">
                <button type="button" className="btn btn-primary btn-animated" onClick={submitTweet} disabled={!tweet.trim()}>
                  Publish thought
                </button>
                <button type="button" className="btn btn-ghost btn-animated" onClick={() => setTweet('')}>
                  Clear
                </button>
              </div>
            </>
          )}

          {status && <div className="form-status">{status}</div>}
        </section>
      </div>
    </div>
  )
}
