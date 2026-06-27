import React, { useEffect, useMemo, useState } from 'react'
import { fetchMusic, fullUrl, toggleTrackLike } from '../services/api'
import { useMusicPlayer } from '../context/MusicPlayerContext'
import Icon from '../components/Icon'

const MUSIC_TABS = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'loved', label: 'Loved songs' },
  { id: 'explore', label: 'All songs' },
]

function formatTrackArtist(track) {
  return track?.artist || track?.user?.username || 'Unknown artist'
}

function formatShortDate(value) {
  if (!value) return 'Recently added'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently added'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function TrackTile({ track, active, index, onPlay, onToggleLike, compact = false }) {
  const cover = track?.cover ? fullUrl(track.cover) : null
  return (
    <article className={`spotify-track ${active ? 'active' : ''} ${compact ? 'compact' : ''}`}>
      <button type="button" className="spotify-track-main" onClick={() => onPlay(track)} aria-label={`Play ${track.title || 'track'}`}>
        <div className="spotify-track-index">{active ? '▶' : index + 1}</div>
        <div className="spotify-track-cover">{cover ? <img src={cover} alt="" /> : <div>♪</div>}</div>
        <div className="spotify-track-meta">
          <strong>{track.title || 'Untitled'}</strong>
          <span>{formatTrackArtist(track)}</span>
        </div>
      </button>
      <button
        type="button"
        className={`spotify-track-like ${track.liked ? 'active' : ''}`}
        onClick={() => onToggleLike(track)}
        aria-label={track.liked ? `Remove ${track.title || 'track'} from liked songs` : `Add ${track.title || 'track'} to liked songs`}
      >
        <Icon name={track.liked ? 'heartFill' : 'heart'} size={16} />
      </button>
    </article>
  )
}

function PlaylistCard({ playlist, active, onSelect }) {
  return (
    <button type="button" className={`spotify-playlist-card ${active ? 'active' : ''}`} onClick={() => onSelect(playlist.id)}>
      <div className="spotify-playlist-art">
        {playlist.artwork.length > 0 ? (
          playlist.artwork.slice(0, 4).map((src, index) => <img key={`${playlist.id}-${index}`} src={src} alt="" />)
        ) : (
          <div className="playlist-placeholder"><Icon name="music" size={20} /></div>
        )}
      </div>
      <div className="spotify-playlist-copy">
        <strong>{playlist.name}</strong>
        <span>{playlist.description}</span>
      </div>
      <div className="spotify-playlist-foot">
        <span>{playlist.trackCount} songs</span>
        <span>{playlist.subtitle}</span>
      </div>
    </button>
  )
}

