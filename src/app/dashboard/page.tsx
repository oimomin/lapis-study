import { createClient } from "@/utils/supabase/server";
import MonthlySchedule from "@/components/dashboard/MonthlySchedule";
import StudentProgressWidget from "@/components/dashboard/StudentProgressWidget";
import AdminActivityWidget from "@/components/dashboard/AdminActivityWidget";
import { AlertCircle, CalendarClock, PenTool, Megaphone } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch upcoming events for reminders (next 2 days)
    const today = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);

    const todayStr = today.toISOString().split('T')[0];
    const twoDaysStr = twoDaysFromNow.toISOString().split('T')[0];

    const { data: profile } = await supabase.from('users').select('role').eq('id', user?.id).single();
    const role = profile?.role || 'student';

    let query = supabase
        .from('events')
        .select('*')
        .or('is_completed.is.null,is_completed.eq.false')
        .gte('date', todayStr)
        .lte('date', twoDaysStr);

    if (role === 'student' && user?.id) {
        query = query.or(`and(student_id.eq.${user.id},parent_id.is.null),and(student_id.is.null,parent_id.is.null)`);
    } else if (role === 'parent' && user?.id) {
        const { data: family } = await supabase.from('family_connections').select('student_id').eq('parent_id', user.id);
        if (family && family.length > 0) {
            const studentIds = family.map(f => f.student_id);
            query = query.or(`parent_id.eq.${user.id},student_id.in.(${studentIds.join(',')}),and(student_id.is.null,parent_id.is.null)`);
        } else {
            query = query.or(`parent_id.eq.${user.id},and(student_id.is.null,parent_id.is.null)`);
        }
    }

    // Wrap in try/catch or handle error since the table might not exist until migration is pushed
    const { data: upcomingEvents, error } = await query
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

    const safeEvents = error ? [] : upcomingEvents || [];

    // Fetch graded homework for the student (alerts for un-reviewed feedback)
    let pendingFeedbackSubmissions: any[] = [];
    if (role === 'student' && user?.id) {
        const { data: feedbackData } = await supabase
            .from('homework_submissions')
            .select(`
                id,
                subject,
                created_at,
                event:events(title)
            `)
            .eq('student_id', user.id)
            .eq('status', 'graded')
            .order('created_at', { ascending: false });

        pendingFeedbackSubmissions = feedbackData || [];
    }

    // Fetch latest 3 published notices
    let validAudiences = ['all'];
    if (role === 'student') validAudiences.push('students');
    if (role === 'parent') validAudiences.push('parents');

    let noticesQuery = supabase
        .from('notices')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(3);

    if (role !== 'admin') {
        noticesQuery = noticesQuery.in('target_audience', validAudiences);
    }

    const { data: latestNotices, error: noticesError } = await noticesQuery;
    const safeNotices = noticesError ? [] : latestNotices || [];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50">
                ダッシュボード
            </h1>
            <p className="text-app-text2 dark:text-app-text2-dark">
                LapisStudyへようこそ！ここから学習の進捗やスケジュールを確認できます。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* News & Progress */}
                <div className="md:col-span-1 space-y-6 flex flex-col">
                    {/* Notices Card */}
                    <div className="p-6 rounded-2xl bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-xl flex flex-col max-h-[400px]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">お知らせ</h3>
                            </div>
                            <Link href="/dashboard/notices" className="text-xs font-bold text-lapis-500 hover:text-lapis-600">
                                すべて見る
                            </Link>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {safeNotices.length > 0 ? (
                                safeNotices.map((notice: any) => (
                                    <Link key={`notice-${notice.id}`} href="/dashboard/notices" className="block p-3 border rounded-xl relative overflow-hidden bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 dark:bg-indigo-500"></div>
                                        <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                            <Megaphone className="w-3.5 h-3.5" />
                                            {new Date(notice.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                        </p>
                                        <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                                            {notice.title}
                                        </p>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                    新しいお知らせはありません
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Events & Deadlines Card */}
                    <div className="p-6 rounded-2xl bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-xl flex-1 flex flex-col min-h-[300px]">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">予定・期限</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {/* Graded Homework Alerts */}
                            {pendingFeedbackSubmissions.map(sub => (
                                <div key={`feedback-${sub.id}`} className="p-3 border rounded-xl relative overflow-hidden bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-400 dark:bg-orange-500"></div>
                                    <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                                        <PenTool className="w-3.5 h-3.5" />
                                        採点完了
                                    </p>
                                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100 mb-2">
                                        {sub.event?.title || sub.subject || '宿題'} の採点が完了しました！
                                    </p>
                                    <Link
                                        href={`/dashboard/homework/feedback/${sub.id}`}
                                        className="inline-block px-3 py-1.5 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition-colors"
                                    >
                                        結果を見て評価する
                                    </Link>
                                </div>
                            ))}

                            {/* Upcoming Events */}
                            {safeEvents.length > 0 ? (
                                safeEvents.map(event => {
                                    // Match calendar colors
                                    let bgColor = "bg-red-50 dark:bg-red-900/10";
                                    let borderColor = "border-red-100 dark:border-red-900/30";
                                    let stripColor = "bg-red-400 dark:bg-red-500";
                                    let textColor = "text-red-600 dark:text-red-400";
                                    let hideWarning = false;

                                    switch (event.type) {
                                        case 'class':
                                            bgColor = "bg-lapis-50 dark:bg-lapis-900/10";
                                            borderColor = "border-lapis-100 dark:border-lapis-900/30";
                                            stripColor = "bg-lapis-400 dark:bg-lapis-500";
                                            textColor = "text-lapis-600 dark:text-lapis-400";
                                            hideWarning = true;
                                            break;
                                        case 'interview':
                                            bgColor = "bg-accent-50 dark:bg-accent-900/10";
                                            borderColor = "border-accent-100 dark:border-accent-900/30";
                                            stripColor = "bg-accent-400 dark:bg-accent-500";
                                            textColor = "text-accent-600 dark:text-accent-400";
                                            hideWarning = true;
                                            break;
                                        case 'homework':
                                            bgColor = "bg-success-50 dark:bg-success-900/10";
                                            borderColor = "border-success-100 dark:border-success-900/30";
                                            stripColor = "bg-success-400 dark:bg-success-500";
                                            textColor = "text-success-600 dark:text-success-400";
                                            break;
                                        case 'payment':
                                            bgColor = "bg-red-50 dark:bg-red-900/10";
                                            borderColor = "border-red-100 dark:border-red-900/30";
                                            stripColor = "bg-red-400 dark:bg-red-500";
                                            textColor = "text-red-600 dark:text-red-400";
                                            break;
                                    }

                                    return (
                                        <div key={event.id} className={`p-3 border rounded-xl relative overflow-hidden ${bgColor} ${borderColor}`}>
                                            <div className={`absolute top-0 left-0 w-1 h-full ${stripColor}`}></div>
                                            <p className={`text-xs font-bold mb-1 flex items-center gap-1.5 ${textColor}`}>
                                                <CalendarClock className="w-3.5 h-3.5" />
                                                {event.date} {event.start_time ? event.start_time.substring(0, 5) : ''}
                                            </p>
                                            <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{event.title}</p>

                                            {/* Action Button for Homework if Student */}
                                            {role === 'student' && event.type === 'homework' && !event.is_completed && (
                                                <div className="mt-2">
                                                    <a
                                                        href={`/dashboard/homework/${event.id}/submit`}
                                                        className="inline-block px-3 py-1.5 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg shadow-sm transition-colors"
                                                    >
                                                        宿題を提出する
                                                    </a>
                                                </div>
                                            )}

                                            {!hideWarning && (
                                                <p className="text-[10px] text-gray-500 mt-2">期限・予定が近づいています！</p>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                pendingFeedbackSubmissions.length === 0 && (
                                    <p className="text-sm text-app-text2 dark:text-app-text2-dark text-center py-8">
                                        直近の予定や期限はありません🍒
                                    </p>
                                )
                            )}
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <MonthlySchedule />

                    {/* Progress Widget for Students/Parents */}
                    {role !== 'admin' && user?.id && (
                        <div className="mt-6">
                            <StudentProgressWidget studentId={user.id} />
                        </div>
                    )}

                    {/* Activity Widget for Admins */}
                    {role === 'admin' && (
                        <div className="mt-6">
                            <AdminActivityWidget />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
