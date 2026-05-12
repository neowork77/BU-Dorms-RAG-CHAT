-- ══════════════════════════════════════════════════════════════
-- RAG Pipeline Observability Logs
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rag_pipeline_logs (
    id              BIGSERIAL PRIMARY KEY,
    request_id      TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Query
    query           TEXT NOT NULL,

    -- Pipeline stages with timing
    stages          JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Reasoning details
    is_dorm_query   BOOLEAN NOT NULL DEFAULT false,
    sort_by         TEXT,
    max_price       INTEGER,
    total_raw_results   INTEGER DEFAULT 0,
    after_filter_count  INTEGER DEFAULT 0,
    top_k           INTEGER DEFAULT 0,
    intent_summary  TEXT,

    -- Retrieved docs with scores
    retrieved_docs  JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- LLM info
    llm_prompt_summary  TEXT,
    llm_response_length INTEGER,

    -- Duration
    total_duration_ms   INTEGER,

    -- Error
    error           TEXT
);

-- Index for querying by time
CREATE INDEX IF NOT EXISTS idx_rag_logs_created_at ON rag_pipeline_logs (created_at DESC);

-- Index for filtering by request_id
CREATE INDEX IF NOT EXISTS idx_rag_logs_request_id ON rag_pipeline_logs (request_id);

-- Index for filtering dorm vs non-dorm queries
CREATE INDEX IF NOT EXISTS idx_rag_logs_is_dorm ON rag_pipeline_logs (is_dorm_query);

-- Enable RLS (allow insert from anon for API route, read for authenticated/service)
ALTER TABLE rag_pipeline_logs ENABLE ROW LEVEL SECURITY;

-- Policy: allow insert from any role (API route uses anon key)
CREATE POLICY "Allow insert from API" ON rag_pipeline_logs
    FOR INSERT WITH CHECK (true);

-- Policy: allow select for viewing logs (adjust as needed)
CREATE POLICY "Allow read logs" ON rag_pipeline_logs
    FOR SELECT USING (true);
