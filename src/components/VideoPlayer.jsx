import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react'
import './VideoPlayer.css'

export default function VideoPlayer({ src, onError, id }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const progressBarRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoAspectRatio, setVideoAspectRatio] = useState(null)
  const controlsTimeoutRef = useRef(null)

  // Track whether user manually paused so IntersectionObserver won't auto-resume
  const userPausedRef = useRef(false)
  // Prevent double-fire: onTouchEnd → synthetic onClick on mobile
  const touchGuardRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      if (video.videoWidth && video.videoHeight) {
        setVideoAspectRatio(`${video.videoWidth} / ${video.videoHeight}`)
      }
    }
    const handleTimeUpdate = () => !isDragging && setCurrentTime(video.currentTime)
    const handleEnded = () => setIsPlaying(false)

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)

    const handleOtherVideoPlayed = (e) => {
      if (e.detail.id !== id && isPlaying) {
        video.pause()
        setIsPlaying(false)
      }
    }
    window.addEventListener('video-played', handleOtherVideoPlayed)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      window.removeEventListener('video-played', handleOtherVideoPlayed)
    }
  }, [isDragging, id, isPlaying])

  // IntersectionObserver: auto-play/pause based on scroll, but respect user pause
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6 && !isPlaying && !userPausedRef.current) {
          videoRef.current?.play().catch(() => {})
          setIsPlaying(true)
          window.dispatchEvent(new CustomEvent('video-played', { detail: { id } }))
        } else if (entry.intersectionRatio < 0.2 && isPlaying) {
          videoRef.current?.pause()
          setIsPlaying(false)
          // Reset user-paused when scrolled out so it can auto-play again when scrolled back
          userPausedRef.current = false
        }
      },
      { threshold: [0.2, 0.6] }
    )

    if (containerRef.current) observer.observe(containerRef.current)
    return () => containerRef.current && observer.unobserve(containerRef.current)
  }, [isPlaying, id])

  // ── Core play/pause ─────────────────────────────────────────────────────────
  const doTogglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
      userPausedRef.current = true
      setIsPlaying(false)
    } else {
      video.play().catch(() => {})
      userPausedRef.current = false
      window.dispatchEvent(new CustomEvent('video-played', { detail: { id } }))
      setIsPlaying(true)
    }
    showControlsTemporarily()
  }

  // Called by touch events — sets guard so the subsequent synthetic click is ignored
  const handlePlayTouchEnd = (e) => {
    e.stopPropagation()
    e.preventDefault()
    touchGuardRef.current = true
    doTogglePlay()
    setTimeout(() => { touchGuardRef.current = false }, 500)
  }

  // Called by mouse click events — skips if touch just fired
  const handlePlayClick = (e) => {
    e.stopPropagation()
    if (touchGuardRef.current) return
    doTogglePlay()
  }

  const toggleMute = (e) => {
    if (e) e.stopPropagation()
    const video = videoRef.current
    if (!video) return
    video.muted = !isMuted
    setIsMuted(!isMuted)
    showControlsTemporarily()
  }

  const toggleFullscreen = async (e) => {
    if (e) e.stopPropagation()
    const container = containerRef.current
    if (!container) return

    try {
      if (!isFullscreen) {
        if (container.requestFullscreen) await container.requestFullscreen()
        else if (container.webkitRequestFullscreen) await container.webkitRequestFullscreen()
        else if (container.mozRequestFullScreen) await container.mozRequestFullScreen()
      } else {
        if (document.exitFullscreen) await document.exitFullscreen()
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen()
        else if (document.mozCancelFullScreen) await document.mozCancelFullScreen()
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handleProgressClick = (e) => {
    const video = videoRef.current
    const progressBar = progressBarRef.current
    if (!video || !progressBar) return
    const rect = progressBar.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    video.currentTime = pos * duration
    setCurrentTime(video.currentTime)
  }

  const handleProgressDrag = (e) => {
    if (!isDragging) return
    const video = videoRef.current
    const progressBar = progressBarRef.current
    if (!video || !progressBar) return
    const rect = progressBar.getBoundingClientRect()
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = pos * duration
    setCurrentTime(newTime)
    video.currentTime = newTime
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    const touch = e.touches[0]
    const video = videoRef.current
    const progressBar = progressBarRef.current
    if (!video || !progressBar) return
    const rect = progressBar.getBoundingClientRect()
    const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    video.currentTime = pos * duration
    setCurrentTime(pos * duration)
  }

  useEffect(() => {
    if (isDragging) {
      const onMouseMove = (e) => handleProgressDrag(e)
      const onMouseUp = () => setIsDragging(false)
      const onTouchEnd = () => setIsDragging(false)
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', onTouchEnd)
      return () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', onTouchEnd)
      }
    }
  }, [isDragging, duration])

  const showControlsTemporarily = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
  }

  useEffect(() => {
    if (isPlaying && showControls) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
    }
    return () => controlsTimeoutRef.current && clearTimeout(controlsTimeoutRef.current)
  }, [isPlaying, showControls])

  // Container click (shows/hides controls bar, does NOT toggle play)
  const handleContainerClick = (e) => {
    e.stopPropagation()
    if (showControls && isPlaying) setShowControls(false)
    else showControlsTemporarily()
  }

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={`vp-container ${isFullscreen ? 'vp-fullscreen' : ''}`}
      onClick={handleContainerClick}
      style={videoAspectRatio && !isFullscreen ? { aspectRatio: videoAspectRatio } : undefined}
    >
      <video
        ref={videoRef}
        src={src}
        className="vp-video"
        muted={isMuted}
        playsInline
        onError={onError}
      />

      {/* Centre big play/pause button */}
      {(!isPlaying || showControls) && (
        <button
          className="vp-play-center"
          onTouchEnd={handlePlayTouchEnd}
          onClick={handlePlayClick}
        >
          {isPlaying ? <Pause size={32} fill="#000" /> : <Play size={32} fill="#000" />}
        </button>
      )}

      {/* Bottom control bar */}
      <div className={`vp-overlay ${showControls ? 'vp-show' : ''}`}>
        <div className="vp-bottom">
          <div
            ref={progressBarRef}
            className="vp-progress"
            onMouseDown={(e) => { e.stopPropagation(); setIsDragging(true); handleProgressClick(e) }}
            onTouchStart={(e) => { e.stopPropagation(); setIsDragging(true); handleProgressClick(e) }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vp-progress-bar">
              <div className="vp-progress-fill" style={{ width: `${progress}%` }}>
                <div className="vp-progress-thumb" />
              </div>
            </div>
          </div>

          <div className="vp-controls">
            <button
              className="vp-btn"
              onTouchEnd={handlePlayTouchEnd}
              onClick={handlePlayClick}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} fill="white" />}
            </button>

            <button className="vp-btn" onClick={(e) => toggleMute(e)}>
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <div className="vp-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <button className="vp-btn vp-btn-fullscreen" onClick={(e) => toggleFullscreen(e)}>
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
