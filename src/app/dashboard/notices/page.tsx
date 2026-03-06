"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Megaphone, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";

type Notice = {
    id: string;
    title: string;
    content: string;
    target_audience: "all" | "students" | "parents";
    created_at: string;
    author: { first_name: string; last_name: string; avatar_url: string | null; };
};

export default function NoticesPage() {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [expandedNotices, setExpandedNotices] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchNotices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchNotices = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
            if (!profile) return;

            // Determine what audience this user falls under
            const validAudiences = ['all'];
            if (profile.role === 'student') validAudiences.push('students');
            if (profile.role === 'parent') validAudiences.push('parents');

            // Admins see everything anyway due to RLS, but let's just query everything published
            let query = supabase
                .from('notices')
                .select(`
                    *,
                    author:users!notices_created_by_fkey(first_name, last_name, avatar_url)
                `)
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            // For non-admins, we filter by target_audience (though RLS already handles this, it's good practice)
            if (profile.role !== 'admin') {
                query = query.in('target_audience', validAudiences);
            }

            const { data, error } = await query;
            if (error) throw error;

            setNotices(data as Notice[]);

            // Auto expand the first notice if there is one
            if (data && data.length > 0) {
                setExpandedNotices(new Set([data[0].id]));
            }
        } catch (error) {
            console.error("Fetch notices error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedNotices(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
            <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-6">
                <Megaphone className="w-8 h-8 text-lapis-600" />
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50">
                        お知らせ
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">先生からの連絡事項やイベント情報をご確認ください。</p>
                </div>
            </div>

            {notices.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
                        <Megaphone className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">現在、新しいお知らせはありません</h3>
                    <p className="text-gray-500 font-medium">新しい連絡事項が追加されるとここに表示されます。</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notices.map((notice) => {
                        const isExpanded = expandedNotices.has(notice.id);
                        return (
                            <div
                                key={notice.id}
                                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all hover:shadow-md"
                            >
                                {/* Header (Clickable) */}
                                <div
                                    onClick={() => toggleExpand(notice.id)}
                                    className="p-5 md:p-6 cursor-pointer flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors"
                                >
                                    {/* Icon / Avatar */}
                                    <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-lapis-100 dark:bg-lapis-900/30 text-lapis-700 flex items-center justify-center overflow-hidden border border-lapis-200 dark:border-lapis-800/50">
                                        {notice.author?.avatar_url ? (
                                            <Image src={notice.author.avatar_url} alt="" width={48} height={48} className="object-cover" />
                                        ) : (
                                            <Megaphone className="w-5 h-5 text-lapis-600 dark:text-lapis-400" />
                                        )}
                                    </div>

                                    {/* Content Title & Meta */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-gray-500">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(notice.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                            <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md inline-block">
                                                {notice.author?.last_name || "LapisStudy"}先生より
                                            </span>
                                        </div>
                                        <h3 className={`text-lg md:text-xl font-bold transition-colors ${isExpanded ? 'text-lapis-600 dark:text-lapis-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                            {notice.title}
                                        </h3>
                                    </div>

                                    {/* Toggle Icon */}
                                    <div className="shrink-0 ml-4 text-gray-400 flex items-center h-full pt-1 sm:pt-4">
                                        {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                                    </div>
                                </div>

                                {/* Body (Expandable) */}
                                {isExpanded && (
                                    <div className="px-5 md:px-6 pb-6 pt-2 border-t border-gray-50 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/50">
                                        <div className="prose prose-sm md:prose-base max-w-none text-gray-700 dark:text-gray-300 font-medium whitespace-pre-wrap leading-relaxed mt-4">
                                            {notice.content}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

