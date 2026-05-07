import { useState, useEffect, useRef } from 'react'

/**
 * ImageZoomModal — supports single or multiple images.
 * Props:
 *   imageUrl  (string)  — single image, legacy prop kept for back-compat
 *   imageUrls (string[]) — array of image URLs
 *   initialIndex (number) — which image to open first
 *   onClose   (fn)
 */
export default function ImageZoomModal({ imageUrl, imageUrls, initialIndex = 0, onClose }) {
    // Support both single-image (imageUrl) and multi-image (imageUrls) usage
    const images = imageUrls && imageUrls.length > 0
        ? imageUrls
        : imageUrl
            ? [imageUrl]
            : []

    const [idx, setIdx] = useState(Math.min(initialIndex, images.length - 1))
    const [scale, setScale] = useState(1)
    const touchStartX = useRef(null)

    // Reset scale when slide changes
    useEffect(() => { setScale(1) }, [idx])

    // Close on Escape, navigate with arrow keys
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowRight') gotoNext()
            if (e.key === 'ArrowLeft') gotoPrev()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [idx, images.length])

    const handleZoomIn  = () => setScale(prev => Math.min(prev + 0.5, 4))
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5))

    const gotoNext = () => setIdx(i => (i + 1) % images.length)
    const gotoPrev = () => setIdx(i => (i - 1 + images.length) % images.length)

    // Touch swipe
    const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 40) dx < 0 ? gotoNext() : gotoPrev()
        touchStartX.current = null
    }

    if (images.length === 0) return null

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.96)',
                zIndex: 9999,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Top toolbar */}
            <div
                style={{
                    position: 'absolute', top: '16px', right: '16px',
                    display: 'flex', gap: '8px', zIndex: 10000,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {[
                    { icon: 'ri-zoom-out-line', action: handleZoomOut },
                    { icon: 'ri-zoom-in-line',  action: handleZoomIn },
                    { icon: 'ri-close-line',    action: onClose },
                ].map(({ icon, action }) => (
                    <button
                        key={icon}
                        onClick={action}
                        style={{
                            width: '40px', height: '40px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.12)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white', fontSize: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(10px)', cursor: 'pointer',
                        }}
                    >
                        <i className={icon} />
                    </button>
                ))}
            </div>

            {/* Prev arrow */}
            {images.length > 1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); gotoPrev() }}
                    style={{
                        position: 'absolute', left: '16px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                        borderRadius: '50%', width: '44px', height: '44px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '22px', cursor: 'pointer', zIndex: 10000,
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <i className="ri-arrow-left-s-line" />
                </button>
            )}

            {/* Next arrow */}
            {images.length > 1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); gotoNext() }}
                    style={{
                        position: 'absolute', right: '16px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                        borderRadius: '50%', width: '44px', height: '44px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '22px', cursor: 'pointer', zIndex: 10000,
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <i className="ri-arrow-right-s-line" />
                </button>
            )}

            {/* Image */}
            <div
                style={{
                    maxWidth: '90vw', maxHeight: '82vh',
                    overflow: 'auto', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={images[idx]}
                    alt={`Image ${idx + 1} of ${images.length}`}
                    style={{
                        transform: `scale(${scale})`,
                        transition: 'transform 0.3s ease',
                        maxWidth: '100%', maxHeight: '82vh',
                        objectFit: 'contain',
                        userSelect: 'none',
                    }}
                />
            </div>

            {/* Bottom bar: zoom % + dots */}
            <div
                style={{
                    position: 'absolute', bottom: '20px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                    zIndex: 10000,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Dots */}
                {images.length > 1 && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {images.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIdx(i)}
                                style={{
                                    width: i === idx ? '20px' : '8px',
                                    height: '8px', borderRadius: '4px',
                                    background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)',
                                    border: 'none', cursor: 'pointer', padding: 0,
                                    transition: 'width 0.25s ease, background 0.2s ease',
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Zoom level */}
                <div style={{
                    color: 'white', fontSize: '13px',
                    background: 'rgba(0,0,0,0.55)',
                    padding: '5px 14px', borderRadius: '20px',
                    backdropFilter: 'blur(10px)',
                }}>
                    {images.length > 1 ? `${idx + 1} / ${images.length}  · ` : ''}
                    Zoom: {Math.round(scale * 100)}%
                </div>
            </div>
        </div>
    )
}
