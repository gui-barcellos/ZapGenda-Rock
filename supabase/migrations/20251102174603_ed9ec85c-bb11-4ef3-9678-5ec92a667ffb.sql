-- Drop existing restrictive policies to replace with proper member access
DROP POLICY IF EXISTS "View own company" ON public.companies;
DROP POLICY IF EXISTS "Company settings" ON public.company_settings;

-- Companies table: Allow members to view and admins to update
CREATE POLICY "company_members_can_select"
ON public.companies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = companies.id
  )
);

CREATE POLICY "company_members_can_update"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = companies.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = companies.id
  )
);

-- Company Settings table: Allow members to select and update/insert (for upsert)
CREATE POLICY "company_members_can_select_settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = company_settings.company_id
  )
);

CREATE POLICY "company_members_can_insert_settings"
ON public.company_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = company_settings.company_id
  )
);

CREATE POLICY "company_members_can_update_settings"
ON public.company_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = company_settings.company_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = company_settings.company_id
  )
);