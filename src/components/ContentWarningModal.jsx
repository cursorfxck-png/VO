import { useEffect } from 'react'

export default function ContentWarningModal({ message, onClose }) {
    useEffect(() => {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    return (
        <div 
            className="content-warning-overlay"
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50000,
                animation: 'fadeIn 0.2s ease',
                padding: '20px'
            }}
        >
            <div 
                className="content-warning-modal"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.98) 0%, rgba(30, 30, 30, 0.98) 100%)',
                    borderRadius: '24px',
                    padding: '0',
                    maxWidth: '420px',
                    width: '100%',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 69, 58, 0.3)',
                    animation: 'modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    overflow: 'hidden'
                }}
            >
                {/* Icon Section */}
                <div style={{
                    padding: '40px 32px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'linear-gradient(180deg, rgba(255, 69, 58, 0.1) 0%, transparent 100%)'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(255, 69, 58, 0.2) 0%, rgba(255, 59, 48, 0.1) 100%)',
                        border: '3px solid rgba(255, 69, 58, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'iconPulse 2s ease-in-out infinite'
                    }}>
                        <i className="ri-error-warning-line" style={{
                            fontSize: '42px',
                            color: '#ff453a',
                            filter: 'drop-shadow(0 2px 8px rgba(255, 69, 58, 0.5))'
                        }}></i>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{
                            color: '#fff',
                            fontSize: '22px',
                            fontWeight: '700',
                            margin: '0 0 8px 0',
                            letterSpacing: '-0.5px'
                        }}>
                            Content Warning
                        </h3>
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '15px',
                            margin: 0,
                            lineHeight: '1.5'
                        }}>
                            {message || '⚠️ Inappropriate content detected. Please remove offensive language and try again.'}
                        </p>
                    </div>
                </div>

                {/* Divider */}
                <div style={{
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 69, 58, 0.3) 50%, transparent 100%)',
                    margin: '0 32px'
                }}></div>

                {/* Button Section */}
                <div style={{ padding: '24px 32px 32px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'linear-gradient(135deg, #ff453a 0%, #ff3b30 100%)',
                            border: 'none',
                            borderRadius: '14px',
                            color: '#fff',
                            fontSize: '17px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 16px rgba(255, 69, 58, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={e => {
                            e.target.style.transform = 'translateY(-2px)'
                            e.target.style.boxShadow = '0 6px 20px rgba(255, 69, 58, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                        }}
                        onMouseLeave={e => {
                            e.target.style.transform = 'translateY(0)'
                            e.target.style.boxShadow = '0 4px 16px rgba(255, 69, 58, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                        }}
                        onMouseDown={e => e.target.style.transform = 'translateY(0) scale(0.98)'}
                        onMouseUp={e => e.target.style.transform = 'translateY(-2px) scale(1)'}
                    >
                        <span style={{ position: 'relative', zIndex: 1 }}>I Understand</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
