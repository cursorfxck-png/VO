import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Auth from './components/Auth'
import Sidebar from './components/Sidebar'
import Feed from './components/Feed'
import GuestFeed from './components/GuestFeed'
import MobileLayout from './components/MobileLayout'
import MobileComposeModal from './components/MobileComposeModal'
import OnboardingModal from './components/OnboardingModal'
import UserProfile from './components/UserProfile'
import OtherUserProfile from './components/OtherUserProfile'
import Explore from './components/Explore'
import Messages from './components/Messages'
import OfflineBanner from './components/OfflineBanner'
import SinglePost from './components/SinglePost'
import PublicProfile from './components/PublicProfile'
import RightSidebar from './components/RightSidebar'
import NotificationManager from './components/NotificationManager'
import ErrorBoundary from './components/ErrorBoundary'
import { formatDistanceToNow } from 'date-fns'

function App() {
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true) // wait before showing Auth
  const [showMobileCompose, setShowMobileCompose] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [currentView, setCurrentView] = useState('feed')
  const [selectedChatUser, setSelectedChatUser] = useState(null)
  const [viewingUserId, setViewingUserId] = useState(null)
  const [rightSidebarWidth, setRightSidebarWidth] = useState(350)
  const [isResizing, setIsResizing] = useState(false)
  const [isViewingStory, setIsViewingStory] = useState(false)
  const [messageNotifications, setMessageNotifications] = useState([])
  const [lastMessageIds, setLastMessageIds] = useState(new Set())
  const presenceHeartbeatRef = useRef(null)

  const navigate = useNavigate()
  const location = useLocation()

  // ── Session init ────────────────────────────────────────────────────────────
  useEffect(() => {
    // Restore session from localStorage immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setSessionLoading(false)
      if (session) {
        checkProfile(session)
        updatePresence(session.user.id, true)
        setupMessageNotifications(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setSessionLoading(false)
      if (session) {
        checkProfile(session)
        updatePresence(session.user.id, true)
        setupMessageNotifications(session.user.id)
      } else {
        // user signed out — clear heartbeat
        if (presenceHeartbeatRef.current) {
          clearInterval(presenceHeartbeatRef.current)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Presence tracking (heartbeat + visibility + pagehide) ──────────────────
  useEffect(() => {
    if (!session) return

    // Mark online immediately
    updatePresence(session.user.id, true)

    // Heartbeat every 30 s — keeps the user online while tab is open
    presenceHeartbeatRef.current = setInterval(() => {
      if (!document.hidden) {
        updatePresence(session.user.id, true)
      }
    }, 30_000)

    const handleVisibility = () => {
      updatePresence(session.user.id, !document.hidden)
    }
    const handleOffline = () => updatePresence(session.user.id, false)

    // pagehide fires on mobile Safari when tab is closed / backgrounded
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleOffline)
    window.addEventListener('pagehide', handleOffline)

    return () => {
      clearInterval(presenceHeartbeatRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleOffline)
      window.removeEventListener('pagehide', handleOffline)
      // Mark offline on cleanup (component unmount / sign-out)
      updatePresence(session.user.id, false)
    }
  }, [session])

  // ── Right-sidebar resize ───────────────────────────────────────────────────
  useEffect(() => {
    const resize = (e) => {
      if (isResizing) {
        const container = document.querySelector('.app-layout')
        if (container) {
          const newWidth = container.getBoundingClientRect().right - e.clientX
          if (newWidth > 200 && newWidth < 600) setRightSidebarWidth(newWidth)
        }
      }
    }
    const stop = () => setIsResizing(false)
    if (isResizing) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stop)
    }
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stop)
    }
  }, [isResizing])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updatePresence = async (userId, isOnline) => {
    try {
      await supabase.from('user_presence').upsert(
        { user_id: userId, is_online: isOnline, last_seen: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    } catch (err) {
      console.error('Presence update error:', err)
    }
  }

  const checkProfile = async (session) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, date_of_birth')
        .eq('id', session.user.id)
        .single()
      if (error && error.code !== 'PGRST116') return
      if (!data || !data.full_name || !data.username || !data.date_of_birth) {
        setShowOnboarding(true)
      } else {
        setShowOnboarding(false)
      }
    } catch { /* ignore */ }
  }

  const setupMessageNotifications = (userId) => {
    const channel = supabase
      .channel('new-messages-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${userId}`
      }, async (payload) => {
        const newMessage = payload.new
        if (currentView === 'messages') return
        if (lastMessageIds.has(newMessage.id)) return

        const { data: senderProfile } = await supabase
          .from('profiles').select('full_name, username, avatar_url')
          .eq('id', newMessage.sender_id).single()

        const { data: verifiedData } = await supabase
          .from('verified_users').select('username')
          .eq('username', senderProfile?.username).single()

        const notification = {
          id: newMessage.id,
          senderName: senderProfile?.full_name || 'User',
          senderAvatar: senderProfile?.avatar_url,
          message: newMessage.content,
          timestamp: formatDistanceToNow(new Date(newMessage.created_at), { addSuffix: true }),
          time: new Date(newMessage.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          isVerified: !!verifiedData
        }
        setMessageNotifications(prev => [...prev, notification])
        setLastMessageIds(prev => new Set([...prev, newMessage.id]))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  const handleDismissNotification = (id) => {
    setMessageNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleStartChat = (user) => {
    setSelectedChatUser(user)
    setCurrentView('messages')
  }

  const handleViewProfile = async (userId) => {
    if (userId === session?.user?.id) {
      const { data } = await supabase.from('profiles').select('username').eq('id', session.user.id).single()
      if (data?.username) navigate(`/u/${data.username}`)
      else setCurrentView('profile')
    } else {
      const { data } = await supabase.from('profiles').select('username').eq('id', userId).single()
      if (data?.username) navigate(`/u/${data.username}`)
      else { setViewingUserId(userId); setCurrentView('otherProfile') }
    }
  }

  const renderView = () => {
    switch (currentView) {
      case 'feed':
        return <Feed session={session} onViewProfile={handleViewProfile} onViewingStoryChange={setIsViewingStory} isViewingStory={isViewingStory} />
      case 'profile':
        return <UserProfile session={session} onBack={() => setCurrentView('feed')} onViewMessages={() => setCurrentView('messages')} />
      case 'otherProfile':
        return <OtherUserProfile userId={viewingUserId} session={session} onBack={() => setCurrentView('feed')} onMessage={(user) => { setSelectedChatUser(user); setCurrentView('messages') }} />
      case 'explore':
        return <Explore session={session} onStartChat={handleStartChat} onBack={() => setCurrentView('feed')} />
      case 'messages':
        return <Messages session={session} onBack={() => setCurrentView('feed')} selectedUser={selectedChatUser} onViewProfile={handleViewProfile} />
      default:
        return <Feed session={session} onViewProfile={handleViewProfile} onViewingStoryChange={setIsViewingStory} isViewingStory={isViewingStory} />
    }
  }

  // ── Loading splash while we check stored session ──────────────────────────
  if (sessionLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '20px'
      }}>
        <img src="/logo.svg" alt="VogueX" style={{ width: '64px', height: '64px', opacity: 0.9 }} />
        <div style={{
          width: '32px', height: '32px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#d946ef',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    )
  }

  // ── Public routes always accessible ───────────────────────────────────────
  const publicRouteMatch =
    location.pathname.startsWith('/post/') ||
    location.pathname.startsWith('/u/')

  // Unauthenticated: show public routes OR guest feed
  if (!session) {
    return (
      <ErrorBoundary>
        <Routes>
          <Route path="/post/:postId" element={<SinglePost session={null} />} />
          <Route path="/u/:username" element={<PublicProfile session={null} />} />
          <Route path="/*" element={<GuestFeed />} />
        </Routes>
        <OfflineBanner />
      </ErrorBoundary>
    )
  }

  // ── Check if mobile view ──────────────────────────────────────────────────
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 800)
  
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 800)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ── Authenticated layout ───────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/post/:postId" element={<SinglePost session={session} />} />
        <Route path="/u/:username" element={<PublicProfile session={session} />} />
        <Route path="/*" element={
          isMobileView ? (
            // Mobile View - VogueX Design
            <MobileLayout
              session={session}
              onNavClick={(view) => {
                if (view === 'home') setCurrentView('feed')
                else if (view === 'explore') setCurrentView('explore')
                else if (view === 'compose') setShowMobileCompose(true)
                else if (view === 'messages') setCurrentView('messages')
                else if (view === 'for-you' || view === 'following') {
                  /* Tab navigation */
                }
              }}
              onProfileClick={() => handleViewProfile(session.user.id)}
              currentView={currentView}
            >
              {renderView()}
            </MobileLayout>
          ) : (
            // Desktop View - Original Layout
            <div
              className="app-layout"
              style={{
                '--right-sidebar-width': `${rightSidebarWidth}px`,
                cursor: isResizing ? 'col-resize' : 'default',
                userSelect: isResizing ? 'none' : 'auto'
              }}
            >
              <Sidebar
                session={session}
                onViewProfile={() => handleViewProfile(session.user.id)}
                onViewExplore={() => setCurrentView('explore')}
                onViewMessages={() => setCurrentView('messages')}
                currentView={currentView}
              />

              {renderView()}

              <RightSidebar
                session={session}
                width={rightSidebarWidth}
                onStartResize={() => setIsResizing(true)}
                onToggle={() => setRightSidebarWidth(w => w === 0 ? 350 : 0)}
                onViewingStoryChange={setIsViewingStory}
                onEditorChange={setIsViewingStory}
              />

              {currentView === 'feed' && (
                <button className="fab-mobile" onClick={() => setShowMobileCompose(true)}>
                  <i className="ri-add-line"></i>
                </button>
              )}

              {/* Mobile Nav — no Music tab */}
              <nav className="mobile-nav">
                <a href="#" className="mobile-item" onClick={(e) => { e.preventDefault(); setCurrentView('feed') }}
                  style={{ color: currentView === 'feed' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                    <path fillRule="evenodd" d="M17.36 2.03 L18.07 3.12 L18.07 7.79 L20.75 10.6 L20.89 11.06 L20.75 11.84 L20.19 12.31 L19.48 12.31 L18.49 11.38 L18.49 21.35 L18.21 21.97 L17.22 22.75 L5.65 22.6 L4.8 21.51 L4.8 11.53 L3.81 12.31 L2.96 12.31 L2.4 11.69 L2.54 10.6 L10.59 2.81 L11.15 2.49 L12.56 2.65 L15.39 5.3 L15.53 2.49 L16.38 1.87 Z M10.16 12.47 L9.88 12.78 L9.88 12.94 L9.46 13.4 L9.46 13.71 L9.32 13.87 L9.32 14.81 L9.18 14.96 L9.18 18.08 L9.32 18.23 L9.32 18.39 L9.46 18.55 L13.84 18.55 L13.98 18.39 L13.98 14.03 L13.84 13.87 L13.84 13.56 L13.55 13.25 L13.55 13.09 L12.99 12.47 L12.85 12.47 L12.56 12.16 L12.28 12.16 L12.14 12.0 L11.15 12.0 L11.01 12.16 L10.73 12.16 L10.59 12.31 L10.45 12.31 L10.31 12.47 Z" />
                  </svg>
                </a>
                <a href="#" className="mobile-item" onClick={(e) => { e.preventDefault(); setCurrentView('explore') }}
                  style={{ color: currentView === 'explore' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  <i className="ri-search-line"></i>
                </a>
                <a href="#" className="mobile-item" onClick={(e) => { e.preventDefault(); setCurrentView('messages') }}
                  style={{ color: currentView === 'messages' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  <svg width="24" height="20" viewBox="0 0 31 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 0C18.6274 0 24 4.25263 24 9.49851C24 14.7444 17.6406 18.8634 10.3681 18.3883C7.70922 21.1085 4.66783 21.0465 4.51201 20.8586C4.35619 20.6707 4.7425 20.5054 5.38145 19.5059C6.0204 18.5064 6.0204 17.4176 4.78304 16.6474L4.7034 16.6027L4.62171 16.5619C1.54057 15.1153 0 12.7609 0 9.49851C0 3.65377 5.37258 0 12 0ZM19.7804 0.502277C26.0021 0.603488 31 4.07282 31 9.57383C31 12.5898 29.6173 14.7935 26.852 16.1849L26.4926 16.3604L26.4163 16.4031C25.2305 17.1389 25.2305 18.1789 25.8428 19.1338C26.4551 20.0886 26.8253 20.2465 26.676 20.426C26.5267 20.6055 23.612 20.6647 21.0639 18.0662C20.5147 18.1019 19.971 18.1104 19.4353 18.0933C23.0637 16.2416 25.5 13.1378 25.5 9.49851C25.5 5.92825 23.4481 2.80265 20.2847 0.805168L19.9941 0.626706L19.7804 0.502277Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </a>
                <a href="#" className="mobile-item" onClick={(e) => { e.preventDefault(); handleViewProfile(session.user.id) }}
                  style={{ color: currentView === 'profile' ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                    <path d="M8.36 0.49 L6.81 1.46 L5.61 2.68 L4.78 4.1 L4.0 6.63 L4.0 8.87 L4.48 10.29 L5.44 11.51 L6.46 12.32 L7.05 13.13 L6.99 14.92 L6.69 16.03 L6.16 16.75 L5.26 17.5 L4.0 18.36 L2.81 19.33 L1.85 20.3 L1.25 21.06 L0.96 21.72 L0.96 23.35 L22.42 23.35 L22.6 23.04 L22.6 22.38 L21.16 20.76 L18.83 19.84 L16.85 18.88 L15.72 18.17 L15.54 17.56 L16.32 16.29 L16.68 15.68 L17.57 15.42 L20.32 15.17 L21.28 14.51 L21.58 12.89 L21.58 12.12 L23.5 11.06 L23.74 9.69 L22.84 8.72 L22.18 8.01 L21.7 6.34 L21.82 4.97 L22.54 3.75 L23.44 2.89 L23.32 1.46 L21.7 1.46 L20.45 1.77 L18.89 1.97 L16.32 1.26 L15.24 0.6 L14.7 0.25 L8.36 0.49 Z" />
                  </svg>
                </a>
              </nav>
            </div>
          )
        } />
      </Routes>

      {showMobileCompose && (
        <MobileComposeModal session={session} onClose={() => setShowMobileCompose(false)} />
      )}
      {showOnboarding && (
        <OnboardingModal session={session} onComplete={() => setShowOnboarding(false)} />
      )}
      <OfflineBanner />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, pointerEvents: 'none', zIndex: 100000 }}>
        <NotificationManager notifications={messageNotifications} onDismiss={handleDismissNotification} />
      </div>
    </ErrorBoundary>
  )
}

export default App
