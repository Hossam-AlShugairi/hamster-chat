-- ============================================================
-- Hamster Chat Migration: Add Replies, Image Messages & Rename User
-- ============================================================
-- Run this script in your Supabase SQL Editor to apply these updates.
-- ============================================================

-- 1. Update message_type check constraint to include 'image'
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS check_message_content_type;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID DEFAULT NULL REFERENCES public.messages(id) ON DELETE SET NULL;

-- Ensure message_type column exists and has proper check constraint
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_type_check CHECK (message_type IN ('text', 'voice', 'image'));

-- Add constraint to validate message fields according to message_type
ALTER TABLE public.messages
  ADD CONSTRAINT check_message_content_type CHECK (
    (message_type = 'text' AND content IS NOT NULL AND char_length(content) > 0) OR
    (message_type = 'voice' AND audio_url IS NOT NULL AND audio_duration IS NOT NULL AND audio_duration >= 0) OR
    (message_type = 'image' AND image_url IS NOT NULL)
  );

-- 2. Create index on reply_to_message_id
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_message_id);

-- 3. Create Supabase Storage bucket for chat-images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS Policies for chat-images
DROP POLICY IF EXISTS "Anyone can upload chat images" ON storage.objects;
CREATE POLICY "Anyone can upload chat images" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Anyone can read chat images" ON storage.objects;
CREATE POLICY "Anyone can read chat images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-images');

-- 5. Update display name of Admin to Hossam
UPDATE public.users
SET display_name = 'Hossam'
WHERE username ILIKE 'Admin';
