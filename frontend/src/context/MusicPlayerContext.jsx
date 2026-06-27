import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { fullUrl } from '../services/api'
import { notify } from '../services/notify'

const MusicPlayerContext = createContext(null)
const toneCache = new Map()

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext)
  if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider')
  return ctx
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function hashSeed(value = '') {
  let h = 0
  for (let i = 0; i < String(value).length; i += 1) {
    h = (h << 5) - h + String(value).charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function buildToneWav(seed = 1, duration = 6) {
  const sampleRate = 44100
  const totalSamples = Math.floor(sampleRate * duration)
  const data = new Int16Array(totalSamples)
  const base = 160 + (seed % 280)
  const second = base * 1.5
  const third = base * 2
  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate
    const fade = Math.sin(Math.min(1, t / duration) * Math.PI)
    const env = 0.34 + 0.66 * fade
    const sample =
      Math.sin(2 * Math.PI * base * t) * 0.42 +
      Math.sin(2 * Math.PI * second * t * 0.5) * 0.25 +
      Math.sin(2 * Math.PI * third * t * 0.25) * 0.18
    data[i] = Math.max(-1, Math.min(1, sample * env)) * 32767
  }

  const buffer = new ArrayBuffer(44 + data.length * 2)
  const view = new DataView(buffer)

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + data.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, data.length * 2, true)

  let offset = 44
  for (let i = 0; i < data.length; i += 1) {
    view.setInt16(offset, data[i], true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

function ensureToneUrl(track) {
  if (!track) return ''
  const direct = track.file || track.src || track.url
  if (direct) return fullUrl(direct)
  const key = String(track.id || track.title || track.artist || 'tone')
  if (!toneCache.has(key)) {
    const blob = buildToneWav(hashSeed(key) + (track.toneSeed || 0), Math.max(4, Number(track.duration || 180) / 48))
    toneCache.set(key, URL.createObjectURL(blob))
  }
  return toneCache.get(key)
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = String(Math.floor(seconds % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export function MusicPlayerProvider({ children }) {
  const audioRef = useRef(null)
  const [tracks, setTracks] = useState([])
  const [currentTrackId, setCurrentTrackId] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.9)
  const [muted, setMuted] = useState(false)
  const [repeat, setRepeat] = useState('off')
  const autoplayNextRef = useRef(false)

  const currentIndex = useMemo(() => tracks.findIndex((track) => track?.id === currentTrackId), [tracks, currentTrackId])
  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = muted ? 0 : volume
  }, [volume, muted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
      if (!Number.isFinite(audio.currentTime)) audio.currentTime = 0
    }
    const onTime = () => setCurrentTime(audio.currentTime || 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      if (repeat === 'one' && currentTrack) {
        autoplayNextRef.current = true
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }
      if (repeat === 'all' && tracks.length) {
        const idx = currentIndex >= 0 ? currentIndex : 0
        const next = tracks[(idx + 1) % tracks.length]
        if (next) {
          autoplayNextRef.current = true
          setCurrentTrackId(next.id)
        }
        return
      }
      setIsPlaying(false)
    }

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('durationchange', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('durationchange', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [currentTrack, repeat, currentIndex, tracks])
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!currentTrack) {
      audio.removeAttribute('src')
      audio.load()
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      return
    }

    const src = ensureToneUrl(currentTrack)
    if (audio.src !== src) {
      audio.src = src
      audio.load()
      setCurrentTime(0)
      setDuration(0)
    }

    if (autoplayNextRef.current) {
      autoplayNextRef.current = false
      audio.play().catch(() => {
        setIsPlaying(false)
        notify('Tap play to start audio.', 'info')
      })
    }
  }, [currentTrack])
  const playTrack = (track) => {
    if (!track) return
    const id = track.id
    setTracks((prev) => (prev.some((item) => item?.id === id) ? prev : [track, ...prev]))
    if (currentTrackId === id && audioRef.current) {
      if (audioRef.current.paused) audioRef.current.play().catch(() => {})
      else audioRef.current.pause()
      return
    }
    autoplayNextRef.current = true
    setCurrentTrackId(id)
  }

  const play = () => audioRef.current?.play().catch(() => {})
  const pause = () => audioRef.current?.pause()
  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) play()
    else pause()
  }

  const seekTo = (nextTime) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return
    const value = clamp(nextTime, 0, audio.duration)
    audio.currentTime = value
    setCurrentTime(value)
  }

  const seekRatio = (ratio) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return
    seekTo(audio.duration * clamp(ratio, 0, 1))
  }

  const nextTrack = () => {
    if (!tracks.length) return
    const idx = currentIndex >= 0 ? currentIndex : 0
    const next = tracks[(idx + 1) % tracks.length]
    if (next) {
      autoplayNextRef.current = true
      setCurrentTrackId(next.id)
    }
  }

  const prevTrack = () => {
    if (!tracks.length) return
    if (audioRef.current && audioRef.current.currentTime > 5) {
      audioRef.current.currentTime = 0
      return
    }
    const idx = currentIndex >= 0 ? currentIndex : 0
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length]
    if (prev) {
      autoplayNextRef.current = true
      setCurrentTrackId(prev.id)
    }
  }

  const toggleMute = () => setMuted((v) => !v)
  const setPlayerVolume = (nextVolume) => {
    const v = clamp(Number(nextVolume), 0, 1)
    setVolume(v)
    setMuted(v === 0)
    if (audioRef.current) audioRef.current.volume = v
  }

  const value = {
    tracks,
    setTracks,
    currentTrack,
    currentTrackId,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    repeat,
    setRepeat,
    playTrack,
    togglePlay,
    play,
    pause,
    nextTrack,
    prevTrack,
    seekTo,
    seekRatio,
    toggleMute,
    setPlayerVolume,
    formatTime,
  }

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" className="sr-only" aria-hidden="true" />
    </MusicPlayerContext.Provider>
  )
}
