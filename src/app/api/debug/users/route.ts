import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    // Check auth users
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Check public users
    const { data: users, error: dbError } = await supabase.from('users').select('*');

    return NextResponse.json({
        currentUser: user,
        authError,
        allPublicUsers: users,
        dbError
    });
}
