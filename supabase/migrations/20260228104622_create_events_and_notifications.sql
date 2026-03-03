DO $$ BEGIN
    CREATE TYPE public.event_type AS ENUM ('class', 'meeting', 'homework', 'todo', 'payment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type public.event_type NOT NULL,
    date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    description TEXT,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) NOT NULL DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Admins have full access to events" ON public.events
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- View policy
CREATE POLICY "Users can view relevant events" ON public.events
    FOR SELECT
    USING (
        student_id = auth.uid() OR
        parent_id = auth.uid() OR
        (student_id IS NULL AND parent_id IS NULL) OR
        EXISTS (
            SELECT 1 FROM public.family_connections fc
            WHERE fc.parent_id = auth.uid() AND fc.student_id = events.student_id
        )
    );

-- Student policy: create/update/delete homework and todo
CREATE POLICY "Students can manage homework and todo" ON public.events
    FOR ALL
    USING (
        student_id = auth.uid() AND
        type IN ('homework', 'todo') AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'student')
    );

-- Parent policy: create/update/delete todo
CREATE POLICY "Parents can manage todo" ON public.events
    FOR ALL
    USING (
        type = 'todo' AND
        (
            parent_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.family_connections fc
                WHERE fc.parent_id = auth.uid() AND fc.student_id = events.student_id
            )
        ) AND
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'parent')
    );

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    related_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
CREATE POLICY "Admins have full access to notifications" ON public.notifications
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid());
