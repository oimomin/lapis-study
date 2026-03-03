"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ArrowLeft, CheckCircle, MessageSquare, Star, Sparkles, ThumbsUp, Flame, Award } from 'lucide-react';
import Link from 'next/link';

type SubmissionDetail = {
    id: string;
    status: 'submitted' | 'graded' | 'returned';
    created_at: string;
    subject: string | null;
    understanding_level: string | null;
    student_id: string;
    student: {
        first_name: string;
        last_name: string;
    };
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

export default function ParentHomeworkDetail({ params }: { params: Promise<{ submissionId: string }> }) {
    const { submissionId } = use(params);
    const router = useRouter();
    const supabase = createClient();

    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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

            // Verify parent has access to this student's submission
            // Fetch submission first
            const { data: subData, error: subError } = await supabase
                .from('homework_submissions')
                .select(`
                    id,
                    status,
                    created_at,
                    subject,
                    student_id,
                    understanding_level,
                    student:users!homework_submissions_student_id_fkey(first_name, last_name),
                    event:events (title),
                    photos:homework_photos (id, photo_url, graded_photo_url, comment)
                `)
                .eq('id', submissionId)
                .single();

            if (subError || !subData) {
                console.error("Error fetching submission:", subError);
                router.push('/dashboard/homework/parent');
                return;
            }

            // Check family connection
            const { data: conn } = await supabase
                .from('family_connections')
                .select('id')
                .eq('parent_id', user.id)
                .eq('student_id', subData.student_id)
                .single();

            if (!conn) {
                console.error("Access denied");
                router.push('/dashboard/homework/parent');
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setSubmission(subData as any);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    if (!submission) {
        return <div className="p-8 text-center text-gray-500">データが見つかりません。</div>;
    }

    const title = submission.event?.title || submission.subject || '自主学習';
    const currentPhoto = submission.photos[currentPhotoIndex];
    // Parents see graded photo if it exists, otherwise original
    const displayImageUrl = currentPhoto?.graded_photo_url || currentPhoto?.photo_url;
    const studentName = `${submission.student?.last_name || ''} ${submission.student?.first_name || ''}`.trim();

    return (
        <div className="max-w-4xl mx-auto pb-24 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/homework/parent"
                        className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold bg-lapis-100 text-lapis-700 px-2 py-0.5 rounded">
                                {studentName}
                            </span>
                            <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white">
                                {title}
                            </h1>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">
                            提出日: {new Date(submission.created_at).toLocaleDateString('ja-JP')}
                        </p>
                    </div>
                </div>

                {submission.status === 'returned' && (
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 self-start md:self-auto">
                        <CheckCircle className="w-4 h-4" /> 本人確認済み
                    </div>
                )}
                {submission.status === 'graded' && (
                    <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 self-start md:self-auto">
                        <Star className="w-4 h-4" /> 採点完了・本人確認待ち
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Left: Photos & Feedback */}
                <div className="flex-1 space-y-6">
                    {/* Main Image Viewer */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-gray-700 dark:text-gray-200 text-sm flex items-center gap-2">
                                <Award className="w-4 h-4 text-lapis-500" />
                                ノート画像 ({currentPhotoIndex + 1}/{submission.photos.length})
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

                {/* Right: Navigation & Evaluation (Read Only) */}
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

                    {/* View Only Evaluation */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-24">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base mb-2">本人の理解度</h3>

                        {submission.understanding_level ? (
                            <div className="py-2 text-center">
                                <div className="inline-flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl w-full border border-gray-100">
                                    {submission.understanding_level === 'excellent' && <div className="text-center"><Sparkles className="w-10 h-10 text-pink-500 mx-auto mb-2" /><span className="font-bold text-pink-600 text-sm">◎ よくできた！</span></div>}
                                    {submission.understanding_level === 'good' && <div className="text-center"><ThumbsUp className="w-10 h-10 text-green-500 mx-auto mb-2" /><span className="font-bold text-green-600 text-sm">◯ できた</span></div>}
                                    {submission.understanding_level === 'needs_work' && <div className="text-center"><Flame className="w-10 h-10 text-blue-500 mx-auto mb-2" /><span className="font-bold text-blue-600 text-sm">△ いまひとつ</span></div>}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-center border border-gray-100">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    まだ本人が理解度を記録していません。<br />声かけをして確認を促してみましょう。
                                </p>
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <p className="text-[10px] text-gray-400 text-center">
                                ※保護者画面は閲覧専用です。<br />評価の変更は生徒自身のアカウントから行ってください。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
