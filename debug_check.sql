-- ファイル一覧と処理状態を確認
SELECT
  file_name,
  processing_status,
  chunk_count,
  processed_chunks,
  created_at
FROM files
WHERE room_id = '2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a'
ORDER BY created_at DESC;

-- embeddingがNULLのドキュメントを確認
SELECT
  f.file_name,
  COUNT(*) as total_chunks,
  SUM(CASE WHEN d.embedding IS NULL THEN 1 ELSE 0 END) as null_embeddings
FROM files f
LEFT JOIN documents d ON d.file_id = f.id
WHERE f.room_id = '2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a'
GROUP BY f.file_name
ORDER BY f.created_at DESC;

-- 集会所利用ガイドの内容を確認（ファイル名が正確に分からないので部分一致）
SELECT
  file_name,
  content,
  embedding IS NOT NULL as has_embedding
FROM documents
WHERE room_id = '2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a'
  AND file_name LIKE '%集会所%'
LIMIT 5;
