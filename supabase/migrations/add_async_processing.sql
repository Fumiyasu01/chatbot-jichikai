-- Add async processing support for file uploads
-- This migration enables background processing of embeddings

-- Add processing status to files table
ALTER TABLE files ADD COLUMN processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
ALTER TABLE files ADD COLUMN error_message TEXT;
ALTER TABLE files ADD COLUMN chunk_count INTEGER DEFAULT 0;
ALTER TABLE files ADD COLUMN processed_chunks INTEGER DEFAULT 0;
ALTER TABLE files ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add file_id reference to documents table
ALTER TABLE documents ADD COLUMN file_id UUID REFERENCES files(id) ON DELETE CASCADE;

-- Create index for faster file status lookups
CREATE INDEX idx_files_processing_status ON files(processing_status);
CREATE INDEX idx_documents_file_id ON documents(file_id);

-- Allow embedding to be NULL initially (will be filled during background processing)
ALTER TABLE documents ALTER COLUMN embedding DROP NOT NULL;

-- Trigger to automatically update files.updated_at
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get files with their processing status
CREATE OR REPLACE FUNCTION get_files_with_status(p_room_id UUID)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  processing_status TEXT,
  chunk_count INTEGER,
  processed_chunks INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.file_name,
    f.file_size,
    f.mime_type,
    f.processing_status,
    f.chunk_count,
    f.processed_chunks,
    f.error_message,
    f.created_at,
    f.updated_at
  FROM files f
  WHERE f.room_id = p_room_id
  ORDER BY f.created_at DESC;
END;
$$;

-- Migration to update existing files (set them as completed)
UPDATE files
SET
  processing_status = 'completed',
  chunk_count = (
    SELECT COUNT(*)
    FROM documents
    WHERE documents.file_name = files.file_name
    AND documents.room_id = files.room_id
  ),
  processed_chunks = (
    SELECT COUNT(*)
    FROM documents
    WHERE documents.file_name = files.file_name
    AND documents.room_id = files.room_id
  );

-- Update existing documents to link them to files
UPDATE documents d
SET file_id = (
  SELECT f.id
  FROM files f
  WHERE f.file_name = d.file_name
  AND f.room_id = d.room_id
  LIMIT 1
)
WHERE d.file_id IS NULL;
