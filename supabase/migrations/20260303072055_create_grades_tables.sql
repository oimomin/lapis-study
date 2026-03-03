-- Create grades table
CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    score INTEGER NOT NULL,
    test_type TEXT NOT NULL, -- '小テスト', '定期テスト', '模試系', 'その他'
    test_date DATE NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: student_id is references public.users(id)
-- created_by is references auth.users(id) to know who actually input the score (admin, parent, or student)

-- Create grade_images table
CREATE TABLE grade_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    image_type TEXT NOT NULL DEFAULT '答案用紙', -- '答案用紙', '問題用紙', 'その他'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_images ENABLE ROW LEVEL SECURITY;

-- Setup grades storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('grades', 'grades', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for grades
-- 1. Admins can do everything
CREATE POLICY "Admins can manage all grades" 
ON grades FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- 2. Students can read, view and insert their own grades (they shouldn't normally be modifying/deleting them, but creating is fine)
CREATE POLICY "Students can manage their own grades" 
ON grades FOR ALL 
USING (
    auth.uid() = student_id
);

-- 3. Parents can read and manage grades of their connected children
CREATE POLICY "Parents can manage their childrens grades" 
ON grades FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.family_connections
        WHERE family_connections.parent_id = auth.uid()
        AND family_connections.student_id = grades.student_id
    )
);

-- Policies for grade_images
-- 1. Admins can do everything
CREATE POLICY "Admins can manage all grade images" 
ON grade_images FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- 2. Students can manage images for their own grades
CREATE POLICY "Students can manage their own grade images" 
ON grade_images FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM grades
        WHERE grades.id = grade_images.grade_id
        AND grades.student_id = auth.uid()
    )
);

-- 3. Parents can manage images for their children's grades
CREATE POLICY "Parents can manage their childrens grade images" 
ON grade_images FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM grades
        JOIN family_connections ON family_connections.student_id = grades.student_id
        WHERE grades.id = grade_images.grade_id
        AND family_connections.parent_id = auth.uid()
    )
);


-- Storage policies for 'grades' bucket
CREATE POLICY "grades_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'grades');

CREATE POLICY "grades_insert"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'grades' AND auth.role() = 'authenticated'
);

CREATE POLICY "grades_update"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'grades' AND auth.role() = 'authenticated'
);

CREATE POLICY "grades_delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'grades' AND auth.role() = 'authenticated'
);
