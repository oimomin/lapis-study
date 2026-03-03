-- Create homework_submissions table
CREATE TABLE public.homework_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('submitted', 'graded', 'returned')),
    understanding_level TEXT CHECK (understanding_level IN ('excellent', 'good', 'needs_work')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for homework_submissions
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to homework submissions" ON public.homework_submissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Students can insert and view their own submissions
CREATE POLICY "Students can insert own submissions" ON public.homework_submissions
    FOR INSERT
    WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own submissions" ON public.homework_submissions
    FOR SELECT
    USING (student_id = auth.uid());

-- Students can update their own submissions (e.g., adding understanding_level)
CREATE POLICY "Students can update own submissions" ON public.homework_submissions
    FOR UPDATE
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Parents can view submissions of their connected students
CREATE POLICY "Parents can view connected students' submissions" ON public.homework_submissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.family_connections
            WHERE family_connections.parent_id = auth.uid()
            AND family_connections.student_id = homework_submissions.student_id
        )
    );



-- Create homework_photos table
CREATE TABLE public.homework_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES public.homework_submissions(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    graded_photo_url TEXT,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for homework_photos
ALTER TABLE public.homework_photos ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins have full access to homework photos" ON public.homework_photos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Students can insert and view their own photos
CREATE POLICY "Students can insert own photos" ON public.homework_photos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.homework_submissions
            WHERE homework_submissions.id = submission_id
            AND homework_submissions.student_id = auth.uid()
        )
    );

CREATE POLICY "Students can view own photos" ON public.homework_photos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.homework_submissions
            WHERE homework_submissions.id = submission_id
            AND homework_submissions.student_id = auth.uid()
        )
    );

-- Parents can view photos of their connected students
CREATE POLICY "Parents can view connected students' photos" ON public.homework_photos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.homework_submissions hs
            JOIN public.family_connections fc ON fc.student_id = hs.student_id
            WHERE hs.id = submission_id AND fc.parent_id = auth.uid()
        )
    );


-- Trigger for updating updated_at on submissions
CREATE TRIGGER set_homework_submissions_timestamp
    BEFORE UPDATE ON public.homework_submissions
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();


-- Setup Storage Bucket for homework_photos
INSERT INTO storage.buckets (id, name, public) VALUES ('homework_photos', 'homework_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Everyone can read public images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'homework_photos');

-- Authenticated users can upload
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'homework_photos');

-- Authenticated users can update/delete their uploads (adhering to bucket rules)
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'homework_photos');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'homework_photos');
