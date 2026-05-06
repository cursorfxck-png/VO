import { useState } from 'react'

export default function MobileMenu({ onViewLive, onViewMusic }) {
  const [isOpen, setIsOpen] = useState(false)

  const handleLiveClick = () => {
    setIsOpen(false)
    onViewLive()
  }

  const handleMusicClick = () => {
    setIsOpen(false)
    onViewMusic()
  }

  return (
    <>
      {/* Three dots button - only visible on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          width: '44px',
          height: '44px',
          background: '#1c1c1e',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '50%',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10000,
          transition: 'all 0.3s ease',
          boxShadow: isOpen ? '0 8px 24px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.2)'
        }}
        className="mobile-menu-button"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="12" r="2" fill="#fff"/>
          <circle cx="12" cy="12" r="2" fill="#fff"/>
          <circle cx="18" cy="12" r="2" fill="#fff"/>
        </svg>
      </button>

      {/* Glassmorphic menu overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 9998,
              animation: 'fadeIn 0.3s ease'
            }}
            className="mobile-menu-backdrop"
          />

          {/* Menu container */}
          <div
            style={{
              position: 'fixed',
              top: '70px',
              right: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 9999,
              animation: 'slideDown 0.3s ease'
            }}
            className="mobile-menu-container"
          >
            {/* Live Stream Button */}
            <button
              onClick={handleLiveClick}
              className="glass-button"
              style={{
                width: '220px',
                height: '70px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.05) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '2px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '35px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Glow effect behind dot */}
              <div style={{
                position: 'absolute',
                left: '25px',
                width: '28px',
                height: '28px',
                background: 'radial-gradient(circle, rgba(255, 59, 48, 0.6) 0%, rgba(255, 59, 48, 0) 70%)',
                borderRadius: '50%',
                animation: 'glowPulse 1.5s infinite'
              }} />
              
              {/* Live dot */}
              <div style={{
                width: '20px',
                height: '20px',
                background: '#ff3b30',
                borderRadius: '50%',
                marginRight: '16px',
                animation: 'livePulse 1.5s infinite',
                boxShadow: '0 0 12px rgba(255, 59, 48, 0.8)',
                position: 'relative',
                zIndex: 1
              }} />
              
              {/* Text */}
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#fff',
                letterSpacing: '0.5px',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                LIVE STREAM
              </span>
            </button>

            {/* Music Button */}
            <button
              onClick={handleMusicClick}
              className="glass-button music-button"
              style={{
                width: '220px',
                height: '70px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.1) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '2px solid rgba(139, 92, 246, 0.5)',
                borderRadius: '35px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Music icon with glow */}
              <div style={{
                position: 'relative',
                marginRight: '16px'
              }}>
                <div style={{
                  position: 'absolute',
                  width: '28px',
                  height: '28px',
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, rgba(139, 92, 246, 0) 70%)',
                  borderRadius: '50%',
                  left: '-4px',
                  top: '-4px'
                }} />
                <i className="ri-music-2-fill" style={{
                  fontSize: '24px',
                  color: '#8b5cf6',
                  position: 'relative',
                  zIndex: 1,
                  filter: 'drop-shadow(0 2px 8px rgba(139, 92, 246, 0.6))'
                }}></i>
              </div>
              
              {/* Text */}
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#fff',
                letterSpacing: '0.5px',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                MUSIC
              </span>
            </button>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-button {
            display: flex !important;
          }
        }

        /* Glass button hover and active effects */
        .glass-button:hover {
          transform: scale(1.05) translateY(-2px);
          box-shadow: 0 12px 40px rgba(255, 59, 48, 0.5);
        }

        .glass-button:active {
          transform: scale(0.98);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }

        .music-button:hover {
          box-shadow: 0 12px 40px rgba(139, 92, 246, 0.5) !important;
        }

        /* Touch feedback for mobile */
        @media (hover: none) {
          .glass-button:active {
            transform: scale(0.95);
            opacity: 0.9;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes livePulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes glowPulse {
          0% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.3);
          }
          100% {
            opacity: 0.4;
            transform: scale(1);
          }
        }

        /* Ripple effect on click */
        .glass-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .glass-button:active::before {
          width: 300px;
          height: 300px;
        }
      `}</style>
    </>
  )
}
