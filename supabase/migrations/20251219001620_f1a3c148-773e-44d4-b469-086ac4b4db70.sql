-- Add column to track when AI should process pending messages
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pending_ai_processing_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_conversations_pending_ai ON conversations(pending_ai_processing_at) 
WHERE pending_ai_processing_at IS NOT NULL;