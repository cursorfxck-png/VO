import { useState, useEffect } from 'react'

export default function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [showBanner, setShowBanner] = useState(!navigator.onLine)
    const [isRetrying, setIsRetrying] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true)
            setShowBanner(false)
            console.log('✅ Back online')
        }

        const handleOffline = () => {
            setIsOnline(false)
            setShowBanner(true)
            console.log('❌ Connection lost')
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const handleRetry = async () => {
        setIsRetrying(true)
        
        try {
            // Try to fetch a small resource to check connectivity
            const response = await fetch('https://www.google.com/favicon.ico', {
                mode: 'no-cors',
                cache: 'no-cache'
            })
            
            // If we get here, we're online
            setIsOnline(true)
            setShowBanner(false)
            window.location.reload()
        } catch (error) {
            // Still offline
            console.log('Still offline')
        } finally {
            setIsRetrying(false)
        }
    }

    if (!showBanner || isDismissed) return null

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            paddingBottom: 'env(safe-area-inset-bottom)'
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                backdropFilter: 'blur(20px)',
                borderTop: '2px solid #ff6b6b',
                padding: '20px',
                boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                alignItems: 'center'
            }}>
                {/* Close Button */}
                <button
                    onClick={() => setIsDismissed(true)}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        color: 'rgba(255, 255, 255, 0.7)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                        e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>

                {/* Icon and Message */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    maxWidth: '500px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4)',
                        animation: 'pulse 2s infinite'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 9L12 2L23 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M1 15L12 22L23 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                            <line x1="12" y1="2" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
                            <circle cx="12" cy="12" r="2" fill="white"/>
                        </svg>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#ffffff',
                            marginBottom: '4px',
                            letterSpacing: '-0.3px'
                        }}>
                            No Internet Connection
                        </div>
                        <div style={{
                            fontSize: '13px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            lineHeight: '1.4'
                        }}>
                            Check your connection and try again
                        </div>
                    </div>
                </div>

                {/* Retry Button */}
                <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    style={{
                        width: '100%',
                        maxWidth: '500px',
                        padding: '14px 24px',
                        background: isRetrying 
                            ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                            : 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: isRetrying ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isRetrying 
                            ? 'none'
                            : '0 4px 16px rgba(0, 122, 255, 0.4)',
                        transform: isRetrying ? 'scale(0.98)' : 'scale(1)',
                        opacity: isRetrying ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isRetrying) {
                            e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 122, 255, 0.5)'
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isRetrying) {
                            e.currentTarget.style.transform = 'scale(1)'
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 122, 255, 0.4)'
                        }
                    }}
                >
                    {isRetrying ? (
                        <>
                            <svg 
                                width="20" 
                                height="20" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                style={{ animation: 'spin 1s linear infinite' }}
                            >
                                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="15" opacity="0.3"/>
                                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="45"/>
                            </svg>
                            <span>Checking Connection...</span>
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21.5 2V16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M21.5 2L14 9.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M21.5 2L14 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M21.5 2L21.5 9.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M3 22C3 17.5817 6.58172 14 11 14C15.4183 14 19 17.5817 19 22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <span>Retry Connection</span>
                        </>
                    )}
                </button>

                {/* Connection Tips */}
                <div style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    textAlign: 'center',
                    maxWidth: '500px',
                    lineHeight: '1.5'
                }}>
                    💡 Your loaded content is still available offline
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                    50% {
                        transform: scale(1.05);
                        opacity: 0.9;
                    }
                }

                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    )
}
