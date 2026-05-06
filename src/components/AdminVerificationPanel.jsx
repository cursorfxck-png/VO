import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Check, X, ExternalLink } from 'lucide-react'

export default function AdminVerificationPanel({ session, onClose }) {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('pending')

    useEffect(() => {
        fetchVerificationRequests()
    }, [filter])

    const fetchVerificationRequests = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('verification_requests')
                .select(`
                    *,
                    profiles:user_id (
                        username,
                        full_name,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false })

            if (filter !== 'all') {
                query = query.eq('status', filter)
            }

            const { data, error } = await query

            if (error) throw error
            setRequests(data || [])
        } catch (error) {
            console.error('Error fetching verification requests:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (request) => {
        if (!confirm(`Approve verification for ${request.profiles.username}?`)) return

        try {
            // Update request status
            await supabase
                .from('verification_requests')
                .update({ status: 'approved', reviewed_at: new Date().toISOString() })
                .eq('id', request.id)

            // Add to verified_users table
            await supabase
                .from('verified_users')
                .insert({
                    username: request.profiles.username,
                    verified_at: new Date().toISOString()
                })

            // Update profile with verified status
            await supabase
                .from('profiles')
                .update({ is_verified: true })
                .eq('id', request.user_id)

            alert('Verification approved successfully!')
            fetchVerificationRequests()
        } catch (error) {
            console.error('Error approving verification:', error)
            alert('Failed to approve verification')
        }
    }

    const handleReject = async (request) => {
        const reason = prompt('Reason for rejection (optional):')
        
        try {
            await supabase
                .from('verification_requests')
                .update({ 
                    status: 'rejected', 
                    reviewed_at: new Date().toISOString(),
                    rejection_reason: reason 
                })
                .eq('id', request.id)

            alert('Verification rejected')
            fetchVerificationRequests()
        } catch (error) {
            console.error('Error rejecting verification:', error)
            alert('Failed to reject verification')
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>Verification Requests</h2>
                        <i className="ri-close-line" onClick={onClose} style={{ fontSize: '24px', cursor: 'pointer' }}></i>
                    </div>

                    {/* Filter Tabs */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                        {['pending', 'approved', 'rejected', 'all'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                style={{
                                    padding: '10px 20px',
                                    background: filter === status ? 'var(--accent)' : 'transparent',
                                    color: filter === status ? 'white' : 'var(--text-main)',
                                    border: 'none',
                                    borderBottom: filter === status ? '2px solid var(--accent)' : 'none',
                                    cursor: 'pointer',
                                    fontWeight: filter === status ? 'bold' : 'normal',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    {/* Requests List */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            Loading requests...
                        </div>
                    ) : requests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No {filter !== 'all' ? filter : ''} requests found
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {requests.map(request => (
                                <div
                                    key={request.id}
                                    style={{
                                        padding: '20px',
                                        background: 'var(--bg-hover)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                        <img
                                            src={request.profiles?.avatar_url || '/download.png'}
                                            style={{ width: '60px', height: '60px', borderRadius: '50%' }}
                                            alt={request.profiles?.username}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>
                                                {request.full_name}
                                            </div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
                                                @{request.profiles?.username}
                                            </div>
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                background: request.status === 'pending' ? 'rgba(255, 193, 7, 0.2)' :
                                                           request.status === 'approved' ? 'rgba(76, 175, 80, 0.2)' :
                                                           'rgba(244, 67, 54, 0.2)',
                                                color: request.status === 'pending' ? '#FFC107' :
                                                       request.status === 'approved' ? '#4CAF50' :
                                                       '#F44336'
                                            }}>
                                                {request.status.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Email</div>
                                            <div style={{ fontSize: '14px' }}>{request.email}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Phone</div>
                                            <div style={{ fontSize: '14px' }}>{request.phone_number || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Category</div>
                                            <div style={{ fontSize: '14px' }}>{request.category}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Country</div>
                                            <div style={{ fontSize: '14px' }}>{request.country}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <a
                                            href={request.document_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '8px 16px',
                                                background: 'var(--accent)',
                                                color: 'white',
                                                borderRadius: '8px',
                                                textDecoration: 'none',
                                                fontSize: '14px',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            <ExternalLink size={16} />
                                            View Document
                                        </a>
                                    </div>

                                    {request.status === 'pending' && (
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={() => handleApprove(request)}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <Check size={18} />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(request)}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    background: 'linear-gradient(135deg, #F44336 0%, #d32f2f 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <X size={18} />
                                                Reject
                                            </button>
                                        </div>
                                    )}

                                    {request.rejection_reason && (
                                        <div style={{
                                            marginTop: '12px',
                                            padding: '12px',
                                            background: 'rgba(244, 67, 54, 0.1)',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            color: '#F44336'
                                        }}>
                                            <strong>Rejection Reason:</strong> {request.rejection_reason}
                                        </div>
                                    )}

                                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        Submitted: {new Date(request.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}