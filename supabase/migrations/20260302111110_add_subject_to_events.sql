-- Add subject column to events table
ALTER TABLE "public"."events"
ADD COLUMN "subject" text;
