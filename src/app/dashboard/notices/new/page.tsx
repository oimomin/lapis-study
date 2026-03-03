"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone, Send, ArrowLeft, Building2, Users, FileText } from "lucide-react";
import Link from "next/link";

export default function NewNoticePage() {
    const supabase = createClient();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [targetAudience, setTargetAudience] = useState<"all" | "students" | "parents">("all");
    const [isPublished, setIsPublished] = useState(true); // true = Publish immediately, false = Draft

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !content.trim()) {
            alert("タイトルと本文は必須です。");
            return;
        }

        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase.from('notices').insert({
                title,
                content,
                target_audience: targetAudience,
                is_published: isPublished,
                created_by: user.id
            });

            if (error) throw error;

            // Redirect back to manage page
            router.push('/dashboard/notices/manage');
            router.refresh();

        } catch (error) {
            console.error("Error creating notice:", error);
            alert("お知らせの作成に失敗しました。");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/dashboard/notices/manage"
                    className="p-2 -ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-lapis-600" />
                        新しいお知らせを作成
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">
                        生徒や保護者へ向けた連絡事項を作成して配信します。
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-8">

                {/* Title */}
                <div className="space-y-2">
                    <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        件名 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="例：夏期講習のお知らせ"
                        className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-lapis-500 outline-none transition-all placeholder:text-gray-400"
                        required
                    />
                </div>

                {/* Target Audience */}
                <div className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        配信対象 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                            type="button"
                            onClick={() => setTargetAudience('all')}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${targetAudience === 'all'
                                    ? 'border-lapis-500 bg-lapis-50 dark:bg-lapis-900/20 text-lapis-700 dark:text-lapis-300'
                                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:border-lapis-200 dark:hover:border-lapis-800'
                                }`}
                        >
                            <Building2 className="w-6 h-6 mb-2" />
                            <span className="font-bold">全員</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setTargetAudience('students')}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${targetAudience === 'students'
                                    ? 'border-lapis-500 bg-lapis-50 dark:bg-lapis-900/20 text-lapis-700 dark:text-lapis-300'
                                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:border-lapis-200 dark:hover:border-lapis-800'
                                }`}
                        >
                            <Users className="w-6 h-6 mb-2" />
                            <span className="font-bold">生徒のみ</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setTargetAudience('parents')}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${targetAudience === 'parents'
                                    ? 'border-lapis-500 bg-lapis-50 dark:bg-lapis-900/20 text-lapis-700 dark:text-lapis-300'
                                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:border-lapis-200 dark:hover:border-lapis-800'
                                }`}
                        >
                            <FileText className="w-6 h-6 mb-2" />
                            <span className="font-bold">保護者のみ</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                    <label htmlFor="content" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        本文 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="お知らせの内容を入力してください..."
                        rows={10}
                        className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-lapis-500 outline-none transition-all placeholder:text-gray-400 resize-y"
                        required
                    />
                </div>

                {/* Status Options */}
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        公開設定
                    </label>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={isPublished === true}
                                onChange={() => setIsPublished(true)}
                                className="w-5 h-5 text-lapis-600 border-gray-300 focus:ring-lapis-500"
                            />
                            <span className="font-bold text-gray-700 dark:text-gray-300">今すぐ公開する</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={isPublished === false}
                                onChange={() => setIsPublished(false)}
                                className="w-5 h-5 text-gray-400 border-gray-300 focus:ring-gray-500"
                            />
                            <span className="font-bold text-gray-500">下書きとして保存</span>
                        </label>
                    </div>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <Link
                        href="/dashboard/notices/manage"
                        className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                        キャンセル
                    </Link>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-8 py-3 rounded-xl font-bold text-white shadow-sm transition-all flex items-center gap-2 ${isPublished
                                ? 'bg-lapis-600 hover:bg-lapis-700'
                                : 'bg-gray-600 hover:bg-gray-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            isPublished ? <Send className="w-5 h-5" /> : <FileText className="w-5 h-5" />
                        )}
                        {isPublished ? '作成して配信' : '下書き保存'}
                    </button>
                </div>
            </form>
        </div>
    );
}

