import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function SettingsModal({ session, onClose }) {
    const [selectedUser, setSelectedUser] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [followers, setFollowers] = useState([])
    const [addFollowerQuery, setAddFollowerQuery] = useState('')
    const [addFollowerResults, setAddFollowerResults] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (selectedUser) {
            fetchFollowers()
        }
    }, [selectedUser])

    const searchUsers = async (query) => {
        if (!query.trim()) {
            setSearchResults([])
            return
        }

        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
                .limit(10)

            setSearchResults(data || [])
        } catch (error) {
            console.error('Error searching users:', error)
        }
    }

    const searchUsersToAdd = async (query) => {
        if (!query.trim()) {
            setAddFollowerResults([])
            return
        }

        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
                .limit(10)

            setAddFollowerResults(data || [])
        } catch (error) {
            console.error('Error searching users:', error)
        }
    }

    const fetchFollowers = async () => {
        if (!selectedUser) return

        setLoading(true)
        try {
            const { data } = await supabase
                .from('followers')
                .select('follower_id, profiles!followers_follower_id_fkey(id, username, full_name, avatar_url)')
                .eq('following_id', selectedUser.id)

            setFollowers(data || [])
        } catch (error) {
            console.error('Error fetching followers:', error)
        } finally {
            setLoading(false)
        }
    }

    const addFollower = async (followerUser) => {
        if (!selectedUser || !followerUser) return

        try {
            await supabase
                .from('followers')
                .insert({
                    follower_id: followerUser.id,
                    following_id: selectedUser.id
                })

            alert(`Added ${followerUser.username} as follower of ${selectedUser.username}`)
            fetchFollowers()
            setAddFollowerQuery('')
            setAddFollowerResults([])
        } catch (error) {
            console.error('Error adding follower:', error)
            alert('Failed to add follower. They may already be following.')
        }
    }

    const removeFollower = async (followerId) => {
        if (!selectedUser || !confirm('Remove this follower?')) return

        try {
            await supabase
                .from('followers')
                .delete()
                .eq('follower_id', followerId)
                .eq('following_id', selectedUser.id)

            alert('Follower removed successfully')
            fetchFollowers()
        } catch (error) {
            console.error('Error removing follower:', error)
            alert('Failed to remove follower')
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Admin Settings</h2>
                        <i className="ri-close-line" onClick={onClose} style={{ fontSize: '24px', cursor: 'pointer' }}></i>
                    </div>

                    {/* Search for user to manage */}
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                            Select User to Manage
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                searchUsers(e.target.value)
                            }}
                            placeholder="Search by username or name..."
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                        {searchResults.length > 0 && (
                            <div style={{
                                marginTop: '10px',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                background: 'var(--bg-secondary)',
                                maxHeight: '200px',
                                overflow: 'auto'
                            }}>
                                {searchResults.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => {
                                            setSelectedUser(user)
                                            setSearchQuery('')
                                            setSearchResults([])
                                        }}
                                        style={{
                                            padding: '10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            borderBottom: '1px solid var(--border)'
                                        }}
                                    >
                                        <img src={user.avatar_url || '/download.png'} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{user.full_name}</div>
                                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>@{user.username}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {selectedUser && (
                        <div>
                            <div style={{
                                padding: '15px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <img src={selectedUser.avatar_url || '/download.png'} style={{ width: '50px', height: '50px', borderRadius: '50%' }} />
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{selectedUser.full_name}</div>
                                    <div style={{ color: 'var(--text-muted)' }}>@{selectedUser.username}</div>
                                </div>
                            </div>

                            {/* Add Follower Section */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                                    Add Follower
                                </label>
                                <input
                                    type="text"
                                    value={addFollowerQuery}
                                    onChange={(e) => {
                                        setAddFollowerQuery(e.target.value)
                                        searchUsersToAdd(e.target.value)
                                    }}
                                    placeholder="Search user to add as follower..."
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                                {addFollowerResults.length > 0 && (
                                    <div style={{
                                        marginTop: '10px',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        background: 'var(--bg-secondary)',
                                        maxHeight: '150px',
                                        overflow: 'auto'
                                    }}>
                                        {addFollowerResults.map(user => (
                                            <div
                                                key={user.id}
                                                onClick={() => addFollower(user)}
                                                style={{
                                                    padding: '10px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    borderBottom: '1px solid var(--border)'
                                                }}
                                            >
                                                <img src={user.avatar_url || '/download.png'} style={{ width: '35px', height: '35px', borderRadius: '50%' }} />
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{user.full_name}</div>
                                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>@{user.username}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Current Followers List */}
                            <div>
                                <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>
                                    Current Followers ({followers.length})
                                </h3>
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                        Loading followers...
                                    </div>
                                ) : followers.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                        No followers yet
                                    </div>
                                ) : (
                                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                                        {followers.map(follower => (
                                            <div
                                                key={follower.follower_id}
                                                style={{
                                                    padding: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    borderBottom: '1px solid var(--border)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <img
                                                        src={follower.profiles?.avatar_url || '/download.png'}
                                                        style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                                                    />
                                                    <div>
                                                        <div style={{ fontWeight: 'bold' }}>{follower.profiles?.full_name}</div>
                                                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                                            @{follower.profiles?.username}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFollower(follower.follower_id)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#dc2626',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
