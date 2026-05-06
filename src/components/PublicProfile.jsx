import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Post from './Post'
import LoadingSpinner from './LoadingSpinner'

export default function PublicProfile({ session }) {
    const { username: rawUsername } = useParams()
    const navigate = useNavigate()
    const [profile, setProfile] = useState(null)
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [followersCount, setFollowersCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [isFollowing, setIsFollowing] = useState(false)
    const [isVerified, setIsVerified] = useState(false)

    // Remove @ symbol if present and handle undefined
    const cleanUsername = rawUsername?.startsWith('@') ? rawUsername.slice(1) : rawUsername
    
    console.log('Raw username:', rawUsername)
    console.log('Clean username:', cleanUsername)

    useEffect(() => {
        fetchProfile()
    }, [cleanUsername])

    const fetchProfile = async () => {
        try {
            setLoading(true)

            // Fetch profile by username
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', cleanUsername)
                .single()

            if (profileError) throw profileError

            if (!profileData) {
                setError('User not found')
                return
            }

            setProfile(profileData)

            // Fetch user's posts
            const { data: postsData } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', profileData.id)
                .order('created_at', { ascending: false })

            const postsWithProfile = postsData?.map(post => ({
                ...post,
                profiles: profileData
            })) || []

            setPosts(postsWithProfile)

            // Fetch followers count
            const { count: followersCount } = await supabase
                .from('followers')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', profileData.id)

            setFollowersCount(followersCount || 0)

            // Fetch following count
            const { count: followingCount } = await supabase
                .from('followers')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', profileData.id)

            setFollowingCount(followingCount || 0)

            // Check if current user is following
            if (session?.user?.id) {
                const { data: followData } = await supabase
                    .from('followers')
                    .select('id')
                    .eq('follower_id', session.user.id)
                    .eq('following_id', profileData.id)
                    .single()

                setIsFollowing(!!followData)
            }

            // Check if user is verified
            const { data: verifiedData } = await supabase
                .from('verified_users')
                .select('username')
                .eq('username', profileData.username)
                .single()

            setIsVerified(!!verifiedData)
        } catch (err) {
            console.error('Error fetching profile:', err)
            setError('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    const handleBack = () => {
        navigate('/')
    }

    const handleFollow = async () => {
        if (!session) {
            alert('Please log in to follow users')
            return
        }

        try {
            if (isFollowing) {
                await supabase
                    .from('followers')
                    .delete()
                    .eq('follower_id', session.user.id)
                    .eq('following_id', profile.id)
                setIsFollowing(false)
                setFollowersCount(prev => prev - 1)
            } else {
                await supabase
                    .from('followers')
                    .insert({
                        follower_id: session.user.id,
                        following_id: profile.id
                    })
                setIsFollowing(true)
                setFollowersCount(prev => prev + 1)
            }
        } catch (error) {
            console.error('Error following/unfollowing:', error)
        }
    }

    if (loading) {
        return (
            <div className="main-feed">
                <header className="feed-header">
                    <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '20px' }}>
                            <i className="ri-arrow-left-line"></i>
                        </button>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Profile</h2>
                    </div>
                </header>
                <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                    <LoadingSpinner />
                </div>
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="main-feed">
                <header className="feed-header">
                    <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '20px' }}>
                            <i className="ri-arrow-left-line"></i>
                        </button>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Profile</h2>
                    </div>
                </header>
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <i className="ri-user-line" style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}></i>
                    <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>User Not Found</h3>
                    <p style={{ fontSize: '14px', marginBottom: '24px' }}>@{cleanUsername} doesn't exist</p>
                    <button onClick={handleBack} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                        Go to Home
                    </button>
                </div>
            </div>
        )
    }

    const isOwnProfile = session?.user?.id === profile.id

    return (
        <div className="main-feed">
            <header className="feed-header">
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '20px', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                            <i className="ri-arrow-left-line"></i>
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{profile.full_name}</h2>
                                {isVerified && (
                                    <i className="ri-verified-badge-fill" style={{ color: 'var(--twitter-blue)', fontSize: '18px' }}></i>
                                )}
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{posts.length} posts</p>
                        </div>
                    </div>
                    
                    {/* Logout button - only for own profile */}
                    {isOwnProfile && (
                        <button
                            onClick={async () => {
                                if (confirm('Are you sure you want to log out?')) {
                                    await supabase.auth.signOut()
                                    navigate('/')
                                }
                            }}
                            style={{
                                padding: '8px 16px',
                                background: 'rgba(255, 59, 48, 0.1)',
                                color: '#ff3b30',
                                border: '1px solid rgba(255, 59, 48, 0.3)',
                                borderRadius: '20px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)'
                                e.currentTarget.style.borderColor = 'rgba(255, 59, 48, 0.5)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)'
                                e.currentTarget.style.borderColor = 'rgba(255, 59, 48, 0.3)'
                            }}
                        >
                            <i className="ri-logout-box-r-line"></i>
                            Logout
                        </button>
                    )}
                </div>
            </header>

            {/* Profile Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <img src={profile.avatar_url || '/download.png'} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--border)' }} alt={profile.full_name} />
                    {!isOwnProfile && session && (
                        <button onClick={handleFollow} style={{ padding: '10px 24px', background: isFollowing ? 'transparent' : 'white', color: isFollowing ? 'white' : 'black', border: isFollowing ? '1px solid var(--border)' : 'none', borderRadius: '20px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s' }}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                    )}
                    {isOwnProfile && (
                        <button onClick={() => navigate('/')} style={{ padding: '10px 24px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid var(--border)', borderRadius: '20px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s' }}>
                            Edit Profile
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{profile.full_name}</h1>
                    {isVerified && (
                        <i className="ri-verified-badge-fill" style={{ color: 'var(--twitter-blue)', fontSize: '20px' }}></i>
                    )}
                </div>
                <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '12px' }}>@{profile.username}</p>

                {profile.bio && (
                    <p style={{ fontSize: '15px', marginBottom: '12px', lineHeight: '1.5' }}>{profile.bio}</p>
                )}

                <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                    <div><span style={{ fontWeight: '700' }}>{followingCount}</span> <span style={{ color: 'var(--text-muted)' }}>Following</span></div>
                    <div><span style={{ fontWeight: '700' }}>{followersCount}</span> <span style={{ color: 'var(--text-muted)' }}>Followers</span></div>
                </div>
            </div>

            {/* Posts */}
            <div>
                {posts.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <i className="ri-quill-pen-line" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '10px' }}></i>
                        <div>No posts yet</div>
                    </div>
                ) : (
                    posts.map(post => (
                        <Post key={post.id} post={post} session={session} onViewProfile={() => {}} />
                    ))
                )}
            </div>

            {/* Share Profile */}
            <div style={{ padding: '20px', borderTop: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Share this profile</h3>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copied!') }} style={{ padding: '10px 16px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="ri-link"></i>
                    Copy Profile Link
                </button>
            </div>
        </div>
    )
}
