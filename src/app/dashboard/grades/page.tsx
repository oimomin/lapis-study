"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, TrendingUp, Plus, Filter, FilePenLine, Calendar, ChevronRight, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type GradeImage = {
    id: string;
    file_url: string;
    image_type: string;
};

type GradeRecord = {
    id: string;
    student_id: string;
    subject: string;
    score: number;
    test_type: string;
    test_date: string;
    created_at: string;
    images?: GradeImage[];
    student?: { first_name: string; last_name: string; avatar_url: string | null; };
};

export default function GradeInsightsPage() {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string>('student');
    const [grades, setGrades] = useState<GradeRecord[]>([]);

    // Filters
    const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>("all");
    const [selectedSubject, setSelectedSubject] = useState<string>("all");
    const [selectedTestType, setSelectedTestType] = useState<string>("all");

    // Connected kids for parents
    const [connectedStudents, setConnectedStudents] = useState<{ id: string, name: string }[]>([]);

    // Modal state
    const [selectedGrade, setSelectedGrade] = useState<GradeRecord | null>(null);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUser(user);

            const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
            if (!profile) return;
            setRole(profile.role);

            let targetStudentIds: string[] = [];

            if (profile.role === 'student') {
                targetStudentIds = [user.id];
            } else if (profile.role === 'parent') {
                const { data } = await supabase.from('family_connections')
                    .select('student_id, student:users!family_connections_student_id_fkey(first_name, last_name)')
                    .eq('parent_id', user.id);

                if (data && data.length > 0) {
                    const kids = data.map((d: any) => ({
                        id: d.student_id,
                        name: `${d.student.last_name} ${d.student.first_name}`
                    }));
                    setConnectedStudents(kids);
                    targetStudentIds = kids.map(k => k.id);
                }
            } else if (profile.role === 'admin') {
                // Admins shouldn't be here ideally, but if they are, show maybe all grades they've entered?
                // The request says this is student/parent view, admins have /manage. We'll handle it nicely.
                targetStudentIds = []; // We won't fetch everything by default to save bandwidth. Admin goes to Manage.
            }

            if (targetStudentIds.length > 0) {
                const { data: gradesData, error } = await supabase
                    .from('grades')
                    .select(`
                        *,
                        images:grade_images(*),
                        student:users!grades_student_id_fkey(first_name, last_name, avatar_url)
                    `)
                    .in('student_id', targetStudentIds)
                    .order('test_date', { ascending: false });

                if (!error && gradesData) {
                    setGrades(gradesData as GradeRecord[]);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Derived unique filter options
    const availableSubjects = Array.from(new Set(grades.map(g => g.subject)));
    const availableTestTypes = Array.from(new Set(grades.map(g => g.test_type)));

    // Filtered data
    const filteredGrades = grades.filter(g => {
        if (selectedStudentFilter !== 'all' && g.student_id !== selectedStudentFilter) return false;
        if (selectedSubject !== 'all' && g.subject !== selectedSubject) return false;
        if (selectedTestType !== 'all' && g.test_type !== selectedTestType) return false;
        return true;
    });

    // Chart Data Preparation (Reverse chronological so chart goes left->right chronologically)
    const chartData = useMemo(() => {
        const sorted = [...filteredGrades].sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());
        return sorted.map(g => ({
            name: new Date(g.test_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
            score: g.score,
            subject: g.subject,
            test_type: g.test_type,
            fullDate: g.test_date
        }));
    }, [filteredGrades]);

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-lapis-600" />
                        成績インサイト
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 font-medium">テストの点数推移や詳細、答案画像を確認できます。</p>
                </div>
                <Link
                    href="/dashboard/grades/new"
                    className="flex items-center justify-center gap-2 bg-lapis-600 hover:bg-lapis-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    成績を記録する
                </Link>
            </div>

            {grades.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <FilePenLine className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">まだ記録がありません</h3>
                    <p className="text-gray-500 font-medium mb-6">定期テストや小テストの結果を記録してグラフ化しましょう！</p>
                    <Link
                        href="/dashboard/grades/new"
                        className="bg-lapis-50 text-lapis-700 hover:bg-lapis-100 font-bold px-6 py-2 rounded-xl transition-colors"
                    >
                        最初の記録をつける
                    </Link>
                </div>
            ) : (
                <>
                    {/* Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-500 font-bold text-sm mr-2">
                            <Filter className="w-4 h-4" /> 絞り込み:
                        </div>

                        {role === 'parent' && connectedStudents.length > 1 && (
                            <select
                                className="bg-gray-50 dark:bg-gray-700 border-none text-sm font-bold rounded-lg focus:ring-lapis-500 py-2 px-3 text-gray-700 dark:text-gray-200"
                                value={selectedStudentFilter}
                                onChange={e => setSelectedStudentFilter(e.target.value)}
                            >
                                <option value="all">すべての生徒</option>
                                {connectedStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        )}

                        <select
                            className="bg-gray-50 dark:bg-gray-700 border-none text-sm font-bold rounded-lg focus:ring-lapis-500 py-2 px-3 text-gray-700 dark:text-gray-200"
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                        >
                            <option value="all">すべての教科</option>
                            {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <select
                            className="bg-gray-50 dark:bg-gray-700 border-none text-sm font-bold rounded-lg focus:ring-lapis-500 py-2 px-3 text-gray-700 dark:text-gray-200"
                            value={selectedTestType}
                            onChange={e => setSelectedTestType(e.target.value)}
                        >
                            <option value="all">すべてのテスト種類</option>
                            {availableTestTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* Chart Area */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-lapis-500" />
                            点数推移グラフ
                        </h2>

                        {chartData.length < 2 ? (
                            <div className="h-64 flex items-center justify-center text-gray-400 font-medium text-sm text-center">
                                グラフを描画するには、同じ条件の成績データが2つ以上必要です。<br />(※絞り込みを変更してみてください)
                            </div>
                        ) : (
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                                        <YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            name="点数"
                                            stroke="#4F46E5"
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#4F46E5' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Report List */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <FilePenLine className="w-5 h-5 text-gray-500" />
                            成績記録リスト
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredGrades.map((grade) => (
                                <div
                                    key={grade.id}
                                    onClick={() => setSelectedGrade(grade)}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-lapis-200 transition-all cursor-pointer group flex flex-col h-full"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-md">
                                            {grade.test_type}
                                        </span>
                                        <span className="text-sm font-bold text-gray-400 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(grade.test_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto">
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white">
                                            {grade.subject}
                                        </h3>
                                        <div className="flex items-end gap-1">
                                            <span className="text-3xl font-black text-lapis-600 dark:text-lapis-400 leading-none">{grade.score}</span>
                                            <span className="text-sm font-bold text-gray-400 mb-0.5">点</span>
                                        </div>
                                    </div>

                                    {(grade.images && grade.images.length > 0) && (
                                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded flex items-center gap-1.5">
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                画像 {grade.images.length}枚
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-lapis-500 transition-colors" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Detail Modal */}
            {selectedGrade && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/20">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-bold bg-lapis-100 text-lapis-700 px-2 py-1 rounded select-none">
                                        {selectedGrade.test_type}
                                    </span>
                                    <span className="text-sm font-bold text-gray-500">
                                        {new Date(selectedGrade.test_date).toLocaleDateString('ja-JP')}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-4">
                                    {selectedGrade.subject}
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl text-lapis-600">{selectedGrade.score}</span>
                                        <span className="text-base text-gray-400">点</span>
                                    </div>
                                </h2>
                                {role === 'parent' && selectedGrade.student && (
                                    <p className="text-xs font-bold text-gray-500 mt-2">
                                        対象: {selectedGrade.student.last_name} {selectedGrade.student.first_name}
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setSelectedGrade(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>

                        <div className="p-6">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                <ImageIcon className="w-5 h-5 text-gray-400" />
                                添付画像・ファイル
                            </h3>

                            {(!selectedGrade.images || selectedGrade.images.length === 0) ? (
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                                    <p className="text-gray-500 font-medium text-sm">添付されている画像はありません</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {selectedGrade.images.map(img => (
                                        <div key={img.id} className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                                    {img.image_type}
                                                </span>
                                            </div>
                                            <a
                                                href={img.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-zoom-in group"
                                            >
                                                {img.file_url.toLowerCase().endsWith('.pdf') ? (
                                                    <div className="h-48 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 font-bold group-hover:text-lapis-600 transition-colors">
                                                        PDFファイルを開く
                                                    </div>
                                                ) : (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={img.file_url} alt={img.image_type} className="w-full h-auto object-contain max-h-[500px]" />
                                                )}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
