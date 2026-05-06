import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import SearchBar from './SearchBar'

export default function Explore({ session, onStartChat, onBack }) {
    const [users, setUsers] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .neq('id', session.user.id)
                .order('username')

            if (error) throw error
            setUsers(data || [])
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredUsers = users.filter(user => {
        const query = searchQuery.toLowerCase()
        return (
            user.username?.toLowerCase().includes(query) ||
            user.full_name?.toLowerCase().includes(query)
        )
    })

    const checkVerified = async (username) => {
        try {
            const { data } = await supabase
                .from('verified_users')
                .select('username')
                .eq('username', username)
                .single()
            return !!data
        } catch {
            return false
        }
    }

    const [verifiedUsers, setVerifiedUsers] = useState({})

    useEffect(() => {
        const checkAllVerified = async () => {
            const verified = {}
            for (const user of filteredUsers) {
                verified[user.id] = await checkVerified(user.username)
            }
            setVerifiedUsers(verified)
        }
        if (filteredUsers.length > 0) {
            checkAllVerified()
        }
    }, [filteredUsers])

    return (
        <main className="main-feed">
            <header className="feed-header">
                <div style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <i className="ri-arrow-left-line" onClick={onBack} style={{ fontSize: '20px', cursor: 'pointer' }}></i>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '20px' }}>Explore</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{filteredUsers.length} users</div>
                    </div>
                </div>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                    <SearchBar
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users..."
                        autoFocus
                    />
                </div>
            </header>

            {loading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading users...
                </div>
            ) : filteredUsers.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {searchQuery ? 'No users found' : 'No users available'}
                </div>
            ) : (
                filteredUsers.map((user) => (
                    <div
                        key={user.id}
                        style={{
                            padding: '16px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <img
                            src={user.avatar_url || '/download.png'}
                            style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                            alt={user.username}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{user.full_name}</span>
                                {verifiedUsers[user.id] && (
                                    <i className="ri-verified-badge-fill" style={{ color: 'var(--twitter-blue)', fontSize: '14px' }}></i>
                                )}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>@{user.username}</div>
                        </div>
                        <button
                            onClick={() => onStartChat(user)}
                            style={{
                                padding: '8px 16px',
                                background: 'var(--accent)',
                                color: 'white',
                                borderRadius: '20px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <i className="ri-message-3-line"></i>
                            Message
                        </button>
                    </div>
                ))
            )}

            <div style={{ height: '100px' }}></div>
        </main>
    )
}
