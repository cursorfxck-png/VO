import { useState, useEffect, useRef } from 'react'
import './MusicPlayer.css'

export default function MusicPlayer({ song, onClose }) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const playerRef = useRef(null)
  const progressIntervalRef = useRef(null)

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }

    window.onYouTubeIframeAPIReady = () => {
      initPlayer()
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [song])

  const initPlayer = () => {
    if (playerRef.current) {
      playerRef.current.destroy()
    }

    playerRef.current = new window.YT.Player('youtube-player', {
      height: '0',
      width: '0',
      videoId: song.videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
      },
    })
  }

  const onPlayerReady = (event) => {
    setDuration(event.target.getDuration())
    event.target.playVideo()
    startProgressTracking()
  }

  const onPlayerStateChange = (event) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true)
      startProgressTracking()
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false)
      stopProgressTracking()
    } else if (event.data === window.YT.PlayerState.ENDED) {
      setIsPlaying(false)
      stopProgressTracking()
      if (isRepeat) {
        playerRef.current.seekTo(0)
        playerRef.current.playVideo()
      }
    }
  }

  const startProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime())
      }
    }, 1000)
  }

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
  }

  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo()
      } else {
        playerRef.current.playVideo()
      }
    }
  }

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration
    if (playerRef.current) {
      playerRef.current.seekTo(newTime)
      setCurrentTime(newTime)
    }
  }

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume * 100)
    }
    if (newVolume === 0) {
      setIsMuted(true)
    } else {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute()
        playerRef.current.setVolume(volume * 100)
        setIsMuted(false)
      } else {
        playerRef.current.mute()
        setIsMuted(true)
      }
    }
  }

  const skipForward = () => {
    if (playerRef.current) {
      const newTime = Math.min(currentTime + 10, duration)
      playerRef.current.seekTo(newTime)
      setCurrentTime(newTime)
    }
  }

  const skipBackward = () => {
    if (playerRef.current) {
      const newTime = Math.max(currentTime - 10, 0)
      playerRef.current.seekTo(newTime)
      setCurrentTime(newTime)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <div id="youtube-player"></div>
      
      {/* Minimized Player */}
      {isMinimized && (
        <div className="minimized-player">
          <div className="minimized-content" onClick={() => setIsMinimized(false)}>
            <img src={song.thumbnail} alt={song.title} className="minimized-thumbnail" />
            <div className="minimized-info">
              <p className="minimized-title">{song.title}</p>
              <p className="minimized-artist">{song.artist}</p>
            </div>
          </div>
          <div className="minimized-controls">
            <button className="minimized-play-btn" onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}>
              <svg width="40" height="40" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <style>{`
                    .wrap { cursor: pointer; transform-origin: 50% 50%; transition: transform .28s cubic-bezier(.28,1,.28,1), filter .28s; }
                    .wrap:hover { transform: scale(1.12); filter: drop-shadow(0 0 18px rgba(255,255,255,0.95)); }
                    .bg { fill: rgba(255,255,255,0.08); stroke: rgba(255,255,255,0.25); stroke-width: 2.5; backdrop-filter: blur(18px); }
                    .ring { fill: none; stroke: #fff; stroke-width: 6.5; stroke-linecap: round; opacity: .9; stroke-dasharray: 360; stroke-dashoffset: 0; transition: stroke-dashoffset .45s ease, opacity .35s ease; }
                    .wrap:hover .ring { stroke-dashoffset: -55; opacity: 1; }
                    .glow { fill: none; stroke: #fff; stroke-width: 1.2; opacity: .12; transition: transform .4s ease, opacity .4s ease; transform-origin: 50% 50%; }
                    .wrap:hover .glow { transform: scale(1.25); opacity: .22; }
                    .play { fill: #fff; transition: transform .28s cubic-bezier(.28,1,.28,1), opacity .25s; transform-origin: 50% 50%; opacity: .92; }
                    .wrap:hover .play { transform: scale(1.12); opacity: 1; }
                    @keyframes pulse { 0% { opacity: .14; transform: scale(1); } 50% { opacity: .22; transform: scale(1.15); } 100% { opacity: .14; transform: scale(1); } }
                    .pulse { animation: pulse 2.4s infinite ease-in-out; }
                  `}</style>
                </defs>
                <g className="wrap">
                  <circle className="glow pulse" cx="75" cy="75" r="63"/>
                  <circle className="bg" cx="75" cy="75" r="56"/>
                  <circle className="ring" cx="75" cy="75" r="52"/>
                  {isPlaying ? (
                    <>
                      <rect className="play" x="55" y="50" width="12" height="50" rx="2"/>
                      <rect className="play" x="83" y="50" width="12" height="50" rx="2"/>
                    </>
                  ) : (
                    <polygon className="play" points="63,50 105,75 63,100" />
                  )}
                </g>
              </svg>
            </button>
            <button className="minimized-close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}>
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      )}

      {/* Full Player */}
      {!isMinimized && (
        <div className="music-player-overlay">
          <div className="music-player-container">
            <button className="close-player" onClick={() => setIsMinimized(true)}>
              <i className="ri-arrow-down-line"></i>
            </button>

          <div className="player-artwork">
            <img src={song.thumbnail} alt={song.title} />
          </div>

          <div className="player-info">
            <h2 className="player-title">{song.title}</h2>
            <p className="player-artist">{song.artist}</p>
          </div>

          <div className="player-progress">
            <div className="progress-bar" onClick={handleSeek}>
              <div 
                className="progress-fill"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              ></div>
            </div>
            <div className="progress-time">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-controls">
            <button 
              className={`control-button ${isShuffle ? 'active' : ''}`}
              onClick={() => setIsShuffle(!isShuffle)}
            >
              <i className="ri-shuffle-line"></i>
            </button>
            
            <button className="control-button" onClick={skipBackward}>
              <i className="ri-skip-back-fill"></i>
            </button>
            
            <button className="control-button play-pause" onClick={togglePlayPause}>
              <i className={isPlaying ? "ri-pause-fill" : "ri-play-fill"}></i>
            </button>
            
            <button className="control-button" onClick={skipForward}>
              <i className="ri-skip-forward-fill"></i>
            </button>
            
            <button 
              className={`control-button ${isRepeat ? 'active' : ''}`}
              onClick={() => setIsRepeat(!isRepeat)}
            >
              <i className="ri-repeat-line"></i>
            </button>
          </div>

          <div className="player-volume">
            <button className="volume-button" onClick={toggleMute}>
              <i className={isMuted ? "ri-volume-mute-line" : "ri-volume-up-line"}></i>
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="volume-slider"
            />
          </div>

          {/* Audio Enhancer Badge */}
          <div className="audio-enhancer-badge">
            <svg width="32" height="32" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="silver" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffffff"/>
                  <stop offset="40%" stopColor="#d0d0d0"/>
                  <stop offset="100%" stopColor="#f3f3f3"/>
                </linearGradient>
                <style>{`
                  .wrap { cursor: pointer; transform-origin: 50% 50%; transition: transform .28s ease, filter .28s ease; }
                  .wrap:hover { transform: scale(1.1); filter: drop-shadow(0 0 16px rgba(0,0,0,0.35)); }
                  .bubble { fill: url(#silver); stroke: #000; stroke-width: 3; transition: transform .25s ease; }
                  .wrap:hover .bubble { transform: translateY(-3px); }
                  .glow { fill: none; stroke: #000; stroke-width: 2; opacity: .15; transition: transform .35s ease, opacity .35s ease; transform-origin: 50% 50%; }
                  .wrap:hover .glow { transform: scale(1.18); opacity: .28; }
                  .shine { stroke: #000; stroke-width: 2; fill: none; stroke-dasharray: 60; animation: wave 2.2s linear infinite; opacity: .75; }
                  @keyframes wave { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -60; } }
                  .line { stroke: #000; stroke-width: 5; stroke-linecap: round; }
                `}</style>
              </defs>
              <g className="wrap">
                <circle className="glow" cx="75" cy="75" r="60"/>
                <path className="bubble" d="M40 40h70a18 18 0 0 1 18 18v30a18 18 0 0 1 -18 18h-40l-18 14v-14h-12a18 18 0 0 1 -18 -18v-30a18 18 0 0 1 18 -18z"/>
                <path className="shine" d="M48 48 H100"/>
                <line className="line" x1="55" y1="75" x2="100" y2="75"/>
                <line className="line" x1="55" y1="95" x2="85" y2="95"/>
              </g>
            </svg>
            <div className="enhancer-text">
              <span className="enhancer-title">Audio Enhancer V23</span>
              <span className="enhancer-author">by Prakhar Vardhan</span>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  )
}