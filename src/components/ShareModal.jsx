import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Twitter, Youtube, Apple, Phone, Camera, Music, Link2, Globe, ChevronRight } from 'lucide-react'
import { SiPinterest } from 'react-icons/si'

export default function ShareModal({ post, session, onClose }) {
    const [conversations, setConversations] = useState([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)

    useEffect(() => {
        fetchConversations()
    }, [])

    const fetchConversations = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
                .order('created_at', { ascending: false })

            if (error) throw error

            const uniqueUsers = new Map()
            for (const msg of data) {
                const otherUserId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id
                if (!uniqueUsers.has(otherUserId)) {
                    uniqueUsers.set(otherUserId, msg)
                }
            }

            const userIds = Array.from(uniqueUsers.keys())
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', userIds)

                const convos = profiles.map(profile => ({
                    ...profile,
                    lastMessage: uniqueUsers.get(profile.id)
                }))

                setConversations(convos)
            }
        } catch (error) {
            console.error('Error fetching conversations:', error)
        } finally {
            setLoading(false)
        }
    }

    const sharePost = async (recipientId) => {
        setSending(true)
        try {
            const shareMessage = `Check out this post:\n\n"${post.content?.substring(0, 100)}${post.content?.length > 100 ? '...' : ''}"\n\n- Shared from VogueX`

            const { error } = await supabase
                .from('messages')
                .insert([{
                    sender_id: session.user.id,
                    receiver_id: recipientId,
                    content: shareMessage,
                    read: false
                }])

            if (error) throw error

            alert('Post shared successfully!')
            onClose()
        } catch (error) {
            console.error('Error sharing post:', error)
            alert('Failed to share post')
        } finally {
            setSending(false)
        }
    }

    const shareUrl = `${window.location.origin}/post/${post.id}`

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
    }

    const socialIcons = [
        { Icon: Twitter, label: 'Twitter', color: '#1DA1F2' },
        { Icon: Youtube, label: 'YouTube', color: '#FF0000' },
        { Icon: SiPinterest, label: 'Pinterest', color: '#E60023' },
        { Icon: Apple, label: 'Apple', color: '#FFFFFF' },
        { Icon: Phone, label: 'Phone', color: '#34C759' }
    ]

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                backdropFilter: 'blur(10px)'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'linear-gradient(180deg, #1c1c1e 0%, #2c2c2e 100%)',
                    borderRadius: '24px',
                    maxWidth: '380px',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 20px 16px',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '17px',
                        fontWeight: '600',
                        color: '#ffffff',
                        letterSpacing: '-0.3px'
                    }}>
                        Share link
                    </h3>
                </div>

                {/* Social Icons Row */}
                <div style={{
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-around',
                    gap: '12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    {socialIcons.map(({ Icon, label, color }) => (
                        <button
                            key={label}
                            style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                backdropFilter: 'blur(10px)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                                e.currentTarget.style.transform = 'scale(1.05)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                                e.currentTarget.style.transform = 'scale(1)'
                            }}
                        >
                            <Icon style={{ width: '24px', height: '24px', color: '#ffffff' }} />
                        </button>
                    ))}
                </div>

                {/* Conversation List */}
                <div style={{
                    padding: '12px 16px',
                    maxHeight: '320px',
                    overflowY: 'auto'
                }}>
                    {loading ? (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '15px'
                        }}>
                            Loading conversations...
                        </div>
                    ) : conversations.length === 0 ? (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '15px'
                        }}>
                            No recent conversations
                        </div>
                    ) : (
                        conversations.slice(0, 4).map((convo, index) => (
                            <div
                                key={convo.id}
                                onClick={() => !sending && sharePost(convo.id)}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: sending ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: sending ? 0.5 : 1,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    marginBottom: index < 3 ? '8px' : '0'
                                }}
                                onMouseEnter={(e) => !sending && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }}>
                                    <img
                                        src={convo.avatar_url || '/download.png'}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                        alt={convo.username}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: '600',
                                        fontSize: '15px',
                                        color: '#ffffff',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {convo.full_name || convo.username}
                                    </div>
                                    <div style={{
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        fontSize: '13px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        @{convo.username}
                                    </div>
                                </div>
                                <ChevronRight style={{
                                    width: '20px',
                                    height: '20px',
                                    color: 'rgba(255, 255, 255, 0.3)',
                                    flexShrink: 0
                                }} />
                            </div>
                        ))
                    )}
                </div>

                {/* Copy Link Button */}
                <div style={{ padding: '16px 20px 8px' }}>
                    <button
                        onClick={copyToClipboard}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: '#000000',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '28px',
                            fontSize: '17px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            letterSpacing: '-0.3px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#1c1c1c'
                            e.currentTarget.style.transform = 'scale(1.02)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#000000'
                            e.currentTarget.style.transform = 'scale(1)'
                        }}
                    >
                        Copy link
                    </button>
                </div>

                {/* Cancel Button */}
                <div style={{ padding: '0 20px 20px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'transparent',
                            color: '#ff453a',
                            border: '1px solid rgba(255, 69, 58, 0.3)',
                            borderRadius: '28px',
                            fontSize: '17px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            letterSpacing: '-0.3px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 69, 58, 0.1)'
                            e.currentTarget.style.borderColor = 'rgba(255, 69, 58, 0.5)'
                            e.currentTarget.style.transform = 'scale(1.02)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.borderColor = 'rgba(255, 69, 58, 0.3)'
                            e.currentTarget.style.transform = 'scale(1)'
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}