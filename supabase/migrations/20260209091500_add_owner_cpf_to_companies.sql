ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS owner_cpf TEXT;
