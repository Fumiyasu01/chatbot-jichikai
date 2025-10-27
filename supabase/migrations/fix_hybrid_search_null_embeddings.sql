-- Fix hybrid search to exclude documents without embeddings
-- This resolves RAG not working issue when some documents have null embeddings

CREATE OR REPLACE FUNCTION hybrid_search_documents(
  query_embedding vector(1536),
  query_text text,
  match_threshold float DEFAULT 0.2,
  match_count int DEFAULT 5,
  p_room_id uuid DEFAULT NULL,
  vector_weight float DEFAULT 0.6,  -- 60% weight for vector search
  keyword_weight float DEFAULT 0.4  -- 40% weight for keyword search
)
RETURNS TABLE (
  id uuid,
  content text,
  file_name text,
  similarity double precision,
  keyword_rank double precision,
  combined_score double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      d.id,
      d.content,
      d.file_name,
      (1 - (d.embedding <=> query_embedding))::double precision AS similarity
    FROM documents d
    WHERE (p_room_id IS NULL OR d.room_id = p_room_id)
      AND d.embedding IS NOT NULL  -- CRITICAL: Only search documents with embeddings
  ),
  keyword_search AS (
    SELECT
      d.id,
      ts_rank(d.content_tsv, websearch_to_tsquery('simple', query_text))::double precision AS rank
    FROM documents d
    WHERE (p_room_id IS NULL OR d.room_id = p_room_id)
      AND d.content_tsv @@ websearch_to_tsquery('simple', query_text)
      AND d.embedding IS NOT NULL  -- CRITICAL: Only search documents with embeddings
  ),
  combined AS (
    SELECT
      COALESCE(v.id, k.id) AS id,
      v.content,
      v.file_name,
      COALESCE(v.similarity, 0) AS similarity,
      COALESCE(k.rank, 0) AS keyword_rank,
      (COALESCE(v.similarity, 0) * vector_weight + COALESCE(k.rank, 0) * keyword_weight) AS combined_score
    FROM vector_search v
    FULL OUTER JOIN keyword_search k ON v.id = k.id
    WHERE COALESCE(v.similarity, 0) > match_threshold OR COALESCE(k.rank, 0) > 0
  )
  SELECT
    c.id,
    c.content,
    c.file_name,
    c.similarity,
    c.keyword_rank,
    c.combined_score
  FROM combined c
  ORDER BY c.combined_score DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION hybrid_search_documents IS 'Hybrid search combining vector similarity (pgvector) and keyword matching (tsvector). Only searches documents with non-null embeddings. Returns top results ranked by weighted combination of both scores.';
