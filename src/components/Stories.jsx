import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { formatDistanceToNow } from 'date-fns'
import { validateContent } from '../utils/contentModeration'
import ContentWarningModal from './ContentWarningModal'
import StoryEditor from './StoryEditor'

// Helper component to fetch and display viewers
function ViewersList({ viewers }) {
    const [profiles, setProfiles] = useState([])

    useEffect(() => {
        const fetchProfiles = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .in('id', viewers)
            
            if (data) setProfiles(data)
        }
        
        if (viewers && viewers.length > 0) {
            fetchProfiles()
        }
    }, [viewers])

    return profiles.map(profile => (
        <div key={profile.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <img src={profile.avatar_url || '/download.png'} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }} alt="" />
            <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>{profile.full_name || 'User'}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>@{profile.username || 'user'}</div>
            </div>
        </div>
    ))
}

export default function Stories({ session, mode = 'mobile', onViewingChange, onEditorChange }) {
    const [stories, setStories] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [viewingStory, setViewingStory] = useState(null)
    const [currentUserStory, setCurrentUserStory] = useState(null)
    const fileInputRef = useRef(null)
    const [previewFile, setPreviewFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [mediaType, setMediaType] = useState('image')
    const [showPreview, setShowPreview] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [storyToDelete, setStoryToDelete] = useState(null)
    const [showOptionsMenu, setShowOptionsMenu] = useState(false)
    const [replyText, setReplyText] = useState('')
    const [showViewersList, setShowViewersList] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const videoRef = useRef(null)
    const [showAllStories, setShowAllStories] = useState(false)
    const [showContentWarning, setShowContentWarning] = useState(false)
    const [warningMessage, setWarningMessage] = useState('')
    const [showEditor, setShowEditor] = useState(false)
    const [editorImageUrl, setEditorImageUrl] = useState(null)

    useEffect(() => {
        fetchStories()
        const channel = supabase
            .channel('public:stories')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => fetchStories())
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [session])

    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
    }, [previewUrl])

    useEffect(() => {
        if (!viewingStory) return
        const currentStory = viewingStory.stories[viewingStory.currentIndex || 0]
        if (currentStory && currentStory.media_type === 'image') {
            const timer = setTimeout(() => {
                const idx = viewingStory.currentIndex || 0
                if (idx < viewingStory.stories.length - 1) {
                    setViewingStory(prev => ({ ...prev, currentIndex: idx + 1 }))
                } else {
                    handleCloseViewer()
                }
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [viewingStory])

    const fetchStories = async () => {
        try {
            const { data, error } = await supabase
                .from('stories')
                .select('*, profiles:user_id (id, username, full_name, avatar_url)')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
            if (error) throw error

            // Fetch verified users
            const { data: verifiedData } = await supabase
                .from('verified_users')
                .select('username')
            const verifiedUsernames = new Set(verifiedData?.map(v => v.username) || [])

            // Fetch view counts from story_views table
            const storyIds = data.map(s => s.id)
            const { data: viewsData } = await supabase
                .from('story_views')
                .select('story_id, viewer_id')
                .in('story_id', storyIds)

            // Create a map of story views
            const viewsMap = {}
            if (viewsData) {
                viewsData.forEach(view => {
                    if (!viewsMap[view.story_id]) {
                        viewsMap[view.story_id] = []
                    }
                    viewsMap[view.story_id].push(view.viewer_id)
                })
            }

            // Add view counts to stories
            const storiesWithViews = data.map(story => ({
                ...story,
                viewCount: viewsMap[story.id]?.length || 0,
                viewerIds: viewsMap[story.id] || []
            }))

            const grouped = storiesWithViews.reduce((acc, story) => {
                const uid = story.user_id
                if (!acc[uid]) {
                    acc[uid] = { 
                        user: story.profiles, 
                        userId: uid, 
                        stories: [], 
                        hasUnwatched: false, 
                        latestCreatedAt: story.created_at,
                        isVerified: verifiedUsernames.has(story.profiles?.username)
                    }
                }
                acc[uid].stories.push(story)
                if (!story.viewers || !story.viewers.includes(session.user.id)) acc[uid].hasUnwatched = true
                return acc
            }, {})
            const sorted = Object.values(grouped).sort((a, b) => {
                // Current user's stories always first
                if (a.userId === session.user.id) return -1
                if (b.userId === session.user.id) return 1
                
                // Then unwatched stories
                if (a.hasUnwatched && !b.hasUnwatched) return -1
                if (!a.hasUnwatched && b.hasUnwatched) return 1
                
                // Then by latest created
                return new Date(b.latestCreatedAt) - new Date(a.latestCreatedAt)
            })
            setStories(sorted)
            const my = storiesWithViews.filter(s => s.user_id === session.user.id)
            if (my.length > 0) setCurrentUserStory(my[0])
        } catch (e) {
            console.error('Error fetching stories:', e)
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        console.log('📁 File selected:', file.name, file.type, file.size)
        
        if (file.size > 50 * 1024 * 1024) { 
            alert('File too large (max 50MB)')
            return 
        }

        // Check video duration if it's a video file
        if (file.type.startsWith('video/')) {
            const video = document.createElement('video')
            video.preload = 'metadata'
            
            video.onloadedmetadata = function() {
                window.URL.revokeObjectURL(video.src)
                const duration = video.duration
                
                console.log('🎥 Video duration:', duration, 'seconds')
                
                if (duration > 60) {
                    alert('Video too long! Stories can only be up to 60 seconds.')
                    e.target.value = ''
                    return
                }
                
                // If duration is valid, proceed
                if (previewUrl) URL.revokeObjectURL(previewUrl)
                const newUrl = URL.createObjectURL(file)
                console.log('🎥 Created video preview URL:', newUrl)
                setPreviewFile(file)
                setPreviewUrl(newUrl)
                setMediaType('video')
                setShowPreview(true)
            }
            
            video.src = URL.createObjectURL(file)
        } else {
            // For images, open editor first
            if (previewUrl) URL.revokeObjectURL(previewUrl)
            const newUrl = URL.createObjectURL(file)
            console.log('🖼️ Created image preview URL:', newUrl)
            setPreviewFile(file)
            setPreviewUrl(newUrl)
            setMediaType('image')
            setEditorImageUrl(newUrl)
            setShowEditor(true)
            if (onEditorChange) onEditorChange(true)
        }
        
        e.target.value = ''
    }

    const handleEditorSave = async (editedBlob) => {
        setShowEditor(false)
        if (onEditorChange) onEditorChange(false)
        setUploading(true)
        
        try {
            const ext = 'jpg'
            const name = `${session.user.id}/${Date.now()}.${ext}`
            const { error: upErr } = await supabase.storage.from('stories').upload(name, editedBlob)
            if (upErr) throw upErr
            const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(name)
            const { error: dbErr } = await supabase.from('stories').insert({
                user_id: session.user.id,
                media_url: publicUrl,
                media_type: 'image',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
            if (dbErr) throw dbErr
            fetchStories()
            handleClosePreview()
        } catch (e) {
            console.error('Error uploading story:', e)
            alert('Failed to upload story: ' + e.message)
        } finally {
            setUploading(false)
        }
    }

    const handleEditorCancel = () => {
        setShowEditor(false)
        if (onEditorChange) onEditorChange(false)
        setEditorImageUrl(null)
        handleClosePreview()
    }

    const handlePostStory = async () => {
        if (!previewFile) return
        setUploading(true)
        try {
            const ext = previewFile.name.split('.').pop()
            const name = `${session.user.id}/${Date.now()}.${ext}`
            const { error: upErr } = await supabase.storage.from('stories').upload(name, previewFile)
            if (upErr) throw upErr
            const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(name)
            const { error: dbErr } = await supabase.from('stories').insert({
                user_id: session.user.id,
                media_url: publicUrl,
                media_type: mediaType,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
            if (dbErr) throw dbErr
            fetchStories()
            handleClosePreview()
        } catch (e) {
            console.error('Error uploading story:', e)
            alert('Failed to upload story: ' + e.message)
        } finally {
            setUploading(false)
        }
    }

    const handleClosePreview = () => {
        setShowPreview(false)
        setPreviewFile(null)
        if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    }

    const handleViewStory = async (userStories) => {
        console.log('📖 Opening story viewer')
        setViewingStory({ ...userStories, currentIndex: 0 })
        if (onViewingChange) {
            console.log('📖 Calling onViewingChange(true)')
            onViewingChange(true)
        } else {
            console.warn('⚠️ onViewingChange callback not provided!')
        }
        
        // Mark story as viewed in story_views table
        const currentStory = userStories.stories[0]
        if (currentStory && currentStory.user_id !== session.user.id) {
            try {
                await supabase.from('story_views').insert({
                    story_id: currentStory.id,
                    viewer_id: session.user.id
                }).select()
                
                // Also update the viewers array for backward compatibility
                const { data: storyData } = await supabase
                    .from('stories')
                    .select('viewers')
                    .eq('id', currentStory.id)
                    .single()
                
                if (storyData && (!storyData.viewers || !storyData.viewers.includes(session.user.id))) {
                    await supabase.from('stories').update({ 
                        viewers: [...(storyData.viewers || []), session.user.id] 
                    }).eq('id', currentStory.id)
                }
                
                fetchStories()
            } catch (err) { 
                console.error("Error marking story viewed", err) 
            }
        }
    }

    const handleCloseViewer = () => {
        console.log('📖 Closing story viewer')
        setViewingStory(null)
        setShowOptionsMenu(false)
        setShowViewersList(false)
        setReplyText('')
        if (onViewingChange) {
            console.log('📖 Calling onViewingChange(false)')
            onViewingChange(false)
        }
    }

    const handleSendReply = async () => {
        if (!replyText.trim()) return
        
        // Validate content for abusive words
        const validation = validateContent(replyText)
        if (!validation.isValid) {
            setWarningMessage(validation.message)
            setShowContentWarning(true)
            return
        }
        
        try {
            const currentStory = viewingStory.stories[viewingStory.currentIndex]
            // Send as a direct message with story reference (no emoji prefix)
            const { data, error } = await supabase.from('messages').insert({
                sender_id: session.user.id,
                receiver_id: currentStory.user_id,
                content: replyText, // Just the reply text, no emoji
                story_id: currentStory.id,
                read: false
            }).select()
            
            if (error) {
                console.error('Error details:', error)
                throw error
            }
            
            console.log('Reply sent successfully:', data)
            setReplyText('')
            
            // Show success feedback
            const sendButton = document.querySelector('.story-send-button')
            if (sendButton) {
                sendButton.style.background = 'linear-gradient(135deg, #00ba7c 0%, #00a86b 100%)'
                setTimeout(() => {
                    sendButton.style.background = 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)'
                }, 1000)
            }
        } catch (error) {
            console.error('Error sending reply:', error)
            alert('Failed to send reply: ' + error.message)
        }
    }

    const handleQuickReaction = async (emoji) => {
        try {
            const currentStory = viewingStory.stories[viewingStory.currentIndex]
            const { data, error } = await supabase.from('messages').insert({
                sender_id: session.user.id,
                receiver_id: currentStory.user_id,
                content: emoji,
                story_id: currentStory.id,
                read: false
            }).select()
            
            if (error) {
                console.error('Error details:', error)
                throw error
            }
            
            console.log('Reaction sent successfully:', data)
            
            // Visual feedback
            const reactionBtn = event.target
            if (reactionBtn) {
                reactionBtn.style.transform = 'scale(1.3)'
                setTimeout(() => {
                    reactionBtn.style.transform = 'scale(1)'
                }, 200)
            }
        } catch (error) {
            console.error('Error sending reaction:', error)
        }
    }

    const handleForwardStory = async () => {
        const currentStory = viewingStory.stories[viewingStory.currentIndex]
        const storyUrl = `${window.location.origin}/story/${currentStory.id}`
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Check out this story',
                    url: storyUrl
                })
            } catch (error) {
                console.log('Share cancelled')
            }
        } else {
            navigator.clipboard.writeText(storyUrl)
            alert('Story link copied to clipboard!')
        }
    }

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted
            setIsMuted(!isMuted)
        }
    }

    const handleDeleteClick = (story) => { setStoryToDelete(story); setShowDeleteModal(true) }

    const confirmDeleteStory = async () => {
        if (!storyToDelete) return
        try {
            const { error } = await supabase.from('stories').delete().eq('id', storyToDelete.id).eq('user_id', session.user.id)
            if (error) throw error
            setStories(prev => prev.map(g => g.userId === session.user.id ? { ...g, stories: g.stories.filter(s => s.id !== storyToDelete.id) } : g).filter(g => g.stories.length > 0))
            if (viewingStory && viewingStory.userId === session.user.id && viewingStory.stories.length === 1) {
                setViewingStory(null)
            } else if (viewingStory && viewingStory.userId === session.user.id) {
                setViewingStory(prev => ({ ...prev, stories: prev.stories.filter(s => s.id !== storyToDelete.id) }))
            }
            setShowDeleteModal(false)
            setStoryToDelete(null)
            fetchStories()
        } catch (e) { console.error('Error deleting story:', e); alert('Failed to delete story') }
    }

    const currentIdx = viewingStory?.currentIndex || 0
    const currentMedia = viewingStory?.stories?.[currentIdx]

    const MOBILE_STORY_LIMIT = 8
    const displayedStories = mode === 'mobile' && !showAllStories 
        ? stories.slice(0, MOBILE_STORY_LIMIT) 
        : stories
    const hasMoreStories = mode === 'mobile' && stories.length > MOBILE_STORY_LIMIT

    return (
        <>
            {/* Story Editor */}
            {showEditor && editorImageUrl && (
                <StoryEditor
                    imageUrl={editorImageUrl}
                    onSave={handleEditorSave}
                    onCancel={handleEditorCancel}
                />
            )}

            <div className={`stories-container ${mode}`}>
            <div className="story-item add-story" onClick={() => fileInputRef.current?.click()}>
                <div className="story-avatar-wrapper">
                    <img src={session?.user?.user_metadata?.avatar_url || '/download.png'} alt="My Story" />
                    <div className="add-icon">+</div>
                </div>
                <span className="story-username">You</span>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,video/*" onChange={handleFileSelect} disabled={uploading} />
            </div>

            {displayedStories.map((group) => (
                <div key={group.userId} className={`story-item ${group.hasUnwatched ? 'unwatched' : 'watched'}`} onClick={() => handleViewStory(group)}>
                    <div className="story-avatar-wrapper">
                        <img src={group.user?.avatar_url || '/download.png'} alt={group.user?.username || 'User'} />
                        {group.isVerified && (
                            <div className="story-verified-badge">
                                <i className="ri-verified-badge-fill"></i>
                            </div>
                        )}
                    </div>
                    <span className="story-username">{group.user?.username || 'User'}</span>
                </div>
            ))}

            {/* View More Button for Mobile */}
            {hasMoreStories && !showAllStories && (
                <div className="story-item" onClick={() => setShowAllStories(true)} style={{ cursor: 'pointer' }}>
                    <div className="story-avatar-wrapper" style={{ background: 'linear-gradient(135deg, rgba(217, 70, 239, 0.2) 0%, rgba(0, 122, 255, 0.2) 100%)', border: '2px solid rgba(217, 70, 239, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="ri-arrow-right-s-line" style={{ fontSize: '32px', color: 'var(--accent)' }}></i>
                    </div>
                    <span className="story-username" style={{ color: 'var(--accent)', fontWeight: '600' }}>View More</span>
                </div>
            )}

            {viewingStory && (
                <div className="story-viewer-overlay story-warp-in" onClick={handleCloseViewer}>
                    <div className="story-viewer-content story-content-warp" onClick={e => e.stopPropagation()} style={{ background: '#000', borderRadius: mode === 'mobile' ? '0' : '16px', width: mode === 'mobile' ? '100%' : '400px', height: mode === 'mobile' ? '100%' : '85vh', maxHeight: '900px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        
                        {/* Progress Bars */}
                        <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', display: 'flex', gap: '4px', zIndex: 20 }}>
                            {viewingStory.stories.map((story, index) => (
                                <div key={story.id} style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: index <= currentIdx ? '100%' : '0%', height: '100%', background: '#fff', transition: index === currentIdx ? 'width 5s linear' : 'none' }} />
                                </div>
                            ))}
                        </div>

                        {/* Header */}
                        <div className="story-header" style={{ marginTop: '20px', zIndex: 20, padding: '0 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                <img src={viewingStory.user?.avatar_url || '/download.png'} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #fff' }} alt="" />
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '14px', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{viewingStory.user?.username || 'User'}</span>
                                        {viewingStory.isVerified && (
                                            <i className="ri-verified-badge-fill" style={{ color: 'var(--twitter-blue)', fontSize: '14px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}></i>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{currentMedia && formatDistanceToNow(new Date(currentMedia.created_at))} ago</span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Mute Button for Videos */}
                                {currentMedia?.media_type === 'video' && (
                                    <button onClick={(e) => { e.stopPropagation(); toggleMute() }} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
                                        <i className={isMuted ? 'ri-volume-mute-line' : 'ri-volume-up-line'} style={{ fontSize: '18px' }}></i>
                                    </button>
                                )}

                                {/* View Count (for uploader) */}
                                {viewingStory.userId === session.user.id && (
                                    <button onClick={(e) => { e.stopPropagation(); setShowViewersList(!showViewersList) }} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backdropFilter: 'blur(10px)', fontSize: '13px', fontWeight: '600' }}>
                                        <i className="ri-eye-line" style={{ fontSize: '16px' }}></i>
                                        {currentMedia?.viewCount || currentMedia?.viewers?.length || 0}
                                    </button>
                                )}

                                {/* Forward Button (for viewers) */}
                                {viewingStory.userId !== session.user.id && (
                                    <button onClick={(e) => { e.stopPropagation(); handleForwardStory() }} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
                                        <i className="ri-share-forward-line" style={{ fontSize: '18px' }}></i>
                                    </button>
                                )}

                                {/* Delete Button (for uploader only) */}
                                {viewingStory.userId === session.user.id && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(currentMedia) }} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#ff453a', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
                                        <i className="ri-delete-bin-line" style={{ fontSize: '18px' }}></i>
                                    </button>
                                )}

                                {/* Close Button */}
                                <button onClick={handleCloseViewer} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)', fontSize: '24px', fontWeight: '300' }}>×</button>
                            </div>
                        </div>


                        {/* Navigation Areas */}
                        <div style={{ position: 'absolute', top: '60px', bottom: '100px', left: 0, right: 0, display: 'flex', zIndex: 10 }}>
                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if (currentIdx > 0) setViewingStory(prev => ({ ...prev, currentIndex: currentIdx - 1 })) }} />
                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if (currentIdx < viewingStory.stories.length - 1) setViewingStory(prev => ({ ...prev, currentIndex: currentIdx + 1 })); else handleCloseViewer() }} />
                        </div>

                        {/* Media Container */}
                        <div className="story-media-container" style={{ flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '60px' }}>
                            {currentMedia?.media_type === 'video' ? (
                                <video 
                                    ref={videoRef}
                                    key={currentMedia.id} 
                                    src={currentMedia.media_url} 
                                    autoPlay 
                                    playsInline 
                                    muted={isMuted}
                                    className="story-media" 
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '100%', objectPosition: 'center center' }} 
                                    onEnded={() => { if (currentIdx < viewingStory.stories.length - 1) setViewingStory(prev => ({ ...prev, currentIndex: currentIdx + 1 })); else handleCloseViewer() }} 
                                />
                            ) : (
                                <img key={currentMedia?.id} src={currentMedia?.media_url} className="story-media" alt="Story" style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '100%' }} />
                            )}
                        </div>

                        {/* Reply Section */}
                        {viewingStory.userId !== session.user.id && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)', zIndex: 20 }}>
                                {/* Quick Reactions */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
                                    {['❤️', '😂', '🔥', '👏', '😮'].map(emoji => (
                                        <button key={emoji} onClick={(e) => { e.stopPropagation(); handleQuickReaction(emoji) }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', fontSize: '24px', cursor: 'pointer', transition: 'transform 0.2s', backdropFilter: 'blur(10px)' }} onMouseEnter={e => e.target.style.transform = 'scale(1.2)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'}>
                                            {emoji}
                                        </button>
                                    ))}
                                </div>

                                {/* Reply Input */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply() }}
                                        placeholder="Reply to story..."
                                        style={{ flex: 1, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '24px', padding: '12px 20px', color: '#fff', fontSize: '15px', outline: 'none', backdropFilter: 'blur(10px)' }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <button className="story-send-button" onClick={(e) => { e.stopPropagation(); handleSendReply() }} disabled={!replyText.trim()} style={{ background: replyText.trim() ? 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: replyText.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.3s' }}>
                                        <i className="ri-send-plane-fill" style={{ fontSize: '20px', color: '#fff' }}></i>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Viewers List Modal (iOS Style) */}
                        {showViewersList && viewingStory.userId === session.user.id && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(20,20,20,0.98)', backdropFilter: 'blur(20px)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', maxHeight: '60%', overflowY: 'auto', zIndex: 40, animation: 'slideUp 0.3s ease' }} onClick={e => e.stopPropagation()}>
                                <div style={{ padding: '20px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, background: 'rgba(20,20,20,0.98)', backdropFilter: 'blur(20px)' }}>
                                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', margin: '0 auto 16px' }}></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                                            Viewers ({currentMedia?.viewCount || currentMedia?.viewers?.length || 0})
                                        </h3>
                                        <button onClick={() => setShowViewersList(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', padding: '4px' }}>×</button>
                                    </div>
                                </div>
                                <div style={{ padding: '8px 0' }}>
                                    {(currentMedia?.viewerIds && currentMedia.viewerIds.length > 0) || (currentMedia?.viewers && currentMedia.viewers.length > 0) ? (
                                        <ViewersList viewers={currentMedia.viewerIds || currentMedia.viewers} />
                                    ) : (
                                        <div style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                                            <i className="ri-eye-off-line" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}></i>
                                            No views yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showPreview && previewUrl && (
                <div className="story-viewer-overlay" style={{ zIndex: 20001, background: 'rgba(0,0,0,0.95)' }} onClick={handleClosePreview}>
                    <div className="story-viewer-content" onClick={e => e.stopPropagation()} style={{ 
                        background: '#000', 
                        borderRadius: mode === 'mobile' ? '0' : '16px', 
                        width: mode === 'mobile' ? '100%' : '400px', 
                        height: mode === 'mobile' ? '100%' : '85vh', 
                        maxHeight: '900px', 
                        position: 'relative', 
                        overflow: 'hidden', 
                        display: 'flex', 
                        flexDirection: 'column' 
                    }}>
                        {/* Header */}
                        <div style={{ 
                            padding: '16px', 
                            background: 'rgba(0,0,0,0.8)', 
                            backdropFilter: 'blur(10px)', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            zIndex: 10,
                            flexShrink: 0
                        }}>
                            <span style={{ fontWeight: '700', color: 'white', fontSize: '16px' }}>New Story Preview</span>
                            <button onClick={handleClosePreview} style={{ 
                                background: 'rgba(255,255,255,0.1)', 
                                border: 'none', 
                                color: '#fff', 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                cursor: 'pointer', 
                                fontSize: '24px',
                                fontWeight: '300'
                            }}>×</button>
                        </div>

                        {/* Media Container */}
                        <div style={{ 
                            flex: 1, 
                            background: '#000', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            minHeight: 0
                        }}>
                            {mediaType === 'video' ? (
                                <video 
                                    key={previewUrl}
                                    src={previewUrl} 
                                    autoPlay 
                                    controls 
                                    playsInline 
                                    muted 
                                    style={{ 
                                        maxWidth: '100%', 
                                        maxHeight: '100%', 
                                        width: 'auto',
                                        height: 'auto',
                                        objectFit: 'contain',
                                        display: 'block'
                                    }} 
                                    onLoadedData={(e) => {
                                        console.log('Video loaded successfully', e.target.videoWidth, 'x', e.target.videoHeight)
                                        e.target.play().catch(err => console.log('Autoplay prevented:', err))
                                    }} 
                                    onError={(e) => {
                                        console.error('Error loading video:', e)
                                        alert('Error loading video preview')
                                    }} 
                                />
                            ) : (
                                <img 
                                    key={previewUrl}
                                    src={previewUrl} 
                                    alt="Preview" 
                                    style={{ 
                                        maxWidth: '100%', 
                                        maxHeight: '100%', 
                                        width: 'auto',
                                        height: 'auto',
                                        objectFit: 'contain',
                                        display: 'block'
                                    }} 
                                    onLoad={(e) => console.log('Image loaded successfully', e.target.naturalWidth, 'x', e.target.naturalHeight)}
                                    onError={(e) => {
                                        console.error('Error loading image:', e)
                                        alert('Error loading image preview')
                                    }} 
                                />
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ 
                            padding: '20px', 
                            display: 'flex', 
                            gap: '12px', 
                            justifyContent: 'center', 
                            background: 'rgba(0,0,0,0.9)',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            flexShrink: 0
                        }}>
                            <button 
                                onClick={handleClosePreview} 
                                style={{ 
                                    flex: 1, 
                                    padding: '14px 24px',
                                    background: 'rgba(255,59,48,0.2)', 
                                    border: '1px solid rgba(255,59,48,0.5)',
                                    borderRadius: '12px',
                                    color: '#ff453a',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.target.style.background = 'rgba(255,59,48,0.3)'}
                                onMouseLeave={e => e.target.style.background = 'rgba(255,59,48,0.2)'}
                            >
                                Discard
                            </button>
                            <button 
                                onClick={handlePostStory} 
                                disabled={uploading} 
                                style={{ 
                                    flex: 1, 
                                    padding: '14px 24px',
                                    background: uploading ? 'rgba(0,122,255,0.2)' : 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)', 
                                    border: '1px solid rgba(0,122,255,0.5)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: uploading ? 0.6 : 1
                                }}
                                onMouseEnter={e => !uploading && (e.target.style.transform = 'translateY(-2px)')}
                                onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
                            >
                                {uploading ? 'Posting...' : 'Share Story'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {uploading && !showPreview && (
                <div className="uploading-overlay">
                    <div className="spinner"></div>
                    <p>Uploading Story...</p>
                </div>
            )}

            {showDeleteModal && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal-content">
                        <div className="delete-icon-container">
                            <i className="ri-delete-bin-line delete-icon-large"></i>
                        </div>
                        <h3 className="delete-modal-title">Delete Story?</h3>
                        <p className="delete-modal-text">This can't be undone and it will be removed from your profile.</p>
                        <div className="delete-modal-actions">
                            <button className="delete-btn-confirm" onClick={confirmDeleteStory}>Delete</button>
                            <button className="delete-btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Warning Modal */}
            {showContentWarning && (
                <ContentWarningModal 
                    message={warningMessage}
                    onClose={() => setShowContentWarning(false)}
                />
            )}
            </div>
        </>
    )
}
