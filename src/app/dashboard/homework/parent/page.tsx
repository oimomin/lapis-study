"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, BookOpen, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type Child = {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
};

type Submission = {
    id: string;
    student_id: string;
    subject: string | null;
    status: 'submitted' | 'graded' | 'returned';
    created_at: string;
    event?: {
        title: string;
    };
};

export default function ParentHomeworkPage() {
    const supabase = createClient();
    const [children, setChildren] = useState<Child[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get linked children
            const { data: familyConnections, error: familyError } = await supabase
                .from('family_connections')
                .select('student:users!family_connections_student_id_fkey(id, first_name, last_name, avatar_url)')
                .eq('parent_id', user.id);

            if (familyError) throw familyError;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const childrenData = familyConnections?.map((conn: any) => conn.student) || [];
            setChildren(childrenData);

            if (childrenData.length > 0) {
                const childIds = childrenData.map(c => c.id);

                // 2. Get homework submissions for all children
                const { data: submissionData, error: subError } = await supabase
                    .from('homework_submissions')
                    .select(`
                        id,
                        student_id,
                        subject,
                        status,
                        created_at,
                        event:events(title)
                    `)
                    .in('student_id', childIds)
                    .order('created_at', { ascending: false });

                if (subError) throw subError;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setSubmissions(submissionData as any[]);
            }

        } catch (error) {
            console.error("Error fetching parent data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    if (children.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-4 md:p-8 text-center text-gray-500">
                お子様のアカウントが紐付けられていません。
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="mb-8 text-center md:text-left">
                <h1 className="text-2xl font-extrabold text-lapis-900 bg-clip-text text-transparent bg-gradient-to-r from-lapis-600 to-indigo-600 inline-block">
                    お子様の宿題・提出物
                </h1>
                <p className="text-gray-500 text-sm mt-1 font-medium">提出状況や先生からの採点結果を確認できます</p>
            </div>

            {/* Child filter could be added here if needed */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                {children.map(child => (
                    <div key={child.id} className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm shrink-0">
                        <div className="w-6 h-6 rounded-full bg-lapis-100 text-lapis-600 font-bold flex items-center justify-center text-[10px] overflow-hidden">
                            {child.avatar_url ? (
                                <Image src={child.avatar_url} alt="" width={24} height={24} className="w-full h-full object-cover" />
                            ) : (
                                child.last_name?.charAt(0)
                            )}
                        </div>
                        <span className="text-sm font-bold text-gray-700">{child.last_name} {child.first_name}</span>
                    </div>
                ))}
            </div>

            {submissions.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold">まだ宿題の提出記録はありません。</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {submissions.map((sub) => {
                        const child = children.find(c => c.id === sub.student_id);
                        const title = sub.event?.title || sub.subject || '自主学習';
                        const date = new Date(sub.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                        return (
                            <Link
                                href={`/dashboard/homework/parent/${sub.id}`}
                                key={sub.id}
                                className="block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-lapis-200 transition-all group"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            {/* Child Label */}
                                            {children.length > 1 && child && (
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold">
                                                    {child.first_name}
                                                </span>
                                            )}

                                            {/* Status Badge */}
                                            {sub.status === 'submitted' && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                    <Clock className="w-3 h-3" /> 先生の確認待ち
                                                </span>
                                            )}
                                            {sub.status === 'graded' && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                                                    採点完了・本人確認中
                                                </span>
                                            )}
                                            {sub.status === 'returned' && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                                    <CheckCircle className="w-3 h-3" /> 本人確認済み
                                                </span>
                                            )}

                                            <span className="text-xs text-gray-400 font-medium">{date}</span>
                                        </div>
                                        <h3 className="text-lg font-extrabold text-gray-900 group-hover:text-lapis-600 transition-colors">
                                            {title}
                                        </h3>
                                    </div>
                                    <div className="text-lapis-500 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                        詳細を見る →
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
