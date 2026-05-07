import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import ImageZoomModal from './ImageZoomModal'
import ShareModal from './ShareModal'
import VideoPlayer from './VideoPlayer'
import AudioPlayer from './AudioPlayer'
import { validateContent } from '../utils/contentModeration'
import ContentWarningModal from './ContentWarningModal'
import { parseMediaUrls } from '../utils/mediaUtils'

export default function Post({ post, session, onViewProfile, onDelete }) {
    const navigate = useNavigate()
    const [showImageZoom, setShowImageZoom] = useState(false)
    const [zoomIndex, setZoomIndex] = useState(0)
    const [likesCount, setLikesCount] = useState(0)
    const [commentsCount, setCommentsCount] = useState(0)
    const [isLiked, setIsLiked] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const [comments, setComments] = useState([])
    const [newComment, setNewComment] = useState('')
    const [loadingComment, setLoadingComment] = useState(false)
    const [isVerified, setIsVerified] = useState(false)
    const [showShareModal, setShowShareModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showContentWarning, setShowContentWarning] = useState(false)
    const [warningMessage, setWarningMessage] = useState('')
    const [userProfile, setUserProfile] = useState(null)
    // Media carousel state
    const [mediaIndex, setMediaIndex] = useState(0)
    const carouselRef = useRef(null)
    const touchStartX = useRef(null)
    const touchStartY = useRef(null)

    const isOwnPost = session?.user?.id === post.user_id

    // Parse multi-media URLs (JSON arrays or plain strings)
    const imageUrls = parseMediaUrls(post.image_url)
    // video_url may contain both video and audio file URLs
    const videoUrls = parseMediaUrls(post.video_url)
    // Helper: detect audio by file extension in the URL
    const isAudioUrl = (url) => /\.(mp3|m4a|ogg|wav|aac|flac|opus)($|\?)/i.test(url)
    // Combined media array: images first, then video/audio
    const allMedia = [
        ...imageUrls.map(url => ({ type: 'image', url })),
        ...videoUrls.map(url => ({ type: isAudioUrl(url) ? 'audio' : 'video', url })),
    ]
    const totalMedia = allMedia.length

    useEffect(() => {
        fetchUserProfile()
        fetchLikes()
        fetchCommentsCount()
        if (session) {
            checkIfLiked()
        }
    }, [post.id, post.user_id, session])

    useEffect(() => {
        if (userProfile?.username) {
            checkVerified()
        }
    }, [userProfile])

    const fetchUserProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username, full_name, avatar_url')
                .eq('id', post.user_id)
                .single()

            if (data) {
                setUserProfile(data)
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        }
    }

    const username = userProfile?.username || post.profiles?.username || 'user'
    const displayName = userProfile?.full_name || post.profiles?.full_name || 'User'
    const avatarUrl = userProfile?.avatar_url || post.profiles?.avatar_url || '/download.png'

    const checkVerified = async () => {
        try {
            const { data } = await supabase
                .from('verified_users')
                .select('username')
                .eq('username', username)
                .single()
            setIsVerified(!!data)
        } catch {
            setIsVerified(false)
        }
    }

    const fetchLikes = async () => {
        const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)
        setLikesCount(count || 0)
    }

    const fetchCommentsCount = async () => {
        const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)
        setCommentsCount(count || 0)
    }

    const checkIfLiked = async () => {
        const { data } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', session.user.id)
            .single()
        setIsLiked(!!data)
    }

    const toggleLike = async (e) => {
        e.stopPropagation()
        if (!session) {
            alert('Please log in to like posts')
            return
        }

        if (isLiked) {
            await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', session.user.id)
            setIsLiked(false)
            setLikesCount(prev => prev - 1)
        } else {
            await supabase.from('likes').insert({ post_id: post.id, user_id: session.user.id })
            setIsLiked(true)
            setLikesCount(prev => prev + 1)
        }
    }

    const fetchComments = async () => {
        try {
            const { data: commentsData, error } = await supabase
                .from('comments')
                .select('*')
                .eq('post_id', post.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            if (!commentsData || commentsData.length === 0) {
                setComments([])
                return
            }

            const userIds = [...new Set(commentsData.map(c => c.user_id))]
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .in('id', userIds)

            const { data: verifiedData } = await supabase
                .from('verified_users')
                .select('username')

            const verifiedUsernames = new Set(verifiedData?.map(v => v.username) || [])

            const commentsWithProfiles = commentsData.map(comment => {
                const profile = profilesData?.find(p => p.id === comment.user_id)
                return {
                    ...comment,
                    profiles: profile,
                    isVerified: profile ? verifiedUsernames.has(profile.username) : false
                }
            })

            const sortedComments = commentsWithProfiles.sort((a, b) => {
                if (a.isVerified && !b.isVerified) return -1
                if (!a.isVerified && b.isVerified) return 1
                return new Date(b.created_at) - new Date(a.created_at)
            })

            setComments(sortedComments)
        } catch (error) {
            console.error('Error fetching comments:', error)
            setComments([])
        }
    }

    const handleCommentToggle = async (e) => {
        e.stopPropagation()
        if (!showComments) {
            await fetchComments()
        }
        setShowComments(!showComments)
    }

    const sanitizeComment = (text) => {
        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .trim()
            .substring(0, 500)
    }

    const handleAddComment = async (e) => {
        if (e) e.stopPropagation()
        if (!session) {
            alert('Please log in to comment')
            return
        }
        if (!newComment.trim()) return

        const validation = validateContent(newComment)
        if (!validation.isValid) {
            setWarningMessage(validation.message)
            setShowContentWarning(true)
            return
        }

        const sanitizedComment = sanitizeComment(newComment)
        if (!sanitizedComment) return

        setLoadingComment(true)
        try {
            const { data, error } = await supabase
                .from('comments')
                .insert([{ post_id: post.id, user_id: session.user.id, content: sanitizedComment }])
                .select()

            if (error) throw error

            setNewComment('')
            setCommentsCount(prev => prev + 1)
            await fetchComments()
        } catch (error) {
            console.error('Error adding comment:', error)
            alert('Failed to add comment. Please try again.')
        } finally {
            setLoadingComment(false)
        }
    }

    const parseContent = () => {
        let content = post.content || ''
        let locationData = null

        const locationMatch = content.match(/📍\s*(Lat:\s*[-\d.]+,\s*Long:\s*[-\d.]+)/)
        if (locationMatch) {
            locationData = locationMatch[1]
            content = content.replace(/\n\n📍\s*Lat:\s*[-\d.]+,\s*Long:\s*[-\d.]+/, '')
        }

        return { content: content.trim(), location: locationData }
    }

    const { content: cleanContent, location: postLocation } = parseContent()

    const openGoogleMaps = (e) => {
        e.stopPropagation()
        if (postLocation) {
            const latMatch = postLocation.match(/Lat:\s*([-\d.]+)/)
            const longMatch = postLocation.match(/Long:\s*([-\d.]+)/)
            if (latMatch && longMatch) {
                const lat = latMatch[1]
                const lng = longMatch[1]
                window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
            }
        }
    }

    const handleProfileClick = (e) => {
        e.stopPropagation()
        if (username) {
            navigate(`/u/${username}`)
        } else if (onViewProfile && post.user_id) {
            onViewProfile(post.user_id)
        }
    }

    const handleCommentProfileClick = (e, userId, uname) => {
        e.stopPropagation()
        if (uname) {
            navigate(`/u/${uname}`)
        } else if (onViewProfile && userId) {
            onViewProfile(userId)
        }
    }

    const handlePostClick = () => {
        navigate(`/post/${post.id}`)
    }

    const handleDeletePost = async (e) => {
        e.stopPropagation()
        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id)
                .eq('user_id', session.user.id)

            if (error) throw error

            if (onDelete) {
                onDelete(post.id)
            }
            setShowDeleteConfirm(false)
        } catch (error) {
            console.error('Error deleting post:', error)
            alert('Failed to delete post')
        }
    }

    // ── Carousel navigation ──────────────────────────────────────────────────
    const goPrev = (e) => {
        e.stopPropagation()
        setMediaIndex(i => (i - 1 + totalMedia) % totalMedia)
    }

    const goNext = (e) => {
        e.stopPropagation()
        setMediaIndex(i => (i + 1) % totalMedia)
    }

    const goTo = (e, idx) => {
        e.stopPropagation()
        setMediaIndex(idx)
    }

    // Touch swipe handlers
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        const dy = e.changedTouches[0].clientY - touchStartY.current
        // Only swipe if horizontal movement is dominant and significant
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            if (dx < 0) {
                setMediaIndex(i => (i + 1) % totalMedia)
            } else {
                setMediaIndex(i => (i - 1 + totalMedia) % totalMedia)
            }
        }
        touchStartX.current = null
        touchStartY.current = null
    }

    const postUrl = `/post/${post.id}`
    const profileUrl = `/u/${username}`

    // ── Media carousel renderer ──────────────────────────────────────────────
    const renderMediaCarousel = () => {
        if (totalMedia === 0) return null

        const current = allMedia[mediaIndex]

        return (
            <div
                className="post-media-carousel"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                ref={carouselRef}
                style={{ position: 'relative', marginTop: '12px', borderRadius: '16px', overflow: 'hidden' }}
            >
                {/* Current media */}
                {current.type === 'image' ? (
                    <div
                        style={{ cursor: 'zoom-in', lineHeight: 0 }}
                        onClick={(e) => { e.stopPropagation(); setZoomIndex(mediaIndex); setShowImageZoom(true) }}
                    >
                        <img
                            src={current.url}
                            alt={`Media ${mediaIndex + 1}`}
                            onError={(e) => e.target.style.display = 'none'}
                            style={{
                                width: '100%',
                                maxHeight: '520px',
                                objectFit: 'cover',
                                display: 'block',
                                borderRadius: '16px',
                            }}
                        />
                    </div>
                ) : current.type === 'audio' ? (
                    <div onClick={(e) => e.stopPropagation()} style={{ padding: '0 4px' }}>
                        <AudioPlayer
                            src={current.url}
                            title={current.url.split('/').pop()?.replace(/\.[^.]+$/, '')}
                            onError={(e) => e.target.style.display = 'none'}
                        />
                    </div>
                ) : (
                    <div onClick={(e) => e.stopPropagation()}>
                        <VideoPlayer
                            src={current.url}
                            onError={(e) => e.target.style.display = 'none'}
                            id={`${post.id}-${mediaIndex}`}
                        />
                    </div>
                )}

                {/* Arrows — only when multiple media items */}
                {totalMedia > 1 && (
                    <>
                        <button
                            onClick={goPrev}
                            aria-label="Previous"
                            style={{
                                position: 'absolute', left: '10px', top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(0,0,0,0.55)', border: 'none',
                                borderRadius: '50%', width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', cursor: 'pointer', zIndex: 5,
                                backdropFilter: 'blur(6px)',
                                fontSize: '18px', lineHeight: 1,
                            }}
                        >
                            <i className="ri-arrow-left-s-line" />
                        </button>
                        <button
                            onClick={goNext}
                            aria-label="Next"
                            style={{
                                position: 'absolute', right: '10px', top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(0,0,0,0.55)', border: 'none',
                                borderRadius: '50%', width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', cursor: 'pointer', zIndex: 5,
                                backdropFilter: 'blur(6px)',
                                fontSize: '18px', lineHeight: 1,
                            }}
                        >
                            <i className="ri-arrow-right-s-line" />
                        </button>
                    </>
                )}

                {/* Dots */}
                {totalMedia > 1 && (
                    <div
                        style={{
                            position: 'absolute', bottom: '10px', left: 0, right: 0,
                            display: 'flex', justifyContent: 'center', gap: '6px', zIndex: 5,
                        }}
                    >
                        {allMedia.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => goTo(e, idx)}
                                aria-label={`Go to ${item.type} ${idx + 1}`}
                                style={{
                                    width: idx === mediaIndex ? '20px' : '8px',
                                    height: '8px',
                                    borderRadius: '4px',
                                    background: idx === mediaIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'width 0.25s ease, background 0.2s ease',
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Counter badge */}
                {totalMedia > 1 && (
                    <div
                        style={{
                            position: 'absolute', top: '10px', right: '10px',
                            background: 'rgba(0,0,0,0.6)', color: '#fff',
                            fontSize: '12px', fontWeight: 600,
                            padding: '3px 9px', borderRadius: '12px',
                            backdropFilter: 'blur(6px)', zIndex: 5,
                        }}
                    >
                        {mediaIndex + 1}/{totalMedia}
                    </div>
                )}
            </div>
        )
    }

    return (
        <article className="post" onClick={handlePostClick} style={{ cursor: 'pointer' }}>
            <div className="post-avatar" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
                <img src={avatarUrl} alt="User" loading="lazy" />
            </div>
            <div className="post-content">
                <div className="post-header">
                    <span className="display-name" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>{displayName}</span>
                    {isVerified && <i className="ri-verified-badge-fill verified-badge"></i>}
                    <span className="username" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>@{username}</span>
                    <span className="time">· {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : 'Just now'}</span>
                    {/* Post route URL link */}
                    <a
                        href={postUrl}
                        onClick={(e) => { e.stopPropagation(); navigate(postUrl) }}
                        style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '12px', opacity: 0.6 }}
                        title={`View post #${post.id}`}
                    >
                        <i className="ri-link" style={{ fontSize: '12px' }}></i>
                    </a>
                </div>
                <div className="post-text">
                    {cleanContent}
                </div>

                {/* ── Unified media carousel ──────────────────────────────── */}
                {renderMediaCarousel()}

                {/* Image zoom modal (supports multi-image array) */}
                {showImageZoom && imageUrls.length > 0 && (
                    <ImageZoomModal
                        imageUrls={imageUrls}
                        initialIndex={zoomIndex < imageUrls.length ? zoomIndex : 0}
                        onClose={() => setShowImageZoom(false)}
                    />
                )}

                {postLocation && (
                    <div className="post-location" onClick={openGoogleMaps}>
                        <i className="ri-map-pin-fill"></i>
                        <span>{postLocation}</span>
                    </div>
                )}
                <div className="post-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="action-item blue" onClick={handleCommentToggle} style={{ cursor: 'pointer' }}>
                        <i className="ri-chat-1-line"></i> {commentsCount}
                    </div>
                    <div
                        className={`action-item pink ${isLiked ? 'liked' : ''}`}
                        onClick={toggleLike}
                        style={{ cursor: 'pointer', color: isLiked ? '#f91880' : 'inherit' }}
                    >
                        <i className={isLiked ? 'ri-heart-3-fill' : 'ri-heart-3-line'}></i> {likesCount}
                    </div>
                    <div className="action-item green" onClick={(e) => { e.stopPropagation(); setShowShareModal(true) }} style={{ cursor: 'pointer' }}>
                        <i className="ri-share-line"></i>
                    </div>
                    {isOwnPost && (
                        <div className="action-item red" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }} style={{ cursor: 'pointer', color: '#ff4444' }}>
                            <i className="ri-delete-bin-line"></i>
                        </div>
                    )}
                </div>

                {showShareModal && (
                    <ShareModal
                        post={post}
                        session={session}
                        onClose={() => setShowShareModal(false)}
                    />
                )}

                {showContentWarning && (
                    <ContentWarningModal 
                        message={warningMessage}
                        onClose={() => setShowContentWarning(false)}
                    />
                )}

                {showComments && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
                        {session && (
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !loadingComment && newComment.trim()) {
                                            handleAddComment()
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        background: '#16181c',
                                        border: '1px solid var(--border)',
                                        borderRadius: '20px',
                                        padding: '10px 15px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={loadingComment || !newComment.trim()}
                                    className="post-btn-small"
                                    style={{ opacity: loadingComment || !newComment.trim() ? 0.5 : 1 }}
                                >
                                    {loadingComment ? '...' : 'Post'}
                                </button>
                            </div>
                        )}

                        {comments.map((comment) => (
                            <div 
                                key={comment.id} 
                                style={{ 
                                    display: 'flex', 
                                    gap: '10px', 
                                    marginBottom: '12px',
                                    padding: comment.isVerified ? '10px' : '0',
                                    background: comment.isVerified ? 'rgba(0, 122, 255, 0.05)' : 'transparent',
                                    borderRadius: comment.isVerified ? '12px' : '0',
                                    border: comment.isVerified ? '1px solid rgba(0, 122, 255, 0.1)' : 'none'
                                }}
                            >
                                <img
                                    src={comment.profiles?.avatar_url || '/download.png'}
                                    style={{ 
                                        width: '32px', 
                                        height: '32px', 
                                        borderRadius: '50%', 
                                        cursor: 'pointer',
                                        border: comment.isVerified ? '2px solid var(--twitter-blue)' : 'none'
                                    }}
                                    alt="Commenter"
                                    onClick={(e) => handleCommentProfileClick(e, comment.user_id, comment.profiles?.username)}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                        <span
                                            style={{ fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                                            onClick={(e) => handleCommentProfileClick(e, comment.user_id, comment.profiles?.username)}
                                        >
                                            {comment.profiles?.full_name || 'User'}
                                        </span>
                                        {comment.isVerified && (
                                            <i className="ri-verified-badge-fill" style={{ color: 'var(--twitter-blue)', fontSize: '14px', marginLeft: '2px' }}></i>
                                        )}
                                        <span
                                            style={{ color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer' }}
                                            onClick={(e) => handleCommentProfileClick(e, comment.user_id, comment.profiles?.username)}
                                        >
                                            @{comment.profiles?.username || 'user'}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                            · {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '14px', marginTop: '4px' }}>{comment.content}</div>
                                </div>
                            </div>
                        ))}

                        {comments.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>
                                No comments yet. Be the first to comment!
                            </div>
                        )}
                    </div>
                )}

                {showDeleteConfirm && (
                    <div className="delete-modal-overlay" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-content">
                            <div className="delete-icon-container">
                                <i className="ri-delete-bin-5-fill delete-icon-large"></i>
                            </div>
                            <h3 className="delete-modal-title">Delete Post?</h3>
                            <p className="delete-modal-text">
                                Are you sure you want to delete this post?
                                <br />
                                This action cannot be undone.
                            </p>
                            <div className="delete-modal-actions">
                                <button onClick={handleDeletePost} className="delete-btn-confirm">Delete</button>
                                <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false) }} className="delete-btn-cancel">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </article>
    )
}
