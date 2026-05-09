import imageCompression from 'browser-image-compression'

/**
 * Compress an image file to reduce size
 */
export const compressImage = async (file, options = {}) => {
    const defaultOptions = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        quality: 0.72,
        ...options,
    }
    try {
        return await imageCompression(file, defaultOptions)
    } catch (error) {
        console.error('Error compressing image:', error)
        return file
    }
}

/**
 * Parse media URLs from JSON string or plain string
 */
export const parseMediaUrls = (urlString) => {
    if (!urlString) return []
    try {
        return JSON.parse(urlString)
    } catch {
        return urlString ? [urlString] : []
    }
}

/**
 * Detect if URL is audio by file extension
 */
export const isAudioUrl = (url) => /\.(mp3|m4a|ogg|wav|aac|flac|opus)($|\?)/i.test(url)

/**
 * Detect if URL is video
 */
export const isVideoUrl = (url) => /\.(mp4|webm|mov|avi|mkv|m3u8)($|\?)/i.test(url)

/**
 * Get media type from URL
 */
export const getMediaType = (url) => {
    if (isAudioUrl(url)) return 'audio'
    if (isVideoUrl(url)) return 'video'
    return 'image'
}

/**
 * Create a media carousel state object
 */
export const createCarouselState = (totalMedia = 0) => ({
    currentIndex: 0,
    totalMedia,
    canGoPrev: false,
    canGoNext: totalMedia > 1,
})

/**
 * Navigate carousel
 */
export const navigateCarousel = (currentIndex, direction, totalMedia) => {
    if (totalMedia <= 1) return currentIndex
    if (direction === 'next') {
        return (currentIndex + 1) % totalMedia
    } else if (direction === 'prev') {
        return (currentIndex - 1 + totalMedia) % totalMedia
    } else if (typeof direction === 'number') {
        return Math.max(0, Math.min(direction, totalMedia - 1))
    }
    return currentIndex
}

/**
 * Calculate optimal grid columns based on media count
 */
export const getGridColumns = (mediaCount) => {
    if (mediaCount <= 1) return 1
    if (mediaCount <= 2) return 2
    if (mediaCount <= 4) return 2
    if (mediaCount <= 6) return 3
    return 3 // 3 columns for 7+ images
}

/**
 * Revoke all object URLs in media items array
 */
export const revokeMediaUrls = (mediaItems) => {
    mediaItems.forEach(item => {
        if (item?.preview) {
            try {
                URL.revokeObjectURL(item.preview)
            } catch (e) {
                console.warn('Error revoking URL:', e)
            }
        }
    })
}
