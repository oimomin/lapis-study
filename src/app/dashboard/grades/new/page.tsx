"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Upload, Plus, Trash2, CheckCircle, ArrowLeft, Image as ImageIcon, Calendar as CalendarIcon, FilePenLine } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type TestType = '小テスト' | '定期テスト' | '模試系' | 'その他';
type ImageType = '答案用紙' | '問題用紙' | 'その他';

type AttachedImage = {
    file: File;
    previewUrl: string;
    imageType: ImageType;
};

export default function GradeUploadPage() {
    const supabase = createClient();
    const router = useRouter();

    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string>('student');
    const [assignableUsers, setAssignableUsers] = useState<{ id: string, name: string }[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [selectedStudentId, setSelectedStudentId] = useState<string>("");
    const [subject, setSubject] = useState<string>("");
    const [score, setScore] = useState<string>("");
    const [testType, setTestType] = useState<TestType>('定期テスト');
    const [testDate, setTestDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const subjects = ['国語', '数学', '英語', '理科', '社会', '情報', 'プログラミング', 'その他'];
    const testTypes: TestType[] = ['小テスト', '定期テスト', '模試系', 'その他'];
    const imageTypes: ImageType[] = ['答案用紙', '問題用紙', 'その他'];

    useEffect(() => {
        const fetchAuthAndData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setRole(profile.role);

                    // Fetch users for target student assignment
                    if (profile.role === 'admin') {
                        const { data } = await supabase.from('users').select('id, first_name, last_name, role').eq('role', 'student');
                        if (data) {
                            setAssignableUsers(data.map(d => ({
                                id: d.id,
                                name: `${d.last_name || ''} ${d.first_name || ''}`
                            })));
                        }
                    } else if (profile.role === 'parent') {
                        const { data } = await supabase.from('family_connections')
                            .select('student:student_id(id, first_name, last_name)')
                            .eq('parent_id', user.id);
                        if (data) {
                            const children = data.map((d: any) => ({
                                id: d.student.id,
                                name: `${d.student.last_name || ''} ${d.student.first_name || ''}`
                            }));
                            setAssignableUsers(children);
                            if (children.length === 1) {
                                setSelectedStudentId(children[0].id);
                            }
                        }
                    } else if (profile.role === 'student') {
                        setSelectedStudentId(user.id);
                    }
                }
            }
            setIsLoading(false);
        };
        fetchAuthAndData();
    }, [supabase]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const newImages: AttachedImage[] = Array.from(e.target.files).map(file => ({
            file,
            previewUrl: URL.createObjectURL(file),
            imageType: '答案用紙' // Default
        }));

        setAttachedImages(prev => [...prev, ...newImages]);
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        setAttachedImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].previewUrl); // Cleanup
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const changeImageType = (index: number, newType: ImageType) => {
        setAttachedImages(prev => {
            const newImages = [...prev];
            newImages[index].imageType = newType;
            return newImages;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedStudentId) {
            alert("対象の生徒を選択してください");
            return;
        }

        if (!subject || !score || !testType || !testDate) {
            alert("必須項目が入力されていません");
            return;
        }

        const scoreNum = parseInt(score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 1000) {
            alert("正しい点数を入力してください");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Insert grade record
            const { data: gradeData, error: gradeError } = await supabase
                .from('grades')
                .insert({
                    student_id: selectedStudentId,
                    subject,
                    score: scoreNum,
                    test_type: testType,
                    test_date: testDate,
                    created_by: user.id
                })
                .select()
                .single();

            if (gradeError) throw gradeError;
            const gradeId = gradeData.id;

            // 2. Upload images and insert records
            for (const img of attachedImages) {
                const fileExt = img.file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${selectedStudentId}/${gradeId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('grades')
                    .upload(filePath, img.file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('grades')
                    .getPublicUrl(filePath);

                const { error: imgInsertError } = await supabase
                    .from('grade_images')
                    .insert({
                        grade_id: gradeId,
                        file_url: publicUrlData.publicUrl,
                        image_type: img.imageType
                    });

                if (imgInsertError) throw imgInsertError;
            }

            // 3. Optional: Add a general notification for admin if submitted by student/parent
            if (role !== 'admin') {
                await supabase.from('events').insert({
                    title: `${gradeData.subject}の成績が報告されました（${scoreNum}点）`,
                    description: `${testType}の成績インサイトを確認してください。`,
                    type: 'notice',
                    visibility: 'admin',
                    date: new Date().toISOString()
                });
            }

            setIsSuccess(true);
            setTimeout(() => {
                const redirectPath = role === 'admin' ? '/dashboard/grades/manage' : '/dashboard/grades';
                router.push(redirectPath);
            }, 2000);

        } catch (error: any) {
            console.error("Submission error:", error);
            alert("エラーが発生しました: " + error.message);
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="max-w-2xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-2">成績を記録しました！</h2>
                <p className="text-gray-500 mb-8 font-medium">
                    インサイトダッシュボードからグラフや詳細を確認できます。
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8">
            <Link href={role === 'admin' ? '/dashboard/grades/manage' : '/dashboard/grades'} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-lapis-600 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> 戻る
            </Link>

            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 flex items-center gap-3">
                    <FilePenLine className="w-8 h-8 text-lapis-600" />
                    成績の報告・記録
                </h1>
                <p className="text-gray-500 text-sm mt-2 font-medium">テストの点数と答案・問題用紙の画像を記録します。</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8">

                {/* 1. Target Student Selection (Admin/Parent only) */}
                {role !== 'student' && (
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">対象の生徒 <span className="text-red-500">*</span></label>
                        <select
                            required
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-lapis-500 focus:border-lapis-500 block p-3.5 font-medium transition-colors"
                        >
                            <option value="">生徒を選択してください</option>
                            {assignableUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* 2. Core Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Subject */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">教科 <span className="text-red-500">*</span></label>
                        <select
                            required
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-lapis-500 focus:border-lapis-500 block p-3.5 font-medium transition-colors"
                        >
                            <option value="">教科を選択</option>
                            {subjects.map(sj => (
                                <option key={sj} value={sj}>{sj}</option>
                            ))}
                        </select>
                    </div>

                    {/* Score */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">点数 <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input
                                type="number"
                                required
                                min="0"
                                max="1000"
                                placeholder="例: 85"
                                value={score}
                                onChange={(e) => setScore(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-lapis-500 focus:border-lapis-500 block p-3.5 pr-12 font-medium transition-colors"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500 font-bold">
                                点
                            </div>
                        </div>
                    </div>

                    {/* Test Type */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">テストの種類 <span className="text-red-500">*</span></label>
                        <select
                            required
                            value={testType}
                            onChange={(e) => setTestType(e.target.value as TestType)}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-lapis-500 focus:border-lapis-500 block p-3.5 font-medium transition-colors"
                        >
                            {testTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">受験日・返却日 <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input
                                type="date"
                                required
                                value={testDate}
                                onChange={(e) => setTestDate(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-lapis-500 focus:border-lapis-500 block p-3.5 pl-12 font-medium transition-colors"
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Image Upload (Problem & Answer Sheets) */}
                <div className="space-y-4 pt-6 border-t border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">写真の追加 (任意)</h3>
                        <p className="text-xs text-gray-500 mt-1">答案用紙や問題用紙の写真を撮ってアップロードできます。</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* List of attached images */}
                        {attachedImages.map((img, idx) => (
                            <div key={idx} className="relative group rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col h-56">
                                <div className="h-32 bg-gray-100 relative">
                                    <Image src={img.previewUrl} alt={`Attached ${idx}`} fill className="object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-3 bg-white flex-1 flex flex-col justify-center">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">写真の種類</label>
                                    <select
                                        className="w-full bg-gray-50 border-transparent text-gray-800 text-sm rounded-lg focus:ring-lapis-500 focus:border-lapis-500 block p-2 font-bold transition-colors cursor-pointer"
                                        value={img.imageType}
                                        onChange={(e) => changeImageType(idx, e.target.value as ImageType)}
                                    >
                                        {imageTypes.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}

                        {/* Upload Button */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-200 hover:border-lapis-400 hover:bg-lapis-50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all h-56 group"
                        >
                            <div className="w-12 h-12 bg-gray-50 group-hover:bg-white rounded-full flex items-center justify-center mb-3 transition-colors shadow-sm">
                                <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-lapis-500" />
                            </div>
                            <span className="text-sm font-bold text-gray-500 group-hover:text-lapis-600">写真を追加</span>
                            <span className="text-[10px] text-gray-400 mt-1 px-4 text-center">答案・問題など<br />複数追加可能</span>
                        </div>
                    </div>
                </div>

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple // Allow multiple files at once!
                    onChange={handleFileChange}
                />

                {/* Submit Button */}
                <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-8 py-3.5 bg-lapis-600 hover:bg-lapis-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-lapis-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                記録中...
                            </>
                        ) : (
                            <>
                                <Plus className="w-5 h-5" />
                                成績を記録する
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
