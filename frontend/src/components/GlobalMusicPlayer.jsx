import React from 'react'
import { useLocation } from 'react-router-dom'
import Icon from './Icon'
import { useMusicPlayer } from '../context/MusicPlayerContext'
import { coverUrl } from '../services/assets'

export default function GlobalMusicPlayer() {
  const location = useLocation()
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    repeat,
    togglePlay,
    prevTrack,
    nextTrack,
    seekRatio,
    setPlayerVolume,
    toggleMute,
    setRepeat,
    formatTime,
  } = useMusicPlayer()

  const showPlayer = Boolean(currentTrack) && location.pathname !== '/music'
  if (!showPlayer) return null

  const pct = duration ? Math.min(100, (currentTime / duration) * 100) : 0
  const title = currentTrack?.title || 'No track selected'
  const artist = currentTrack?.artist || currentTrack?.user?.username || 'Music'
  const cover = coverUrl(currentTrack, title)

  const onSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seekRatio(ratio)
  }

  return (
    <footer className="global-player spotify-player" aria-label="Music player">
      <div className="global-player-left">
        <div className="global-player-art">
          <img src={cover} alt="" />
        </div>
        <div className="global-player-meta">
          <strong>{title}</strong>
          <span>{artist}</span>
        </div>
      </div>

      <div className="global-player-center">
        <div className="global-player-controls">
          <button type="button" className="icon-btn btn-animated" onClick={prevTrack} aria-label="Previous track"><Icon name="prev" /></button>
          <button type="button" className="play-btn btn-animated" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
            <Icon name={isPlaying ? 'pause' : 'play'} size={22} />
          </button>
          <button type="button" className="icon-btn btn-animated" onClick={nextTrack} aria-label="Next track"><Icon name="next" /></button>
        </div>
        <div className="global-player-timeline">
          <span>{formatTime(currentTime)}</span>
          <button type="button" className="timeline-track" onClick={onSeek} aria-label="Seek track">
            <span style={{ width: `${pct}%` }} />
          </button>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="global-player-right">
        <button type="button" className={`mini-chip btn-animated ${repeat !== 'off' ? 'active' : ''}`} onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}>
          {repeat === 'one' ? '1' : '↻'}
        </button>
        <button type="button" className="icon-btn btn-animated" onClick={toggleMute} aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}>
          <Icon name={muted || volume === 0 ? 'volumeMute' : 'volume'} />
        </button>
        <input className="volume-slider" type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} onChange={(e) => setPlayerVolume(e.target.value)} aria-label="Volume" />
      </div>
    </footer>
  )
}
