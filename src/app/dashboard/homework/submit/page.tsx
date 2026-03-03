"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Camera, Upload, X, CheckCircle, ArrowLeft, Loader2, Image as ImageIcon, BookOpen } from 'lucide-react';
import Link from 'next/link';

const SUBJECTS = [
    "国語", "算数", "数学", "英語", "理科", "社会", "その他"
];

export default function StandaloneHomeworkSubmitPage() {
    const router = useRouter();
    const supabase = createClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [subject, setSubject] = useState(SUBJECTS[0]);

    // Selected image files
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    // Success state
    const [isSuccess, setIsSuccess] = useState(false);

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const filesArray = Array.from(e.target.files);

        // Filter out non-images (basic check)
        const validFiles = filesArray.filter(file => file.type.startsWith('image/'));

        if (validFiles.length !== filesArray.length) {
            alert('画像ファイルのみ選択できます。');
        }

        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);

            // Create preview URLs
            const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
        }

        // Reset input so the same file could be selected again if removed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));

        // Revoke object URL to prevent memory leaks
        URL.revokeObjectURL(previewUrls[index]);
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) return;

        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // 1. Create homework submission record (with NO event_id)
            const { data: submissionData, error: submissionError } = await supabase
                .from('homework_submissions')
                .insert({
                    student_id: user.id,
                    subject: subject,
                    status: 'submitted'
                    // event_id is left null
                })
                .select()
                .single();

            if (submissionError || !submissionData) {
                console.error("Submission DB Error:", submissionError);
                throw new Error("Failed to create submission record.");
            }

            // 2. Upload photos to Storage and record in homework_photos
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const fileExt = file.name.split('.').pop();
                // We use submissionData.id instead of event.id to group files
                const fileName = `${user.id}/adhoc_${submissionData.id}/${Date.now()}_${i}.${fileExt}`;

                // Upload to storage
                const { error: uploadError } = await supabase.storage
                    .from('homework_photos')
                    .upload(fileName, file);

                if (uploadError) {
                    console.error("Error uploading file:", uploadError);
                    continue; // Skip this file but try others
                }

                // Get public URL
                const { data: publicUrlData } = supabase.storage
                    .from('homework_photos')
                    .getPublicUrl(fileName);

                // Insert into homework_photos table
                await supabase
                    .from('homework_photos')
                    .insert({
                        submission_id: submissionData.id,
                        photo_url: publicUrlData.publicUrl
                    });
            }

            // Optional: Create a notification for the admin 
            // e.g. "生徒から自主勉強（○○）が提出されました！"

            setIsSuccess(true);
        } catch (error) {
            console.error("Submission failed:", error);
            alert("提出に失敗しました。もう一度お試しください。");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner animate-bounce-slow">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">提出完了！</h2>
                <p className="text-gray-600 mb-8">
                    自主勉強の提出が完了しました。<br />先生からの確認を待ってね！えらい✨
                </p>
                <Link
                    href="/dashboard"
                    className="px-6 py-3 bg-lapis-600 hover:bg-lapis-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                >
                    ダッシュボードに戻る
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/dashboard"
                    className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-700" />
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900">宿題・自主勉強を提出する</h1>
                    <p className="text-gray-600 mt-1 font-medium text-sm">
                        予定に入っていない課題もここから提出できるよ！
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 sm:p-8 flex flex-col items-center">

                    {/* Subject Selection */}
                    <div className="w-full max-w-sm mb-10">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3 ml-2">
                            <BookOpen className="w-4 h-4 text-lapis-500" />
                            どの科目をやったの？
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {SUBJECTS.map((sub) => (
                                <button
                                    key={sub}
                                    onClick={() => setSubject(sub)}
                                    className={`
                                        px-4 py-2 rounded-xl text-sm font-bold transition-all border-2
                                        ${subject === sub
                                            ? 'bg-orange-100 border-orange-500 text-orange-800 shadow-sm scale-105'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                        }
                                    `}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-full border-t border-gray-100 mb-10"></div>

                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                        <ImageIcon className="w-8 h-8" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">ノートの写真を撮ろう！</h3>
                    <p className="text-gray-500 text-center text-sm mb-8 leading-relaxed max-w-sm">
                        解き終わったノートやプリントを<br />明るい場所で撮影してアップロードしてね。
                    </p>

                    {/* Hidden input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        multiple
                        className="hidden"
                    />

                    {/* Upload Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mb-8">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 max-w-[200px] py-4 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors group"
                        >
                            <Upload className="w-6 h-6 text-gray-400 group-hover:text-lapis-500 transition-colors" />
                            <span className="text-sm font-bold text-gray-600 group-hover:text-lapis-600 transition-colors">画像を選ぶ</span>
                        </button>
                    </div>

                    {/* Previews */}
                    {previewUrls.length > 0 && (
                        <div className="w-full">
                            <h4 className="font-bold text-gray-700 mb-4 px-2">選択した写真 ({previewUrls.length}枚)</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                                {previewUrls.map((url, index) => (
                                    <div key={index} className="relative aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden group shadow-sm border border-gray-200">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={url}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={selectedFiles.length === 0 || isSubmitting}
                        className={`
                            flex items-center gap-2 px-8 py-4 font-bold rounded-xl shadow-lg transition-all
                            ${selectedFiles.length === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                                : 'bg-lapis-600 hover:bg-lapis-700 text-white active:scale-95'
                            }
                        `}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                提出中...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                この内容で提出する！
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
