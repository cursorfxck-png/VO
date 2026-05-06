import { useState, useEffect } from 'react'
import MessageNotification from './MessageNotification'

export default function NotificationManager({ notifications, onDismiss }) {
    const [activeNotification, setActiveNotification] = useState(null)
    const [queue, setQueue] = useState([])

    useEffect(() => {
        console.log('📬 NotificationManager received notifications:', notifications)
        if (notifications && notifications.length > 0) {
            setQueue(prev => {
                const updated = [...prev, ...notifications]
                console.log('📬 Updated queue:', updated)
                return updated
            })
        }
    }, [notifications])

    useEffect(() => {
        console.log('📬 Queue/Active check - Active:', activeNotification, 'Queue length:', queue.length)
        if (!activeNotification && queue.length > 0) {
            const [next, ...rest] = queue
            console.log('📬 Setting active notification:', next)
            setActiveNotification(next)
            setQueue(rest)
        }
    }, [activeNotification, queue])

    const handleClose = () => {
        if (activeNotification) {
            onDismiss(activeNotification.id)
        }
        setActiveNotification(null)
    }

    return (
        <>
            {activeNotification && (
                <MessageNotification
                    notification={activeNotification}
                    onClose={handleClose}
                />
            )}
        </>
    )
}