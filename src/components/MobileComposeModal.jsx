import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ImageIcon, VideoIcon, LocationIcon } from './GradientIcons'

export default function MobileComposeModal({ session, onClose }) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [imageUrl, setImageUrl] = useState('')
    const [videoUrl, setVideoUrl] = useState('')
    const [location, setLocation] = useState(null)
    const [userAvatar, setUserAvatar] = useState('/download.png')
    const [isVisible, setIsVisible] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [videoLoading, setVideoLoading] = useState(false)

    useEffect(() => {
        setIsVisible(true)
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

    const handlePost = async () => {
        if (!content.trim() && !imageUrl && !videoUrl) return
        setLoading(true)

        let finalContent = content
        if (location) {
            finalContent += `\n\n📍 ${location}`
        }

        try {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, full_name')
                .eq('id', session.user.id)
                .single()

            if (profileError || !profileData) {
                alert('Please complete your profile first!')
                setLoading(false)
                return
            }

            if (!profileData.username || !profileData.full_name) {
                alert('Please set your username and name in your profile!')
                setLoading(false)
                return
            }

            const { error } = await supabase
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

            if (error) throw error
            handleClose()
        } catch (error) {
            console.error('Error posting:', error.message)
            alert('Error posting: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(onClose, 300)
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
            const fileName = `${Date.now()}.${fileExt}`
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
            alert('Failed to upload image.')
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
            alert('Failed to upload video.')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.3s ease',
            padding: '20px'
        }}>
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '900px',
                width: '100%',
                margin: '0 auto',
                transform: isVisible ? 'scale(1)' : 'scale(0.95)',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img
                            src={userAvatar}
                            style={{ 
                                width: '50px', 
                                height: '50px', 
                                borderRadius: '50%',
                                border: '2px solid rgba(255, 255, 255, 0.1)'
                            }}
                            alt="Avatar"
                        />
                        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                            What's happening?
                        </h2>
                    </div>
                    <button 
                        onClick={handleClose} 
                        style={{ 
                            fontSize: '17px', 
                            color: 'rgba(255, 255, 255, 0.7)',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            transition: 'all 0.2s',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                </div>

                {/* Content Area */}
                <div style={{ 
                    flex: 1, 
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '20px',
                    marginBottom: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto'
                }}>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's happening?"
                        autoFocus
                        style={{
                            width: '100%',
                            minHeight: '150px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            fontSize: '18px',
                            outline: 'none',
                            resize: 'none',
                            fontFamily: 'Inter, sans-serif'
                        }}
                    />

                    {imageUrl && (
                        <div style={{ position: 'relative', marginTop: '15px' }}>
                            <img 
                                src={imageUrl} 
                                style={{ 
                                    borderRadius: '16px', 
                                    maxHeight: '300px', 
                                    width: '100%',
                                    objectFit: 'cover'
                                }} 
                                alt="Upload"
                            />
                            <button
                                onClick={() => setImageUrl('')}
                                style={{
                                    position: 'absolute', 
                                    top: '10px', 
                                    right: '10px',
                                    background: 'rgba(0,0,0,0.8)', 
                                    borderRadius: '50%',
                                    width: '32px', 
                                    height: '32px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <i className="ri-close-line" style={{ color: 'white', fontSize: '18px' }}></i>
                            </button>
                        </div>
                    )}

                    {videoUrl && (
                        <div style={{ position: 'relative', marginTop: '15px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {videoLoading && (
                                <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255, 255, 255, 0.7)' }}>
                                    <i className="ri-loader-4-line" style={{ fontSize: '24px', animation: 'spin 1s linear infinite' }}></i>
                                    <span>Loading video...</span>
                                </div>
                            )}
                            <video 
                                src={videoUrl} 
                                controls 
                                preload="metadata"
                                playsInline
                                style={{ 
                                    borderRadius: '16px', 
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
                                    top: '10px', 
                                    right: '10px',
                                    background: 'rgba(0,0,0,0.8)', 
                                    borderRadius: '50%',
                                    width: '32px', 
                                    height: '32px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    border: 'none',
                                    cursor: 'pointer',
                                    zIndex: 10
                                }}
                            >
                                <i className="ri-close-line" style={{ color: 'white', fontSize: '18px' }}></i>
                            </button>
                        </div>
                    )}

                    {location && (
                        <div style={{
                            marginTop: '15px',
                            padding: '10px 15px',
                            background: 'rgba(0, 122, 255, 0.1)',
                            border: '1px solid rgba(0, 122, 255, 0.3)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#007AFF' }}>
                                <i className="ri-map-pin-fill"></i>
                                <span style={{ fontSize: '14px' }}>{location}</span>
                            </div>
                            <i 
                                className="ri-close-circle-fill" 
                                onClick={() => setLocation(null)} 
                                style={{ cursor: 'pointer', fontSize: '18px' }}
                            ></i>
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px 20px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <label style={{ cursor: videoUrl ? 'not-allowed' : 'pointer', opacity: videoUrl ? 0.3 : 1, display: 'flex', alignItems: 'center' }}>
                            <ImageIcon size={28} title="Upload Image" />
                            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading || videoUrl} />
                        </label>
                        <label style={{ cursor: imageUrl ? 'not-allowed' : 'pointer', opacity: imageUrl ? 0.3 : 1, display: 'flex', alignItems: 'center' }}>
                            <VideoIcon size={28} title="Upload Video" />
                            <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: 'none' }} disabled={uploading || imageUrl} />
                        </label>
                        <div 
                            onClick={getLocation} 
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
                            title="Add Location"
                        >
                            <LocationIcon size={28} />
                        </div>
                    </div>

                    <button
                        onClick={handlePost}
                        disabled={loading || uploading || (!content.trim() && !imageUrl && !videoUrl)}
                        style={{
                            padding: '12px 32px',
                            background: (loading || uploading || (!content.trim() && !imageUrl && !videoUrl)) 
                                ? 'rgba(0, 122, 255, 0.3)' 
                                : 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
                            color: 'white',
                            borderRadius: '25px',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            border: 'none',
                            cursor: (loading || uploading || (!content.trim() && !imageUrl && !videoUrl)) ? 'not-allowed' : 'pointer',
                            boxShadow: (loading || uploading || (!content.trim() && !imageUrl && !videoUrl)) 
                                ? 'none' 
                                : '0 4px 12px rgba(0, 122, 255, 0.4)',
                            transition: 'all 0.3s'
                        }}
                    >
                        {uploading ? 'Uploading...' : loading ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </div>
        </div>
    )
}
