import { useState } from 'react'

export default function ImageZoomModal({ imageUrl, onClose }) {
    const [scale, setScale] = useState(1)

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3))
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5))

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.95)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    display: 'flex',
                    gap: '10px',
                    zIndex: 10000
                }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        handleZoomOut()
                    }}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <i className="ri-zoom-out-line"></i>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        handleZoomIn()
                    }}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <i className="ri-zoom-in-line"></i>
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                    }}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <i className="ri-close-line"></i>
                </button>
            </div>

            <div
                style={{
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={imageUrl}
                    alt="Zoomed"
                    style={{
                        transform: `scale(${scale})`,
                        transition: 'transform 0.3s ease',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                    }}
                />
            </div>

            <div
                style={{
                    position: 'absolute',
                    bottom: '20px',
                    color: 'white',
                    fontSize: '14px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    backdropFilter: 'blur(10px)'
                }}
            >
                Zoom: {Math.round(scale * 100)}%
            </div>
        </div>
    )
}
