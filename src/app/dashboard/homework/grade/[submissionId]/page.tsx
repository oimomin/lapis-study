"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ArrowLeft, Save, PenTool, Eraser, RotateCcw, Trash2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

type SubmissionDetail = {
    id: string;
    status: 'submitted' | 'graded' | 'returned';
    created_at: string;
    subject: string | null;
    student_id: string;
    student: {
        first_name: string | null;
        last_name: string | null;
    };
    event_id: string | null;
    event?: {
        title: string;
        subject: string | null;
        description: string | null;
    };
    photos: {
        id: string;
        photo_url: string;
        graded_photo_url: string | null;
        comment: string | null;
    }[];
};

import { use } from 'react';
export default function GradeHomeworkPage({ params }: { params: Promise<{ submissionId: string }> }) {
    const { submissionId } = use(params);
    const router = useRouter();
    const supabase = createClient();
    const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // UI State
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [overallComment, setOverallComment] = useState("");

    // Canvas State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    const [color, setColor] = useState('#ff0000'); // Red pen default
    const [lineWidth] = useState(3);
    const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);
    const [historyStep, setHistoryStep] = useState(-1);

    // Prevent rendering on server
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
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
                    student_id,
                    event_id,
                    student:users!homework_submissions_student_id_fkey (first_name, last_name),
                    event:events (title, subject, description),
                    photos:homework_photos (id, photo_url, graded_photo_url, comment)
                `)
                .eq('id', submissionId)
                .single();

            if (error || !data) {
                console.error("Error fetching submission:", error);
                router.push('/dashboard/homework');
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setSubmission(data as any);

            // Set initial overall comment based on the first photo if it exists
            if (data.photos && data.photos.length > 0 && data.photos[0].comment) {
                setOverallComment(data.photos[0].comment);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- CANVAS LOGIC ---
    useEffect(() => {
        if (!submission || submission.photos.length === 0 || !mounted) return;

        const photo = submission.photos[currentPhotoIndex];
        const canvas = canvasRef.current;
        const bgCanvas = bgCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        const bgCtx = bgCanvas?.getContext('2d');

        if (!canvas || !ctx || !bgCanvas || !bgCtx) return;

        // Load background image (prefer graded version if it exists)
        const imageUrl = photo.graded_photo_url || photo.photo_url;
        const img = new Image();
        img.crossOrigin = "anonymous"; // Important for CORS if loading from Storage
        img.src = imageUrl;
        img.onload = () => {
            // Calculate aspect ratio and set canvas size
            const containerWidth = containerRef.current?.clientWidth || 800;
            const ratio = img.height / img.width;

            // Limit max width but keep high resolution internal canvas
            // We just use the natural width/height for resolution

            canvas.width = img.width;      // Internal resolution = physical image resolution
            canvas.height = img.height;
            bgCanvas.width = img.width;
            bgCanvas.height = img.height;

            // Render at container size via CSS
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            bgCanvas.style.width = '100%';
            bgCanvas.style.height = 'auto';

            // Draw image as background to the bgCanvas ONLY
            bgCtx.drawImage(img, 0, 0, bgCanvas.width, bgCanvas.height);
            // Clear the drawing canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Save initial state to history (empty transparent canvas)
            saveHistoryState();
        };

        // If it's already graded, maybe load the graded_photo_url instead to allow re-editing?
        // For simplicity now, we just load the original image.

    }, [submission, currentPhotoIndex, mounted]);

    const saveHistoryState = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Remove future steps if we are not at the end
        const newHistory = canvasHistory.slice(0, historyStep + 1);
        newHistory.push(imageData);

        setCanvasHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    const undo = () => {
        if (historyStep <= 0) return; // Can't undo beyond original image

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const newStep = historyStep - 1;
        ctx.putImageData(canvasHistory[newStep], 0, 0);
        setHistoryStep(newStep);
    };

    const clearCanvas = () => {
        if (historyStep < 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Restore to step 0 (original image)
        ctx.putImageData(canvasHistory[0], 0, 0);

        // Slice history
        const newHistory = [canvasHistory[0]];
        setCanvasHistory(newHistory);
        setHistoryStep(0);
    };

    // Drawing Handlers
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        draw(e, false);
    };

    const endDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) ctx.beginPath(); // Reset path so next line is disconnected
        saveHistoryState();
    };

    const draw = (e: React.MouseEvent | React.TouchEvent, isContinuing: boolean = true) => {
        if (!isDrawing && isContinuing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Get coordinates relative to canvas internal resolution
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const rect = canvas.getBoundingClientRect();

        // Scale the mouse coordinates to the internal canvas resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        ctx.lineWidth = lineWidth * scaleX; // Scale brush size relative to image resolution
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = "destination-out";
            // We make line thicker for easier erasing
            ctx.lineWidth = (lineWidth * scaleX) * 4;
            // Color doesn't matter for destination-out, it just makes pixels transparent
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = color;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    // --- SAVE LOGIC ---
    const handleSaveGrading = async () => {
        if (!submission || !canvasRef.current || !bgCanvasRef.current) return;

        setIsSaving(true);
        try {
            // 1. Combine background and drawing into a single image to save
            const saveCanvas = document.createElement('canvas');
            saveCanvas.width = bgCanvasRef.current.width;
            saveCanvas.height = bgCanvasRef.current.height;
            const saveCtx = saveCanvas.getContext('2d');
            if (!saveCtx) throw new Error("Could not get save context");

            saveCtx.drawImage(bgCanvasRef.current, 0, 0);
            saveCtx.drawImage(canvasRef.current, 0, 0);

            // 2. Convert to Blob
            const blob = await new Promise<Blob | null>((resolve) => {
                saveCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85); // Compress slightly
            });

            if (!blob) throw new Error("Could not generate image blob");

            const photo = submission.photos[currentPhotoIndex];
            const fileExt = 'jpeg';
            const fileName = `graded_${submission.id}_${currentPhotoIndex}_${Date.now()}.${fileExt}`;

            // 2. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('homework_photos')
                .upload(fileName, blob, {
                    contentType: 'image/jpeg'
                });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: publicUrlData } = supabase.storage
                .from('homework_photos')
                .getPublicUrl(fileName);

            const gradedUrl = publicUrlData.publicUrl;

            // 4. Update the DB for this specific photo
            await supabase
                .from('homework_photos')
                .update({
                    graded_photo_url: gradedUrl,
                    comment: overallComment
                })
                .eq('id', photo.id);

            // 5. If this is the last photo, change overall submission status to graded
            // For now, let's just mark it graded every time they hit save.
            await supabase
                .from('homework_submissions')
                .update({ status: 'graded' })
                .eq('id', submission.id);

            // 6. Trigger LINE Notification for grading
            try {
                await fetch('/api/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'homework_graded',
                        payload: {
                            studentId: submission.student_id,
                            title: displayTitle
                        }
                    })
                });
            } catch (notifyErr) {
                console.error("Failed to trigger LINE notification:", notifyErr);
            }

            alert("採点結果を保存しました！");

            // Reload data
            fetchSubmission();
        } catch (error) {
            console.error("Save failed:", error);
            alert("保存に失敗しました。");
        } finally {
            setIsSaving(false);
        }
    };


    if (!mounted || isLoading) {
        return (
            <div className="min-h-screen bg-app-bg dark:bg-app-bg-dark flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    if (!submission) {
        return <div className="p-8 text-center">データが見つかりません。</div>;
    }

    const studentName = submission.student ? `${submission.student.last_name} ${submission.student.first_name}` : '生徒';
    const displayTitle = submission.event ? submission.event.title : (submission.subject ? `${submission.subject}の自習` : '自主学習');

    return (
        <div className="max-w-[1200px] mx-auto pb-20 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/homework"
                        className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            {studentName}の宿題採点
                            {submission.status === 'graded' && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> 採点済
                                </span>
                            )}
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5 font-medium">{displayTitle}</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleSaveGrading}
                        disabled={isSaving}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-lapis-600 hover:bg-lapis-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        採点完了して保存
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">

                {/* Left: Main Canvas Area */}
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex bg-white dark:bg-gray-700 rounded-lg p-1 border border-gray-200 dark:border-gray-600 shadow-sm">
                            <button
                                onClick={() => setTool('pen')}
                                className={`p-2 rounded-md transition-colors ${tool === 'pen' ? 'bg-orange-100 text-orange-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                title="赤ペン"
                            >
                                <PenTool className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setTool('eraser')}
                                className={`p-2 rounded-md transition-colors ${tool === 'eraser' ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                title="白塗りつぶし"
                            >
                                <Eraser className="w-5 h-5" />
                            </button>
                        </div>

                        {tool === 'pen' && (
                            <div className="flex gap-1.5 px-2">
                                {['#ff0000', '#2563eb', '#16a34a', '#eab308'].map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-gray-300 dark:border-gray-500' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-2 px-2 ml-auto">
                            <button onClick={undo} disabled={historyStep <= 0} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30" title="元に戻す">
                                <RotateCcw className="w-5 h-5" />
                            </button>
                            <button onClick={clearCanvas} disabled={historyStep <= 0} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-30" title="すべて消去">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Canvas Container */}
                    <div
                        ref={containerRef}
                        className="relative flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto flex items-center justify-center p-4 min-h-[500px]"
                        style={{ cursor: tool === 'pen' ? 'crosshair' : 'cell' }}
                    >
                        <div className="relative max-w-full shadow-md rounded-sm overflow-hidden">
                            {/* Background Image Layer */}
                            <canvas
                                ref={bgCanvasRef}
                                className="block max-w-full bg-white"
                            />
                            {/* Drawing Layer */}
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={endDrawing}
                                onMouseLeave={endDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={(e) => {
                                    // Prevent scrolling while drawing on mobile
                                    if (isDrawing) {
                                        e.preventDefault();
                                        draw(e, true);
                                    }
                                }}
                                onTouchEnd={endDrawing}
                                className="absolute top-0 left-0 w-full h-full"
                                style={{ touchAction: 'none' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Tools & Info Panel */}
                <div className="w-full lg:w-80 flex flex-col gap-4">

                    {/* Photos Navigation */}
                    {submission.photos.length > 1 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">提出された写真 ({submission.photos.length}枚)</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {submission.photos.map((p, index) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setCurrentPhotoIndex(index)}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${currentPhotoIndex === index
                                            ? 'border-lapis-500 opacity-100 shadow-md transform scale-105 z-10'
                                            : 'border-transparent opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={p.graded_photo_url || p.photo_url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Comment Area */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 dark:border-gray-700 flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm">先生からのコメント</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            生徒が確認画面で見るメッセージです。写真ごとに別のコメントを保存することも可能です。
                        </p>
                        <textarea
                            value={overallComment}
                            onChange={(e) => setOverallComment(e.target.value)}
                            placeholder="よくできましたね！次のページを復習しておきましょう。"
                            className="w-full h-32 md:h-48 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-lapis-500 focus:border-transparent outline-none resize-none text-sm dark:text-gray-100"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
