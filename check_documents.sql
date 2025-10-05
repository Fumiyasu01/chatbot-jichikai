-- documentsテーブルの内容を確認
SELECT 
  id,
  room_id,
  file_name,
  file_size,
  LEFT(content, 100) as content_preview,
  LENGTH(content) as content_length,
  metadata,
  created_at
FROM documents
WHERE room_id = '2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a'
ORDER BY created_at DESC;
