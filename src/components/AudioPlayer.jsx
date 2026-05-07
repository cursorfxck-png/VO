import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import './AudioPlayer.css'

// Animated equaliser bars (pure CSS via the class)
function EqBars({ isPlaying }) {
    return (
        <div className={`ap-eq ${isPlaying ? 'ap-eq--playing' : ''}`}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className="ap-eq__bar" style={{ animationDelay: `${(i - 1) * 0.12}s` }} />
            ))}
        </div>
    )
}

export default function AudioPlayer({ src, title, onError }) {
    const audioRef = useRef(null)
    const containerRef = useRef(null)
    const progressRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    // Touch-guard to prevent double-fire on mobile
    const touchGuardRef = useRef(false)

    const fileName = title || src?.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Audio'

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const onMeta = () => setDuration(audio.duration)
        const onTime = () => !isDragging && setCurrentTime(audio.currentTime)
        const onEnded = () => { setIsPlaying(false); setCurrentTime(0) }

        audio.addEventListener('loadedmetadata', onMeta)
        audio.addEventListener('timeupdate', onTime)
        audio.addEventListener('ended', onEnded)
        return () => {
            audio.removeEventListener('loadedmetadata', onMeta)
            audio.removeEventListener('timeupdate', onTime)
            audio.removeEventListener('ended', onEnded)
        }
    }, [isDragging])

    // Pause when scrolled out of view
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.intersectionRatio < 0.2) {
                    const audio = audioRef.current
                    if (audio && !audio.paused) {
                        audio.pause()
                        setIsPlaying(false)
                    }
                }
            },
            { threshold: [0.2] }
        )
        if (containerRef.current) observer.observe(containerRef.current)
        return () => containerRef.current && observer.unobserve(containerRef.current)
    }, [])

    const doTogglePlay = () => {
        const audio = audioRef.current
        if (!audio) return
        if (isPlaying) {
            audio.pause()
            setIsPlaying(false)
        } else {
            audio.play().catch(() => {})
            setIsPlaying(true)
        }
    }

    const handleTouchEnd = (e) => {
        e.stopPropagation()
        e.preventDefault()
        touchGuardRef.current = true
        doTogglePlay()
        setTimeout(() => { touchGuardRef.current = false }, 500)
    }

    const handleClick = (e) => {
        e.stopPropagation()
        if (touchGuardRef.current) return
        doTogglePlay()
    }

    const toggleMute = (e) => {
        e.stopPropagation()
        const audio = audioRef.current
        if (!audio) return
        audio.muted = !isMuted
        setIsMuted(!isMuted)
    }

    const seekTo = (e) => {
        const bar = progressRef.current
        const audio = audioRef.current
        if (!bar || !audio) return
        const rect = bar.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        audio.currentTime = pos * duration
        setCurrentTime(pos * duration)
    }

    const formatTime = (t) => {
        if (!t || isNaN(t)) return '0:00'
        const m = Math.floor(t / 60)
        const s = Math.floor(t % 60)
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
        <div ref={containerRef} className="ap-root" onClick={(e) => e.stopPropagation()}>
            <audio ref={audioRef} src={src} preload="metadata" onError={onError} />

            {/* Play button pill */}
            <button
                className="ap-play-btn"
                onTouchEnd={handleTouchEnd}
                onClick={handleClick}
                aria-label={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying
                    ? <Pause size={22} fill="white" color="white" />
                    : <Play size={22} fill="white" color="white" />
                }
            </button>

            {/* Middle: waveform / eq + progress */}
            <div className="ap-middle">
                {/* Song name */}
                <div className="ap-title" title={fileName}>{fileName}</div>

                {/* EQ bars + progress bar */}
                <div className="ap-wave-row">
                    <EqBars isPlaying={isPlaying} />
                    <div
                        ref={progressRef}
                        className="ap-progress"
                        onMouseDown={(e) => { e.stopPropagation(); setIsDragging(true); seekTo(e) }}
                        onMouseUp={() => setIsDragging(false)}
                        onTouchStart={(e) => { e.stopPropagation(); setIsDragging(true); seekTo(e) }}
                        onTouchEnd={() => setIsDragging(false)}
                        onClick={(e) => { e.stopPropagation(); seekTo(e) }}
                    >
                        <div className="ap-progress-track">
                            <div className="ap-progress-fill" style={{ width: `${progress}%` }}>
                                <div className="ap-progress-thumb" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time */}
                <div className="ap-time">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Right side: mute + MP3 badge */}
            <div className="ap-right">
                <button className="ap-mute-btn" onClick={toggleMute} aria-label="Toggle mute">
                    {isMuted ? <VolumeX size={16} color="#9ca3af" /> : <Volume2 size={16} color="#9ca3af" />}
                </button>
                <span className="ap-badge">MP3</span>
            </div>
        </div>
    )
}
