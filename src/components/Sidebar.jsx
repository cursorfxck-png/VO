import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ProfileEditModal from './ProfileEditModal'
import LogoutModal from './LogoutModal'

export default function Sidebar({ session, onViewProfile, onViewExplore, onViewMessages, currentView }) {
  const [profile, setProfile] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    getProfile()
    fetchUnreadCount()

    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${session.user.id}`
      }, () => fetchUnreadCount())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', session.user.id)
        .eq('read', false)
      setUnreadCount(count || 0)
    } catch { /* ignore */ }
  }

  const getProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()
      if (data) setProfile(data)
    } catch { /* ignore */ }
  }

  return (
    <>
      <aside className="sidebar-left">
        <div>
          <div className="logo-area">
            <img src="/logo.svg" alt="VogueX" className="logo-icon" />
            <span className="logo-text">VogueX</span>
          </div>

          <nav className="nav-links">
            {/* Home */}
            <a href="#" className={`nav-link ${currentView === 'feed' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); window.location.reload() }}>
              <svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path fillRule="evenodd" d="M17.36 2.03 L18.07 3.12 L18.07 7.79 L20.75 10.6 L20.89 11.06 L20.75 11.84 L20.19 12.31 L19.48 12.31 L18.49 11.38 L18.49 21.35 L18.21 21.97 L17.22 22.75 L5.65 22.6 L4.8 21.51 L4.8 11.53 L3.81 12.31 L2.96 12.31 L2.4 11.69 L2.54 10.6 L10.59 2.81 L11.15 2.49 L12.56 2.65 L15.39 5.3 L15.53 2.49 L16.38 1.87 Z M10.16 12.47 L9.88 12.78 L9.88 12.94 L9.46 13.4 L9.46 13.71 L9.32 13.87 L9.32 14.81 L9.18 14.96 L9.18 18.08 L9.32 18.23 L9.32 18.39 L9.46 18.55 L13.84 18.55 L13.98 18.39 L13.98 14.03 L13.84 13.87 L13.84 13.56 L13.55 13.25 L13.55 13.09 L12.99 12.47 L12.85 12.47 L12.56 12.16 L12.28 12.16 L12.14 12.0 L11.15 12.0 L11.01 12.16 L10.73 12.16 L10.59 12.31 L10.45 12.31 L10.31 12.47 Z" />
              </svg>
              <span>Home</span>
            </a>

            {/* Explore */}
            <a href="#" className={`nav-link ${currentView === 'explore' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onViewExplore() }}>
              <i className="ri-search-line"></i> <span>Explore</span>
            </a>

            {/* Messages */}
            <a href="#" className={`nav-link ${currentView === 'messages' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onViewMessages() }} style={{ position: 'relative' }}>
              <svg width="26" height="21" viewBox="0 0 31 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 0C18.6274 0 24 4.25263 24 9.49851C24 14.7444 17.6406 18.8634 10.3681 18.3883C7.70922 21.1085 4.66783 21.0465 4.51201 20.8586C4.35619 20.6707 4.7425 20.5054 5.38145 19.5059C6.0204 18.5064 6.0204 17.4176 4.78304 16.6474L4.7034 16.6027L4.62171 16.5619C1.54057 15.1153 0 12.7609 0 9.49851C0 3.65377 5.37258 0 12 0ZM19.7804 0.502277C26.0021 0.603488 31 4.07282 31 9.57383C31 12.5898 29.6173 14.7935 26.852 16.1849L26.4926 16.3604L26.4163 16.4031C25.2305 17.1389 25.2305 18.1789 25.8428 19.1338C26.4551 20.0886 26.8253 20.2465 26.676 20.426C26.5267 20.6055 23.612 20.6647 21.0639 18.0662C20.5147 18.1019 19.971 18.1104 19.4353 18.0933C23.0637 16.2416 25.5 13.1378 25.5 9.49851C25.5 5.92825 23.4481 2.80265 20.2847 0.805168L19.9941 0.626706L19.7804 0.502277Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Messages</span>
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </a>

            {/* Profile */}
            <a href="#" className={`nav-link ${currentView === 'profile' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); onViewProfile() }}>
              <svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                <path d="M8.36 0.49 L6.81 1.46 L5.61 2.68 L4.78 4.1 L4.0 6.63 L4.0 8.87 L4.48 10.29 L5.44 11.51 L6.46 12.32 L7.05 13.13 L6.99 14.92 L6.69 16.03 L6.16 16.75 L5.26 17.5 L4.0 18.36 L2.81 19.33 L1.85 20.3 L1.25 21.06 L0.96 21.72 L0.96 23.35 L22.42 23.35 L22.6 23.04 L22.6 22.38 L21.16 20.76 L18.83 19.84 L16.85 18.88 L15.72 18.17 L15.54 17.56 L16.32 16.29 L16.68 15.68 L17.57 15.42 L20.32 15.17 L21.28 14.51 L21.58 12.89 L21.58 12.12 L23.5 11.06 L23.74 9.69 L22.84 8.72 L22.18 8.01 L21.7 6.34 L21.82 4.97 L22.54 3.75 L23.44 2.89 L23.32 1.46 L21.7 1.46 L20.45 1.77 L18.89 1.97 L16.32 1.26 L15.24 0.6 L14.7 0.25 L8.36 0.49 Z" />
              </svg>
              <span>Profile</span>
            </a>
          </nav>

          <button className="post-btn-large">
            <span>Post</span>
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <div className="user-profile-mini" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <img src={profile?.avatar_url || '/download.png'} alt="Me" className="mini-avatar" />
            <div className="user-info">
              <div style={{ fontWeight: 700 }}>{profile?.full_name || 'User'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>@{profile?.username || 'user'}</div>
            </div>
            <i className="ri-more-fill" style={{ marginLeft: 'auto' }}></i>
          </div>

          {showProfileMenu && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '8px',
              background: 'rgba(28,28,30,0.95)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
              overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 100
            }}>
              <button
                onClick={() => { setShowProfileMenu(false); setShowEditModal(true) }}
                style={{ width: '100%', padding: '14px 16px', background: 'transparent', color: 'white', textAlign: 'left', fontSize: '15px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <i className="ri-edit-line" style={{ fontSize: '18px' }}></i> Edit Profile
              </button>
              <button
                onClick={() => { setShowProfileMenu(false); setShowLogoutModal(true) }}
                style={{ width: '100%', padding: '14px 16px', background: 'transparent', color: '#ff3b30', textAlign: 'left', fontSize: '15px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '12px' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,59,48,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <i className="ri-logout-box-line" style={{ fontSize: '18px' }}></i> Log Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {showEditModal && (
        <ProfileEditModal session={session} onClose={() => setShowEditModal(false)} onUpdate={getProfile} />
      )}
      {showLogoutModal && (
        <LogoutModal onClose={() => setShowLogoutModal(false)} />
      )}
    </>
  )
}
