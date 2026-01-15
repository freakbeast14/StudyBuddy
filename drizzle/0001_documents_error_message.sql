-- Add error message to documents for failed ingestion tracking
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS error_message text;
