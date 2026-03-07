import { NextResponse } from 'next/server';
import { getLineClient } from '@/lib/line';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
    try {
        const { type, payload } = await request.json();
        const supabase = createAdminClient();
        const client = getLineClient();

        if (!client) {
            // Silently succeed if LINE is not configured (graceful degradation)
            return NextResponse.json({ success: true, message: 'LINE not configured' });
        }

        const userIdsToNotify = new Set<string>();
        let messageText = '';

        if (type === 'notice') {
            const { title, excerpt, targetAudience } = payload;
            const audienceRoleMap: Record<string, string> = {
                students: 'student',
                parents: 'parent',
            };
            const normalizedAudience = audienceRoleMap[targetAudience] || targetAudience;

            let query = supabase
                .from('users')
                .select('line_user_id, role')
                .not('line_user_id', 'is', null);

            if (normalizedAudience !== 'all') {
                query = query.eq('role', normalizedAudience);
            }

            const { data: users, error } = await query;
            if (!error && users) {
                users.forEach(u => u.line_user_id && userIdsToNotify.add(u.line_user_id));
            }

            messageText = `📢 [お知らせ] ${title}\n\n${excerpt}\n\nLapis Studyで詳細をご確認ください。`;

        } else if (type === 'homework_submitted') {
            const { studentName, subject } = payload;

            // Notify all admins
            const { data: admins, error } = await supabase
                .from('users')
                .select('line_user_id')
                .eq('role', 'admin')
                .not('line_user_id', 'is', null);

            if (!error && admins) {
                admins.forEach(a => a.line_user_id && userIdsToNotify.add(a.line_user_id));
            }

            messageText = `📝 [宿題提出]\n${studentName}さんから宿題（${subject}）が提出されました。\nLapis Studyで採点してください。`;

        } else if (type === 'homework_graded') {
            const { studentId, title } = payload;

            // Notify the student and their connected parents
            const { data: student, error: studentError } = await supabase
                .from('users')
                .select('line_user_id')
                .eq('id', studentId)
                .single();

            if (!studentError && student?.line_user_id) {
                userIdsToNotify.add(student.line_user_id);
            }

            // Parent lookup
            const { data: connections } = await supabase
                .from('family_connections')
                .select('parent_id')
                .eq('student_id', studentId);

            if (connections && connections.length > 0) {
                const parentIds = connections.map(c => c.parent_id);
                const { data: parents } = await supabase
                    .from('users')
                    .select('line_user_id')
                    .in('id', parentIds)
                    .not('line_user_id', 'is', null);

                if (parents) {
                    parents.forEach(p => p.line_user_id && userIdsToNotify.add(p.line_user_id));
                }
            }

            messageText = `✨ [採点完了]\n宿題「${title}」の採点が完了しました！\nLapis Studyで結果を確認してね。`;

        } else {
            return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
        }

        // Send messages in batches/parallel if there are recipients
        if (userIdsToNotify.size > 0 && messageText) {
            const toArray = Array.from(userIdsToNotify);

            // send multicast (up to 500 users at once)
            if (toArray.length <= 500) {
                await client.multicast(toArray, { type: 'text', text: messageText });
            } else {
                // chunk it up if needed, just doing simple loop for MVP
                for (let i = 0; i < toArray.length; i += 500) {
                    const chunk = toArray.slice(i, i + 500);
                    await client.multicast(chunk, { type: 'text', text: messageText });
                }
            }
        }

        return NextResponse.json({ success: true, count: userIdsToNotify.size });
    } catch (error) {
        console.error('Failed to send notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
