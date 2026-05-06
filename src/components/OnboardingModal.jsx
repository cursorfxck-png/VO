import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function OnboardingModal({ session, onComplete }) {
    const [fullName, setFullName] = useState('')
    const [username, setUsername] = useState('')
    const [dob, setDob] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        // Pre-fill email username if available
        if (session?.user?.email) {
            const emailUser = session.user.email.split('@')[0]
            setUsername(emailUser)
        }
    }, [session])

    const calculateAge = (birthDate) => {
        const today = new Date()
        const birth = new Date(birthDate)
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--
        }
        return age
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (!fullName.trim() || !username.trim() || !dob) {
            setError('Please fill in all required fields.')
            setLoading(false)
            return
        }

        const age = calculateAge(dob)
        if (age < 13) {
            setError('You must be at least 13 years old to use VogueX.')
            setLoading(false)
            return
        }

        try {
            const updates = {
                id: session.user.id,
                full_name: fullName,
                username: username,
                date_of_birth: dob,
                avatar_url: avatarUrl || '/download.png',
                updated_at: new Date(),
            }

            const { error } = await supabase
                .from('profiles')
                .upsert(updates)

            if (error) throw error

            onComplete()
        } catch (error) {
            console.error('Error updating profile:', error)
            setError(error.message)
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
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
        }}>
            <div style={{
                background: '#000',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '30px',
                maxWidth: '450px',
                width: '90%',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                    <i className="ri-twitter-x-line" style={{ fontSize: '40px', color: 'white' }}></i>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', marginTop: '15px' }}>Complete your profile</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Let's get you set up on VogueX</p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(255, 68, 68, 0.1)',
                        color: '#ff4444',
                        padding: '10px',
                        borderRadius: '8px',
                        marginBottom: '15px',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontSize: '14px' }}>Full Name <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Bella Hadid"
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#16181c',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '16px'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontSize: '14px' }}>Username <span style={{ color: 'red' }}>*</span></label>
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
                                color: 'white',
                                fontSize: '16px'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontSize: '14px' }}>Date of Birth <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#16181c',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '16px',
                                colorScheme: 'dark'
                            }}
                        />
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>You must be at least 13 years old.</p>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-muted)', fontSize: '14px' }}>Profile Picture URL (Optional)</label>
                        <input
                            type="text"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder="https://..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#16181c',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '16px'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="post-btn-large"
                        style={{
                            width: '100%',
                            marginTop: '10px',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Saving...' : 'Save & Continue'}
                    </button>
                </form>
            </div>
        </div>
    )
}