export default function Music() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('playlists')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('')
  const {
    tracks,
    setTracks,
    currentTrack,
    currentTrackId,
    playTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    volume,
    muted,
    setPlayerVolume,
    repeat,
    setRepeat,
    formatTime,
    currentTime,
    duration,
    seekRatio,
  } = useMusicPlayer()

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchMusic()
        if (!alive) return
        setTracks(Array.isArray(data) ? data : [])
      } catch {
        if (alive) setError('Could not load your music library right now.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    const refresh = () => load()
    window.addEventListener('connect-content-updated', refresh)
    return () => {
      alive = false
      window.removeEventListener('connect-content-updated', refresh)
    }
  }, [setTracks])

  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tracks
    return tracks.filter((track) => `${track.title || ''} ${formatTrackArtist(track)}`.toLowerCase().includes(q))
  }, [tracks, query])

  const likedTracks = useMemo(() => filteredTracks.filter((track) => track.liked), [filteredTracks])

  const playlists = useMemo(() => {
    const byArtist = new Map()
    filteredTracks.forEach((track) => {
      const artist = formatTrackArtist(track)
      const bucket = byArtist.get(artist) || []
      bucket.push(track)
      byArtist.set(artist, bucket)
    })

    const artistPick = Array.from(byArtist.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 1)
      .map(([artist, items]) => ({
        id: `artist-${artist}`,
        name: `${artist} mix`,
        description: `A quick mix of ${artist}.`,
        subtitle: `${items.length} tracks`,
        tracks: items.slice(0, 12),
      }))

    const recent = [...filteredTracks]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 12)

    const liked = filteredTracks.filter((track) => track.liked)

    return [
      {
        id: 'liked-songs',
        name: 'Liked songs',
        description: 'Your loved tracks in one place.',
        subtitle: 'Hearted',
        tracks: liked,
        artwork: liked.slice(0, 4).map((track) => track.cover).filter(Boolean),
      },
      {
        id: 'recently-added',
        name: 'Recently added',
        description: 'The newest songs in your library.',
        subtitle: 'Fresh',
        tracks: recent,
        artwork: recent.slice(0, 4).map((track) => track.cover).filter(Boolean),
      },
      {
        id: 'artist-mix',
        name: 'Artist mix',
        description: 'Grouped from the most active artist.',
        subtitle: 'Mix',
        tracks: artistPick[0]?.tracks || [],
        artwork: artistPick[0]?.tracks.slice(0, 4).map((track) => track.cover).filter(Boolean) || [],
      },
    ].map((playlist) => ({
      ...playlist,
      trackCount: playlist.tracks.length,
      artwork: playlist.artwork || playlist.tracks.slice(0, 4).map((track) => track.cover).filter(Boolean),
    }))
  }, [filteredTracks])

  useEffect(() => {
    if (!playlists.length) {
      setSelectedPlaylistId('')
      return
    }
    const fallbackId = playlists[0].id
    if (!selectedPlaylistId || !playlists.some((playlist) => playlist.id === selectedPlaylistId)) {
      setSelectedPlaylistId(fallbackId)
    }
  }, [playlists, selectedPlaylistId])

  const activePlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId) || playlists[0] || null
  const exploreTracks = filteredTracks
  const currentTrackList = tab === 'playlists'
    ? activePlaylist?.tracks || []
    : tab === 'loved'
      ? likedTracks
      : exploreTracks

  const selected = currentTrack || currentTrackList[0] || tracks[0] || null
  const currentLabel = useMemo(() => {
    if (!currentTrack) return 'Nothing playing'
    return currentTrack.title || 'Untitled track'
  }, [currentTrack])

  const pct = duration ? Math.min(100, (currentTime / duration) * 100) : 0

  const handleToggleLike = async (track) => {
    try {
      const result = await toggleTrackLike(track.id)
      if (typeof result?.liked === 'boolean') {
        setTracks((prev) => prev.map((item) => (String(item.id) === String(track.id) ? { ...item, liked: result.liked } : item)))
      }
    } catch (error) {
      console.error(error)
    }
  }

  const renderList = (items, emptyText) => {
    if (loading) return <div className="empty-state">Loading tracks…</div>
    if (error) return <div className="empty-state">{error}</div>
    if (items.length === 0) return <div className="empty-state">{emptyText}</div>
    return items.map((track, index) => (
      <TrackTile
        key={track.id}
        track={track}
        index={index}
        active={currentTrackId === track.id}
        onPlay={playTrack}
        onToggleLike={handleToggleLike}
      />
    ))
  }

  return (
    <div className="page-shell music-page page-fade-in spotify-shell">
      <section className="music-hero surface spotify-hero">
        <div className="music-hero-copy">
          <div className="eyebrow"><Icon name="music" size={16} /> Your Library</div>
          <h1>Music</h1>
          <p>A Spotify-style library with playlists, loved songs, and a full browse view for every track.</p>
        </div>
        <div className="music-hero-card spotify-hero-card">
          <span>Library</span>
          <strong>{tracks.length}</strong>
          <small>{currentTrack ? currentLabel : 'No track selected'}</small>
        </div>
      </section>

      <div className="spotify-layout">
        <aside className="surface spotify-sidebar">
          <div className="spotify-sidebar-head">
            <div>
              <div className="eyebrow">Collection</div>
              <strong>Browse music</strong>
            </div>
            <button type="button" className={`mini-chip btn-animated ${repeat !== 'off' ? 'active' : ''}`} onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}>
              {repeat === 'one' ? 'Repeat 1' : repeat === 'all' ? 'Repeat all' : 'Repeat off'}
            </button>
          </div>

          <div className="spotify-tab-row" role="tablist" aria-label="Music library tabs">
            {MUSIC_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`spotify-tab btn-animated ${tab === item.id ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
                role="tab"
                aria-selected={tab === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="spotify-search" aria-label="Search music">
            <Icon name="search" size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search songs, artists" />
          </label>

          {tab === 'playlists' && (
            <div className="spotify-section">
              <div className="spotify-section-head">
                <strong>Playlists</strong>
                <span className="mini-chip">{playlists.length}</span>
              </div>
              <div className="spotify-playlist-grid" aria-busy={loading} aria-live="polite">
                {playlists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    active={playlist.id === activePlaylist?.id}
                    onSelect={setSelectedPlaylistId}
                  />
                ))}
              </div>
              <div className="spotify-section">
                <div className="spotify-section-head">
                  <strong>{activePlaylist?.name || 'Playlist'}</strong>
                  <span className="mini-chip">{activePlaylist?.trackCount || 0}</span>
                </div>
                <div className="spotify-library-list" aria-busy={loading} aria-live="polite">
                  {renderList(activePlaylist?.tracks || [], 'No tracks in this playlist yet.')}
                </div>
              </div>
            </div>
          )}

          {tab === 'loved' && (
            <div className="spotify-section">
              <div className="spotify-section-head">
                <strong>Loved songs</strong>
                <span className="mini-chip">{likedTracks.length}</span>
              </div>
              <div className="spotify-library-list" aria-busy={loading} aria-live="polite">
                {renderList(likedTracks, 'Like songs to save them here.')}
              </div>
            </div>
          )}

          {tab === 'explore' && (
            <div className="spotify-section">
              <div className="spotify-section-head">
                <strong>All songs</strong>
                <span className="mini-chip">{exploreTracks.length}</span>
              </div>
              <div className="spotify-library-list" aria-busy={loading} aria-live="polite">
                {renderList(exploreTracks, 'No tracks match that search.')}
              </div>
            </div>
          )}
        </aside>

        <section className="surface spotify-now-playing spotify-player-main">
          <div className="spotify-now-header">
            <div className="eyebrow">Now playing</div>
            <span className="mini-chip">{isPlaying ? 'Playing' : 'Paused'}</span>
          </div>
          <div className="music-now-art spotify-now-art">
            {selected?.cover ? <img src={fullUrl(selected.cover)} alt="" /> : <div className="cover-placeholder">♪</div>}
          </div>
          <div className="music-now-copy">
            <h2>{selected?.title || 'Choose a track'}</h2>
            <p>{selected ? `by ${formatTrackArtist(selected)}` : 'Pick a song from the tabs to start playback.'}</p>
            {selected && (
              <button type="button" className={`btn btn-chip btn-animated music-like-chip ${selected.liked ? 'active' : ''}`} onClick={() => handleToggleLike(selected)}>
                <Icon name={selected.liked ? 'heartFill' : 'heart'} size={16} />
                <span>{selected.liked ? 'Loved' : 'Love song'}</span>
              </button>
            )}
          </div>

          <div className="spotify-transport">
            <button type="button" className="btn btn-ghost btn-animated" onClick={prevTrack}>Previous</button>
            <button type="button" className="btn btn-primary btn-animated" onClick={togglePlay} disabled={!currentTrack}>{isPlaying ? 'Pause' : 'Play'}</button>
            <button type="button" className="btn btn-ghost btn-animated" onClick={nextTrack}>Next</button>
          </div>

          <div className="spotify-seek">
            <span>{formatTime(currentTime)}</span>
            <button type="button" className="timeline-track" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const ratio = (e.clientX - rect.left) / rect.width; seekRatio(ratio) }} aria-label="Seek track">
              <span style={{ width: `${pct}%` }} />
            </button>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="spotify-controls-row">
            <div className="spotify-volume-block">
              <Icon name={muted || volume === 0 ? 'volumeMute' : 'volume'} size={16} />
              <input className="volume-slider" type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} onChange={(e) => setPlayerVolume(e.target.value)} aria-label="Volume" />
            </div>
            <button type="button" className="mini-chip btn-animated" onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}>
              {repeat === 'one' ? '1' : '↻'}
            </button>
          </div>
        </section>

        <aside className="surface spotify-queue">
          <div className="spotify-sidebar-head">
            <div>
              <div className="eyebrow">Up next</div>
              <strong>{tab === 'playlists' ? 'Playlist queue' : tab === 'loved' ? 'Loved queue' : 'Browse queue'}</strong>
            </div>
            <span className="mini-chip">{currentTrackList.length} tracks</span>
          </div>
          <div className="spotify-queue-list">
            {currentTrackList.slice(0, 8).map((track, index) => (
              <button key={`${track.id}-queue`} type="button" className={`spotify-queue-item ${currentTrackId === track.id ? 'active' : ''}`} onClick={() => playTrack(track)}>
                <span>{index + 1}</span>
                <div>
                  <strong>{track.title || 'Untitled'}</strong>
                  <small>{formatTrackArtist(track)}</small>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
