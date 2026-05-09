/**
 * mediaUtils.js
 * Image compression + multi-media URL parsing utilities.
 */

/**
 * Compress an image file using canvas.
 * Targets ~0.8 MB per image with aggressive quality reduction.
 *
 * @param {File} file
 * @param {{ maxWidthOrHeight?: number, quality?: number, maxSizeMB?: number }} options
 * @returns {Promise<File>}
 */
export async function compressImage(file, options = {}) {
    const {
        maxWidthOrHeight = 1920,
        quality = 0.72,
        maxSizeMB = 0.8,
    } = options

    // Pass through non-image types unchanged
    if (!file.type.startsWith('image/')) return file

    return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(objectUrl)
            let { width, height } = img

            // Scale down if needed
            if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
                if (width >= height) {
                    height = Math.round((height * maxWidthOrHeight) / width)
                    width = maxWidthOrHeight
                } else {
                    width = Math.round((width * maxWidthOrHeight) / height)
                    height = maxWidthOrHeight
                }
            }

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)

            // Prefer JPEG (much smaller); keep PNG only if explicitly PNG & small
            const outputType = file.type === 'image/png' && file.size < 500_000 ? 'image/png' : 'image/jpeg'

            let currentQuality = quality

            const tryCompress = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) { reject(new Error('Canvas compression failed')); return }

                        if (blob.size > maxSizeMB * 1024 * 1024 && currentQuality > 0.2) {
                            currentQuality = Math.max(0.2, currentQuality - 0.1)
                            tryCompress()
                            return
                        }

                        // Return as File so it can be uploaded with a proper name
                        const ext = outputType === 'image/jpeg' ? 'jpg' : 'png'
                        const compressedFile = new File(
                            [blob],
                            file.name.replace(/\.[^.]+$/, `.${ext}`),
                            { type: outputType, lastModified: Date.now() }
                        )
                        resolve(compressedFile)
                    },
                    outputType,
                    currentQuality
                )
            }

            tryCompress()
        }

        img.onerror = reject
        img.src = objectUrl
    })
}

/**
 * Parse a media URL field that may be:
 *  - null / undefined → []
 *  - a JSON array string → parsed array
 *  - a plain URL string → [url]  (backward compat)
 *
 * @param {string|null} urlField
 * @returns {string[]}
 */
export function parseMediaUrls(urlField) {
    if (!urlField) return []
    try {
        const parsed = JSON.parse(urlField)
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [urlField]
    } catch {
        return [urlField]
    }
}

/**
 * Calculate optimal grid columns based on media count
 * Used for responsive image grid layout
 *
 * @param {number} mediaCount
 * @returns {number} Number of columns (1-3)
 */
export function getGridColumns(mediaCount) {
    if (mediaCount <= 1) return 1
    if (mediaCount <= 2) return 2
    if (mediaCount <= 4) return 2
    if (mediaCount <= 6) return 3
    return 3 // 3 columns for 7+ images
}

/**
 * Revoke all object URLs in media items array to free memory
 * Called on cleanup to prevent memory leaks
 *
 * @param {Array} mediaItems - Array of media items with preview URLs
 */
export function revokeMediaUrls(mediaItems) {
    if (!Array.isArray(mediaItems)) return
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
