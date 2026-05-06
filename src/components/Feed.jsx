import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ComposeBox from './ComposeBox'
import Post from './Post'
import ProfileEditModal from './ProfileEditModal'
import SearchBar from './SearchBar'
import LoadingSpinner from './LoadingSpinner'
import Stories from './Stories'


export default function Feed({ session, onViewProfile, onViewingStoryChange, isViewingStory = false }) {
    const [posts, setPosts] = useState([])
    const [allPosts, setAllPosts] = useState([])
    const [userAvatar, setUserAvatar] = useState('/download.png')
    const [showEditModal, setShowEditModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState('forYou') // 'forYou', 'trending', 'following'
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [touchStart, setTouchStart] = useState(0)
    const [pullDistance, setPullDistance] = useState(0)
    const [isEditingStory, setIsEditingStory] = useState(false)

    const handleStoryViewingChange = (viewing) => {
        console.log('📱 Feed: handleStoryViewingChange called with:', viewing)
        if (onViewingStoryChange) {
            console.log('📱 Feed: Calling parent onViewingStoryChange')
            onViewingStoryChange(viewing)
        }
    }

    const handleStoryEditorChange = (editing) => {
        console.log('📱 Feed: handleStoryEditorChange called with:', editing)
        setIsEditingStory(editing)
        if (onViewingStoryChange) {
            onViewingStoryChange(editing)
        }
    }

    useEffect(() => {
        console.log('📱 Feed: isViewingStory prop changed to:', isViewingStory)
    }, [isViewingStory])

    useEffect(() => {
        fetchPosts()
        getUserProfile()

        // Subscribe to real-time changes for posts table
        console.log('🔌 Setting up real-time subscription for posts...')

        const channel = supabase
            .channel('posts-changes', {
                config: {
                    broadcast: { self: true }
                }
            })
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'posts'
                },
                (payload) => {
                    console.log('📡 Real-time event received:', payload.eventType, payload)
                    // Immediately refetch posts
                    fetchPosts()
                }
            )
            .subscribe((status) => {
                console.log('📊 Subscription status:', status)
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to posts changes')
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Subscription failed - check Supabase Realtime settings')
                }
            })

        return () => {
            console.log('🔌 Cleaning up subscription...')
            supabase.removeChannel(channel)
        }
    }, [])

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setPosts(allPosts)
        } else {
            const filtered = allPosts.filter(post => {
                const content = post.content?.toLowerCase() || ''
                const username = post.profiles?.username?.toLowerCase() || ''
                const fullName = post.profiles?.full_name?.toLowerCase() || ''
                const query = searchQuery.toLowerCase()
                return content.includes(query) || username.includes(query) || fullName.includes(query)
            })
            setPosts(filtered)
        }
    }, [searchQuery, allPosts])

    useEffect(() => {
        fetchPosts(activeTab)
    }, [activeTab])

    const getUserProfile = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', session.user.id)
                .single()

            if (data?.avatar_url) {
                setUserAvatar(data.avatar_url)
            }
        } catch (error) {
            console.error('Error loading avatar:', error)
        }
    }

    const fetchPosts = async (feedType = activeTab) => {
        try {
            let postsData = []
            let postsError = null

            if (feedType === 'forYou') {
                // For You: Random posts
                const { data, error } = await supabase
                    .from('posts')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50)
                postsData = data
                postsError = error
            } else if (feedType === 'trending') {
                // Trending: Posts sorted by engagement (likes + comments)
                const { data: allPosts, error } = await supabase
                    .from('posts')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(100)

                if (error) {
                    postsError = error
                } else {
                    // Fetch likes and comments count for each post
                    const postsWithEngagement = await Promise.all(allPosts.map(async (post) => {
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
                            engagement: (likesCount || 0) + (commentsCount || 0)
                        }
                    }))

                    // Sort by engagement, then by created_at
                    postsData = postsWithEngagement.sort((a, b) => {
                        if (b.engagement !== a.engagement) {
                            return b.engagement - a.engagement
                        }
                        return new Date(b.created_at) - new Date(a.created_at)
                    })
                }
            } else if (feedType === 'following') {
                // Following: Posts from followed users only
                const { data: followingData, error: followError } = await supabase
                    .from('followers')
                    .select('following_id')
                    .eq('follower_id', session.user.id)

                if (followError) {
                    console.error('Error fetching following:', followError)
                    postsData = []
                } else if (!followingData || followingData.length === 0) {
                    // No following, empty feed
                    postsData = []
                } else {
                    const followingIds = followingData.map(f => f.following_id)
                    const { data, error } = await supabase
                        .from('posts')
                        .select('*')
                        .in('user_id', followingIds)
                        .order('created_at', { ascending: false })
                    postsData = data
                    postsError = error
                }
            }

            if (postsError) {
                console.error('Error fetching posts:', postsError)
                return
            }

            // Fetch all profiles separately
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError)
            }

            // Merge posts with their profiles
            const postsWithProfiles = postsData.map(post => {
                const profile = profilesData?.find(p => p.id === post.user_id)
                return {
                    ...post,
                    profiles: profile || null
                }
            })

            setPosts(postsWithProfiles || [])
            setAllPosts(postsWithProfiles || [])
        } catch (err) {
            console.error('Unexpected error:', err)
        }
    }

    const handleTouchStart = (e) => {
        if (window.scrollY === 0) {
            setTouchStart(e.touches[0].clientY)
        }
    }

    const handleTouchMove = (e) => {
        if (touchStart > 0 && window.scrollY === 0) {
            const touchY = e.touches[0].clientY
            const diff = touchY - touchStart
            if (diff > 0) {
                setPullDistance(Math.min(diff * 0.5, 100)) // Limit pull distance
            }
        }
    }

    const handleTouchEnd = async () => {
        if (pullDistance > 60) {
            setIsRefreshing(true)
            await fetchPosts()
            setIsRefreshing(false)
        }
        setTouchStart(0)
        setPullDistance(0)
    }

    const handleManualRefresh = async () => {
        setIsRefreshing(true)
        await fetchPosts()
        setIsRefreshing(false)
    }

    return (
        <main
            className="main-feed"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {pullDistance > 0 && (
                <div style={{
                    height: `${pullDistance}px`,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'height 0.2s'
                }}>
                    <LoadingSpinner />
                </div>
            )}
            {isRefreshing && pullDistance === 0 && (
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                    <LoadingSpinner />
                </div>
            )}
            <header className="feed-header" style={{ display: (isViewingStory || isEditingStory) ? 'none' : 'block' }}>
                <div className="header-top">
                    <div
                        className="mini-avatar"
                        style={{ width: '30px', height: '30px', background: '#333', overflow: 'hidden', cursor: 'pointer' }}
                        onClick={() => setShowEditModal(true)}
                    >
                        <img src={userAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" />
                    </div>

                    <div className="mobile-logo" style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        <img src="/logo.svg" alt="VogueX" style={{ width: '32px', height: '32px' }} />
                        VogueX
                    </div>
                </div>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                    <SearchBar
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search posts, users..."
                    />
                </div>

                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-primary)'
                }}>
                    <button
                        onClick={() => setActiveTab('forYou')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            background: 'transparent',
                            color: activeTab === 'forYou' ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'forYou' ? 'bold' : 'normal',
                            borderBottom: activeTab === 'forYou' ? '3px solid var(--accent)' : '3px solid transparent',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            fontSize: '15px'
                        }}
                    >
                        For You
                    </button>
                    <button
                        onClick={() => setActiveTab('trending')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            background: 'transparent',
                            color: activeTab === 'trending' ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'trending' ? 'bold' : 'normal',
                            borderBottom: activeTab === 'trending' ? '3px solid var(--accent)' : '3px solid transparent',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            fontSize: '15px'
                        }}
                    >
                        <i className="ri-fire-line" style={{ marginRight: '5px' }}></i>
                        Trending
                    </button>
                    <button
                        onClick={() => setActiveTab('following')}
                        style={{
                            flex: 1,
                            padding: '15px',
                            background: 'transparent',
                            color: activeTab === 'following' ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontWeight: activeTab === 'following' ? 'bold' : 'normal',
                            borderBottom: activeTab === 'following' ? '3px solid var(--accent)' : '3px solid transparent',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            fontSize: '15px'
                        }}
                    >
                        Following
                    </button>
                </div>

            </header>

            {/* Mobile Stories Bar */}
            <div className="mobile-stories-wrapper">
                <Stories session={session} mode="mobile" onViewingChange={handleStoryViewingChange} onEditorChange={handleStoryEditorChange} />
            </div>

            <ComposeBox session={session} />

            {posts.map((post) => (
                <Post key={post.id} post={post} session={session} onViewProfile={onViewProfile} />
            ))}

            {posts.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchQuery ? (
                        <>
                            <i className="ri-search-line" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '10px' }}></i>
                            <div>No posts found</div>
                        </>
                    ) : activeTab === 'following' ? (
                        <>
                            <i className="ri-user-follow-line" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '10px' }}></i>
                            <div style={{ marginBottom: '8px' }}>Follow people to see their posts here</div>
                            <div style={{ fontSize: '14px', opacity: 0.7 }}>Posts from people you follow will appear in this feed</div>
                        </>
                    ) : (
                        <>
                            <i className="ri-quill-pen-line" style={{ fontSize: '48px', opacity: 0.5, marginBottom: '10px' }}></i>
                            <div>No posts yet. Be the first to post!</div>
                        </>
                    )}
                </div>
            )}

            <div style={{ height: '100px' }}></div>

            {showEditModal && (
                <ProfileEditModal
                    session={session}
                    onClose={() => setShowEditModal(false)}
                    onUpdate={() => {
                        getUserProfile()
                        fetchPosts()
                    }}
                />
            )}
        </main>
    )
}
