import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ImageIcon, VideoIcon, LocationIcon } from './GradientIcons'
import { validateContent } from '../utils/contentModeration'
import ContentWarningModal from './ContentWarningModal'

export default function ComposeBox({ session }) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [imageUrl, setImageUrl] = useState('')
    const [videoUrl, setVideoUrl] = useState('')
    const [location, setLocation] = useState(null)
    const [userAvatar, setUserAvatar] = useState('/download.png')
    const [uploading, setUploading] = useState(false)
    const [videoLoading, setVideoLoading] = useState(false)
    const [showContentWarning, setShowContentWarning] = useState(false)
    const [warningMessage, setWarningMessage] = useState('')

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

            if (data?.avatar_url) {
                setUserAvatar(data.avatar_url)
            }
        } catch (error) {
            console.error('Error loading avatar:', error)
        }
    }

    const sanitizeContent = (text) => {
        // Sanitize HTML and limit length
        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .trim()
            .substring(0, 5000) // Limit post length
    }

    const validateImageUrl = (url) => {
        if (!url) return true
        try {
            const urlObj = new URL(url)
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
        } catch {
            return false
        }
    }

    const handlePost = async () => {
        if (!content.trim() && !imageUrl && !videoUrl) return

        // Validate content for abusive words
        const contentValidation = validateContent(content)
        if (!contentValidation.isValid) {
            setWarningMessage(contentValidation.message)
            setShowContentWarning(true)
            return
        }

        // Validate content length
        if (content.length > 5000) {
            alert('Post is too long. Maximum 5000 characters.')
            return
        }

        // Validate image URL if provided
        if (imageUrl && !validateImageUrl(imageUrl)) {
            alert('Invalid image URL')
            return
        }

        setLoading(true)

        let finalContent = sanitizeContent(content)
        if (location) {
            finalContent += `\n\n📍 ${location}`
        }


        try {
            // Validate session
            if (!session?.user?.id) {
                throw new Error('Not authenticated')
            }

            // First, ensure the user has a profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, full_name')
                .eq('id', session.user.id)
                .single()

            if (profileError || !profileData) {
                alert('Please complete your profile first!')
                return
            }

            if (!profileData.username || !profileData.full_name) {
                alert('Please set your username and name in your profile!')
                return
            }

            // Now create the post
            const { data, error } = await supabase
                .from('posts')
                .insert([
                    {
                        content: finalContent,
                        user_id: session.user.id,
                        image_url: imageUrl || null,
                        video_url: videoUrl || null,
                        created_at: new Date()
                    }
                ])
                .select()

            if (error) throw error

            // Clear form immediately for better UX
            setContent('')
            setImageUrl('')
            setVideoUrl('')
            setLocation(null)


            // Force a broadcast to trigger real-time listeners
            if (data && data[0]) {
                console.log('✅ Post created successfully:', data[0].id)
            }
        } catch (error) {
            console.error('Error posting:', error.message)
            alert('Failed to create post. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                setLocation(`Lat: ${position.coords.latitude.toFixed(6)}, Long: ${position.coords.longitude.toFixed(6)}`)
            }, (error) => {
                alert("Could not get location: " + error.message)
            })
        } else {
            alert("Geolocation is not supported by this browser.")
        }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB')
            return
        }

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
            const filePath = `post-images/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('images')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(filePath)

            setImageUrl(publicUrl)
        } catch (error) {
            console.error('Error uploading image:', error)
            alert('Failed to upload image. Make sure the "images" bucket exists in Supabase Storage.')
        } finally {
            setUploading(false)
        }
    }

    const handleVideoUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (!file.type.startsWith('video/')) {
            alert('Please select a video file')
            return
        }

        if (file.size > 50 * 1024 * 1024) {
            alert('Video size should be less than 50MB')
            return
        }

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}.${fileExt}`
            const filePath = `${session.user.id}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(filePath)

            setVideoUrl(publicUrl)
        } catch (error) {
            console.error('Error uploading video:', error)
            alert('Failed to upload video. Make sure the "videos" bucket exists in Supabase Storage.')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="compose-box">
            <img src={userAvatar} className="compose-avatar" />
            <div style={{ flex: 1 }}>
                <input type="text" className="compose-input" placeholder="What's trending now?!" value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePost()} />
                {imageUrl && (<div style={{ position: 'relative', marginTop: '10px', marginBottom: '10px' }}><img src={imageUrl} style={{ borderRadius: '12px', maxHeight: '200px', width: 'auto' }} /><button onClick={() => setImageUrl('')} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ri-close-line" style={{ color: 'white' }}></i></button></div>)}
                {videoUrl && (
                    <div style={{ position: 'relative', marginTop: '10px', marginBottom: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {videoLoading && (
                            <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                                <i className="ri-loader-4-line" style={{ fontSize: '20px', animation: 'spin 1s linear infinite' }}></i>
                                <span>Loading video...</span>
                            </div>
                        )}
                        <video
                            src={videoUrl}
                            controls
                            preload="metadata"
                            playsInline
                            style={{
                                borderRadius: '12px',
                                maxHeight: '300px',
                                width: '100%',
                                display: videoLoading ? 'none' : 'block'
                            }}
                            onLoadStart={() => setVideoLoading(true)}
                            onLoadedData={(e) => {
                                setVideoLoading(false)
                                e.target.style.opacity = '1'
                            }}
                            onError={(e) => {
                                console.error('Video preview error')
                                setVideoLoading(false)
                                alert('Failed to load video preview')
                                setVideoUrl('')
                            }}
                        />
                        <button
                            onClick={() => {
                                setVideoUrl('')
                                setVideoLoading(false)
                            }}
                            style={{
                                position: 'absolute',
                                top: '5px',
                                right: '5px',
                                background: 'rgba(0,0,0,0.7)',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                cursor: 'pointer',
                                zIndex: 10
                            }}
                        >
                            <i className="ri-close-line" style={{ color: 'white' }}></i>
                        </button>
                    </div>
                )}
                {location && (<div style={{ marginTop: '5px', marginBottom: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', background: 'rgba(217, 70, 239, 0.1)', padding: '5px 10px', borderRadius: '12px', width: 'fit-content' }}><i className="ri-map-pin-fill"></i> {location} <i className="ri-close-circle-fill" onClick={() => setLocation(null)} style={{ cursor: 'pointer', marginLeft: '5px' }}></i></div>)}

                <div className="compose-actions">
                    <div className="icon-set" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                        <label style={{ cursor: videoUrl ? 'not-allowed' : 'pointer', opacity: videoUrl ? 0.5 : 1, display: 'inline-flex', alignItems: 'center' }}>
                            <ImageIcon size={24} />
                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading || videoUrl} />
                        </label>
                        <label style={{ cursor: imageUrl ? 'not-allowed' : 'pointer', opacity: imageUrl ? 0.5 : 1, display: 'inline-flex', alignItems: 'center' }}>
                            <VideoIcon size={24} />
                            <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: 'none' }} disabled={uploading || imageUrl} />
                        </label>

                        <div style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={getLocation}>
                            <LocationIcon size={24} />
                        </div>
                    </div>
                    <button className="glass-btn" onClick={handlePost} disabled={loading || uploading}>
                        <span>{uploading ? 'Uploading...' : loading ? 'Posting...' : 'Post'}</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content Warning Modal */}
            {showContentWarning && (
                <ContentWarningModal 
                    message={warningMessage}
                    onClose={() => setShowContentWarning(false)}
                />
            )}
        </div>
    )
}
