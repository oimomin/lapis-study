"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Plus, Edit2, Trash2, Calendar, FilePenLine, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type GradeRecord = {
    id: string;
    student_id: string;
    subject: string;
    score: number;
    test_type: string;
    test_date: string;
    created_at: string;
    student?: { first_name: string; last_name: string; avatar_url: string | null; };
    _count: { images: number };
};

export default function AdminGradesManagePage() {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);
    const [grades, setGrades] = useState<GradeRecord[]>([]);

    // Filtering
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("all");

    // Editing state
    const [editingGrade, setEditingGrade] = useState<GradeRecord | null>(null);
    const [editForm, setEditForm] = useState({ score: 0, subject: "", test_type: "", test_date: "" });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchGrades();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchGrades = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('grades')
                .select(`
                    *,
                    images:grade_images(count),
                    student:users!grades_student_id_fkey(first_name, last_name, avatar_url)
                `)
                .order('test_date', { ascending: false });

            if (error) throw error;

            // Format count
            const formattedData = data.map((d: any) => ({
                ...d,
                _count: { images: d.images[0]?.count || 0 }
            }));

            setGrades(formattedData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("本当にこの成績データを削除しますか？\n添付された画像等のデータも全て削除されます。")) return;

        try {
            const { error } = await supabase.from('grades').delete().eq('id', id);
            if (error) throw error;
            setGrades(prev => prev.filter(g => g.id !== id));
        } catch (error) {
            console.error("Delete error:", error);
            alert("削除に失敗しました");
        }
    };

    const handleEditClick = (grade: GradeRecord) => {
        setEditingGrade(grade);
        setEditForm({
            score: grade.score,
            subject: grade.subject,
            test_type: grade.test_type,
            test_date: grade.test_date,
        });
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGrade) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('grades')
                .update({
                    score: editForm.score,
                    subject: editForm.subject,
                    test_type: editForm.test_type,
                    test_date: editForm.test_date
                })
                .eq('id', editingGrade.id);

            if (error) throw error;

            // Update UI list
            setGrades(prev => prev.map(g => g.id === editingGrade.id ? {
                ...g,
                score: editForm.score,
                subject: editForm.subject,
                test_type: editForm.test_type,
                test_date: editForm.test_date
            } : g));

            setEditingGrade(null);
        } catch (error) {
            console.error("Edit error:", error);
            alert("更新に失敗しました。");
        } finally {
            setIsSaving(false);
        }
    };

    const availableSubjects = Array.from(new Set(grades.map(g => g.subject)));

    const filteredGrades = grades.filter(g => {
        const studentName = (g.student?.last_name || "") + " " + (g.student?.first_name || "");
        if (searchQuery && !studentName.toLowerCase().includes(searchQuery.toLowerCase().replace(/\s/g, ""))) {
            return false;
        }
        if (selectedSubject !== 'all' && g.subject !== selectedSubject) return false;
        return true;
    });

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
                        <FilePenLine className="w-8 h-8 text-lapis-600" />
                        全生徒成績管理
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 font-medium">生徒の全成績データの閲覧と誤った入力の修正を行います。</p>
                </div>
                <Link
                    href="/dashboard/grades/new"
                    className="flex items-center gap-2 bg-lapis-600 hover:bg-lapis-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5" />
                    新しく記録する
                </Link>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="relative flex-1 w-full">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="生徒名で検索..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-lapis-500"
                    />
                </div>
                <select
                    className="w-full sm:w-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-lapis-500"
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                >
                    <option value="all">すべての教科</option>
                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Grades Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <th className="px-6 py-4">生徒</th>
                                <th className="px-6 py-4">教科・種類</th>
                                <th className="px-6 py-4">点数</th>
                                <th className="px-6 py-4">受験日</th>
                                <th className="px-6 py-4">添付</th>
                                <th className="px-6 py-4 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredGrades.map((grade) => (
                                <tr key={grade.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-lapis-100 text-lapis-700 flex items-center justify-center shrink-0 text-[10px] overflow-hidden">
                                                {grade.student?.avatar_url ? (
                                                    <Image src={grade.student.avatar_url} alt="" width={24} height={24} className="object-cover" />
                                                ) : (
                                                    grade.student?.last_name?.charAt(0) || 'S'
                                                )}
                                            </div>
                                            {grade.student?.last_name} {grade.student?.first_name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800 dark:text-gray-200">{grade.subject}</div>
                                        <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded inline-block mt-1">
                                            {grade.test_type}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-lg font-black text-lapis-600 dark:text-lapis-400">
                                            {grade.score}<span className="text-xs font-bold text-gray-400 ml-1">点</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(grade.test_date).toLocaleDateString('ja-JP')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                                        {grade._count?.images > 0 ? (
                                            <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded select-none">
                                                {grade._count.images}枚
                                            </span>
                                        ) : (
                                            <span className="text-gray-300 dark:text-gray-600">なし</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <button
                                            onClick={() => handleEditClick(grade)}
                                            className="p-2 text-gray-400 hover:text-lapis-600 hover:bg-lapis-50 dark:hover:bg-gray-800 rounded-lg transition-colors inline-block mx-1"
                                            title="編集"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(grade.id, e)}
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
                    {filteredGrades.length === 0 && (
                        <div className="p-12 text-center text-gray-500 font-medium">
                            該当するデータがありません
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editingGrade && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <Edit2 className="w-4 h-4 text-lapis-500" />
                                成績データの編集
                            </h3>
                            <button onClick={() => setEditingGrade(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-sm text-gray-500 font-bold mb-1">対象生徒</p>
                                <p className="font-bold text-gray-900 dark:text-gray-100">
                                    {editingGrade.student?.last_name} {editingGrade.student?.first_name}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">教科</label>
                                    <select
                                        className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-2.5 font-bold"
                                        value={editForm.subject}
                                        onChange={e => setEditForm({ ...editForm, subject: e.target.value })}
                                    >
                                        {['国語', '数学', '英語', '理科', '社会', '情報', 'プログラミング', 'その他'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">点数</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-2.5 font-bold pr-8"
                                            value={editForm.score}
                                            onChange={e => setEditForm({ ...editForm, score: parseInt(e.target.value) || 0 })}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">点</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">テストの種類</label>
                                <select
                                    className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-2.5 font-bold"
                                    value={editForm.test_type}
                                    onChange={e => setEditForm({ ...editForm, test_type: e.target.value })}
                                >
                                    {['小テスト', '定期テスト', '模試系', 'その他'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block">日付</label>
                                <input
                                    type="date"
                                    className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-2.5 font-bold"
                                    value={editForm.test_date}
                                    onChange={e => setEditForm({ ...editForm, test_date: e.target.value })}
                                />
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setEditingGrade(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                    キャンセル
                                </button>
                                <button type="submit" disabled={isSaving} className="px-5 py-2.5 text-sm font-bold text-white bg-lapis-600 hover:bg-lapis-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2">
                                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    保存する
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
