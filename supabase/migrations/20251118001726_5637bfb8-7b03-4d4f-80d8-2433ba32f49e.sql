-- Add profile_picture_fetched_at column to track fetch attempts and prevent rate limiting issues
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS profile_picture_fetched_at TIMESTAMPTZ;

-- Create index to efficiently find contacts that need profile picture fetch
CREATE INDEX IF NOT EXISTS idx_contacts_picture_fetch 
ON public.contacts(profile_picture_fetched_at) 
WHERE profile_picture_url IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.contacts.profile_picture_fetched_at IS 'Timestamp of last attempt to fetch profile picture from Z-API. Used for rate limiting (1 fetch per 24 hours).';