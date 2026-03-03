"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Upload, X, CheckCircle, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export default function HomeworkSubmitPage() {
    const params = useParams<{ eventId: string }>();
    const router = useRouter();
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [event, setEvent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);

    // Selected image files
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    // Success and Error states
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchEventAndAuth = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }
                setUser(user);

                // Fetch the event
                const { data: eventData, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', params.eventId)
                    .single();

                if (error || !eventData) {
                    console.error("Error fetching event:", error, "eventId:", params.eventId);
                    setErrorMsg("課題データの取得に失敗しました。詳細: " + (error?.message || "データが見つかりません"));
                    return;
                }

                // Verify this is a homework event
                if (eventData.type !== 'homework') {
                    console.error("Invalid event type, not a homework assignment.");
                    setErrorMsg("この課題は宿題ではありません。");
                    return;
                }

                // Check if already submitted
                const { data: submission } = await supabase
                    .from('homework_submissions')
                    .select('id')
                    .eq('event_id', params.eventId)
                    .eq('student_id', user.id)
                    .single();

                if (submission) {
                    // Already submitted, maybe redirect to a view page or show success
                    setIsSuccess(true);
                }

                setEvent(eventData);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEventAndAuth();
    }, [params.eventId, router, supabase]);

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
        if (selectedFiles.length === 0 || !user || !event) return;

        setIsSubmitting(true);
        try {
            // 1. Create homework submission record
            const { data: submissionData, error: submissionError } = await supabase
                .from('homework_submissions')
                .insert({
                    event_id: event.id,
                    student_id: user.id,
                    status: 'submitted'
                })
                .select()
                .single();

            if (submissionError || !submissionData) {
                throw new Error("Failed to create submission record.");
            }

            // 2. Upload photos to Storage and record in homework_photos
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${user.id}/${event.id}/${Date.now()}_${i}.${fileExt}`;

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

            // 3. Mark the original event as completed
            await supabase
                .from('events')
                .update({ is_completed: true })
                .eq('id', event.id);

            // 4. Create a notification for the admin (Optional, can be added later)

            setIsSuccess(true);
        } catch (error) {
            console.error("Submission failed:", error);
            alert("提出に失敗しました。もう一度お試しください。");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <X className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">エラーが発生しました</h2>
                <p className="text-gray-600 mb-8 max-w-md">{errorMsg}</p>
                <Link
                    href="/dashboard/todos"
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl shadow-sm transition-colors"
                >
                    やることリストに戻る
                </Link>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner animate-bounce-slow">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">提出完了！</h2>
                <p className="text-gray-600 mb-8">
                    宿題の提出が完了しました。<br />先生からの採点を待ってね！
                </p>
                <Link
                    href="/dashboard/todos"
                    className="px-6 py-3 bg-lapis-600 hover:bg-lapis-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                >
                    やることリストに戻る
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/dashboard/todos"
                    className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-700" />
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900">宿題を提出する</h1>
                    {event && (
                        <p className="text-gray-600 mt-1 font-medium flex items-center gap-2">
                            {event.subject && (
                                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full font-bold">
                                    {event.subject}
                                </span>
                            )}
                            {event.title}
                        </p>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 sm:p-8 flex flex-col items-center">

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
