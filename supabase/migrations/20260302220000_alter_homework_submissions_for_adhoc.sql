-- We need to alter the column to be nullable
ALTER TABLE public.homework_submissions ALTER COLUMN event_id DROP NOT NULL;

-- Add subject column
ALTER TABLE public.homework_submissions ADD COLUMN IF NOT EXISTS subject TEXT;
