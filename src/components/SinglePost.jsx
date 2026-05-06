import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Post from './Post'
import LoadingSpinner from './LoadingSpinner'

export default function SinglePost({ session }) {
    const { postId } = useParams()
    const navigate = useNavigate()
    const [post, setPost] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchPost()
    }, [postId])

    const fetchPost = async () => {
        try {
            setLoading(true)
            
            // Fetch the post
            const { data: postData, error: postError } = await supabase
                .from('posts')
                .select('*')
                .eq('id', postId)
                .single()

            if (postError) throw postError

            if (!postData) {
                setError('Post not found')
                return
            }

            // Fetch the profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .eq('id', postData.user_id)
                .single()

            setPost({
                ...postData,
                profiles: profileData
            })
        } catch (err) {
            console.error('Error fetching post:', err)
            setError('Failed to load post')
        } finally {
            setLoading(false)
        }
    }

    const handleBack = () => {
        navigate('/')
    }

    if (loading) {
        return (
            <div className="main-feed">
                <header className="feed-header">
                    <div style={{ 
                        padding: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px',
                        borderBottom: '1px solid var(--border)'
                    }}>
                        <button 
                            onClick={handleBack}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                fontSize: '20px',
                                padding: '8px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <i className="ri-arrow-left-line"></i>
                        </button>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Post</h2>
                    </div>
                </header>
                <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                    <LoadingSpinner />
                </div>
            </div>
        )
    }

    if (error || !post) {
        return (
            <div className="main-feed">
                <header className="feed-header">
                    <div style={{ 
                        padding: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px',
                        borderBottom: '1px solid var(--border)'
                    }}>
                        <button 
                            onClick={handleBack}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                fontSize: '20px',
                                padding: '8px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <i className="ri-arrow-left-line"></i>
                        </button>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Post</h2>
                    </div>
                </header>
                <div style={{ 
                    padding: '60px 20px', 
                    textAlign: 'center',
                    color: 'var(--text-muted)'
                }}>
                    <i className="ri-error-warning-line" style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}></i>
                    <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Post Not Found</h3>
                    <p style={{ fontSize: '14px', marginBottom: '24px' }}>
                        This post may have been deleted or doesn't exist.
                    </p>
                    <button
                        onClick={handleBack}
                        style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="main-feed">
            <header className="feed-header">
                <div style={{ 
                    padding: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px',
                    borderBottom: '1px solid var(--border)'
                }}>
                    <button 
                        onClick={handleBack}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            fontSize: '20px',
                            padding: '8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <i className="ri-arrow-left-line"></i>
                    </button>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Post</h2>
                </div>
            </header>

            <Post 
                post={post} 
                session={session} 
                onViewProfile={(userId) => {
                    const username = post.profiles?.username
                    if (username) {
                        navigate(`/u/${username}`)
                    }
                }}
            />

            {/* Share Section */}
            <div style={{
                padding: '20px',
                borderTop: '1px solid var(--border)',
                background: 'rgba(255, 255, 255, 0.02)'
            }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
                    Share this post
                </h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => {
                            const url = window.location.href
                            navigator.clipboard.writeText(url)
                            alert('Link copied to clipboard!')
                        }}
                        style={{
                            padding: '10px 16px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <i className="ri-link"></i>
                        Copy Link
                    </button>
                </div>
            </div>
        </div>
    )
}
