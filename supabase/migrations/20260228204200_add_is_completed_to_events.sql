-- Migration to add 'is_completed' column to events table

ALTER TABLE public.events ADD COLUMN is_completed BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.events.is_completed IS 'Whether the homework or todo is completed';
