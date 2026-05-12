-- ════════════════════════════════════════════════════════════════
-- Migration: Chat History Tables
-- Run this in your Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New Chat',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     JSONB NOT NULL,  -- stores full message payload (text/body/sources/dorms)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- 4. Row Level Security (RLS) — users can only access their own data
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Sessions: user can CRUD their own sessions
CREATE POLICY "Users can view own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Messages: user can CRUD messages in their sessions
CREATE POLICY "Users can view messages in own sessions"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in own sessions"
  ON chat_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
        AND chat_sessions.user_id = auth.uid()
    )
  );
