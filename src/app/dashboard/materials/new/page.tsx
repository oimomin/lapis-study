"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Upload, File, FileImage, FileText, CheckCircle, ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type Student = {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
};

export default function AdminMaterialUploadPage() {
    const router = useRouter();
    const supabase = createClient();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Student assignment state
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [isFetchingStudents, setIsFetchingStudents] = useState(true);

    const [isUploading, setIsUploading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchStudents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, first_name, last_name, avatar_url')
                .eq('role', 'student')
                .order('last_name', { ascending: true });

            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setIsFetchingStudents(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        const file = e.target.files[0];

        // Basic check: must be PDF or image
        if (!file.type.includes('pdf') && !file.type.includes('image')) {
            alert('PDFと画像ファイルのみアップロードできます。');
            return;
        }

        // If it's a new file, revoke old preview
        if (previewUrl && selectedFile?.type.includes('image')) {
            URL.revokeObjectURL(previewUrl);
        }

        setSelectedFile(file);

        // Auto-fill title if empty
        if (!title) {
            setTitle(file.name.split('.')[0]);
        }

        if (file.type.includes('image')) {
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setPreviewUrl(null); // PDF preview relies on an icon
        }
    };

    const toggleStudentSelection = (studentId: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const selectAllStudents = () => {
        setSelectedStudentIds(students.map(s => s.id));
    };

    const clearStudentSelection = () => {
        setSelectedStudentIds([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !title.trim() || selectedStudentIds.length === 0) return;

        setIsUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Upload file to Storage
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('materials')
                .upload(fileName, selectedFile);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('materials')
                .getPublicUrl(fileName);

            // 2. Insert into materials table
            const { data: materialData, error: materialError } = await supabase
                .from('materials')
                .insert({
                    title: title.trim(),
                    description: description.trim() || null,
                    file_url: publicUrlData.publicUrl,
                    file_type: selectedFile.type,
                    uploaded_by: user.id
                })
                .select()
                .single();

            if (materialError || !materialData) throw materialError;

            // 3. Create assignments
            const assignmentsToInsert = selectedStudentIds.map(studentId => ({
                material_id: materialData.id,
                student_id: studentId
            }));

            const { error: assignmentError } = await supabase
                .from('material_assignments')
                .insert(assignmentsToInsert);

            if (assignmentError) throw assignmentError;

            // 4. Create notification records for each student
            const notificationsToInsert = selectedStudentIds.map(studentId => ({
                title: `新しい教材「${title.trim()}」が配布されました！`,
                description: '「教材一覧」から確認・ダウンロードしてください。',
                type: 'notice',
                visibility: 'user',
                student_id: studentId,
                date: new Date().toISOString()
            }));

            await supabase
                .from('events')
                .insert(notificationsToInsert);

            setIsSuccess(true);
            setTimeout(() => {
                router.push("/dashboard/materials/manage");
            }, 2000);

        } catch (error) {
            console.error("Upload failed:", error);
            alert("アップロードに失敗しました。もう一度お試しください。");
            setIsUploading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner animate-bounce-slow">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">配布完了！</h2>
                <p className="text-gray-600 mb-8">
                    プリントのアップロードと配布設定が完了しました。<br />教材一覧画面へ戻ります...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20 p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/dashboard/materials/manage"
                    className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-700" />
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900">新規プリント・教材の配布</h1>
                    <p className="text-gray-600 mt-1 font-medium text-sm">
                        PDFや画像をアップロードして、対象の生徒に共有します。
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* File Upload Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-lapis-500" />
                        1. ファイルのアップロード
                    </h2>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,application/pdf"
                        className="hidden"
                    />

                    {!selectedFile ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-12 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer group"
                        >
                            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 group-hover:text-lapis-500 mb-2">
                                <Upload className="w-8 h-8" />
                            </div>
                            <span className="font-bold text-gray-700">ファイルを選択してアップロード</span>
                            <span className="text-sm text-gray-500">PDF または 画像（JPG, PNGなど）</span>
                        </div>
                    ) : (
                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center gap-4">
                            <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                                {previewUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <File className="w-8 h-8 text-blue-500" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 truncate">{selectedFile.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedFile(null);
                                    setPreviewUrl(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                                変更
                            </button>
                        </div>
                    )}
                </div>

                {/* Details Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-lapis-500" />
                        2. 教材の詳細情報
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">プリントのタイトル *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lapis-500 focus:border-transparent outline-none transition-all font-medium"
                                placeholder="例: 中学2年 数学 夏休み課題プリント"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">説明文（任意）</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-lapis-500 focus:border-transparent outline-none transition-all font-medium min-h-[100px] resize-y"
                                placeholder="プリントに関する補足や、取り組んでほしい箇所の指示など"
                            />
                        </div>
                    </div>
                </div>

                {/* Student Selection Section */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-lapis-500" />
                            3. 配布する生徒の選択 *
                        </h2>

                        <div className="flex items-center gap-2 text-sm">
                            <button
                                type="button"
                                onClick={selectAllStudents}
                                className="text-lapis-600 font-bold hover:bg-lapis-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                全員選択
                            </button>
                            <button
                                type="button"
                                onClick={clearStudentSelection}
                                className="text-gray-500 font-bold hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                クリア
                            </button>
                        </div>
                    </div>

                    {isFetchingStudents ? (
                        <div className="py-8 flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="p-4 bg-gray-50 text-gray-500 text-center rounded-xl font-medium">
                            生徒アカウントが登録されていません。
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {students.map((student) => {
                                const isSelected = selectedStudentIds.includes(student.id);
                                return (
                                    <div
                                        key={student.id}
                                        onClick={() => toggleStudentSelection(student.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                                            ? 'border-lapis-500 bg-lapis-50/50 shadow-sm'
                                            : 'border-transparent bg-gray-50 hover:bg-gray-100'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-lapis-500 border-lapis-500 text-white' : 'border-gray-300 bg-white'
                                            }`}>
                                            {isSelected && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>

                                        <div className="w-8 h-8 rounded-full bg-lapis-200 flex items-center justify-center text-lapis-700 font-bold text-xs overflow-hidden shrink-0">
                                            {student.avatar_url ? (
                                                <Image src={student.avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
                                            ) : (
                                                student.last_name?.charAt(0)
                                            )}
                                        </div>
                                        <span className="font-bold text-gray-700 truncate">
                                            {student.last_name} {student.first_name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {selectedStudentIds.length === 0 && !isFetchingStudents && (
                        <p className="text-red-500 text-sm font-bold mt-3 ml-1">
                            ※ 少なくとも1人の生徒を選択してください。
                        </p>
                    )}
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isUploading || !selectedFile || !title.trim() || selectedStudentIds.length === 0}
                        className={`
                            px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all text-white
                            ${(!selectedFile || !title.trim() || selectedStudentIds.length === 0)
                                ? 'bg-gray-300 cursor-not-allowed shadow-none'
                                : isUploading
                                    ? 'bg-lapis-500 cursor-wait'
                                    : 'bg-gradient-to-r from-lapis-600 to-indigo-600 hover:shadow-xl hover:shadow-lapis-500/20 active:scale-95'
                            }
                        `}
                    >
                        {isUploading ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> アップロード中...</>
                        ) : (
                            <><Upload className="w-5 h-5" /> この内容でプリントを配布する</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
