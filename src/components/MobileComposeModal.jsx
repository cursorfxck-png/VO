import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { ImageIcon, VideoIcon, LocationIcon } from './GradientIcons'
import { compressImage, getGridColumns, revokeMediaUrls } from '../utils/mediaUtils'

const MAX_IMAGES = 10
const MAX_VIDEOS = 2

export default function MobileComposeModal({ session, onClose }) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [location, setLocation] = useState(null)
    const [userAvatar, setUserAvatar] = useState('/download.png')
    const [isVisible, setIsVisible] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')
    const [mediaItems, setMediaItems] = useState([])
    const [carouselIndex, setCarouselIndex] = useState(0)
    const [touchStart, setTouchStart] = useState(0)
    const imageInputRef = useRef(null)
    const videoInputRef = useRef(null)
    const carouselRef = useRef(null)

    const imageCount = mediaItems.filter(m => m.type === 'image').length
    const videoCount = mediaItems.filter(m => m.type === 'video').length
    const images = mediaItems.filter(m => m.type === 'image')
    const videos = mediaItems.filter(m => m.type === 'video')
    const gridCols = getGridColumns(imageCount)

    useEffect(() => {
        setIsVisible(true)
        getUserProfile()
    }, [])

    const getUserProfile = async () => {
        try {
            const { data } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single()
            if (data?.avatar_url) setUserAvatar(data.avatar_url)
        } catch { /* ignore */ }
    }

    const handleClose = () => {
        revokeMediaUrls(mediaItems)
        setIsVisible(false)
        setTimeout(onClose, 300)
    }

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files || [])
        e.target.value = ''
        if (!files.length) return
        const remaining = MAX_IMAGES - imageCount
        if (remaining <= 0) { alert(`Max ${MAX_IMAGES} images`); return }
        const toAdd = files.slice(0, remaining)
        setMediaItems(prev => [...prev, ...toAdd.map(f => ({
            id: `img-${Date.now()}-${Math.random()}`, type: 'image',
            file: f, preview: URL.createObjectURL(f), url: null,
        }))])
    }

    const handleVideoSelect = (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (videoCount >= MAX_VIDEOS) { alert(`Max ${MAX_VIDEOS} videos`); return }
        if (file.size > 200 * 1024 * 1024) { alert('Video must be under 200 MB'); return }
        setMediaItems(prev => [...prev, {
            id: `vid-${Date.now()}-${Math.random()}`, type: 'video',
            file, preview: URL.createObjectURL(file), url: null,
        }])
    }

    const removeMedia = (id) => {
        setMediaItems(prev => {
            const item = prev.find(m => m.id === id)
            if (item?.preview) URL.revokeObjectURL(item.preview)
            return prev.filter(m => m.id !== id)
        })
        if (carouselIndex >= imageCount - 1) {
            setCarouselIndex(Math.max(0, carouselIndex - 1))
        }
    }

    const uploadImageFile = async (file, index, total) => {
        setUploadProgress(`Compressing image ${index + 1}/${total}…`)
        const compressed = await compressImage(file, { maxSizeMB: 0.8, quality: 0.72 })
        const fileName = `${session.user.id}-${Date.now()}-${index}.jpg`
        setUploadProgress(`Uploading image ${index + 1}/${total}…`)
        const { error } = await supabase.storage.from('images').upload(`post-images/${fileName}`, compressed)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(`post-images/${fileName}`)
        return publicUrl
    }

    const uploadVideoFile = async (file, index, total) => {
        setUploadProgress(`Uploading video ${index + 1}/${total}…`)
        const ext = file.name.split('.').pop()
        const filePath = `${session.user.id}/${Date.now()}-${index}.${ext}`
        const { error } = await supabase.storage.from('videos').upload(filePath, file)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(filePath)
        return publicUrl
    }

    const handlePost = async () => {
        if (!content.trim() && mediaItems.length === 0) return
        setLoading(true)
        setUploading(true)
        try {
            const { data: profileData, error: pe } = await supabase.from('profiles')
                .select('id, username, full_name').eq('id', session.user.id).single()
            if (pe || !profileData?.username || !profileData?.full_name) {
                alert('Please complete your profile first!')
                return
            }

            const imageUrls = await Promise.all(images.map((item, i) => uploadImageFile(item.file, i, images.length)))
            const videoUrls = []
            for (let i = 0; i < videos.length; i++) {
                videoUrls.push(await uploadVideoFile(videos[i].file, i, videos.length))
            }

            setUploadProgress('Creating post…')
            let finalContent = content.trim()
            if (location) finalContent += `\n\n📍 ${location}`

            const { error } = await supabase.from('posts').insert([{
                content: finalContent,
                user_id: session.user.id,
                image_url: imageUrls.length > 0 ? JSON.stringify(imageUrls) : null,
                video_url: videoUrls.length > 0 ? JSON.stringify(videoUrls) : null,
                created_at: new Date(),
            }])
            if (error) throw error
            handleClose()
        } catch (error) {
            console.error('Error posting:', error.message)
            alert('Error posting: ' + error.message)
        } finally {
            setLoading(false)
            setUploading(false)
            setUploadProgress('')
        }
    }

    const getLocation = () => {
        if (!navigator.geolocation) { alert('Geolocation not supported'); return }
        navigator.geolocation.getCurrentPosition(
            pos => setLocation(`Lat: ${pos.coords.latitude.toFixed(6)}, Long: ${pos.coords.longitude.toFixed(6)}`),
            err => alert('Location error: ' + err.message)
        )
    }

    // Carousel touch handlers
    const handleCarouselTouchStart = (e) => {
        setTouchStart(e.touches[0].clientX)
    }

    const handleCarouselTouchEnd = (e) => {
        const touchEnd = e.changedTouches[0].clientX
        const diff = touchStart - touchEnd
        if (Math.abs(diff) > 50 && images.length > 0) {
            if (diff > 0) {
                setCarouselIndex(prev => (prev + 1) % images.length)
            } else {
                setCarouselIndex(prev => (prev - 1 + images.length) % images.length)
            }
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 1000, background: 'rgba(0,0,0,0.96)',
            display: 'flex', flexDirection: 'column',
            opacity: isVisible ? 1 : 0, transition: 'opacity 0.3s ease', padding: '20px',
        }}>
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '900px',
                width: '100%', margin: '0 auto',
                transform: isVisible ? 'scale(1)' : 'scale(0.95)',
                transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src={userAvatar} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }} alt="Avatar" />
                        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>What&apos;s happening?</h2>
                    </div>
                    <button onClick={handleClose} style={{ fontSize: '17px', color: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer' }}>
                        Cancel
                    </button>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: '16px' }}>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's happening?"
                        autoFocus
                        style={{ width: '100%', minHeight: '100px', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '18px', outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif' }}
                    />

                    {/* Image carousel with swipe support */}
                    {images.length > 0 && (
                        <div style={{ flex: 1, minHeight: '250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Carousel */}
                            <div 
                                ref={carouselRef}
                                onTouchStart={handleCarouselTouchStart}
                                onTouchEnd={handleCarouselTouchEnd}
                                style={{
                                    flex: 1,
                                    position: 'relative',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    background: 'rgba(255,255,255,0.05)',
                                    minHeight: '200px',
                                    cursor: 'grab'
                                }}
                            >
                                <img 
                                    src={images[carouselIndex]?.preview} 
                                    alt={`Preview ${carouselIndex + 1}`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block'
                                    }}
                                />
                                {/* Navigation arrows */}
                                {images.length > 1 && (
                                    <>
                                        <button
                                            onClick={() => setCarouselIndex(prev => (prev - 1 + images.length) % images.length)}
                                            style={{
                                                position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                                                background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                                                width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', color: 'white', cursor: 'pointer', zIndex: 5
                                            }}
                                        >
                                            <i className="ri-arrow-left-s-line" style={{ fontSize: '18px' }}></i>
                                        </button>
                                        <button
                                            onClick={() => setCarouselIndex(prev => (prev + 1) % images.length)}
                                            style={{
                                                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                                background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                                                width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', color: 'white', cursor: 'pointer', zIndex: 5
                                            }}
                                        >
                                            <i className="ri-arrow-right-s-line" style={{ fontSize: '18px' }}></i>
                                        </button>
                                    </>
                                )}
                                {/* Counter */}
                                {images.length > 1 && (
                                    <div style={{
                                        position: 'absolute', top: '10px', right: '10px',
                                        background: 'rgba(0,0,0,0.7)', color: 'white',
                                        fontSize: '12px', fontWeight: '600', padding: '4px 10px',
                                        borderRadius: '12px', zIndex: 5
                                    }}>
                                        {carouselIndex + 1}/{images.length}
                                    </div>
                                )}
                            </div>

                            {/* Grid preview of all images */}
                            {images.length > 1 && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${Math.min(gridCols, 4)}, 1fr)`,
                                    gap: '8px',
                                    maxHeight: '100px'
                                }}>
                                    {images.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            onClick={() => setCarouselIndex(idx)}
                                            style={{
                                                position: 'relative',
                                                paddingBottom: '100%',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                border: carouselIndex === idx ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.2)',
                                                cursor: 'pointer',
                                                opacity: carouselIndex === idx ? 1 : 0.6,
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <img 
                                                src={item.preview} 
                                                alt={`Thumb ${idx + 1}`}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0, left: 0, width: '100%', height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Video previews */}
                    {videos.map(item => (
                        <div key={item.id} style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                            <video src={item.preview} controls preload="metadata" playsInline style={{ borderRadius: '16px', maxHeight: '300px', width: '100%', display: 'block' }} />
                            <button onClick={() => removeMedia(item.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', zIndex: 10 }}>
                                <i className="ri-close-line" style={{ color: 'white', fontSize: '18px' }}></i>
                            </button>
                        </div>
                    ))}

                    {location && (
                        <div style={{ marginTop: '10px', padding: '10px 15px', background: 'rgba(0,122,255,0.1)', border: '1px solid rgba(0,122,255,0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#007AFF' }}>
                                <i className="ri-map-pin-fill"></i>
                                <span style={{ fontSize: '14px' }}>{location}</span>
                            </div>
                            <i className="ri-close-circle-fill" onClick={() => setLocation(null)} style={{ cursor: 'pointer', fontSize: '18px' }}></i>
                        </div>
                    )}

                    {uploading && uploadProgress && (
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite' }}></i>
                            {uploadProgress}
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <label style={{ cursor: imageCount >= MAX_IMAGES ? 'not-allowed' : 'pointer', opacity: imageCount >= MAX_IMAGES ? 0.3 : 1, display: 'flex', alignItems: 'center' }}
                            title={`Images (${imageCount}/${MAX_IMAGES})`}>
                            <ImageIcon size={28} />
                            <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} disabled={uploading || imageCount >= MAX_IMAGES} />
                        </label>
                        <label style={{ cursor: videoCount >= MAX_VIDEOS ? 'not-allowed' : 'pointer', opacity: videoCount >= MAX_VIDEOS ? 0.3 : 1, display: 'flex', alignItems: 'center' }}
                            title={`Videos (${videoCount}/${MAX_VIDEOS})`}>
                            <VideoIcon size={28} />
                            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} style={{ display: 'none' }} disabled={uploading || videoCount >= MAX_VIDEOS} />
                        </label>
                        <div onClick={getLocation} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <LocationIcon size={28} />
                        </div>
                        {mediaItems.length > 0 && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.07)', padding: '3px 8px', borderRadius: '10px' }}>
                                {imageCount > 0 && `${imageCount} img`}{imageCount > 0 && videoCount > 0 && ' · '}{videoCount > 0 && `${videoCount} vid`}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handlePost}
                        disabled={loading || uploading || (!content.trim() && mediaItems.length === 0)}
                        style={{
                            padding: '12px 32px',
                            background: (loading || uploading || (!content.trim() && mediaItems.length === 0)) ? 'rgba(0,122,255,0.3)' : 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
                            color: 'white', borderRadius: '25px', fontWeight: 'bold', fontSize: '16px',
                            border: 'none', cursor: loading || uploading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s'
                        }}
                    >
                        {uploading ? (uploadProgress || 'Uploading…') : loading ? 'Posting…' : 'Post'}
                    </button>
                </div>
            </div>
        </div>
    )
}
