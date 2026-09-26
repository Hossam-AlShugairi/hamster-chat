-- ============================================
-- Hamster Chat — Complete Database Setup
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor
-- to set up the database from scratch.
-- ============================================

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create tables
-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_participants ON public.messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 4. Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist to prevent errors when re-running
DROP POLICY IF EXISTS "Service role can read users" ON public.users;
DROP POLICY IF EXISTS "Authenticated can read messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated can insert messages" ON public.messages;

-- 6. Create RLS Policies
CREATE POLICY "Service role can read users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can read messages" ON public.messages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert messages" ON public.messages
  FOR INSERT WITH CHECK (true);

-- 7. Enable Realtime for messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- 8. Seed/Update the two authorized accounts with bcrypt hashes
-- User 1: hanem  -> Password: relay@#1234
-- User 2: Admin  -> Password: admin@#1234
INSERT INTO public.users (username, display_name, password_hash)
VALUES
  ('hanem', 'Hanem', '$2b$10$M6B/o/4DpzYBRVYdwKFQH.9jCdK/mPI4.M8gYYQlhyfRLazJMxzhy'),
  ('Admin', 'Admin', '$2b$10$07LfKJGIbiS9wmPhbhQbn.2NCbIcM6uw5KSVmyXNSEuWjPELJUXQm')
ON CONFLICT (username) DO UPDATE
  SET password_hash = EXCLUDED.password_hash;