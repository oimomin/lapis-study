"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { UserPlus, Search, Link as LinkIcon, AlertCircle, CheckCircle2 } from "lucide-react";

export default function UserManagementPage() {
    const supabase = createClient();
    const [parents, setParents] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [connections, setConnections] = useState<any[]>([]);

    // Form state
    const [selectedParent, setSelectedParent] = useState("");
    const [selectedStudent, setSelectedStudent] = useState("");

    // Status state
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Initial Fetch
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // First verify admin role
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.role !== 'admin') {
                throw new Error("管理者権限が必要です。");
            }

            // Fetch users with role 'parent'
            const { data: parentsData, error: parentsError } = await supabase
                .from('users')
                .select('id, last_name, first_name, email')
                .eq('role', 'parent');

            if (parentsError) throw parentsError;
            setParents(parentsData || []);

            // Fetch users with role 'student'
            const { data: studentsData, error: studentsError } = await supabase
                .from('users')
                .select('id, last_name, first_name, email, grade_level, school_name')
                .eq('role', 'student');

            if (studentsError) throw studentsError;
            setStudents(studentsData || []);

            // Fetch current connections
            const { data: connectionsData, error: connError } = await supabase
                .from('family_connections')
                .select('id, parent_id, student_id, created_at');

            if (connError) throw connError;
            setConnections(connectionsData || []);

        } catch (err: any) {
            console.error("データの取得に失敗しました:", err);
            setError(err.message || "データの取得に失敗しました。RLSの設定を確認してください。");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [supabase]);

    const handleCreateConnection = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedParent || !selectedStudent) {
            setError("保護者と生徒の両方を選択してください。");
            return;
        }

        // Check for existing connection visually first
        const exists = connections.some(c => c.parent_id === selectedParent && c.student_id === selectedStudent);
        if (exists) {
            setError("この紐づけは既に存在します。");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const { error: insertError } = await supabase
                .from('family_connections')
                .insert([
                    { parent_id: selectedParent, student_id: selectedStudent }
                ]);

            if (insertError) {
                // Unique constraint violation check
                if (insertError.code === '23505') {
                    throw new Error("この保護者と生徒は既に紐づけられています。");
                }
                throw insertError;
            }

            setSuccess("保護者と生徒の紐づけが完了しました。");
            setSelectedParent("");
            setSelectedStudent("");
            // Refresh connections list
            fetchData();

        } catch (err: any) {
            console.error(err);
            setError(err.message || "紐づけの保存に失敗しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteConnection = async (id: string) => {
        if (!window.confirm("この紐づけを解除してもよろしいですか？")) return;

        setIsSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const { error } = await supabase
                .from('family_connections')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSuccess("紐づけを解除しました。");
            fetchData();
        } catch (err: any) {
            console.error(err);
            setError("解除に失敗しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lapis-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-lapis-600" />
                生徒・保護者の紐づけ管理
            </h1>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>{error}</div>
                </div>
            )}

            {success && (
                <div className="p-4 bg-success-50 dark:bg-success-900/30 text-success-600 dark:text-success-400 rounded-xl border border-success-200 dark:border-success-800 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>{success}</div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                {/* Connection Form */}
                <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm backdrop-blur-xl h-fit">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-lapis-500" />
                        新しい紐づけを作成
                    </h2>

                    <form onSubmit={handleCreateConnection} className="space-y-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                保護者アカウント
                            </label>
                            <select
                                value={selectedParent}
                                onChange={(e) => setSelectedParent(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-lapis-500 transition-shadow outline-none"
                                required
                            >
                                <option value="">選択してください</option>
                                {parents.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.last_name} {p.first_name} ({p.email})
                                    </option>
                                ))}
                            </select>
                            {parents.length === 0 && <p className="text-xs text-orange-500">保護者アカウントが登録されていません。</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                生徒アカウント
                            </label>
                            <select
                                value={selectedStudent}
                                onChange={(e) => setSelectedStudent(e.target.value)}
                                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-lapis-500 transition-shadow outline-none"
                                required
                            >
                                <option value="">選択してください</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.last_name} {s.first_name} {s.grade_level ? `[${s.grade_level}]` : ''} ({s.email})
                                    </option>
                                ))}
                            </select>
                            {students.length === 0 && <p className="text-xs text-orange-500">生徒アカウントが登録されていません。</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedParent || !selectedStudent}
                            className="w-full py-3 rounded-xl bg-lapis-600 hover:bg-lapis-700 text-white font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "紐づけを保存する"
                            )}
                        </button>
                    </form>
                </div>

                {/* Connection List */}
                <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm backdrop-blur-xl">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Search className="w-5 h-5 text-lapis-500" />
                        現在の紐づけ一覧
                    </h2>

                    <div className="space-y-3">
                        {connections.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">紐づけデータはありません。</p>
                        ) : (
                            connections.map(conn => {
                                const parent = parents.find(p => p.id === conn.parent_id);
                                const student = students.find(s => s.id === conn.student_id);

                                return (
                                    <div key={conn.id} className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/20 flex flex-col sm:flex-row justify-between gap-4">
                                        <div className="text-sm">
                                            <div className="mb-1">
                                                <span className="inline-block px-2 py-0.5 rounded text-xs bg-lapis-100 dark:bg-lapis-900/40 text-lapis-700 mr-2">保護者</span>
                                                <span className="font-bold">{parent ? `${parent.last_name} ${parent.first_name}` : '不明なユーザー'}</span>
                                            </div>
                                            <div>
                                                <span className="inline-block px-2 py-0.5 rounded text-xs bg-accent-100 dark:bg-accent-900/40 text-accent-700 mr-2">生徒</span>
                                                <span className="font-bold">{student ? `${student.last_name} ${student.first_name}` : '不明なユーザー'}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteConnection(conn.id)}
                                            className="text-xs text-red-500 hover:text-red-700 self-end sm:self-center font-bold px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            disabled={isSubmitting}
                                        >
                                            解除
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
