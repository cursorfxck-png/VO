import { supabase } from './supabaseClient'

/**
 * Upload an image file to Supabase Storage
 * @param {File} file - The image file to upload
 * @param {string} userId - The user's ID
 * @returns {Promise<string|null>} - The public URL of the uploaded image, or null if failed
 */
export async function uploadProfileImage(file, userId) {
    if (!file) return null

    try {
        // Create a unique filename with timestamp
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}/${Date.now()}.${fileExt}`

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (error) {
            console.error('Upload error:', error)
            return null
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)

        return publicUrl
    } catch (error) {
        console.error('Error uploading image:', error)
        return null
    }
}

/**
 * Delete an image from Supabase Storage
 * @param {string} imageUrl - The URL of the image to delete
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function deleteProfileImage(imageUrl, userId) {
    try {
        // Extract the file path from the URL
        const urlParts = imageUrl.split('/avatars/')
        if (urlParts.length < 2) return false

        const filePath = urlParts[1]

        // Only allow deletion from user's own folder
        if (!filePath.startsWith(`${userId}/`)) {
            console.error('Unauthorized deletion attempt')
            return false
        }

        const { error } = await supabase.storage
            .from('avatars')
            .remove([filePath])

        if (error) {
            console.error('Delete error:', error)
            return false
        }

        return true
    } catch (error) {
        console.error('Error deleting image:', error)
        return false
    }
}
