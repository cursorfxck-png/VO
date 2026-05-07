import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { ImageIcon, VideoIcon, LocationIcon } from './GradientIcons'
import { validateContent } from '../utils/contentModeration'
import ContentWarningModal from './ContentWarningModal'
import { compressImage, parseMediaUrls } from '../utils/mediaUtils'

const MAX_IMAGES = 10
const MAX_VIDEOS = 2

export default function ComposeBox({ session }) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [location, setLocation] = useState(null)
    const [userAvatar, setUserAvatar] = useState('/download.png')
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('') // status text
    const [showContentWarning, setShowContentWarning] = useState(false)
    const [warningMessage, setWarningMessage] = useState('')
    // mediaItems: [{id, type:'image'|'video', file, preview, url}]
    const [mediaItems, setMediaItems] = useState([])
    const imageInputRef = useRef(null)
    const videoInputRef = useRef(null)

    const imageCount = mediaItems.filter(m => m.type === 'image').length
    const videoCount = mediaItems.filter(m => m.type === 'video').length

    useEffect(() => {
        getUserProfile()
    }, [])

    const getUserProfile = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', session.user.id)
                .single()
            if (data?.avatar_url) setUserAvatar(data.avatar_url)
        } catch (error) {
            console.error('Error loading avatar:', error)
        }
    }

    const sanitizeContent = (text) =>
        text.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim().substring(0, 5000)

    // ── Upload helpers ─────────────────────────────────────────────────────────
    const uploadImageFile = async (file, index, total) => {
        setUploadProgress(`Compressing image ${index + 1}/${total}…`)
        const compressed = await compressImage(file, { maxSizeMB: 0.8, quality: 0.72 })

        const fileName = `${session.user.id}-${Date.now()}-${index}.jpg`
        const filePath = `post-images/${fileName}`
        setUploadProgress(`Uploading image ${index + 1}/${total}…`)

        const { error } = await supabase.storage.from('images').upload(filePath, compressed)
        if (error) throw error

        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath)
        return publicUrl
    }

    const uploadVideoFile = async (file, index, total) => {
        setUploadProgress(`Uploading video ${index + 1}/${total}…`)
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${index}.${fileExt}`
        const filePath = `${session.user.id}/${fileName}`

        const { error } = await supabase.storage.from('videos').upload(filePath, file)
        if (error) throw error

        const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(filePath)
        return publicUrl
    }

    // ── File select handlers ───────────────────────────────────────────────────
    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return
        e.target.value = '' // reset so same file can be picked again

        const remaining = MAX_IMAGES - imageCount
        if (remaining <= 0) { alert(`Maximum ${MAX_IMAGES} images allowed`); return }

        const toAdd = files.slice(0, remaining)
        const newItems = toAdd.map(file => ({
            id: `img-${Date.now()}-${Math.random()}`,
            type: 'image',
            file,
            preview: URL.createObjectURL(file),
            url: null,
        }))
        setMediaItems(prev => [...prev, ...newItems])
    }

    const handleVideoSelect = (e) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return
        e.target.value = ''

        const remaining = MAX_VIDEOS - videoCount
        if (remaining <= 0) { alert(`Maximum ${MAX_VIDEOS} videos allowed`); return }

        const file = files[0] // one at a time
        const isAudio = file.type.startsWith('audio/')
        const isVideo = file.type.startsWith('video/')
        if (!isVideo && !isAudio) { alert('Select a video or audio (MP3) file'); return }
        if (file.size > 200 * 1024 * 1024) { alert('File must be under 200 MB'); return }

        const newItem = {
            id: `vid-${Date.now()}-${Math.random()}`,
            type: isAudio ? 'audio' : 'video',
            file,
            preview: URL.createObjectURL(file),
            url: null,
        }
        setMediaItems(prev => [...prev, newItem])
    }

    const removeMedia = (id) => {
        setMediaItems(prev => {
            const item = prev.find(m => m.id === id)
            if (item?.preview) URL.revokeObjectURL(item.preview)
            return prev.filter(m => m.id !== id)
        })
    }

    // ── Post ──────────────────────────────────────────────────────────────────
    const handlePost = async () => {
        if (!content.trim() && mediaItems.length === 0) return

        const contentValidation = validateContent(content)
        if (!contentValidation.isValid) {
            setWarningMessage(contentValidation.message)
            setShowContentWarning(true)
            return
        }
        if (content.length > 5000) { alert('Post is too long (max 5000 chars)'); return }

        setLoading(true)
        setUploading(true)

        try {
            if (!session?.user?.id) throw new Error('Not authenticated')

            const { data: profileData, error: profileError } = await supabase
                .from('profiles').select('id, username, full_name').eq('id', session.user.id).single()
            if (profileError || !profileData?.username || !profileData?.full_name) {
                alert('Please complete your profile first!')
                return
            }

            // Upload all media
            const images = mediaItems.filter(m => m.type === 'image')
            // Both video and audio go to the videos bucket; audio URLs get stored in video_url too
            const videos = mediaItems.filter(m => m.type === 'video' || m.type === 'audio')

            const imageUrls = await Promise.all(
                images.map((item, i) => uploadImageFile(item.file, i, images.length))
            )
            const videoUrls = []
            for (let i = 0; i < videos.length; i++) {
                const url = await uploadVideoFile(videos[i].file, i, videos.length)
                videoUrls.push(url)
            }

            setUploadProgress('Creating post…')
            let finalContent = sanitizeContent(content)
            if (location) finalContent += `\n\n📍 ${location}`

            const { data, error } = await supabase.from('posts').insert([{
                content: finalContent,
                user_id: session.user.id,
                image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
                video_url: videoUrls.length > 0 ? JSON.stringify(videoUrls) : null,
                created_at: new Date(),
            }]).select()

            if (error) throw error

            // Clean up previews
            mediaItems.forEach(m => { if (m.preview) URL.revokeObjectURL(m.preview) })
            setContent('')
            setMediaItems([])
            setLocation(null)
            if (data?.[0]) console.log('✅ Post created:', data[0].id)
        } catch (error) {
            console.error('Error posting:', error.message)
            alert('Failed to create post: ' + error.message)
        } finally {
            setLoading(false)
            setUploading(false)
            setUploadProgress('')
        }
    }

    const getLocation = () => {
        if (!navigator.geolocation) { alert('Geolocation not supported'); return }
        navigator.geolocation.getCurrentPosition(
            (pos) => setLocation(`Lat: ${pos.coords.latitude.toFixed(6)}, Long: ${pos.coords.longitude.toFixed(6)}`),
            (err) => alert('Could not get location: ' + err.message)
        )
    }

    // ── Media preview grid ────────────────────────────────────────────────────
    const renderMediaPreviews = () => {
        if (mediaItems.length === 0) return null
        const images = mediaItems.filter(m => m.type === 'image')
        const videos = mediaItems.filter(m => m.type === 'video')

        return (
            <div style={{ marginTop: '12px' }}>
                {/* Image grid */}
                {images.length > 0 && (
                    <div className={`compose-media-grid compose-media-grid-${Math.min(images.length, 3)}`}>
                        {images.map((item) => (
                            <div key={item.id} className="compose-media-item">
                                <img src={item.preview} alt="preview" />
                                <button className="compose-media-remove" onClick={() => removeMedia(item.id)}>
                                    <i className="ri-close-line"></i>
                                </button>
                            </div>
                        ))}
                        {imageCount < MAX_IMAGES && (
                            <button
                                className="compose-media-add"
                                onClick={() => imageInputRef.current?.click()}
                                title="Add more images"
                            >
                                <i className="ri-add-line"></i>
                                <span>{imageCount}/{MAX_IMAGES}</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Video / Audio previews */}
                {videos.length > 0 && (
                    <div style={{ marginTop: images.length > 0 ? '8px' : '0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {videos.map((item) => (
                            <div key={item.id} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                                {item.type === 'audio' ? (
                                    /* Audio preview pill */
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
                                        <div style={{
                                            width: '40px', height: '36px', borderRadius: '50px',
                                            background: 'linear-gradient(135deg,#cd07ff,#8b00b5)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            <i className="ri-music-2-line" style={{ color: '#fff', fontSize: '16px' }}></i>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e5e5e5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.file.name.replace(/\.[^.]+$/, '')}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#ffc300', fontWeight: 700, marginTop: '2px' }}>MP3</div>
                                        </div>
                                        <audio src={item.preview} controls style={{ display: 'none' }} />
                                    </div>
                                ) : (
                                    <video
                                        src={item.preview}
                                        controls
                                        preload="metadata"
                                        playsInline
                                        style={{ width: '100%', maxHeight: '220px', display: 'block', borderRadius: '12px' }}
                                    />
                                )}
                                <button
                                    onClick={() => removeMedia(item.id)}
                                    style={{
                                        position: 'absolute', top: '8px', right: '8px',
                                        background: 'rgba(0,0,0,0.75)', border: 'none',
                                        borderRadius: '50%', width: '28px', height: '28px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', color: 'white', zIndex: 5
                                    }}
                                >
                                    <i className="ri-close-line" style={{ fontSize: '16px' }}></i>
                                </button>
                            </div>
                        ))}
                        {videoCount < MAX_VIDEOS && (
                            <button
                                style={{
                                    padding: '8px 16px', background: 'rgba(255,255,255,0.06)',
                                    border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '10px',
                                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px'
                                }}
                                onClick={() => videoInputRef.current?.click()}
                            >
                                <i className="ri-add-line"></i> Add video / audio ({videoCount}/{MAX_VIDEOS})
                            </button>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="compose-box">
            <img src={userAvatar} className="compose-avatar" alt="avatar" />
            <div style={{ flex: 1 }}>
                <input
                    type="text"
                    className="compose-input"
                    placeholder="What's trending now?!"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePost()}
                />

                {renderMediaPreviews()}

                {location && (
                    <div style={{ marginTop: '5px', marginBottom: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', background: 'rgba(217, 70, 239, 0.1)', padding: '5px 10px', borderRadius: '12px', width: 'fit-content' }}>
                        <i className="ri-map-pin-fill"></i> {location}
                        <i className="ri-close-circle-fill" onClick={() => setLocation(null)} style={{ cursor: 'pointer', marginLeft: '5px' }}></i>
                    </div>
                )}

                {uploading && uploadProgress && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }}></i>
                        {uploadProgress}
                    </div>
                )}

                <div className="compose-actions">
                    <div className="icon-set" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                        {/* Image upload — disabled when max reached */}
                        <label style={{ cursor: imageCount >= MAX_IMAGES ? 'not-allowed' : 'pointer', opacity: imageCount >= MAX_IMAGES ? 0.4 : 1, display: 'inline-flex', alignItems: 'center' }}
                            title={`Add images (${imageCount}/${MAX_IMAGES})`}>
                            <ImageIcon size={24} />
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageSelect}
                                style={{ display: 'none' }}
                                disabled={uploading || imageCount >= MAX_IMAGES}
                            />
                        </label>

                        {/* Video / Audio upload — disabled when max reached */}
                         <label style={{ cursor: videoCount >= MAX_VIDEOS ? 'not-allowed' : 'pointer', opacity: videoCount >= MAX_VIDEOS ? 0.4 : 1, display: 'inline-flex', alignItems: 'center' }}
                            title={`Add video or MP3 audio (${videoCount}/${MAX_VIDEOS})`}>
                            <VideoIcon size={24} />
                            <input
                                ref={videoInputRef}
                                type="file"
                                accept="video/*,audio/*,.mp3,.m4a,.ogg,.wav,.aac"
                                onChange={handleVideoSelect}
                                style={{ display: 'none' }}
                                disabled={uploading || videoCount >= MAX_VIDEOS}
                            />
                        </label>

                        <div style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={getLocation}>
                            <LocationIcon size={24} />
                        </div>

                        {/* Media count badge */}
                        {mediaItems.length > 0 && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.07)', padding: '3px 8px', borderRadius: '10px' }}>
                                {imageCount > 0 && `${imageCount} img`}
                                {imageCount > 0 && videoCount > 0 && ' · '}
                                {videoCount > 0 && `${videoCount} vid`}
                            </span>
                        )}
                    </div>

                    <button className="glass-btn" onClick={handlePost} disabled={loading || uploading}>
                        <span>{uploading ? uploadProgress || 'Uploading…' : loading ? 'Posting…' : 'Post'}</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
            </div>

            {showContentWarning && (
                <ContentWarningModal
                    message={warningMessage}
                    onClose={() => setShowContentWarning(false)}
                />
            )}
        </div>
    )
}
