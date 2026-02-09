-- Add missing columns to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Add is_internal column to support_ticket_messages
ALTER TABLE public.support_ticket_messages 
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Company tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Superuser tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Company ticket_msg" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Superuser ticket_msg" ON public.support_ticket_messages;

-- Create new policies for support_tickets
CREATE POLICY "Company tickets"
ON public.support_tickets
FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
))
WITH CHECK (company_id IN (
  SELECT company_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Superuser tickets"
ON public.support_tickets
FOR ALL
USING (has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK (has_role(auth.uid(), 'superuser'::app_role));

-- Update policies for support_ticket_messages
CREATE POLICY "Company ticket_msg"
ON public.support_ticket_messages
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  AND (is_internal = false OR is_internal IS NULL)
);

-- Company can insert messages (non-internal only)
CREATE POLICY "Company create ticket_msg"
ON public.support_ticket_messages
FOR INSERT
WITH CHECK (
  ticket_id IN (
    SELECT id FROM support_tickets 
    WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  AND user_id = auth.uid()
  AND (is_internal = false OR is_internal IS NULL)
);

-- Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;