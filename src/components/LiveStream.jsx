import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

export default function LiveStream({ session, onBack }) {
  const [liveStreams, setLiveStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGoLiveModal, setShowGoLiveModal] = useState(false)

  useEffect(() => {
    fetchLiveStreams()
    
    // Subscribe to live stream updates
    const channel = supabase
      .channel('live-streams')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_streams'
      }, () => {
        fetchLiveStreams()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchLiveStreams = async () => {
    try {
      setLoading(true)
      // Fetch posts that start with 🔴 LIVE
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .ilike('content', '🔴 LIVE:%')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      // Fetch profiles for these posts
      if (postsData && postsData.length > 0) {
        const userIds = [...new Set(postsData.map(p => p.user_id))]
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds)

        const streams = postsData.map(post => {
          const profile = profilesData?.find(p => p.id === post.user_id)
          const content = post.content.replace('🔴 LIVE: ', '')
          const [title, ...descParts] = content.split('\n\n')
          return {
            id: post.id,
            user_id: post.user_id,
            title: title || 'Live Stream',
            description: descParts.join('\n\n') || '',
            viewer_count: Math.floor(Math.random() * 100),
            profiles: profile
          }
        })
        setLiveStreams(streams)
      } else {
        setLiveStreams([])
      }
    } catch (error) {
      console.error('Error fetching live streams:', error)
      setLiveStreams([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="main-feed">
      <header className="feed-header">
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '20px', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <i className="ri-arrow-left-line"></i>
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, flex: 1 }}>Live Streams</h2>
          <button onClick={() => setShowGoLiveModal(true)} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #ff0050 0%, #ff4d4d 100%)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(255, 0, 80, 0.4)' }}>
            <i className="ri-live-line"></i>
            Go Live
          </button>
        </div>
      </header>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="ri-loader-4-line" style={{ fontSize: '48px', animation: 'spin 1s linear infinite' }}></i>
          </div>
        ) : liveStreams.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="ri-live-line" style={{ fontSize: '64px', opacity: 0.5, marginBottom: '16px' }}></i>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>No Live Streams</h3>
            <p style={{ fontSize: '14px', marginBottom: '24px' }}>Be the first to go live!</p>
            <button onClick={() => setShowGoLiveModal(true)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #ff0050 0%, #ff4d4d 100%)', color: 'white', border: 'none', borderRadius: '20px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
              Start Streaming
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {liveStreams.map(stream => (
              <LiveStreamCard key={stream.id} stream={stream} session={session} />
            ))}
          </div>
        )}
      </div>

      {showGoLiveModal && (
        <GoLiveModal session={session} onClose={() => setShowGoLiveModal(false)} />
      )}
    </main>
  )
}

function LiveStreamCard({ stream, session }) {
  const handleJoinStream = () => {
    // Extract room ID from content
    const roomIdMatch = stream.description.match(/Room ID: (live_\w+_\d+)/)
    const roomId = roomIdMatch ? roomIdMatch[1] : `live_${stream.user_id}_${stream.id}`
    window.location.href = `/live/watch/${roomId}`
  }

  return (
    <div onClick={handleJoinStream} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
      <div style={{ position: 'relative', paddingTop: '56.25%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ position: 'absolute', top: '12px', left: '12px', padding: '4px 12px', background: '#ff0050', color: 'white', borderRadius: '4px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(255, 0, 80, 0.4)' }}>
          <span style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
          LIVE
        </div>
        <div style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '4px 8px', background: 'rgba(0, 0, 0, 0.7)', color: 'white', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
          <i className="ri-user-line"></i> {stream.viewer_count || 0}
        </div>
      </div>
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <img src={stream.profiles?.avatar_url || '/download.png'} style={{ width: '32px', height: '32px', borderRadius: '50%' }} alt={stream.profiles?.username} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontWeight: '600', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stream.profiles?.full_name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{stream.profiles?.username}</div>
          </div>
        </div>
        <h3 style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stream.title}</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stream.description}</p>
      </div>
    </div>
  )
}

function GoLiveModal({ session, onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)

  useEffect(() => {
    startCamera()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setStream(mediaStream)
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Could not access camera. Please allow camera permissions.')
    }
  }

  const handleGoLive = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your live stream')
      return
    }

    setLoading(true)
    try {
      const roomId = `live_${session.user.id}_${Date.now()}`
      
      // Create a post with live stream info
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: session.user.id,
          content: `🔴 LIVE: ${title.trim()}\n\n${description.trim() || 'Join my live stream!'}\n\nRoom ID: ${roomId}`,
          created_at: new Date()
        })
        .select()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      // Navigate to live stream room
      window.location.href = `/live/host/${roomId}`
    } catch (error) {
      console.error('Error starting live stream:', error)
      alert('Failed to start live stream: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', maxWidth: '500px', width: '100%', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Go Live</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '24px', cursor: 'pointer' }}>
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <video ref={videoRef} autoPlay muted style={{ width: '100%', borderRadius: '12px', background: '#000', marginBottom: '16px' }} />

          <input type="text" placeholder="Stream title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '15px', marginBottom: '12px', outline: 'none' }} />

          <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '15px', marginBottom: '16px', outline: 'none', resize: 'vertical', minHeight: '80px' }} />

          <button onClick={handleGoLive} disabled={loading || !title.trim()} style={{ width: '100%', padding: '14px', background: loading || !title.trim() ? 'rgba(255, 0, 80, 0.5)' : 'linear-gradient(135deg, #ff0050 0%, #ff4d4d 100%)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px', cursor: loading || !title.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <i className="ri-live-line"></i>
            {loading ? 'Starting...' : 'Start Live Stream'}
          </button>
        </div>
      </div>
    </div>
  )
}
