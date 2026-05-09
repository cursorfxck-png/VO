import { useState } from 'react'

/**
 * MobileLayout - VogueX mobile-first wrapper
 * Provides the exact layout structure from the design template:
 * - Status bar (safe area)
 * - Header with profile & logo
 * - Search bar
 * - Tabs (For You / Following)
 * - Stories row
 * - Feed (scrollable)
 * - Bottom navigation (fixed)
 */
export default function MobileLayout({ children, onNavClick, currentView, session, onProfileClick, onComposeClick }) {
  const [activeTab, setActiveTab] = useState('for-you')

  const handleTabClick = (tab) => {
    setActiveTab(tab)
    if (onNavClick) onNavClick(tab)
  }

  return (
    <div className="mobile-app">
      {/* Status bar spacer for notch */}
      <div className="status-bar"></div>

      {/* Header */}
      <div className="header">
        <button className="header-profile-btn" onClick={onProfileClick}>
          {session?.user?.user_metadata?.avatar_url ? (
            <img src={session.user.user_metadata.avatar_url} alt="Profile" />
          ) : (
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#d9d9d9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="ri-user-line" style={{ fontSize: '18px', color: '#000' }}></i>
            </div>
          )}
        </button>

        <div className="header-logo">
          <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo_1-B1TYbk7uDh69lkHeGIbVWqfRAv8KNp.png" alt="VogueX" />
        </div>

        <div style={{ width: '34px' }}></div>
      </div>

      {/* Search Bar */}
      <div className="search-wrap">
        <div className="search-bar">
          <img 
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vector_6-emnssuEjZZPdQS1Kjv1bh0d87nYaT9.png" 
            alt="Search" 
            className="search-icon" 
          />
          <span>Explore VogueX</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-wrap">
        <div className="tabs">
          <div className="tabs-indicator" style={{
            left: activeTab === 'for-you' ? '4px' : '50%',
            width: 'calc(50% - 8px)'
          }}></div>

          <button
            className={`tab-btn ${activeTab === 'for-you' ? 'active' : ''}`}
            onClick={() => handleTabClick('for-you')}
          >
            FOR YOU
          </button>

          <div className="tab-divider"></div>

          <button
            className={`tab-btn ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => handleTabClick('following')}
          >
            FOLLOWING
          </button>
        </div>
      </div>

      {/* Stories Row */}
      <div className="stories-row">
        <div className="story">
          <div className="story-avatar">
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '55px',
              background: '#505050',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="ri-add-line" style={{ color: '#fff', fontSize: '28px' }}></i>
            </div>
            <button className="add-story-btn">
              <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/divmdi_plus-zY9mUkqsSb7NBGOmIMBIazt48GEp2N.png" alt="Add" />
            </button>
          </div>
          <div className="story-name">Your Story</div>
        </div>

        {/* Sample stories - replace with dynamic */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="story">
            <div className="story-avatar">
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '55px',
                background: `hsl(${i * 60}, 70%, 50%)`,
                opacity: 0.6
              }}></div>
            </div>
            <div className="story-name">{`Story ${i}`}</div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="divider"></div>

      {/* Feed - Main Content Area */}
      <div className="feed">
        {children}
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div className="nav-inner">
          <div className="nav-pill-bg"></div>

          <button className="nav-item" onClick={() => handleTabClick('home')}>
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vector_0-MFGNgB2gxQpZ4e2X98ob6Vdp4d0EFX.png" alt="Home" />
            <span className="nav-label">Home</span>
          </button>

          <button className="nav-item" onClick={() => handleTabClick('explore')}>
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vector_2-ys1qA4agy7D7gKKKm6HcQQZqFaSPH4.png" alt="Explore" />
            <span className="nav-label">Explore</span>
          </button>

          <button className="nav-item" onClick={() => handleTabClick('compose')}>
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vector_1-G4Qbce3kWrYVgDCniLuuuatsgkVcda.png" alt="Compose" />
            <span className="nav-label">Post</span>
          </button>

          <button className="nav-item" onClick={() => handleTabClick('messages')}>
            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Vector_7-RMDcqZVxrUmJNGoW9CR1qP7vJ7niVV.png" alt="Messages" />
            <span className="nav-label">Chat</span>
          </button>

          <button className="nav-profile-btn" onClick={onProfileClick}>
            {session?.user?.user_metadata?.avatar_url ? (
              <img src={session.user.user_metadata.avatar_url} alt="Profile" />
            ) : (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#d9d9d9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="ri-user-line" style={{ fontSize: '16px', color: '#000' }}></i>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
