-- Add response_instruction column to ai_action_definitions
-- This allows superusers to define instructions that guide the AI on how to interpret each function's results
ALTER TABLE public.ai_action_definitions 
ADD COLUMN response_instruction TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.ai_action_definitions.response_instruction IS 'Instruction sent to AI along with function result to guide interpretation/presentation';