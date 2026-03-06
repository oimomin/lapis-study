-- Add LINE integration columns to users table
ALTER TABLE public.users
ADD COLUMN line_user_id TEXT UNIQUE DEFAULT NULL,
ADD COLUMN line_link_token TEXT UNIQUE DEFAULT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN public.users.line_user_id IS 'LINE Messaging API user ID for push notifications';
COMMENT ON COLUMN public.users.line_link_token IS 'Temporary 6-digit token for linking LINE account via bot chat';
