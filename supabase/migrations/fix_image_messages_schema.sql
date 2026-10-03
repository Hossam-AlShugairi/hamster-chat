-- ============================================================
-- Hamster Chat Fix: Schema Update for Image Messages & Replies
-- ============================================================
-- Run this ENTIRE script in your Supabase SQL Editor to make sure
-- database constraints allow image messages, voice messages, and replies.
-- ============================================================

-- 1. Drop ALL legacy constraints on messages table to avoid conflicts
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS check_message_content_type;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS check_valid_message_type;

-- 2. Add columns if not already present
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID DEFAULT NULL REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- 3. Add single unified check constraint for message types
ALTER TABLE public.messages
  ADD CONSTRAINT check_valid_message_type CHECK (
    message_type IN ('text', 'voice', 'image')
  );

-- 4. Create index on reply_to_message_id
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_message_id);

-- 5. Create storage bucket for chat-images if not existing
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS Policies for chat-images
DROP POLICY IF EXISTS "Anyone can upload chat images" ON storage.objects;
CREATE POLICY "Anyone can upload chat images" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "Anyone can read chat images" ON storage.objects;
CREATE POLICY "Anyone can read chat images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'chat-images');

-- 7. Ensure Admin display_name is Hossam
UPDATE public.users
SET display_name = 'Hossam'
WHERE username ILIKE 'Admin';
