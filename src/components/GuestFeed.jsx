import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '../supabaseClient'
import VideoPlayer from './VideoPlayer'
import LoadingSpinner from './LoadingSpinner'

/* ─── Inline Login Modal ─────────────────────────────────────────────────── */
function LoginModal({ onClose, defaultTab = 'login' }) {
    const [tab, setTab] = useState(defaultTab)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true); setError(''); setSuccess('')
        try {
            if (tab === 'signup') {
                const { error } = await supabase.auth.signUp({ email, password })
                if (error) throw error
                setSuccess('Check your email for the confirmation link!')
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                onClose()
            }
        } catch (err) { setError(err.message) }
        finally { setLoading(false) }
    }

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#111214', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px',
                position: 'relative', animation: 'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: '14px', right: '14px', background: 'rgba(255,255,255,0.08)',
                    border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '50%',
                    cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>×</button>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <img src="/logo.svg" alt="VogueX" style={{ width: '44px', height: '44px', marginBottom: '10px' }} />
                    <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                        {tab === 'login' ? 'Log in to VogueX' : 'Create your account'}
                    </h2>
                </div>

                {/* Tab switcher */}
                <div style={{
                    display: 'flex', background: 'rgba(255,255,255,0.06)',
                    borderRadius: '12px', padding: '4px', marginBottom: '20px', gap: '4px'
                }}>
                    {['login', 'signup'].map(t => (
                        <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }} style={{
                            flex: 1, padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: '14px', transition: 'all 0.2s',
                            background: tab === t ? 'rgba(255,255,255,0.12)' : 'transparent',
                            color: tab === t ? 'white' : 'var(--text-muted)'
                        }}>
                            {t === 'login' ? 'Log in' : 'Sign up'}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="email" placeholder="Email address" value={email}
                        onChange={e => setEmail(e.target.value)} required
                        style={{
                            padding: '14px 16px', borderRadius: '14px', border: '1.5px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '15px', outline: 'none'
                        }} />
                    <input type="password" placeholder="Password" value={password}
                        onChange={e => setPassword(e.target.value)} required
                        style={{
                            padding: '14px 16px', borderRadius: '14px', border: '1.5px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: '15px', outline: 'none'
                        }} />
                    {error && <p style={{ color: '#ff4757', fontSize: '14px', margin: 0 }}>{error}</p>}
                    {success && <p style={{ color: '#00ba7c', fontSize: '14px', margin: 0 }}>{success}</p>}
                    <button type="submit" disabled={loading} style={{
                        padding: '15px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                        background: 'white', color: '#000', fontWeight: 700, fontSize: '16px',
                        opacity: loading ? 0.6 : 1, marginTop: '4px'
                    }}>
                        {loading ? '...' : tab === 'login' ? 'Log in' : 'Create account'}
                    </button>
                </form>
            </div>
        </div>
    )
}

