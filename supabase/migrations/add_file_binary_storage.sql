-- Add binary storage for files to enable background text extraction
-- This resolves 504 timeout issues by making upload instant

-- Add file_data column to store binary data temporarily
ALTER TABLE files ADD COLUMN file_data BYTEA;

-- Add mime_type if not exists (for proper text extraction)
-- Note: This may already exist, so we use IF NOT EXISTS syntax
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'files' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE files ADD COLUMN mime_type TEXT;
  END IF;
END $$;

-- Create index for faster file data retrieval during background processing
CREATE INDEX IF NOT EXISTS idx_files_pending_processing
  ON files(processing_status)
  WHERE processing_status IN ('pending', 'processing');

-- Note: file_data will be deleted after successful processing to save space
-- The column allows NULL values, which is the state after processing completes
