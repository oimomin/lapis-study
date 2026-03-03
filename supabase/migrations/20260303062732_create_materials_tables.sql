-- materials table
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- material_assignments table
CREATE TABLE IF NOT EXISTS public.material_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_assignments ENABLE ROW LEVEL SECURITY;

-- materials RLS
CREATE POLICY "Admins can do everything on materials" ON public.materials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Students can view materials assigned to them" ON public.materials
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.material_assignments
            WHERE material_assignments.material_id = materials.id
            AND material_assignments.student_id = auth.uid()
        )
    );

CREATE POLICY "Parents can view materials assigned to their children" ON public.materials
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.material_assignments ma
            JOIN public.family_connections fc ON ma.student_id = fc.student_id
            WHERE ma.material_id = materials.id
            AND fc.parent_id = auth.uid()
        )
    );

-- material_assignments RLS
CREATE POLICY "Admins can do everything on material_assignments" ON public.material_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

CREATE POLICY "Students can view their own assignments" ON public.material_assignments
    FOR SELECT USING (
        student_id = auth.uid()
    );

CREATE POLICY "Parents can view their children's assignments" ON public.material_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_connections
            WHERE family_connections.student_id = material_assignments.student_id
            AND family_connections.parent_id = auth.uid()
        )
    );

-- Storage Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS

-- Authenticated users (admin/student/parent) can read
CREATE POLICY "Authenticated users can view materials"
ON storage.objects FOR SELECT
USING (bucket_id = 'materials' AND auth.uid() IS NOT NULL);

-- Admins can insert
CREATE POLICY "Admins can insert materials"
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'materials' AND 
    EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can update
CREATE POLICY "Admins can update materials"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'materials' AND 
    EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can delete
CREATE POLICY "Admins can delete materials"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'materials' AND 
    EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
);