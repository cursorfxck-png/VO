-- ============================================
-- ADD FILE ATTACHMENT SUPPORT TO MESSAGES
-- ============================================
-- Run this in Supabase SQL Editor to add file support to messages

-- 1. Add file-related columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size TEXT;

-- 2. Create chat-files storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-files', 'chat-files', true, 10485760, ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav'
])
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/wav'
    ];

-- 3. Drop existing storage policies for chat-files if any
DROP POLICY IF EXISTS "Chat files public view" ON storage.objects;
DROP POLICY IF EXISTS "Chat files auth upload" ON storage.objects;
DROP POLICY IF EXISTS "Chat files owner update" ON storage.objects;
DROP POLICY IF EXISTS "Chat files owner delete" ON storage.objects;

-- 4. Create storage policies for chat-files bucket
-- Allow anyone to view chat files
CREATE POLICY "Chat files public view"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-files');

-- Allow authenticated users to upload chat files
CREATE POLICY "Chat files auth upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

-- Allow users to update their own chat files
CREATE POLICY "Chat files owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-files');

-- Allow users to delete their own chat files
CREATE POLICY "Chat files owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-files');

-- 5. Create index for file_url for better performance
CREATE INDEX IF NOT EXISTS idx_messages_file_url ON public.messages(file_url);

-- 6. Verification
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND table_schema = 'public'
AND column_name IN ('file_url', 'file_name', 'file_size')
ORDER BY ordinal_position;

-- Check bucket exists
SELECT id, name, public, file_size_limit FROM storage.buckets 
WHERE id = 'chat-files';

-- Success message
SELECT 'File attachment support added to messages successfully!' as status;
