-- Add column to store complete OpenAI raw response for debugging
ALTER TABLE ai_prompt_logs 
ADD COLUMN IF NOT EXISTS openai_raw_response JSONB;