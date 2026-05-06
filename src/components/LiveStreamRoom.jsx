import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function LiveStreamRoom({ session, isHost = false }) {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const zpRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!session || !containerRef.current) return

    let mounted = true
    let retryCount = 0
    const maxRetries = 20 // Try for up to 10 seconds (20 * 500ms)

    const waitForSDK = () => {
      return new Promise((resolve, reject) => {
        const checkSDK = () => {
          if (!mounted) {
            reject(new Error('Component unmounted'))
            return
          }

          if (window.ZegoUIKitPrebuilt) {
            resolve()
          } else if (retryCount < maxRetries) {
            retryCount++
            setTimeout(checkSDK, 500)
          } else {
            reject(new Error('SDK failed to load'))
          }
        }
        checkSDK()
      })
    }

    const initLiveStream = async () => {
      try {
        setLoading(true)
        setError(null)

        // Wait for SDK to load with retry logic
        await waitForSDK()

        if (!mounted) return

        const ZegoUIKitPrebuilt = window.ZegoUIKitPrebuilt
        
        // ZegoCloud credentials
        const appID = 345182230
        const serverSecret = "e9b5f3165f4ed9b60862f05c7d769914"
        
        // Generate token
        const TOKEN = ZegoUIKitPrebuilt.generateKitTokenForTest(
          appID,
          serverSecret,
          roomId || `live_${Date.now()}`,
          session.user.id,
          session.user.email?.split('@')[0] || 'User'
        )

        const zp = ZegoUIKitPrebuilt.create(TOKEN)
        zpRef.current = zp

        // Join room
        await zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.LiveStreaming,
            config: {
              role: isHost ? ZegoUIKitPrebuilt.Host : ZegoUIKitPrebuilt.Audience
            }
          },
          sharedLinks: [
            {
              name: 'Share Link',
              url: window.location.href
            }
          ],
          showPreJoinView: false,
          showLeavingView: false,
          onLeaveRoom: () => {
            navigate('/live')
          },
          onJoinRoom: () => {
            console.log('Joined room:', roomId)
            setLoading(false)
          }
        })

        setLoading(false)
      } catch (err) {
        console.error('Error initializing live stream:', err)
        if (mounted) {
          setError(err.message)
          setLoading(false)
        }
      }
    }

    initLiveStream()

    return () => {
      mounted = false
      // Cleanup
      if (zpRef.current) {
        try {
          zpRef.current.destroy()
        } catch (e) {
          console.error('Error destroying stream:', e)
        }
      }
    }
  }, [session, roomId, isHost, navigate])

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: '#000',
      zIndex: 9999 
    }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'white',
          zIndex: 10000
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTop: '4px solid #ff0050',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ fontSize: '16px', fontWeight: '600' }}>
            {error ? 'Connection Error' : 'Connecting to live stream...'}
          </p>
          {error && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '14px', color: '#ff6b6b', marginBottom: '16px' }}>
                {error}
              </p>
              <button
                onClick={() => navigate('/live')}
                style={{
                  padding: '12px 24px',
                  background: '#ff0050',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Back to Live Streams
              </button>
            </div>
          )}
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
