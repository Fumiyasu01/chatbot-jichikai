-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'chat', 'upload', 'embedding'
  tokens_used INTEGER DEFAULT 0,
  file_name TEXT,
  chunk_count INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_usage_logs_room_id ON usage_logs(room_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_event_type ON usage_logs(event_type);

-- Function to get usage summary by room
CREATE OR REPLACE FUNCTION get_room_usage_summary(
  target_room_id UUID,
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_events BIGINT,
  total_tokens BIGINT,
  total_cost DECIMAL,
  chat_count BIGINT,
  upload_count BIGINT,
  embedding_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_events,
    COALESCE(SUM(tokens_used), 0)::BIGINT as total_tokens,
    COALESCE(SUM(cost_usd), 0) as total_cost,
    COUNT(*) FILTER (WHERE event_type = 'chat')::BIGINT as chat_count,
    COUNT(*) FILTER (WHERE event_type = 'upload')::BIGINT as upload_count,
    COUNT(*) FILTER (WHERE event_type = 'embedding')::BIGINT as embedding_count
  FROM usage_logs
  WHERE room_id = target_room_id
    AND created_at BETWEEN start_date AND end_date;
END;
$$;

-- RLS policies
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on usage_logs"
  ON usage_logs FOR ALL
  USING (true);
