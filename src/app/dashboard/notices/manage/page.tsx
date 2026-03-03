"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Plus, Edit2, Trash2, Megaphone, Calendar, EyeOff, Users, Building2, FileText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type Notice = {
    id: string;
    title: string;
    content: string;
    target_audience: "all" | "students" | "parents";
    is_published: boolean;
    created_at: string;
    updated_at: string;
    author: { first_name: string; last_name: string; avatar_url: string | null; };
};

export default function AdminNoticesManagePage() {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);
    const [notices, setNotices] = useState<Notice[]>([]);

    useEffect(() => {
        fetchNotices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchNotices = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('notices')
                .select(`
                    *,
                    author:users!notices_created_by_fkey(first_name, last_name, avatar_url)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotices(data as Notice[]);
        } catch (error) {
            console.error("Fetch notices error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`お知らせ「${title}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) return;

        try {
            const { error } = await supabase.from('notices').delete().eq('id', id);
            if (error) throw error;
            setNotices(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Delete notice error:", error);
            alert("削除に失敗しました。");
        }
    };

    const togglePublishStatus = async (notice: Notice) => {
        try {
            const newStatus = !notice.is_published;
            const { error } = await supabase
                .from('notices')
                .update({ is_published: newStatus })
                .eq('id', notice.id);

            if (error) throw error;

            setNotices(prev => prev.map(n => n.id === notice.id ? { ...n, is_published: newStatus } : n));
        } catch (error) {
            console.error("Toggle publish status error:", error);
            alert("状態の変更に失敗しました。");
        }
    };

    const AudienceIcon = ({ target }: { target: string }) => {
        switch (target) {
            case 'all': return <Building2 className="w-3.5 h-3.5" />;
            case 'students': return <Users className="w-3.5 h-3.5" />;
            case 'parents': return <FileText className="w-3.5 h-3.5" />;
            default: return null;
        }
    };

    const getAudienceLabel = (target: string) => {
        switch (target) {
            case 'all': return '全員';
            case 'students': return '生徒のみ';
            case 'parents': return '保護者のみ';
            default: return target;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-lapis-600" />
                        お知らせ管理
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 font-medium">生徒・保護者へ向けた連絡事項の作成と管理を行います。</p>
                </div>
                <Link
                    href="/dashboard/notices/new"
                    className="flex items-center gap-2 bg-lapis-600 hover:bg-lapis-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5" />
                    新規作成
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <th className="px-6 py-4">状態</th>
                                <th className="px-6 py-4">タイトル / 配信対象</th>
                                <th className="px-6 py-4">作成者</th>
                                <th className="px-6 py-4">作成日時</th>
                                <th className="px-6 py-4 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {notices.map((notice) => (
                                <tr key={notice.id} className={`transition-colors ${!notice.is_published ? 'bg-gray-50/50 dark:bg-gray-800/20' : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => togglePublishStatus(notice)}
                                            className={`px-3 py-1 flex items-center gap-1.5 text-xs font-bold rounded-full transition-colors border ${notice.is_published
                                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30'
                                                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                                }`}
                                        >
                                            {notice.is_published ? (
                                                <><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> 公開中</>
                                            ) : (
                                                <><EyeOff className="w-3 h-3" /> 下書き</>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`font-bold text-base mb-1 ${!notice.is_published ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                            {notice.title}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md inline-flex">
                                            <AudienceIcon target={notice.target_audience} />
                                            {getAudienceLabel(notice.target_audience)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-lapis-100 text-lapis-700 flex items-center justify-center shrink-0 text-[10px] overflow-hidden">
                                                {notice.author?.avatar_url ? (
                                                    <Image src={notice.author.avatar_url} alt="" width={24} height={24} className="object-cover" />
                                                ) : (
                                                    notice.author?.last_name?.charAt(0) || 'T'
                                                )}
                                            </div>
                                            {notice.author?.last_name}先生
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(notice.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <button
                                            onClick={() => alert('後ほど編集画面（/dashboard/notices/[id]/edit）を実装予定です！下書きON/OFFは左のバッジから可能です。')}
                                            className="p-2 text-gray-400 hover:text-lapis-600 hover:bg-lapis-50 dark:hover:bg-gray-800 rounded-lg transition-colors inline-block mx-1"
                                            title="編集"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(notice.id, notice.title)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors inline-block mx-1"
                                            title="削除"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {notices.length === 0 && (
                        <div className="p-16 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <Megaphone className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">お知らせがありません</h3>
                            <p className="text-sm font-medium text-gray-500">右上から新しいお知らせを作成しましょう！</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
