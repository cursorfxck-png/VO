import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Post from './Post'
import LogoutModal from './LogoutModal'
import SettingsModal from './SettingsModal'
import AdminVerificationPanel from './AdminVerificationPanel'
import LoadingSpinner from './LoadingSpinner'

export default function UserProfile({ session, onBack, onViewMessages }) {
    const [posts, setPosts] = useState([])
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isVerified, setIsVerified] = useState(false)
    const [showLogoutModal, setShowLogoutModal] = useState(false)
    const [followerCount, setFollowerCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
    const [showVerificationPanel, setShowVerificationPanel] = useState(false)
    const [verificationStatus, setVerificationStatus] = useState(null)

    useEffect(() => {
        fetchProfile()
        fetchUserPosts()
        fetchFollowerCounts()
    }, [])

    useEffect(() => {
        if (profile?.username) {
            checkVerified()
            checkVerificationRequest()
        }
    }, [profile])

    const checkVerified = async () => {
        try {
            const { data } = await supabase
                .from('verified_users')
                .select('username')
                .eq('username', profile.username)
                .single()
            setIsVerified(!!data)
        } catch {
            setIsVerified(false)
        }
    }

    const checkVerificationRequest = async () => {
        try {
            const { data } = await supabase
                .from('verification_requests')
                .select('status')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
            
            setVerificationStatus(data?.status || null)
        } catch {
            setVerificationStatus(null)
        }
    }

    const fetchProfile = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
            setProfile(data)
        } catch (error) {
            console.error('Error fetching profile:', error)
        }
    }

    const fetchUserPosts = async () => {
        setLoading(true)
        try {
            // Fetch user's posts
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })

            if (postsError) {
                console.error('Error fetching posts:', postsError)
                setLoading(false)
                return
            }

            if (!postsData || postsData.length === 0) {
                setPosts([])
                setLoading(false)
                return
            }

            // Fetch profile data to attach to posts (Post component expects profiles object)
            const { data: profileData } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .eq('id', session.user.id)
                .single()

            const postsWithProfile = postsData.map(post => ({
                ...post,
                profiles: profileData
            }))

            setPosts(postsWithProfile)
        } catch (error) {
            console.error('Error fetching posts:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchFollowerCounts = async () => {
        try {
            // Get follower count
            const { count: followers } = await supabase
                .from('followers')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', session.user.id)

            // Get following count
            const { count: following } = await supabase
                .from('followers')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', session.user.id)

            setFollowerCount(followers || 0)
            setFollowingCount(following || 0)
        } catch (error) {
            console.error('Error fetching follower counts:', error)
        }
    }

    return (
        <main className="main-feed">
            <header className="feed-header">
                <div style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <i className="ri-arrow-left-line" onClick={onBack} style={{ fontSize: '20px', cursor: 'pointer' }}></i>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '20px' }}>{profile?.full_name || 'Profile'}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{posts.length} posts</div>
                    </div>
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="mobile-logout-button"
                    >
                        <i className="ri-logout-box-r-line"></i>
                    </button>
                    {isVerified && (
                        <>
                            <button
                                onClick={() => setShowSettingsModal(true)}
                                className="mobile-logout-button"
                                style={{ marginLeft: '10px', padding: 0, background: 'transparent', border: 'none' }}
                                title="Admin Settings"
                            >
                                <img
                                    src="https://img.icons8.com/?size=100&id=uO2NlgCRbPZM&format=png&color=000000"
                                    alt="Settings"
                                    style={{ width: '24px', height: '24px' }}
                                />
                            </button>
                            <button
                                onClick={() => setShowVerificationPanel(true)}
                                className="mobile-logout-button"
                                style={{ marginLeft: '10px' }}
                                title="Verification Requests"
                            >
                                <i className="ri-verified-badge-line"></i>
                            </button>
                        </>
                    )}
                </div>
            </header>

            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                <img
                    src={profile?.avatar_url || '/download.png'}
                    style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '15px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{profile?.full_name || 'User'}</span>
                    {isVerified && (
                        <div style={{ position: 'relative', display: 'inline-flex' }}>
                            <i className="ri-verified-badge-fill" style={{ 
                                color: 'var(--twitter-blue)', 
                                fontSize: '18px',
                                filter: 'drop-shadow(0 0 4px rgba(29, 155, 240, 0.5))'
                            }}></i>
                        </div>
                    )}
                </div>
                {isVerified && (
                    <div style={{ 
                        fontSize: '13px', 
                        color: 'var(--twitter-blue)', 
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <i className="ri-shield-check-line"></i>
                        Verified by VogueX
                    </div>
                )}
                {verificationStatus === 'pending' && !isVerified && (
                    <div style={{ 
                        fontSize: '13px', 
                        color: '#FFC107', 
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <i className="ri-time-line"></i>
                        Verification Pending
                    </div>
                )}
                <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' }}>@{profile?.username || 'user'}</div>
                <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '5px' }}>{session.user.email}</div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                    <div style={{ display: 'flex', gap: '5px', fontSize: '14px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{followerCount}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Followers</span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', fontSize: '14px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{followingCount}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Following</span>
                    </div>
                </div>

                {onViewMessages && (
                    <button
                        onClick={onViewMessages}
                        style={{
                            marginTop: '15px',
                            padding: '10px 20px',
                            background: 'var(--accent)',
                            color: 'white',
                            borderRadius: '25px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <i className="ri-message-3-line"></i>
                        Messages
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <LoadingSpinner />
                </div>
            ) : posts.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    You haven't posted anything yet.
                </div>
            ) : (
                posts.map((post) => (
                    <Post 
                        key={post.id} 
                        post={post} 
                        session={session} 
                        onDelete={(postId) => setPosts(posts.filter(p => p.id !== postId))}
                    />
                ))
            )}

            <div style={{ height: '100px' }}></div>

            {showLogoutModal && (
                <LogoutModal onClose={() => setShowLogoutModal(false)} />
            )}

            {showSettingsModal && (
                <SettingsModal session={session} onClose={() => setShowSettingsModal(false)} />
            )}

            {showVerificationPanel && (
                <AdminVerificationPanel session={session} onClose={() => setShowVerificationPanel(false)} />
            )}
        </main>
    )
}
