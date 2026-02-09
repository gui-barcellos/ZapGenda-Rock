-- Add process_expired_message column to company_ai_settings
ALTER TABLE company_ai_settings 
ADD COLUMN IF NOT EXISTS process_expired_message TEXT 
DEFAULT '⏰ O tempo limite para confirmar seu agendamento foi excedido. Para agendar um novo horário, por favor inicie o processo novamente.';