/* ─── Guest Post Card ────────────────────────────────────────────────────── */
function GuestPost({ post, onRequireLogin }) {
    const navigate = useNavigate()
    const [likesCount, setLikesCount] = useState(0)
    const [commentsCount, setCommentsCount] = useState(0)

    useEffect(() => { fetchCounts() }, [post.id])

    const fetchCounts = async () => {
        const [{ count: lc }, { count: cc }] = await Promise.all([
            supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id)
        ])
        setLikesCount(lc || 0)
        setCommentsCount(cc || 0)
    }

    const username = post.profiles?.username || 'user'
    const displayName = post.profiles?.full_name || 'User'
    const avatarUrl = post.profiles?.avatar_url || '/download.png'

    const content = (post.content || '').replace(/\n\n📍\s*Lat:\s*[-\d.]+,\s*Long:\s*[-\d.]+/, '').trim()

    return (
        <article style={{ borderBottom: '1px solid var(--border)', padding: '16px 16px 12px', cursor: 'pointer' }}
            onClick={() => navigate(`/post/${post.id}`)}>
            <div style={{ display: 'flex', gap: '12px' }}>
                <img src={avatarUrl}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    alt={displayName}
                    onClick={e => { e.stopPropagation(); navigate(`/u/${username}`) }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); navigate(`/u/${username}`) }}>
                            {displayName}
                        </span>
                        {post.isVerified && <i className="ri-verified-badge-fill" style={{ color: '#1DA1F2', fontSize: '14px' }}></i>}
                        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>@{username}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>·</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                            {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : ''}
                        </span>
                    </div>
                    {content && <p style={{ margin: '0 0 10px', fontSize: '15px', lineHeight: 1.5, wordBreak: 'break-word' }}>{content}</p>}
                    {post.image_url && (
                        <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '10px' }}>
                            <img src={post.image_url} style={{ width: '100%', display: 'block' }} alt="Post" />
                        </div>
                    )}
                    {post.video_url && (
                        <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '10px' }}
                            onClick={e => e.stopPropagation()}>
                            <VideoPlayer src={post.video_url} id={post.id} />
                        </div>
                    )}
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '28px', marginTop: '8px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => onRequireLogin('login')}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', padding: 0 }}>
                            <i className="ri-chat-1-line" style={{ fontSize: '18px' }}></i> {commentsCount}
                        </button>
                        <button onClick={() => onRequireLogin('login')}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', padding: 0 }}>
                            <i className="ri-heart-3-line" style={{ fontSize: '18px' }}></i> {likesCount}
                        </button>
                        <button onClick={() => {
                            navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`)
                            onRequireLogin('login')
                        }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', padding: 0 }}>
                            <i className="ri-share-line" style={{ fontSize: '18px' }}></i>
                        </button>
                    </div>
                </div>
            </div>
        </article>
    )
}

/* ─── Main Guest Feed ────────────────────────────────────────────────────── */
export default function GuestFeed() {
    const navigate = useNavigate()
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loginModal, setLoginModal] = useState(null) // null | 'login' | 'signup'
    const [activeTab, setActiveTab] = useState('forYou')

    useEffect(() => { fetchPosts() }, [])

    const fetchPosts = async () => {
        try {
            const { data: postsData } = await supabase
                .from('posts').select('*').order('created_at', { ascending: false }).limit(60)

            if (!postsData?.length) { setPosts([]); return }

            const userIds = [...new Set(postsData.map(p => p.user_id))]
            const [{ data: profiles }, { data: verified }] = await Promise.all([
                supabase.from('profiles').select('id,username,full_name,avatar_url').in('id', userIds),
                supabase.from('verified_users').select('username')
            ])
            const verifiedSet = new Set(verified?.map(v => v.username) || [])
            setPosts(postsData.map(p => ({
                ...p,
                profiles: profiles?.find(pr => pr.id === p.user_id) || null,
                isVerified: verifiedSet.has(profiles?.find(pr => pr.id === p.user_id)?.username)
            })))
        } catch (err) { console.error('GuestFeed error:', err) }
        finally { setLoading(false) }
    }

    const showLogin = (tab = 'login') => setLoginModal(tab)

    return (
        <div className="app-layout" style={{ '--right-sidebar-width': '0px' }}>

            {/* ── Desktop Left Sidebar ────────────────────────────────── */}
            <aside className="sidebar-left">
                <div>
                    <div className="logo-area">
                        <img src="/logo.svg" alt="VogueX" className="logo-icon" />
                        <span className="logo-text">VogueX</span>
                    </div>
                    <nav className="nav-links">
                        <a href="#" className="nav-link active">
                            <svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                <path fillRule="evenodd" d="M17.36 2.03 L18.07 3.12 L18.07 7.79 L20.75 10.6 L20.89 11.06 L20.75 11.84 L20.19 12.31 L19.48 12.31 L18.49 11.38 L18.49 21.35 L18.21 21.97 L17.22 22.75 L5.65 22.6 L4.8 21.51 L4.8 11.53 L3.81 12.31 L2.96 12.31 L2.4 11.69 L2.54 10.6 L10.59 2.81 L11.15 2.49 L12.56 2.65 L15.39 5.3 L15.53 2.49 L16.38 1.87 Z M10.16 12.47 L9.88 12.78 L9.88 12.94 L9.46 13.4 L9.46 13.71 L9.32 13.87 L9.32 14.81 L9.18 14.96 L9.18 18.08 L9.32 18.23 L9.32 18.39 L9.46 18.55 L13.84 18.55 L13.98 18.39 L13.98 14.03 L13.84 13.87 L13.84 13.56 L13.55 13.25 L13.55 13.09 L12.99 12.47 L12.85 12.47 L12.56 12.16 L12.28 12.16 L12.14 12.0 L11.15 12.0 L11.01 12.16 L10.73 12.16 L10.59 12.31 L10.45 12.31 L10.31 12.47 Z" />
                            </svg>
                            <span>Home</span>
                        </a>
                        <a href="#" className="nav-link" onClick={e => { e.preventDefault(); showLogin() }}>
                            <i className="ri-search-line"></i> <span>Explore</span>
                        </a>
                        <a href="#" className="nav-link" onClick={e => { e.preventDefault(); showLogin() }}>
                            <svg width="26" height="21" viewBox="0 0 31 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 0C18.6274 0 24 4.25263 24 9.49851C24 14.7444 17.6406 18.8634 10.3681 18.3883C7.70922 21.1085 4.66783 21.0465 4.51201 20.8586C4.35619 20.6707 4.7425 20.5054 5.38145 19.5059C6.0204 18.5064 6.0204 17.4176 4.78304 16.6474L4.7034 16.6027L4.62171 16.5619C1.54057 15.1153 0 12.7609 0 9.49851C0 3.65377 5.37258 0 12 0ZM19.7804 0.502277C26.0021 0.603488 31 4.07282 31 9.57383C31 12.5898 29.6173 14.7935 26.852 16.1849L26.4926 16.3604L26.4163 16.4031C25.2305 17.1389 25.2305 18.1789 25.8428 19.1338C26.4551 20.0886 26.8253 20.2465 26.676 20.426C26.5267 20.6055 23.612 20.6647 21.0639 18.0662C20.5147 18.1019 19.971 18.1104 19.4353 18.0933C23.0637 16.2416 25.5 13.1378 25.5 9.49851C25.5 5.92825 23.4481 2.80265 20.2847 0.805168L19.9941 0.626706L19.7804 0.502277Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                            <span>Messages</span>
                        </a>
                        <a href="#" className="nav-link" onClick={e => { e.preventDefault(); showLogin() }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                <path d="M8.36 0.49 L6.81 1.46 L5.61 2.68 L4.78 4.1 L4.0 6.63 L4.0 8.87 L4.48 10.29 L5.44 11.51 L6.46 12.32 L7.05 13.13 L6.99 14.92 L6.69 16.03 L6.16 16.75 L5.26 17.5 L4.0 18.36 L2.81 19.33 L1.85 20.3 L1.25 21.06 L0.96 21.72 L0.96 23.35 L22.42 23.35 L22.6 23.04 L22.6 22.38 L21.16 20.76 L18.83 19.84 L16.85 18.88 L15.72 18.17 L15.54 17.56 L16.32 16.29 L16.68 15.68 L17.57 15.42 L20.32 15.17 L21.28 14.51 L21.58 12.89 L21.58 12.12 L23.5 11.06 L23.74 9.69 L22.84 8.72 L22.18 8.01 L21.7 6.34 L21.82 4.97 L22.54 3.75 L23.44 2.89 L23.32 1.46 L21.7 1.46 L20.45 1.77 L18.89 1.97 L16.32 1.26 L15.24 0.6 L14.7 0.25 L8.36 0.49 Z" />
                            </svg>
                            <span>Profile</span>
                        </a>
                    </nav>

                    {/* Post button → login */}
                    <button className="post-btn-large" onClick={() => showLogin()}>
                        <span>Post</span>
                    </button>
                </div>

                {/* Login / Sign up at the bottom */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px 0' }}>
                    <button onClick={() => showLogin('login')} style={{
                        width: '100%', padding: '13px 16px', background: 'transparent',
                        border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: '40px',
                        color: 'white', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                        transition: 'border-color 0.2s'
                    }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}>
                        Log in
                    </button>
                    <button onClick={() => showLogin('signup')} style={{
                        width: '100%', padding: '13px 16px',
                        background: 'white', borderRadius: '40px',
                        color: '#000', fontWeight: 700, fontSize: '15px', cursor: 'pointer', border: 'none'
                    }}>
                        Sign up
                    </button>
                </div>
            </aside>

            {/* ── Main Feed ───────────────────────────────────────────── */}
            <main className="main-feed" style={{ background: 'var(--bg-primary)' }}>
                {/* Feed Header */}
                <header className="feed-header">
                    <div className="header-top">
                        <div className="mini-avatar"
                            style={{ width: '30px', height: '30px', background: '#333', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => showLogin()}>
                            <i className="ri-user-line" style={{ fontSize: '16px', color: '#888' }}></i>
                        </div>
                        <div className="mobile-logo" style={{ fontSize: '22px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src="/logo.svg" alt="VogueX" style={{ width: '28px', height: '28px' }} />
                            VogueX
                        </div>
                        {/* Mobile login button */}
                        <button onClick={() => showLogin()} style={{
                            background: 'white', color: '#000', border: 'none',
                            borderRadius: '20px', padding: '7px 16px', fontWeight: 700,
                            fontSize: '13px', cursor: 'pointer', display: 'none'
                        }} className="mobile-login-btn">
                            Log in
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                        {['forYou', 'trending'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                flex: 1, padding: '15px', background: 'transparent',
                                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontWeight: activeTab === tab ? 'bold' : 'normal',
                                borderBottom: activeTab === tab ? '3px solid var(--accent)' : '3px solid transparent',
                                transition: 'all 0.2s', cursor: 'pointer', fontSize: '15px', border: 'none'
                            }}>
                                {tab === 'forYou' ? 'For You' : 'Trending'}
                            </button>
                        ))}
                        <button onClick={() => showLogin()} style={{
                            flex: 1, padding: '15px', background: 'transparent',
                            color: 'var(--text-muted)', fontWeight: 'normal',
                            borderBottom: '3px solid transparent', cursor: 'pointer', fontSize: '15px', border: 'none'
                        }}>
                            Following
                        </button>
                    </div>
                </header>

                {/* Posts */}
                {loading ? (
                    <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
                        <LoadingSpinner />
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p style={{ marginBottom: '16px' }}>No posts yet. Be the first!</p>
                        <button onClick={() => showLogin('signup')} style={{
                            padding: '12px 24px', background: 'var(--accent)', color: 'white',
                            border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 700
                        }}>Join Now</button>
                    </div>
                ) : (
                    posts.map(post => (
                        <GuestPost key={post.id} post={post} onRequireLogin={showLogin} />
                    ))
                )}

                <div style={{ height: '80px' }} />
            </main>

            {/* ── Mobile Nav ──────────────────────────────────────────── */}
            <nav className="mobile-nav">
                <a href="#" className="mobile-item" style={{ color: 'var(--text-main)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                        <path fillRule="evenodd" d="M17.36 2.03 L18.07 3.12 L18.07 7.79 L20.75 10.6 L20.89 11.06 L20.75 11.84 L20.19 12.31 L19.48 12.31 L18.49 11.38 L18.49 21.35 L18.21 21.97 L17.22 22.75 L5.65 22.6 L4.8 21.51 L4.8 11.53 L3.81 12.31 L2.96 12.31 L2.4 11.69 L2.54 10.6 L10.59 2.81 L11.15 2.49 L12.56 2.65 L15.39 5.3 L15.53 2.49 L16.38 1.87 Z M10.16 12.47 L9.88 12.78 L9.88 12.94 L9.46 13.4 L9.46 13.71 L9.32 13.87 L9.32 14.81 L9.18 14.96 L9.18 18.08 L9.32 18.23 L9.32 18.39 L9.46 18.55 L13.84 18.55 L13.98 18.39 L13.98 14.03 L13.84 13.87 L13.84 13.56 L13.55 13.25 L13.55 13.09 L12.99 12.47 L12.85 12.47 L12.56 12.16 L12.28 12.16 L12.14 12.0 L11.15 12.0 L11.01 12.16 L10.73 12.16 L10.59 12.31 L10.45 12.31 L10.31 12.47 Z" />
                    </svg>
                </a>
                <a href="#" className="mobile-item" onClick={e => { e.preventDefault(); showLogin() }} style={{ color: 'var(--text-muted)' }}>
                    <i className="ri-search-line"></i>
                </a>
                <a href="#" className="mobile-item" onClick={e => { e.preventDefault(); showLogin() }} style={{ color: 'var(--text-muted)' }}>
                    <svg width="24" height="20" viewBox="0 0 31 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 0C18.6274 0 24 4.25263 24 9.49851C24 14.7444 17.6406 18.8634 10.3681 18.3883C7.70922 21.1085 4.66783 21.0465 4.51201 20.8586C4.35619 20.6707 4.7425 20.5054 5.38145 19.5059C6.0204 18.5064 6.0204 17.4176 4.78304 16.6474L4.7034 16.6027L4.62171 16.5619C1.54057 15.1153 0 12.7609 0 9.49851C0 3.65377 5.37258 0 12 0ZM19.7804 0.502277C26.0021 0.603488 31 4.07282 31 9.57383C31 12.5898 29.6173 14.7935 26.852 16.1849L26.4926 16.3604L26.4163 16.4031C25.2305 17.1389 25.2305 18.1789 25.8428 19.1338C26.4551 20.0886 26.8253 20.2465 26.676 20.426C26.5267 20.6055 23.612 20.6647 21.0639 18.0662C20.5147 18.1019 19.971 18.1104 19.4353 18.0933C23.0637 16.2416 25.5 13.1378 25.5 9.49851C25.5 5.92825 23.4481 2.80265 20.2847 0.805168L19.9941 0.626706L19.7804 0.502277Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                </a>
                <a href="#" className="mobile-item" onClick={e => { e.preventDefault(); showLogin() }} style={{ color: 'var(--text-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                        <path d="M8.36 0.49 L6.81 1.46 L5.61 2.68 L4.78 4.1 L4.0 6.63 L4.0 8.87 L4.48 10.29 L5.44 11.51 L6.46 12.32 L7.05 13.13 L6.99 14.92 L6.69 16.03 L6.16 16.75 L5.26 17.5 L4.0 18.36 L2.81 19.33 L1.85 20.3 L1.25 21.06 L0.96 21.72 L0.96 23.35 L22.42 23.35 L22.6 23.04 L22.6 22.38 L21.16 20.76 L18.83 19.84 L16.85 18.88 L15.72 18.17 L15.54 17.56 L16.32 16.29 L16.68 15.68 L17.57 15.42 L20.32 15.17 L21.28 14.51 L21.58 12.89 L21.58 12.12 L23.5 11.06 L23.74 9.69 L22.84 8.72 L22.18 8.01 L21.7 6.34 L21.82 4.97 L22.54 3.75 L23.44 2.89 L23.32 1.46 L21.7 1.46 L20.45 1.77 L18.89 1.97 L16.32 1.26 L15.24 0.6 L14.7 0.25 L8.36 0.49 Z" />
                    </svg>
                </a>
            </nav>

            {/* Login Modal */}
            {loginModal && <LoginModal defaultTab={loginModal} onClose={() => setLoginModal(null)} />}
        </div>
    )
}
