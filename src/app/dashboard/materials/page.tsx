"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, BookOpen, Download, FileText, FileImage, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type AssignedMaterial = {
    id: string; // Assignment ID
    material: {
        id: string;
        title: string;
        description: string | null;
        file_url: string;
        file_type: string;
        created_at: string;
    };
    student_id: string;
    student?: {
        first_name: string;
        last_name: string;
        avatar_url: string | null;
    }
};

export default function MaterialsPage() {
    const supabase = createClient();
    const [assignments, setAssignments] = useState<AssignedMaterial[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        fetchMaterials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMaterials = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user's role from DB (it might be in metadata, but we'll fetch to be safe)
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            const role = userData?.role || 'student';
            setUser({ ...user, role });

            if (role === 'student') {
                // Fetch assignments directly for this student
                const { data, error } = await supabase
                    .from('material_assignments')
                    .select(`
                        id,
                        student_id,
                        material:materials (id, title, description, file_url, file_type, created_at)
                    `)
                    .eq('student_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setAssignments((data as any[]) || []);

            } else if (role === 'parent') {
                // Fetch assignments for all linked children
                const { data: familyConnections } = await supabase
                    .from('family_connections')
                    .select('student_id, student:users!family_connections_student_id_fkey(first_name, last_name, avatar_url)')
                    .eq('parent_id', user.id);

                if (!familyConnections || familyConnections.length === 0) {
                    setAssignments([]);
                    return;
                }

                const childIds = familyConnections.map(c => c.student_id);

                const { data, error } = await supabase
                    .from('material_assignments')
                    .select(`
                        id,
                        student_id,
                        material:materials (id, title, description, file_url, file_type, created_at)
                    `)
                    .in('student_id', childIds)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Attach child data to assignments for UI rendering
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const formattedData = (data as any[]).map(assignment => {
                    const child = familyConnections.find(c => c.student_id === assignment.student_id);
                    return {
                        ...assignment,
                        student: child?.student
                    };
                });

                setAssignments(formattedData);
            }
        } catch (error) {
            console.error("Error fetching materials:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (url: string, title: string, e: React.MouseEvent) => {
        // Prevent default navigation
        e.preventDefault();

        try {
            // Fetch the file and trigger download via blob to force download behavior
            // instead of opening in a new tab if we want to ensure actual download.
            // But since these are public URLs, standard linking with target="_blank" and download attribute
            // is often enough and easier on bandwidth. We'll use a direct link approach in the UI usually,
            // but this helper is here if programmatic download is needed.

            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = title;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);

        } catch (err) {
            console.error("Download failed", err);
            // Fallback: open in new tab
            window.open(url, '_blank');
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
            <div className="mb-8 text-center md:text-left">
                <h1 className="text-2xl font-extrabold text-lapis-900 bg-clip-text text-transparent bg-gradient-to-r from-lapis-600 to-indigo-600 inline-block flex items-center gap-2 justify-center md:justify-start">
                    <BookOpen className="w-6 h-6 text-lapis-500" />
                    配布プリント・教材
                </h1>
                <p className="text-gray-500 text-sm mt-1 font-medium">先生から配られたプリントを見たり、ダウンロードしたりできます。</p>
            </div>

            {assignments.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <BookOpen className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">まだプリントは届いていません</h3>
                    <p className="text-gray-500 font-medium">
                        新しいプリントや教材が先生から配られると、ここに表示されます！
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignments.map(({ id, material, student }) => {
                        const isPDF = material.file_type.includes('pdf');
                        const date = new Date(material.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });

                        return (
                            <div key={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all overflow-hidden group flex flex-col">
                                {/* Preview Area */}
                                <div className="h-40 bg-gray-50 flex items-center justify-center border-b border-gray-100 relative overflow-hidden p-4">
                                    {isPDF ? (
                                        <div className="flex flex-col items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300">
                                            <FileText className="w-16 h-16 drop-shadow-sm mb-2" />
                                            <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded uppercase tracking-wider">PDF</span>
                                        </div>
                                    ) : (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={material.file_url} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm opacity-50 group-hover:scale-105 transition-transform duration-500" />
                                            <div className="relative z-10 flex flex-col items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform duration-300">
                                                <FileImage className="w-16 h-16 drop-shadow-sm mb-2" />
                                                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded uppercase tracking-wider">Image</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Content Info */}
                                <div className="p-5 flex-1 flex flex-col">
                                    {/* Parent View: Show whose material it is */}
                                    {user?.role === 'parent' && student && (
                                        <div className="flex items-center gap-1.5 mb-3 bg-gray-50 px-2 py-1.5 rounded-lg w-fit">
                                            <div className="w-4 h-4 rounded-full bg-lapis-200 text-lapis-700 flex items-center justify-center text-[8px] font-bold overflow-hidden">
                                                {student.avatar_url ? (
                                                    <Image src={student.avatar_url} alt="" width={16} height={16} className="w-full h-full object-cover" />
                                                ) : (
                                                    student.last_name?.charAt(0)
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-gray-600">{student.first_name}の教材</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-400">{date} に配布</span>
                                    </div>

                                    <h3 className="text-lg font-extrabold text-gray-900 mb-2 line-clamp-2 leading-tight">
                                        {material.title}
                                    </h3>

                                    {material.description && (
                                        <p className="text-sm text-gray-500 font-medium line-clamp-2 mb-4">
                                            {material.description}
                                        </p>
                                    )}

                                    <div className="mt-auto pt-4 flex gap-2">
                                        <a
                                            href={material.file_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" /> 開く
                                        </a>
                                        <button
                                            onClick={(e) => handleDownload(material.file_url, material.title, e)}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-lapis-50 hover:bg-lapis-100 text-lapis-700 font-bold rounded-xl transition-colors group-hover:bg-lapis-600 group-hover:text-white"
                                        >
                                            <Download className="w-4 h-4" /> ダウンロード
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
