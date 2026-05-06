import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function ProfileEditModal({ session, onClose, onUpdate }) {
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [website, setWebsite] = useState('')

    useEffect(() => {
        getProfile()
    }, [])

    const getProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

            if (error) throw error

            if (data) {
                setFullName(data.full_name || '')
                setUsername(data.username || '')
                setAvatarUrl(data.avatar_url || '')
                setWebsite(data.website || '')
            }
        } catch (error) {
            console.error('Error loading profile:', error.message)
        }
    }

    const handleAvatarUpload = async (e) => {
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
            const filePath = `${session.user.id}/${fileName}`

            // Upload to Supabase Storage (avatars bucket)
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setAvatarUrl(publicUrl)
            alert('Profile photo uploaded successfully!')
        } catch (error) {
            console.error('Error uploading avatar:', error)
            alert('Failed to upload profile photo. Make sure the "avatars" bucket exists in Supabase Storage.')
        } finally {
            setUploading(false)
        }
    }

    const updateProfile = async () => {
        if (uploading) {
            alert('Please wait for image upload to complete')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    username: username,
                    avatar_url: avatarUrl || '/download.png',
                    website: website,
                    updated_at: new Date(),
                })
                .eq('id', session.user.id)

            if (error) throw error

            alert('Profile updated successfully!')
            onUpdate()
            onClose()
        } catch (error) {
            alert('Error updating profile: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: '#000',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Edit Profile</h2>
                    <button onClick={onClose} style={{ fontSize: '24px', cursor: 'pointer' }}>
                        <i className="ri-close-line"></i>
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Profile Picture</label>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <img 
                                src={avatarUrl || '/download.png'} 
                                onError={(e) => e.target.src = '/download.png'}
                                style={{ 
                                    width: '120px', 
                                    height: '120px', 
                                    borderRadius: '50%', 
                                    objectFit: 'cover',
                                    border: '4px solid var(--border)',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                }} 
                                alt="Profile"
                            />
                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <label 
                                    htmlFor="avatar-upload"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '14px 28px',
                                        background: uploading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
                                        color: 'white',
                                        borderRadius: '14px',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        fontWeight: 600,
                                        fontSize: '15px',
                                        transition: 'all 0.3s',
                                        boxShadow: uploading ? 'none' : '0 4px 12px rgba(0, 122, 255, 0.3)',
                                        opacity: uploading ? 0.6 : 1
                                    }}
                                    onMouseEnter={(e) => !uploading && (e.target.style.transform = 'translateY(-2px)')}
                                    onMouseLeave={(e) => !uploading && (e.target.style.transform = 'translateY(0)')}
                                >
                                    {uploading ? (
                                        <>
                                            <i className="ri-loader-4-line" style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }}></i>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-upload-cloud-line" style={{ marginRight: '8px', fontSize: '18px' }}></i>
                                            Upload Photo
                                        </>
                                    )}
                                </label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    disabled={uploading}
                                    style={{ display: 'none' }}
                                />
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '10px 0 0 0' }}>
                                    JPG, PNG or GIF. Max 5MB.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your Name"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#16181c',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'white'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="username"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#16181c',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'white'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Website</label>
                        <input
                            type="text"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://yourwebsite.com"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#16181c',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'white'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Email</label>
                        <input
                            type="text"
                            value={session.user.email}
                            disabled
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#16181c',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'var(--text-muted)',
                                opacity: 0.6
                            }}
                        />
                    </div>

                    <button
                        onClick={updateProfile}
                        disabled={loading || uploading}
                        className="profile-save-button"
                        style={{ opacity: (loading || uploading) ? 0.6 : 1 }}
                    >
                        {uploading ? (
                            <>
                                <i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}></i>
                                Uploading Image...
                            </>
                        ) : loading ? (
                            <>
                                <i className="ri-loader-4-line" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}></i>
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="ri-check-line" style={{ marginRight: '8px' }}></i>
                                Save Profile
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
