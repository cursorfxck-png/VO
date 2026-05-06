import { useState, useEffect } from 'react'
import './MessageNotification.css'

export default function MessageNotification({ notification, onClose }) {
    const [isVisible, setIsVisible] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
        console.log('💬 MessageNotification mounted with:', notification)
        // Fade in animation
        setTimeout(() => {
            console.log('💬 Setting visible to true')
            setIsVisible(true)
        }, 10)

        // Auto dismiss after 5 seconds if not hovered
        const timer = setTimeout(() => {
            if (!isHovered) {
                console.log('💬 Auto-dismissing notification')
                handleClose()
            }
        }, 5000)

        return () => {
            console.log('💬 MessageNotification unmounting')
            clearTimeout(timer)
        }
    }, [isHovered])

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(() => onClose(), 300)
    }

    if (!notification) return null

    return (
        <div 
            className={`message-notification ${isVisible ? 'visible' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="notification-icon">
                <img src="/icons/notification-icon.png" alt="Notification" />
            </div>
            
            <div className="notification-content">
                <div className="notification-header">
                    <div className="notification-user">
                        <img 
                            src={notification.senderAvatar || '/download.png'} 
                            alt={notification.senderName}
                            className="notification-avatar"
                        />
                        <div className="notification-user-info">
                            <div className="notification-title">
                                <span>{notification.senderName}</span>
                                {notification.isVerified && (
                                    <i className="ri-verified-badge-fill verified-badge"></i>
                                )}
                            </div>
                            <div className="notification-time">{notification.time}</div>
                        </div>
                    </div>
                    <span className="notification-timestamp">{notification.timestamp}</span>
                </div>
                
                <div className="notification-message">
                    {notification.message}
                </div>
            </div>

            {isHovered && (
                <button 
                    className="notification-close"
                    onClick={handleClose}
                    aria-label="Close notification"
                >
                    <i className="ri-close-line"></i>
                </button>
            )}
        </div>
    )
}