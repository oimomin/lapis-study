"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FilePenLine, Loader2, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

type Submission = {
    id: string;
    status: 'submitted' | 'graded' | 'returned';
    created_at: string;
    subject: string | null;
    student_id: string;
    student: {
        first_name: string | null;
        last_name: string | null;
    };
    event_id: string | null;
    event?: {
        title: string;
        subject: string | null;
    };
    understanding_level: string | null;
};

export default function AdminHomeworkManagementPage() {
    const router = useRouter();
    const supabase = createClient();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'graded'>('pending');

    useEffect(() => {
        const fetchSubmissions = async () => {
            setIsLoading(true);
            try {
                // Check auth
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                // Verify user is admin
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role !== 'admin') {
                    router.push('/dashboard');
                    return;
                }

                // Fetch submissions
                const { data, error } = await supabase
                    .from('homework_submissions')
                    .select(`
                        id,
                        status,
                        created_at,
                        subject,
                        student_id,
                        understanding_level,
                        event_id,
                        student:users!homework_submissions_student_id_fkey (
                            first_name,
                            last_name
                        ),
                        event:events (
                            title,
                            subject
                        )
                    `)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error("Error fetching submissions:", error);
                    return;
                }

                if (data) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setSubmissions(data as any[]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSubmissions();
    }, [router, supabase]);

    const filteredSubmissions = submissions.filter(sub => {
        if (filter === 'pending') return sub.status === 'submitted';
        if (filter === 'graded') return sub.status === 'graded' || sub.status === 'returned';
        return true;
    });

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-app-bg dark:bg-app-bg-dark flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20 p-6">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-app-text dark:text-app-text2-dark flex items-center gap-3">
                        <FilePenLine className="w-8 h-8 text-lapis-500" />
                        宿題・提出物の管理 (採点)
                    </h1>
                    <p className="text-sm text-app-text2 mt-1">
                        生徒から提出された宿題や課題を確認して、採点を返却しましょう。
                    </p>
                </div>

                <div className="flex bg-white dark:bg-gray-800 rounded-xl shadow-sm p-1 border border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${filter === 'pending'
                            ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        未採点
                    </button>
                    <button
                        onClick={() => setFilter('graded')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${filter === 'graded'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        採点済み
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${filter === 'all'
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        すべて
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubmissions.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                        {filter === 'pending' ? '未採点の宿題はありません🎉' : '提出された宿題がありません。'}
                    </div>
                ) : (
                    filteredSubmissions.map((sub) => {
                        const studentName = sub.student ? `${sub.student.last_name} ${sub.student.first_name}` : '不明な生徒';
                        // Determine subject and title
                        const displaySubject = sub.subject || sub.event?.subject || '科目なし';
                        const displayTitle = sub.event?.title || '自主学習 (予定なし)';

                        return (
                            <div key={sub.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow relative overflow-hidden group">
                                {/* Decorator line */}
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${sub.status === 'submitted' ? 'bg-orange-400' : 'bg-green-400'}`}></div>

                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg flex flex-col">
                                        {studentName}
                                        <span className="text-xs text-gray-500 font-normal mt-0.5">{formatDate(sub.created_at)}</span>
                                    </h3>
                                    {sub.status === 'submitted' ? (
                                        <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                                            <Clock className="w-3.5 h-3.5" />
                                            未採点
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            完了
                                        </span>
                                    )}
                                </div>

                                <div className="mb-6 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-lapis-100 dark:bg-lapis-900/50 text-lapis-700 dark:text-lapis-300 text-xs px-2 py-0.5 rounded-full font-bold">
                                            {displaySubject}
                                        </span>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">{displayTitle}</p>
                                    </div>
                                    {sub.understanding_level && (
                                        <p className="text-xs text-gray-500">
                                            自己評価: {sub.understanding_level === 'excellent' ? '◎ (よくできた)' : sub.understanding_level === 'good' ? '◯ (できた)' : '△ (いまひとつ)'}
                                        </p>
                                    )}
                                </div>

                                <Link
                                    href={`/dashboard/homework/grade/${sub.id}`}
                                    className={`
                                        block w-full text-center py-2.5 rounded-xl font-bold text-sm transition-colors
                                        ${sub.status === 'submitted'
                                            ? 'bg-lapis-600 hover:bg-lapis-700 text-white shadow-sm'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200'
                                        }
                                    `}
                                >
                                    {sub.status === 'submitted' ? '採点する' : '結果を見る'}
                                </Link>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
