import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { formatDistanceToNow } from 'date-fns'
import ImageZoomModal from './ImageZoomModal'
import Post from './Post'

export default function OtherUserProfile({ userId, session, onBack, onMessage }) {
    const [posts, setPosts] = useState([])
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isVerified, setIsVerified] = useState(false)
    const [showImageZoom, setShowImageZoom] = useState(false)
    const [zoomedImage, setZoomedImage] = useState(null)
    const [isOnline, setIsOnline] = useState(false)
    const [lastSeen, setLastSeen] = useState(null)
    const [followerCount, setFollowerCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [isFollowing, setIsFollowing] = useState(false)

    useEffect(() => {
        fetchProfile()
        fetchUserPosts()
        fetchUserPresence()
        fetchFollowerCounts()
        checkIfFollowing()

        // Subscribe to presence changes
        const presenceChannel = supabase
            .channel(`presence:${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'user_presence',
                filter: `user_id=eq.${userId}`
            }, () => {
                fetchUserPresence()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(presenceChannel)
        }
    }, [userId])

    useEffect(() => {
        if (profile?.username) {
            checkVerified()
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

    const fetchUserPresence = async () => {
        try {
            const { data } = await supabase
                .from('user_presence')
                .select('is_online, last_seen')
                .eq('user_id', userId)
                .single()

            if (data) {
                setIsOnline(data.is_online)
                setLastSeen(data.last_seen)
            }
        } catch (error) {
            console.error('Error fetching user presence:', error)
        }
    }

    const handleImageClick = (imageUrl) => {
        setZoomedImage(imageUrl)
        setShowImageZoom(true)
    }

    const fetchProfile = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
            setProfile(data)
        } catch (error) {
            console.error('Error fetching profile:', error)
        }
    }

    const fetchUserPosts = async () => {
        setLoading(true)
        try {
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', userId)
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

            const { data: profileData } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .eq('id', userId)
                .single()

            const postsWithCounts = await Promise.all(postsData.map(async (post) => {
                const { count: likesCount } = await supabase
                    .from('likes')
                    .select('*', { count: 'exact', head: true })
                    .eq('post_id', post.id)

                const { count: commentsCount } = await supabase
                    .from('comments')
                    .select('*', { count: 'exact', head: true })
                    .eq('post_id', post.id)

                return {
                    ...post,
                    profiles: profileData,
                    likesCount,
                    commentsCount
                }
            }))

            setPosts(postsWithCounts)
        } catch (error) {
            console.error('Error fetching posts:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchFollowerCounts = async () => {
        try {
            const { count: followers } = await supabase
                .from('followers')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', userId)

            const { count: following } = await supabase
                .from('followers')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', userId)

            setFollowerCount(followers || 0)
            setFollowingCount(following || 0)
        } catch (error) {
            console.error('Error fetching follower counts:', error)
        }
    }

    const checkIfFollowing = async () => {
        if (!session) return
        try {
            const { data } = await supabase
                .from('followers')
                .select('id')
                .eq('follower_id', session.user.id)
                .eq('following_id', userId)
                .single()
            setIsFollowing(!!data)
        } catch {
            setIsFollowing(false)
        }
    }

    const handleFollow = async () => {
        if (!session) return
        try {
            if (isFollowing) {
                await supabase
                    .from('followers')
                    .delete()
                    .eq('follower_id', session.user.id)
                    .eq('following_id', userId)
                setFollowerCount(prev => Math.max(0, prev - 1))
            } else {
                await supabase
                    .from('followers')
                    .insert({ follower_id: session.user.id, following_id: userId })
                setFollowerCount(prev => prev + 1)
            }
            setIsFollowing(!isFollowing)
        } catch (error) {
            console.error('Error toggling follow:', error)
        }
    }

    const handleMessage = () => {
        if (onMessage && profile) {
            onMessage(profile)
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
                </div>
            </header>

            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative', width: '100px', marginBottom: '15px' }}>
                    <img
                        src={profile?.avatar_url || '/download.png'}
                        style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }}
                        alt="Profile"
                    />
                    {isOnline && (
                        <span className="active-status-badge" style={{
                            position: 'absolute',
                            bottom: '5px',
                            right: '5px',
                            width: '18px',
                            height: '18px',
                            background: '#00ba7c',
                            border: '3px solid #000',
                            borderRadius: '50%'
                        }}></span>
                    )}
                </div>
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
                <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '2px' }}>@{profile?.username || 'user'}</div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '5px', fontSize: '14px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{followerCount}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Followers</span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', fontSize: '14px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{followingCount}</span>
                        <span style={{ color: 'var(--text-muted)' }}>Following</span>
                    </div>
                </div>

                <div style={{ fontSize: '13px', color: isOnline ? '#00ba7c' : 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {isOnline ? (
                        <>
                            <span style={{ width: '6px', height: '6px', background: '#00ba7c', borderRadius: '50%' }}></span>
                            Active now
                        </>
                    ) : lastSeen ? (
                        <>Active {formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}</>
                    ) : null}
                </div>

                {isVerified && (
                    <div style={{
                        marginTop: '15px',
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.1) 0%, rgba(0, 81, 213, 0.1) 100%)',
                        border: '1px solid rgba(0, 122, 255, 0.3)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <i className="ri-shield-star-fill" style={{ color: 'var(--twitter-blue)', fontSize: '20px' }}></i>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--twitter-blue)' }}>
                                Supreme Authority
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Official VogueX Owner
                            </div>
                        </div>
                    </div>
                )}

                {profile?.website && (
                    <div style={{ marginTop: '10px', fontSize: '14px' }}>
                        <i className="ri-link" style={{ marginRight: '5px', color: 'var(--twitter-blue)' }}></i>
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--twitter-blue)' }}>
                            {profile.website}
                        </a>
                    </div>
                )}

                {userId !== session?.user?.id && (
                    <button
                        onClick={handleFollow}
                        style={{
                            marginTop: '15px',
                            padding: '10px 24px',
                            background: isFollowing ? 'transparent' : 'var(--text-primary)',
                            color: isFollowing ? 'var(--text-primary)' : 'var(--bg-primary)',
                            border: isFollowing ? '1px solid var(--border)' : 'none',
                            borderRadius: '25px',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <i className={isFollowing ? 'ri-user-unfollow-line' : 'ri-user-add-line'}></i>
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                )}

                {onMessage && userId !== session?.user?.id && (
                    <button
                        onClick={handleMessage}
                        style={{
                            marginTop: '15px',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
                            color: 'white',
                            borderRadius: '25px',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                            transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        <i className="ri-message-3-line"></i>
                        Message
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <i className="ri-loader-4-line" style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}></i>
                    <div style={{ marginTop: '10px' }}>Loading posts...</div>
                </div>
            ) : posts.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <i className="ri-file-list-3-line" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '10px' }}></i>
                    <div>No posts yet</div>
                </div>
            ) : (
                posts.map((post) => (
                    <Post key={post.id} post={post} session={session} />
                ))
            )}

            <div style={{ height: '100px' }}></div>

            {showImageZoom && zoomedImage && (
                <ImageZoomModal imageUrl={zoomedImage} onClose={() => setShowImageZoom(false)} />
            )}
        </main>
    )
}
