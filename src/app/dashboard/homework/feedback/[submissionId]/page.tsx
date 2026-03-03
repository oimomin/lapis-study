"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ArrowLeft, CheckCircle, MessageSquare, Star, Circle, Triangle, Award, Sparkles, ThumbsUp, Flame } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type SubmissionDetail = {
    id: string;
    status: 'submitted' | 'graded' | 'returned';
    created_at: string;
    subject: string | null;
    understanding_level: string | null;
    event?: {
        title: string;
    };
    photos: {
        id: string;
        photo_url: string;
        graded_photo_url: string | null;
        comment: string | null;
    }[];
};

export default function StudentFeedbackPage({ params }: { params: Promise<{ submissionId: string }> }) {
    const { submissionId } = use(params);
    const router = useRouter();
    const supabase = createClient();

    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Evaluation state
    const [evaluation, setEvaluation] = useState<'excellent' | 'good' | 'needs_work' | null>(null);

    useEffect(() => {
        fetchSubmission();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submissionId]);

    const fetchSubmission = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data, error } = await supabase
                .from('homework_submissions')
                .select(`
                    id,
                    status,
                    created_at,
                    subject,
                    understanding_level,
                    event:events (title),
                    photos:homework_photos (id, photo_url, graded_photo_url, comment)
                `)
                .eq('id', submissionId)
                // Security check
                .eq('student_id', user.id)
                .single();

            if (error || !data) {
                console.error("Error fetching submission:", error);
                router.push('/dashboard');
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setSubmission(data as any);

            // Set initial evaluation if already evaluated
            if (data.understanding_level) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setEvaluation(data.understanding_level as any);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitEvaluation = async () => {
        if (!evaluation || !submission) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('homework_submissions')
                .update({
                    understanding_level: evaluation,
                    status: 'returned' // Mark as fully completed
                })
                .eq('id', submission.id);

            if (error) throw error;

            // Update local state to reflect the change
            setSubmission({
                ...submission,
                status: 'returned',
                understanding_level: evaluation
            });

            // Re-fetch to be safe
            await fetchSubmission();
        } catch (error) {
            console.error("Evaluation failed:", error);
            alert("評価の送信に失敗しました。もう一度お試しください。");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    if (!submission) {
        return <div className="p-8 text-center text-gray-500">データが見つかりません。</div>;
    }

    const title = submission.event?.title || submission.subject || '自主学習';
    const currentPhoto = submission.photos[currentPhotoIndex];
    // For students, ALWAYS show the graded photo if it exists. Fallback to original otherwise.
    const displayImageUrl = currentPhoto?.graded_photo_url || currentPhoto?.photo_url;

    // Check if waiting for evaluation
    const needsEvaluation = submission.status === 'graded' && !submission.understanding_level;

    return (
        <div className="max-w-4xl mx-auto pb-24 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/dashboard/homework/submit"
                    className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </Link>
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white">
                        採点結果の確認
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5 font-medium">{title}</p>
                </div>

                {submission.status === 'returned' && (
                    <div className="ml-auto bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" /> 確認済み
                    </div>
                )}
            </div>

            {needsEvaluation && (
                <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-3 shadow-sm">
                    <div className="p-2 bg-orange-100 rounded-full text-orange-600 shrink-0">
                        <Star className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                        <h3 className="font-bold text-orange-900">先生が採点してくれたよ！✨</h3>
                        <p className="text-sm text-orange-800 mt-1">
                            赤ペンとコメントを確認して、最後に今の「理解度」を教えてね。
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-6">
                {/* Left: Photos & Feedback */}
                <div className="flex-1 space-y-6">
                    {/* Main Image Viewer */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        {/* Status badge in corner */}
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-gray-700 dark:text-gray-200 text-sm flex items-center gap-2">
                                <Award className="w-4 h-4 text-lapis-500" />
                                採点されたノート ({currentPhotoIndex + 1}/{submission.photos.length})
                            </span>
                        </div>

                        <div className="relative aspect-[3/4] md:aspect-auto md:min-h-[500px] bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            {displayImageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={displayImageUrl}
                                    alt="Graded homework"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                                    画像がありません
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Teacher's Comment Section */}
                    {currentPhoto?.comment ? (
                        <div className="bg-lapis-50 dark:bg-lapis-900/20 rounded-2xl p-5 shadow-sm border border-lapis-100 dark:border-lapis-800/50 flex gap-4">
                            <div className="shrink-0 w-10 h-10 bg-lapis-500 rounded-full flex items-center justify-center text-white shadow-sm">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-lapis-600 dark:text-lapis-400 mb-1">先生からのコメント</p>
                                <p className="text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap leading-relaxed text-sm">
                                    {currentPhoto.comment}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-500 text-sm h-24">
                            この写真へのコメントは特にありません。
                        </div>
                    )}
                </div>

                {/* Right: Navigation & Evaluation */}
                <div className="w-full md:w-72 lg:w-80 space-y-6">

                    {/* Photo Thumbnails */}
                    {submission.photos.length > 1 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">すべての写真</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {submission.photos.map((p, index) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setCurrentPhotoIndex(index)}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${currentPhotoIndex === index
                                            ? 'border-lapis-500 opacity-100 shadow-md transform scale-105'
                                            : 'border-transparent opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={p.graded_photo_url || p.photo_url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Understanding Evaluation Form */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-200 dark:border-gray-700 sticky top-24">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base mb-2">理解度チェック</h3>

                        {submission.status === 'returned' && !needsEvaluation ? (
                            <div className="py-4 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">送信された自己評価</p>
                                <div className="inline-flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl w-full">
                                    {evaluation === 'excellent' && <div className="text-center"><Sparkles className="w-12 h-12 text-pink-500 mx-auto mb-2" /><span className="font-bold text-pink-600">◎ よくできた！</span></div>}
                                    {evaluation === 'good' && <div className="text-center"><ThumbsUp className="w-12 h-12 text-green-500 mx-auto mb-2" /><span className="font-bold text-green-600">◯ できた</span></div>}
                                    {evaluation === 'needs_work' && <div className="text-center"><Flame className="w-12 h-12 text-blue-500 mx-auto mb-2" /><span className="font-bold text-blue-600">△ いまひとつ</span></div>}
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                                    確認が終わったら、自分に正直な理解度を選んで「確認完了」ボタンを押してね。
                                </p>

                                <div className="space-y-3 mb-6">
                                    <button
                                        onClick={() => setEvaluation('excellent')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${evaluation === 'excellent'
                                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 shadow-sm'
                                            : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-pink-200 hover:bg-pink-50/50'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm shrink-0">
                                            <Sparkles className="w-5 h-5 text-pink-500" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-sm">◎ よくできた！</p>
                                            </div>
                                            <p className="text-[10px] opacity-80 mt-0.5">一人でスラスラ解けるレベル</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setEvaluation('good')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${evaluation === 'good'
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 shadow-sm'
                                            : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-green-200 hover:bg-green-50/50'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm shrink-0">
                                            <ThumbsUp className="w-5 h-5 text-green-500" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-sm">◯ できた</p>
                                            </div>
                                            <p className="text-[10px] opacity-80 mt-0.5">解説を見れば理解できるレベル</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setEvaluation('needs_work')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${evaluation === 'needs_work'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm'
                                            : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-blue-200 hover:bg-blue-50/50'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm shrink-0">
                                            <Flame className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-sm">△ いまひとつ</p>
                                            </div>
                                            <p className="text-[10px] opacity-80 mt-0.5">もう一度復習が必要なレベル</p>
                                        </div>
                                    </button>
                                </div>

                                <button
                                    onClick={handleSubmitEvaluation}
                                    disabled={!evaluation || isSubmitting}
                                    className={`w-full py-3.5 rounded-xl font-bold flex items-center gap-2 justify-center transition-all ${evaluation
                                        ? 'bg-lapis-600 hover:bg-lapis-700 text-white shadow-md active:scale-95'
                                        : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-5 h-5" />
                                    )}
                                    この評価で確認完了する
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
