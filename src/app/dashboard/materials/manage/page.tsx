"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, BookOpen, Plus, FileText, FileImage, Trash2 } from "lucide-react";
import Link from "next/link";

type Material = {
    id: string;
    title: string;
    description: string | null;
    file_type: string;
    file_url: string;
    created_at: string;
    uploaded_by: string;
    _count: number; // Number of assigned students
};

export default function AdminMaterialsManagePage() {
    const supabase = createClient();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchMaterials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMaterials = async () => {
        setIsLoading(true);
        try {
            // Fetch materials and count assignments
            const { data, error } = await supabase
                .from('materials')
                .select(`
                    id, title, description, file_type, file_url, created_at, uploaded_by,
                    assignments:material_assignments(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const formattedData = data.map((item: any) => ({
                ...item,
                _count: item.assignments[0]?.count || 0
            }));

            setMaterials(formattedData);
        } catch (error) {
            console.error("Error fetching materials:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string, fileUrl: string) => {
        if (!confirm("この教材を削除しますか？\n（割り当てられた生徒の画面からも見えなくなります）")) return;

        try {
            // 1. Delete from storage
            const fileName = fileUrl.split('/').pop();
            // Assuming the URL format is public/bucketName/fileName or similar. Let's just extract the path.
            // A safer way if it contains the full supabase URL:
            const urlObj = new URL(fileUrl);
            const pathParts = urlObj.pathname.split('/public/materials/');
            if (pathParts.length > 1) {
                const storagePath = pathParts[1];
                await supabase.storage.from('materials').remove([storagePath]);
            }

            // 2. Delete from DB (cascade deletion will handle assignments)
            const { error } = await supabase.from('materials').delete().eq('id', id);
            if (error) throw error;

            // Update UI
            setMaterials(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error("Failed to delete material:", error);
            alert("削除に失敗しました。");
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
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-extrabold text-lapis-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-lapis-500" />
                        教材ライブラリ
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">アップロードした教材の一覧と新しい教材の配布ができます</p>
                </div>
                <Link
                    href="/dashboard/materials/new"
                    className="flex items-center gap-2 bg-lapis-600 hover:bg-lapis-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    新規アップロード
                </Link>
            </div>

            {materials.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">まだ教材がありません</h3>
                    <p className="text-gray-500 mb-6">「新規アップロード」からプリントをアップロードして生徒に配布しましょう。</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                                <th className="px-6 py-4">教材ファイル</th>
                                <th className="px-6 py-4">配布先</th>
                                <th className="px-6 py-4">アップロード日</th>
                                <th className="px-6 py-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {materials.map((material) => (
                                <tr key={material.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-lapis-50 text-lapis-500 flex items-center justify-center shrink-0">
                                                {material.file_type.includes('pdf') ? <FileText className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <a href={material.file_url} target="_blank" rel="noreferrer" className="font-bold text-gray-900 hover:text-lapis-600 transition-colors line-clamp-1">
                                                    {material.title}
                                                </a>
                                                {material.description && (
                                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{material.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                                            {material._count} 人の生徒
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
                                            {new Date(material.created_at).toLocaleDateString('ja-JP')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(material.id, material.file_url)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="削除"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
