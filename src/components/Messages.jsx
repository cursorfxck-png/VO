import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { formatDistanceToNow } from 'date-fns'
import EmojiPicker from 'emoji-picker-react'
import { Paperclip, Send, Smile } from 'lucide-react'

export default function Messages({ session, onBack, selectedUser = null, onViewProfile }) {
    const [conversations, setConversations] = useState([])
    const [selectedChat, setSelectedChat] = useState(selectedUser)
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [isVerified, setIsVerified] = useState(false)
    const [isTyping, setIsTyping] = useState(false)
    const [otherUserTyping, setOtherUserTyping] = useState(false)
    const [otherUserOnline, setOtherUserOnline] = useState(false)
    const [unreadCounts, setUnreadCounts] = useState({})
    const [longPressMessage, setLongPressMessage] = useState(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [messageToDelete, setMessageToDelete] = useState(null)
    const [showDeleteButton, setShowDeleteButton] = useState(null)
    const [lastTap, setLastTap] = useState(0)
    const longPressTimer = useRef(null)
    const typingTimeoutRef = useRef(null)
    const typingChannelRef = useRef(null)
    const [swipeActions, setSwipeActions] = useState(null)
    const [swipeStart, setSwipeStart] = useState(null)
    const [swipeOffset, setSwipeOffset] = useState(0)
    const swipeLongPressTimer = useRef(null)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [filePreview, setFilePreview] = useState(null)
    const fileInputRef = useRef(null)

    useEffect(() => {
        if (!selectedChat) {
            fetchConversations()
            fetchUnreadCounts()

            // Auto-refresh conversations every 3 seconds
            const interval = setInterval(() => {
                fetchConversations()
                fetchUnreadCounts()
            }, 3000)

            return () => clearInterval(interval)
        }
    }, [selectedChat])

    useEffect(() => {
        if (selectedChat) {
            fetchMessages()
            checkVerified(selectedChat.username)
            fetchUserPresence(selectedChat.id)

            // Auto-refresh messages every 3 seconds
            const refreshInterval = setInterval(() => {
                fetchMessages()
            }, 3000)

            // Messages realtime subscription
            const messagesChannel = supabase
                .channel(`messages:${selectedChat.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'messages'
                }, () => {
                    fetchMessages()
                })
                .subscribe()

            // Presence subscription for online status
            const presenceChannel = supabase
                .channel(`presence:${selectedChat.id}`)
                .on('presence', { event: 'sync' }, () => {
                    fetchUserPresence(selectedChat.id)
                })
                .subscribe()

            // Typing indicator subscription
            typingChannelRef.current = supabase.channel(`typing:${session.user.id}-${selectedChat.id}`)
            typingChannelRef.current
                .on('broadcast', { event: 'typing' }, (payload) => {
                    if (payload.payload.userId === selectedChat.id) {
                        setOtherUserTyping(payload.payload.isTyping)
                        if (payload.payload.isTyping) {
                            setTimeout(() => setOtherUserTyping(false), 3000)
                        }
                    }
                })
                .subscribe()

            return () => {
                supabase.removeChannel(messagesChannel)
                supabase.removeChannel(presenceChannel)
                if (typingChannelRef.current) {
                    supabase.removeChannel(typingChannelRef.current)
                }
                clearInterval(refreshInterval)
            }
        }
    }, [selectedChat])

    const fetchUserPresence = async (userId) => {
        try {
            const { data } = await supabase
                .from('user_presence')
                .select('is_online, last_seen')
                .eq('user_id', userId)
                .single()

            if (data) {
                setOtherUserOnline(data.is_online)
            }
        } catch (error) {
            console.error('Error fetching user presence:', error)
        }
    }

    const fetchUnreadCounts = async () => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('sender_id')
                .eq('receiver_id', session.user.id)
                .eq('read', false)

            if (error) throw error

            const counts = {}
            data?.forEach(msg => {
                counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1
            })
            setUnreadCounts(counts)
        } catch (error) {
            console.error('Error fetching unread counts:', error)
        }
    }

    const checkVerified = async (username) => {
        try {
            const { data } = await supabase
                .from('verified_users')
                .select('username')
                .eq('username', username)
                .single()
            setIsVerified(!!data)
        } catch {
            setIsVerified(false)
        }
    }

    useEffect(() => {
        // Auto-scroll to bottom when messages change
        const container = document.getElementById('messages-container')
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight
            }, 100)
        }
    }, [messages, otherUserTyping])

    const fetchConversations = async () => {
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

                // Check verified status for all users
                const { data: verifiedUsers } = await supabase
                    .from('verified_users')
                    .select('username')

                // Fetch presence for all users
                const { data: presenceData } = await supabase
                    .from('user_presence')
                    .select('user_id, is_online')
                    .in('user_id', userIds)

                const verifiedUsernames = new Set(verifiedUsers?.map(v => v.username) || [])
                const onlineUsers = new Set(presenceData?.filter(p => p.is_online).map(p => p.user_id) || [])

                const convos = profiles.map(profile => ({
                    ...profile,
                    lastMessage: uniqueUsers.get(profile.id),
                    isVerified: verifiedUsernames.has(profile.username),
                    isOnline: onlineUsers.has(profile.id)
                }))

                setConversations(convos)
            }
        } catch (error) {
            console.error('Error fetching conversations:', error)
        }
    }

    const fetchMessages = async () => {
        if (!selectedChat) return

        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${selectedChat.id}),and(sender_id.eq.${selectedChat.id},receiver_id.eq.${session.user.id})`)
                .order('created_at', { ascending: true })

            if (error) throw error
            setMessages(data || [])

            // Mark messages as read
            await supabase
                .from('messages')
                .update({ read: true })
                .eq('receiver_id', session.user.id)
                .eq('sender_id', selectedChat.id)
                .eq('read', false)
        } catch (error) {
            console.error('Error fetching messages:', error)
        }
    }

    const handleTyping = (value) => {
        setNewMessage(value)

        if (!value.trim()) {
            setIsTyping(false)
            broadcastTyping(false)
            return
        }

        if (!isTyping) {
            setIsTyping(true)
            broadcastTyping(true)
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }

        // Set new timeout to stop typing after 3 seconds
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
            broadcastTyping(false)
        }, 3000)
    }

    const broadcastTyping = (isTyping) => {
        if (typingChannelRef.current && selectedChat) {
            typingChannelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { userId: session.user.id, isTyping }
            })
        }
    }

    const sanitizeMessage = (text) => {
        // Remove any HTML tags and dangerous characters
        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim()
            .substring(0, 1000) // Limit message length
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Only allow images
        if (!file.type.startsWith('image/')) {
            alert('Only image files are allowed')
            return
        }

        setSelectedFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setFilePreview(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const uploadFile = async (file) => {
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${session.user.id}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('chat-files')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('chat-files')
                .getPublicUrl(filePath)

            return data.publicUrl
        } catch (error) {
            console.error('Error uploading file:', error)
            throw error
        }
    }

    const sendMessage = async () => {
        if ((!newMessage.trim() && !selectedFile) || !selectedChat || loading) return

        const sanitizedMessage = newMessage.trim() ? sanitizeMessage(newMessage) : ''
        
        // If no message content and no file, return
        if (!sanitizedMessage && !selectedFile) return

        setNewMessage('') // Clear input immediately for better UX
        setLoading(true)
        setUploadingFile(true)
        setIsTyping(false)
        broadcastTyping(false)

        try {
            // Validate user is authenticated
            if (!session?.user?.id) {
                throw new Error('Not authenticated')
            }

            // Validate receiver exists
            if (!selectedChat?.id) {
                throw new Error('Invalid recipient')
            }

            let fileUrl = null
            let fileName = null
            let fileSize = null

            if (selectedFile) {
                try {
                    fileUrl = await uploadFile(selectedFile)
                    fileName = selectedFile.name
                    fileSize = (selectedFile.size / (1024 * 1024)).toFixed(1) // Convert to MB
                } catch (fileError) {
                    console.error('File upload error:', fileError)
                    // Continue without file if upload fails
                    alert('Failed to upload file, sending message without attachment')
                }
            }

            // Build message object - only include file fields if they exist
            const messageData = {
                sender_id: session.user.id,
                receiver_id: selectedChat.id,
                content: sanitizedMessage || ' ', // Ensure content is not empty
                read: false
            }

            // Only add file fields if file was uploaded successfully
            if (fileUrl) {
                messageData.file_url = fileUrl
                messageData.file_name = fileName
                messageData.file_size = fileSize
            }

            const { data, error } = await supabase
                .from('messages')
                .insert([messageData])
                .select()

            if (error) {
                console.error('Supabase error:', error)
                throw error
            }

            setSelectedFile(null)
            setFilePreview(null)

            // Immediately add message to UI
            if (data && data[0]) {
                setMessages(prev => [...prev, data[0]])
            } else {
                // Fallback: fetch all messages
                await fetchMessages()
            }
        } catch (error) {
            console.error('Error sending message:', error)
            alert('Failed to send message. Please try again.')
            setNewMessage(newMessage) // Restore original message on error
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteMessage = async (messageId) => {
        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', messageId)
                .eq('sender_id', session.user.id)

            if (error) throw error

            setMessages(messages.filter(m => m.id !== messageId))
            setShowDeleteConfirm(false)
            setMessageToDelete(null)
            setLongPressMessage(null)
            setShowDeleteButton(null)
        } catch (error) {
            console.error('Error deleting message:', error)
            alert('Failed to delete message')
        }
    }

    const handleDoubleTap = (msg) => {
        if (msg.sender_id !== session.user.id) return
        
        const currentTime = new Date().getTime()
        const tapLength = currentTime - lastTap
        
        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected
            setShowDeleteButton(msg.id)
            setMessageToDelete(msg)
            // Auto-hide after 3 seconds
            setTimeout(() => {
                setShowDeleteButton(null)
            }, 3000)
        }
        
        setLastTap(currentTime)
    }

    const handleLongPressStart = (msg) => {
        if (msg.sender_id !== session.user.id) return
        longPressTimer.current = setTimeout(() => {
            setShowDeleteButton(msg.id)
            setMessageToDelete(msg)
        }, 500)
    }

    const handleLongPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current)
        }
    }

    const handleRightClick = (e, msg) => {
        if (msg.sender_id !== session.user.id) return
        e.preventDefault()
        setShowDeleteButton(msg.id)
        setMessageToDelete(msg)
    }

    // Swipe action handlers for conversation items
    const handleConvoTouchStart = (e, convoId) => {
        const touch = e.touches[0]
        setSwipeStart({ x: touch.clientX, y: touch.clientY })
        setSwipeOffset(0)
        
        // Start long press timer
        swipeLongPressTimer.current = setTimeout(() => {
            setSwipeActions(convoId)
        }, 500)
    }

    const handleConvoTouchMove = (e, convoId) => {
        if (!swipeStart) return
        
        // Clear long press timer on move
        if (swipeLongPressTimer.current) {
            clearTimeout(swipeLongPressTimer.current)
        }
        
        const touch = e.touches[0]
        const deltaX = touch.clientX - swipeStart.x
        const deltaY = touch.clientY - swipeStart.y
        
        // Only allow left swipe and prevent vertical scrolling
        if (Math.abs(deltaY) > Math.abs(deltaX)) return
        
        if (deltaX < 0) {
            e.preventDefault()
            setSwipeOffset(Math.max(deltaX, -148)) // Max swipe is width of both buttons
        }
    }

    const handleConvoTouchEnd = (convoId) => {
        // Clear long press timer
        if (swipeLongPressTimer.current) {
            clearTimeout(swipeLongPressTimer.current)
        }
        
        if (swipeOffset < -50) {
            // Show actions if swiped enough
            setSwipeActions(convoId)
        }
        setSwipeStart(null)
        setSwipeOffset(0)
    }

    const handleConvoRightClick = (e, convoId) => {
        e.preventDefault()
        setSwipeActions(convoId)
    }

    const handleArchiveConversation = async (convoId) => {
        try {
            // Delete all messages between current user and the conversation user
            const { error } = await supabase
                .from('messages')
                .delete()
                .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${convoId}),and(sender_id.eq.${convoId},receiver_id.eq.${session.user.id})`)

            if (error) throw error

            // Remove from conversations list
            setConversations(conversations.filter(c => c.id !== convoId))
            setSwipeActions(null)
        } catch (error) {
            console.error('Error archiving conversation:', error)
            alert('Failed to archive conversation')
        }
    }

    const handleMoreOptions = (convoId) => {
        // Placeholder for more options - can be expanded later
        alert('More options coming soon!')
        setSwipeActions(null)
    }

    if (selectedChat) {
        return (
            <main className="main-feed messages-view" style={{ background: '#000000' }}>
                <header style={{ 
                    flexShrink: 0, 
                    background: '#1c1c1d',
                    boxShadow: '0px 0.33px 0px #3d3d3f'
                }}>
                    <div style={{ 
                        padding: '12px 16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        minHeight: '88px'
                    }}>
                        <button
                            onClick={() => setSelectedChat(null)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                color: '#ffffff'
                            }}
                        >
                            <svg width="12" height="21" viewBox="0 0 12 21" fill="none">
                                <path d="M10 2L2 10.5L10 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ 
                                fontFamily: 'SF Pro Text, -apple-system, system-ui, BlinkMacSystemFont, sans-serif',
                                fontSize: '17px',
                                fontWeight: 500,
                                letterSpacing: '-0.40px',
                                color: '#ffffff',
                                cursor: 'pointer'
                            }} onClick={() => onViewProfile && onViewProfile(selectedChat.id)}>
                                {selectedChat.full_name}
                            </div>
                            <div style={{ 
                                fontFamily: 'SF Pro Text, -apple-system, system-ui, BlinkMacSystemFont, sans-serif',
                                fontSize: '13px',
                                fontWeight: 400,
                                letterSpacing: '-0.05px',
                                color: '#787878'
                            }}>
                                {otherUserOnline ? 'last seen just now' : '@' + selectedChat.username}
                            </div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <img
                                src={selectedChat.avatar_url || '/download.png'}
                                style={{ 
                                    width: '37px', 
                                    height: '37px', 
                                    borderRadius: '50%', 
                                    cursor: 'pointer',
                                    objectFit: 'cover'
                                }}
                                alt={selectedChat.username}
                                onClick={() => onViewProfile && onViewProfile(selectedChat.id)}
                            />
                        </div>
                    </div>
                </header>

                <div
                    id="messages-container"
                    className="messages-scroll-area"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        backgroundImage: 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0icGF0dGVybiIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48cGF0aCBkPSJNMjAgMEwyMCA0ME0wIDIwTDQwIDIwIiBzdHJva2U9IiMxYTFhMWEiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3BhdHRlcm4pIi8+PC9zdmc+)',
                        backgroundSize: '40px 40px',
                        backgroundColor: '#000000',
                        paddingBottom: '20px',
                        boxShadow: '0px 0.33px 0px rgba(84, 84, 88, 0.65), 0px -0.33px 0px rgba(84, 84, 88, 0.65)'
                    }}
                >
                    {messages.length === 0 ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: 'var(--text-muted)'
                        }}>
                            <i className="ri-chat-3-line" style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.5 }}></i>
                            <div>No messages yet. Start the conversation!</div>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isSent = msg.sender_id === session.user.id
                            const showSenderName = !isSent && (index === 0 || messages[index - 1].sender_id !== msg.sender_id)
                            
                            return (
                                <div
                                    key={msg.id}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isSent ? 'flex-end' : 'flex-start',
                                        marginBottom: '2px',
                                        position: 'relative'
                                    }}
                                >
                                    {showSenderName && (
                                        <div style={{
                                            fontFamily: 'SF Pro Text, -apple-system, system-ui, BlinkMacSystemFont, sans-serif',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            letterSpacing: '-0.15px',
                                            color: '#ffffff',
                                            marginBottom: '4px',
                                            marginLeft: '12px'
                                        }}>
                                            {selectedChat.full_name}
                                        </div>
                                    )}
                                    
                                    <div
                                        style={{
                                            maxWidth: '75%',
                                            position: 'relative',
                                            backgroundImage: isSent 
                                                ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 240 35\'%3E%3Cpath fill=\'%23262628\' d=\'M0,0 L240,0 L240,35 L0,35 Z\'/%3E%3C/svg%3E")'
                                                : 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 240 35\'%3E%3Cpath fill=\'%23262628\' d=\'M0,0 L240,0 L240,35 L0,35 Z\'/%3E%3C/svg%3E")',
                                            backgroundSize: 'cover',
                                            backgroundColor: '#262628',
                                            borderRadius: '12px',
                                            padding: '10px 14px',
                                            wordWrap: 'break-word'
                                        }}
                                        onClick={() => handleDoubleTap(msg)}
                                        onContextMenu={(e) => handleRightClick(e, msg)}
                                        onTouchStart={() => handleLongPressStart(msg)}
                                        onTouchEnd={handleLongPressEnd}
                                        onTouchMove={handleLongPressEnd}
                                    >
                                        {msg.file_url && (
                                            <div style={{ marginBottom: msg.content ? '8px' : '0' }}>
                                                <img 
                                                    src={msg.file_url} 
                                                    alt={msg.file_name || 'Attachment'}
                                                    style={{
                                                        width: '74px',
                                                        height: '74px',
                                                        borderRadius: '8px',
                                                        objectFit: 'cover',
                                                        display: 'block'
                                                    }}
                                                />
                                                <div style={{
                                                    fontFamily: 'SF Pro Text, -apple-system, system-ui, BlinkMacSystemFont, sans-serif',
                                                    fontSize: '16px',
                                                    fontWeight: 400,
                                                    letterSpacing: '-0.30px',
                                                    color: '#ffffff',
                                                    marginTop: '8px'
                                                }}>
                                                    {msg.file_name}
                                                </div>
                                                <div style={{
                                                    fontFamily: 'SF Pro Text, -apple-system, system-ui, BlinkMacSystemFont, sans-serif',
                                                    fontSize: '13px',
                                                    fontWeight: 400,
                                                    letterSpacing: '-0.10px',
                                                    color: '#8e8e93',
                                                    marginTop: '2px'
                                                }}>
                                                    {msg.file_size} MB
                                                </div>
                                            </div>
                                        )}
                                        
                                        {msg.content && (
                                            <div style={{ 
                                                fontFamily: 'SF Pro Text, -apple-system, system-ui, BlinkMacSystemFont, sans-serif',
                                                fontSize: '17px',
                                                fontWeight: 400,
                                                letterSpacing: '-0.40px',
                                                color: '#ffffff',
                                                lineHeight: '22px',
                                                wordBreak: 'break-word'
                                            }}>
                                                {msg.content}
                                            </div>
                                        )}
                                        
                                        <div style={{
                                            fontSize: '11px',
                                            fontStyle: 'italic',
                                            fontFamily: 'SF Pro Text, -apple-system, system-ui, BlinkMacSystemFont, sans-serif',
                                            color: '#8e8e93',
                                            marginTop: '4px',
                                            textAlign: 'right',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end',
                                            gap: '4px'
                                        }}>
                                            <span>{new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                            {msg.sender_id === session.user.id && msg.read && (
                                                <span style={{ fontSize: '10px' }}>✓</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {showDeleteButton === msg.id && msg.sender_id === session.user.id && (
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(true)
                                            setShowDeleteButton(null)
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            right: msg.sender_id === session.user.id ? 'calc(100% + 10px)' : 'auto',
                                            left: msg.sender_id !== session.user.id ? 'calc(100% + 10px)' : 'auto',
                                            transform: 'translateY(-50%)',
                                            background: 'rgba(255, 68, 68, 0.15)',
                                            backdropFilter: 'blur(20px)',
                                            border: '1px solid rgba(255, 68, 68, 0.3)',
                                            borderRadius: '12px',
                                            padding: '10px 16px',
                                            color: '#ff4444',
                                            fontWeight: '600',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: '0 4px 12px rgba(255, 68, 68, 0.2)',
                                            animation: 'scaleIn 0.2s ease',
                                            zIndex: 10
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = 'rgba(255, 68, 68, 0.25)'
                                            e.target.style.transform = 'translateY(-50%) scale(1.05)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'rgba(255, 68, 68, 0.15)'
                                            e.target.style.transform = 'translateY(-50%) scale(1)'
                                        }}
                                    >
                                        <i className="ri-delete-bin-line" style={{ fontSize: '16px' }}></i>
                                        Delete
                                    </button>
                                    )}
                                </div>
                            )
                        })
                    )}

                    {/* Typing Indicator */}
                    {otherUserTyping && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '4px' }}>
                            <div className="ios-message-bubble ios-message-received">
                                <div className="typing-indicator">
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* File Preview */}
                {filePreview && (
                    <div style={{
                        padding: '12px 16px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(0, 0, 0, 0.98)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <img 
                            src={filePreview} 
                            alt="Preview" 
                            style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                objectFit: 'cover'
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <div style={{ color: 'white', fontSize: '14px' }}>{selectedFile?.name}</div>
                            <div style={{ color: '#8e8e93', fontSize: '12px' }}>
                                {(selectedFile?.size / (1024 * 1024)).toFixed(1)} MB
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedFile(null)
                                setFilePreview(null)
                            }}
                            style={{
                                background: 'rgba(255, 68, 68, 0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#ff4444'
                            }}
                        >
                            <i className="ri-close-line" style={{ fontSize: '20px' }}></i>
                        </button>
                    </div>
                )}

                <div className="message-input-container" style={{
                    padding: '12px 16px',
                    paddingBottom: '16px',
                    borderTop: '1px solid #3a3a3c',
                    display: 'flex',
                    gap: '12px',
                    background: '#1c1c1d',
                    backdropFilter: 'blur(20px)',
                    flexShrink: 0,
                    alignItems: 'center',
                    position: 'relative'
                }}>
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                        <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '16px',
                            zIndex: 1000,
                            marginBottom: '8px'
                        }}>
                            <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                    setNewMessage(prev => prev + emojiData.emoji)
                                    setShowEmojiPicker(false)
                                }}
                                theme="dark"
                                width={300}
                                height={400}
                            />
                        </div>
                    )}

                    {/* Clip Icon */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px',
                            color: '#7f7f7f',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#7f7f7f'}
                    >
                        <Paperclip size={24} />
                    </button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />

                    {/* Message Input */}
                    <div style={{
                        flex: 1,
                        background: '#060606',
                        border: '1px solid #3a3a3c',
                        borderRadius: '17px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 12px',
                        gap: '8px'
                    }}>
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => handleTyping(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !loading && (newMessage.trim() || selectedFile)) {
                                    e.preventDefault()
                                    sendMessage()
                                }
                            }}
                            placeholder="Message"
                            disabled={loading}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: newMessage.trim() ? '#ffffff' : '#636366',
                                outline: 'none',
                                padding: '10px 0',
                                fontSize: '17px',
                                fontFamily: 'SF Pro Text, -apple-system, system-ui, BlinkMacSystemFont, sans-serif',
                                letterSpacing: '-0.40px'
                            }}
                        />
                        
                        {/* Emoji Button */}
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px',
                                color: '#7f7f7f',
                                transition: 'color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#7f7f7f'}
                        >
                            <Smile size={20} />
                        </button>
                    </div>

                    {/* Enhanced iOS-Style Send Button */}
                    <button
                        onClick={sendMessage}
                        disabled={loading || (!newMessage.trim() && !selectedFile)}
                        className="ios-send-button-enhanced"
                        style={{
                            width: '44px',
                            height: '44px',
                            background: (newMessage.trim() || selectedFile) && !loading
                                ? 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)'
                                : 'rgba(255, 255, 255, 0.08)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: (newMessage.trim() || selectedFile) && !loading
                                ? '1px solid rgba(0, 122, 255, 0.4)'
                                : '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: (newMessage.trim() || selectedFile) && !loading ? 'pointer' : 'not-allowed',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: (newMessage.trim() || selectedFile) && !loading
                                ? '0 8px 24px rgba(0, 122, 255, 0.4), 0 4px 12px rgba(0, 122, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                                : '0 2px 8px rgba(0, 0, 0, 0.1)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            if ((newMessage.trim() || selectedFile) && !loading) {
                                e.currentTarget.style.transform = 'scale(1.08) translateY(-1px)'
                                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 122, 255, 0.5), 0 6px 16px rgba(0, 122, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                            }
                        }}
                        onMouseLeave={(e) => {
                            if ((newMessage.trim() || selectedFile) && !loading) {
                                e.currentTarget.style.transform = 'scale(1) translateY(0)'
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 122, 255, 0.4), 0 4px 12px rgba(0, 122, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                            }
                        }}
                        onMouseDown={(e) => {
                            if ((newMessage.trim() || selectedFile) && !loading) {
                                e.currentTarget.style.transform = 'scale(0.95)'
                            }
                        }}
                        onMouseUp={(e) => {
                            if ((newMessage.trim() || selectedFile) && !loading) {
                                e.currentTarget.style.transform = 'scale(1.08) translateY(-1px)'
                            }
                        }}
                    >
                        {loading || uploadingFile ? (
                            <i className="ri-loader-4-line" style={{ 
                                animation: 'spin 1s linear infinite',
                                fontSize: '22px',
                                color: '#fff',
                                filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))'
                            }}></i>
                        ) : (
                            <Send 
                                size={20} 
                                style={{
                                    color: (newMessage.trim() || selectedFile) ? '#fff' : '#636366',
                                    transition: 'color 0.3s',
                                    filter: (newMessage.trim() || selectedFile) ? 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))' : 'none'
                                }}
                            />
                        )}
                    </button>
                </div>
            </main>
        )
    }

    return (
        <main className="main-feed">
            <header className="feed-header">
                <div style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <i className="ri-arrow-left-line" onClick={onBack} style={{ fontSize: '20px', cursor: 'pointer' }}></i>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '20px' }}>Messages</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{conversations.length} conversations</div>
                    </div>
                </div>
            </header>

            {conversations.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <i className="ri-message-3-line" style={{ fontSize: '64px', color: 'var(--text-muted)', marginBottom: '20px' }}></i>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>No messages yet</div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Start a conversation by searching for users</div>
                    <button
                        onClick={onBack}
                        style={{
                            padding: '12px 24px',
                            background: 'var(--accent)',
                            color: 'white',
                            borderRadius: '25px',
                            fontWeight: 'bold',
                            fontSize: '15px'
                        }}
                    >
                        Find Users
                    </button>
                </div>
            ) : (
                conversations.map((convo) => (
                    <div
                        key={convo.id}
                        style={{
                            position: 'relative',
                            overflow: 'hidden',
                            borderBottom: '1px solid var(--border)'
                        }}
                    >
                        {/* Swipe Action Buttons (Background) */}
                        {swipeActions === convo.id && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                zIndex: 1
                            }}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleMoreOptions(convo.id)
                                    }}
                                    style={{
                                        width: '74px',
                                        background: '#c6c6cc',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        fontWeight: '400',
                                        letterSpacing: '-0.15px',
                                        transition: 'opacity 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                    <img src="/icons/more-dots.svg" alt="More" style={{ width: '25px', height: '6px' }} />
                                    <span>More</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleArchiveConversation(convo.id)
                                    }}
                                    style={{
                                        width: '74px',
                                        background: '#3e70a7',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        fontWeight: '400',
                                        letterSpacing: '-0.15px',
                                        transition: 'opacity 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                    <img src="/icons/archive-icon.svg" alt="Archive" style={{ width: '21px', height: '20px' }} />
                                    <span>Archive</span>
                                </button>
                            </div>
                        )}

                        {/* Conversation Item */}
                        <div
                            onClick={() => {
                                if (swipeActions === convo.id) {
                                    setSwipeActions(null)
                                } else {
                                    setSelectedChat(convo)
                                }
                            }}
                            onContextMenu={(e) => handleConvoRightClick(e, convo.id)}
                            onTouchStart={(e) => handleConvoTouchStart(e, convo.id)}
                            onTouchMove={(e) => handleConvoTouchMove(e, convo.id)}
                            onTouchEnd={() => handleConvoTouchEnd(convo.id)}
                            style={{
                                padding: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                transition: 'background 0.2s, transform 0.1s',
                                background: 'var(--bg-body)',
                                position: 'relative',
                                zIndex: 2,
                                transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : 
                                          swipeActions === convo.id ? 'translateX(-148px)' : 'translateX(0)'
                            }}
                            onMouseEnter={(e) => {
                                if (swipeActions !== convo.id) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                                }
                            }}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-body)'}
                        >
                            <div style={{ position: 'relative' }}>
                                <img
                                    src={convo.avatar_url || '/download.png'}
                                    style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                                    alt={convo.username}
                                />
                                {convo.isOnline && (
                                    <span className="active-status-badge" style={{
                                        position: 'absolute',
                                        bottom: '0',
                                        right: '0',
                                        width: '14px',
                                        height: '14px',
                                        background: '#00ba7c',
                                        border: '2px solid #000',
                                        borderRadius: '50%'
                                    }}></span>
                                )}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{convo.full_name}</span>
                                    {convo.isVerified && (
                                        <i className="ri-verified-badge-fill" style={{ color: 'var(--twitter-blue)', fontSize: '14px' }}></i>
                                    )}
                                    {unreadCounts[convo.id] > 0 && (
                                        <span style={{
                                            marginLeft: 'auto',
                                            background: '#007AFF',
                                            color: 'white',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            minWidth: '20px',
                                            textAlign: 'center'
                                        }}>{unreadCounts[convo.id]}</span>
                                    )}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {convo.lastMessage?.content}
                                </div>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {formatDistanceToNow(new Date(convo.lastMessage?.created_at), { addSuffix: true })}
                            </div>
                        </div>
                    </div>
                ))
            )}

            <div style={{ height: '100px' }}></div>

            {showDeleteConfirm && messageToDelete && (
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
                    zIndex: 2000,
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{
                        background: '#16181c',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '90%',
                        animation: 'scaleIn 0.2s ease'
                    }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Delete Message?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            This message will be permanently deleted.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false)
                                    setMessageToDelete(null)
                                    setLongPressMessage(null)
                                }}
                                style={{
                                    padding: '10px 20px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteMessage(messageToDelete.id)}
                                style={{
                                    padding: '10px 20px',
                                    background: '#ff4444',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
