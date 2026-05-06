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
  const controlsTimeoutRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => setDuration(video.duration)
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && isPlaying) {
          videoRef.current?.pause()
          setIsPlaying(false)
        }
      },
      { threshold: 0.5 }
    )

    if (containerRef.current) observer.observe(containerRef.current)
    return () => containerRef.current && observer.unobserve(containerRef.current)
  }, [isPlaying])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
      window.dispatchEvent(new CustomEvent('video-played', { detail: { id } }))
    }
    setIsPlaying(!isPlaying)
    showControlsTemporarily()
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !isMuted
    setIsMuted(!isMuted)
    showControlsTemporarily()
  }

  const toggleFullscreen = async () => {
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
    } catch (error) {
      console.error('Fullscreen error:', error)
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
    const pos = (e.clientX - rect.left) / rect.width
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
      const handleMouseMove = (e) => handleProgressDrag(e)
      const handleMouseUp = () => setIsDragging(false)
      const handleTouchEnd = () => setIsDragging(false)

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove)
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, duration])

  const showControlsTemporarily = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
    }
  }

  useEffect(() => {
    if (isPlaying && showControls) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
    }
    return () => controlsTimeoutRef.current && clearTimeout(controlsTimeoutRef.current)
  }, [isPlaying, showControls])

  const handleVideoClick = () => {
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
    <div ref={containerRef} className={`vp-container ${isFullscreen ? 'vp-fullscreen' : ''}`} onClick={handleVideoClick}>
      <video
        ref={videoRef}
        src={src}
        className="vp-video"
        muted={isMuted}
        playsInline
        onError={onError}
      />

      {(!isPlaying || showControls) && (
        <button className="vp-play-center" onClick={(e) => { e.stopPropagation(); togglePlay() }}>
          {isPlaying ? <Pause size={32} fill="#000" /> : <Play size={32} fill="#000" />}
        </button>
      )}

      <div className={`vp-overlay ${showControls ? 'vp-show' : ''}`}>
        <div className="vp-bottom">
          <div
            ref={progressBarRef}
            className="vp-progress"
            onMouseDown={(e) => { setIsDragging(true); handleProgressClick(e) }}
            onTouchStart={(e) => { setIsDragging(true); handleProgressClick(e) }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vp-progress-bar">
              <div className="vp-progress-fill" style={{ width: `${progress}%` }}>
                <div className="vp-progress-thumb" />
              </div>
            </div>
          </div>

          <div className="vp-controls">
            <button className="vp-btn" onClick={(e) => { e.stopPropagation(); togglePlay() }}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} fill="white" />}
            </button>

            <button className="vp-btn" onClick={(e) => { e.stopPropagation(); toggleMute() }}>
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <div className="vp-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <button className="vp-btn vp-btn-fullscreen" onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}>
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
