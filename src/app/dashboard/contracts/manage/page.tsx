"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { FileSignature, Search, ShieldCheck, CheckCircle2, XCircle, Activity, ChevronDown, CalendarPlus, X, Calendar as CalendarIcon, Clock, Plus } from "lucide-react";

export default function AdminContractsPage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [contracts, setContracts] = useState<any[]>([]);
    const [parents, setParents] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusUpdateMessage, setStatusUpdateMessage] = useState<string | null>(null);

    // Bulk Schedule Modal State
    const [isBulkScheduleModalOpen, setIsBulkScheduleModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<any>(null);
    const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
    const [bulkScheduleForm, setBulkScheduleForm] = useState({
        title: '',
        dayOfWeek: '1', // 0: Sun, 1: Mon, ...
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
    });

    // Filtering & Sorting State
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Verify admin role
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.role !== 'admin') {
                throw new Error("管理者権限が必要です。");
            }
            setUser(user);

            // Fetch Contracts
            const { data: contractsData, error: contractsError } = await supabase
                .from('contracts')
                .select('*')
                .order('created_at', { ascending: false });

            if (contractsError) throw contractsError;
            setContracts(contractsData || []);

            // Optimization: Fetch only parents and students involved in these contracts
            if (contractsData && contractsData.length > 0) {
                const parentIds = [...new Set(contractsData.map(c => c.parent_id))];
                const studentIds = [...new Set(contractsData.map(c => c.student_id))];

                const [parentsRes, studentsRes] = await Promise.all([
                    supabase.from('users').select('id, last_name, first_name, email').in('id', parentIds),
                    supabase.from('users').select('id, last_name, first_name, grade_level').in('id', studentIds)
                ]);

                if (parentsRes.data) setParents(parentsRes.data);
                if (studentsRes.data) setStudents(studentsRes.data);
            }

        } catch (err: any) {
            console.error("契約情報の取得に失敗しました:", err);
            setError(err.message || "データの取得に失敗しました。");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [supabase]);

    const handleStatusChange = async (contractId: string, newStatus: string) => {
        if (!window.confirm("ステータスを変更してもよろしいですか？")) return;

        setError(null);
        setStatusUpdateMessage(null);

        // Optimistic UI Update
        const previousContracts = [...contracts];
        setContracts(contracts.map(c => c.id === contractId ? { ...c, status: newStatus } : c));

        try {
            const { error } = await supabase
                .from('contracts')
                .update({ status: newStatus })
                .eq('id', contractId);

            if (error) throw error;
            setStatusUpdateMessage("ステータスを更新しました。");

            // Clear message after 3 seconds
            setTimeout(() => setStatusUpdateMessage(null), 3000);

        } catch (err: any) {
            console.error(err);
            setError("ステータスの更新に失敗しました。");
            // Revert on error
            setContracts(previousContracts);
        }
    };

    const handleOpenBulkSchedule = (contract: any) => {
        setSelectedContract(contract);
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        setBulkScheduleForm({
            title: '授業',
            dayOfWeek: '1',
            startDate: today.toISOString().split('T')[0],
            endDate: nextMonth.toISOString().split('T')[0],
            startTime: '17:00',
            endTime: '18:00',
        });
        setIsBulkScheduleModalOpen(true);
    };

    const handleSubmitBulkSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingSchedule(true);
        setError(null);
        setStatusUpdateMessage(null);

        try {
            const start = new Date(bulkScheduleForm.startDate);
            const end = new Date(bulkScheduleForm.endDate);
            const targetDay = parseInt(bulkScheduleForm.dayOfWeek);

            if (start > end) {
                throw new Error("開始日は終了日より前に設定してください。");
            }

            const eventsToInsert = [];
            const currentDate = new Date(start);

            // Iterate through every day from start to end
            while (currentDate <= end) {
                if (currentDate.getDay() === targetDay) {
                    const y = currentDate.getFullYear();
                    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
                    const d = String(currentDate.getDate()).padStart(2, '0');

                    eventsToInsert.push({
                        title: bulkScheduleForm.title,
                        type: 'class',
                        date: `${y}-${m}-${d}`,
                        start_time: bulkScheduleForm.startTime,
                        end_time: bulkScheduleForm.endTime,
                        student_id: selectedContract.student_id,
                        created_by: user.id
                    });
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }

            if (eventsToInsert.length === 0) {
                throw new Error("指定された期間内に該当する曜日がありません。");
            }

            const { error } = await supabase.from('events').insert(eventsToInsert);
            if (error) throw error;

            setStatusUpdateMessage(`${eventsToInsert.length}件の授業を一括登録しました。`);
            setIsBulkScheduleModalOpen(false);
            setTimeout(() => setStatusUpdateMessage(null), 4000);

        } catch (err: any) {
            console.error(err);
            alert(err.message || "スケジュールの一括登録に失敗しました。");
        } finally {
            setIsSubmittingSchedule(false);
        }
    };

    // Derived Data
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return '利用中 (Active)';
            case 'pending': return '手続き中 (Pending)';
            case 'completed': return '満了 (Completed)';
            case 'canceled': return '解約済 (Canceled)';
            case 'terminated': return '強制終了 (Terminated)';
            default: return status;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'active': return 'bg-success-100 text-success-800 border-success-200 dark:bg-success-900/30 dark:text-success-300 dark:border-success-800';
            case 'pending': return 'bg-accent-100 text-accent-800 border-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:border-accent-800';
            case 'canceled':
            case 'terminated': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
            default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        }
    };

    // Filtering Logic
    const filteredContracts = contracts.filter(contract => {
        // Status Filter
        if (statusFilter !== "all" && contract.status !== statusFilter) return false;

        // Search Query Filter
        if (searchQuery) {
            const parent = parents.find(p => p.id === contract.parent_id);
            const student = students.find(s => s.id === contract.student_id);
            const searchLower = searchQuery.toLowerCase();

            const parentName = parent ? `${parent.last_name} ${parent.first_name}`.toLowerCase() : "";
            const studentName = student ? `${student.last_name} ${student.first_name}`.toLowerCase() : "";

            if (!parentName.includes(searchLower) && !studentName.includes(searchLower)) {
                return false;
            }
        }

        return true;
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lapis-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-lapis-600" />
                    契約管理 (管理者)
                </h1>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="名前で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-lapis-500 outline-none text-sm w-full sm:w-64"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-lapis-500 outline-none text-sm"
                    >
                        <option value="all">すべてのステータス</option>
                        <option value="active">利用中</option>
                        <option value="pending">手続き中</option>
                    </select>

                    <Link
                        href="/dashboard/contracts/new"
                        className="flex items-center justify-center gap-2 bg-lapis-600 hover:bg-lapis-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" />
                        新規作成
                    </Link>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
                    {error}
                </div>
            )}

            {statusUpdateMessage && (
                <div className="p-4 bg-success-50 text-success-600 rounded-xl border border-success-200 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    {statusUpdateMessage}
                </div>
            )}

            <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm backdrop-blur-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800 text-sm font-bold text-gray-500 dark:text-gray-400">
                                <th className="p-4 whitespace-nowrap">契約日</th>
                                <th className="p-4 whitespace-nowrap">保護者名</th>
                                <th className="p-4 whitespace-nowrap">生徒名 (学年)</th>
                                <th className="p-4 whitespace-nowrap">契約プラン</th>
                                <th className="p-4 whitespace-nowrap text-right">月額(+システム料)</th>
                                <th className="p-4 whitespace-nowrap text-center">ステータス変更</th>
                                <th className="p-4 whitespace-nowrap text-center">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50 text-sm">
                            {filteredContracts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        該当する契約が見つかりません。
                                    </td>
                                </tr>
                            ) : (
                                filteredContracts.map(contract => {
                                    const parent = parents.find(p => p.id === contract.parent_id);
                                    const student = students.find(s => s.id === contract.student_id);

                                    return (
                                        <tr key={contract.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
                                            <td className="p-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {new Date(contract.created_at).toLocaleDateString('ja-JP')}
                                            </td>
                                            <td className="p-4 font-bold">
                                                {parent ? `${parent.last_name} ${parent.first_name}` : '不明'}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold">{student ? `${student.last_name} ${student.first_name}` : '不明'}</div>
                                                <div className="text-xs text-gray-500">{student?.grade_level || '-'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-semibold">{contract.contract_type === 'trial' ? 'お試し' : '年間'}</div>
                                                <div className="text-xs text-gray-500">{contract.subjects.length}科目 ({contract.subjects.join(', ')})</div>
                                            </td>
                                            <td className="p-4 text-right font-mono font-bold">
                                                <span className="text-gray-400 mr-2 text-xs">¥</span>
                                                {(contract.monthly_fee + contract.system_fee).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-center">
                                                <select
                                                    value={contract.status}
                                                    onChange={(e) => handleStatusChange(contract.id, e.target.value)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border outline-none cursor-pointer appearance-none text-center ${getStatusStyle(contract.status)}`}
                                                    style={{ backgroundImage: 'none' }} // Remove default down arrow for cleaner pill look
                                                >
                                                    <option value="active">利用中</option>
                                                    <option value="pending">手続き中</option>
                                                    <option value="completed">満了</option>
                                                    <option value="canceled">解約済</option>
                                                    <option value="terminated">強制終了</option>
                                                </select>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => handleOpenBulkSchedule(contract)}
                                                    className="px-3 py-1.5 flex items-center justify-center gap-1.5 mx-auto bg-lapis-50 hover:bg-lapis-100 text-lapis-700 dark:bg-lapis-900/30 dark:hover:bg-lapis-900/50 dark:text-lapis-300 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    <CalendarPlus className="w-4 h-4" /> 授業登録
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-sm text-gray-500 flex items-center justify-between px-4">
                <span>全 {filteredContracts.length} 件のレコード</span>
                <span>※ステータスのドロップダウンを変更すると即座にデータベースに保存されます</span>
            </div>

            {/* Bulk Schedule Modal */}
            {isBulkScheduleModalOpen && selectedContract && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setIsBulkScheduleModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-lapis-50 dark:bg-lapis-900/20">
                            <h3 className="font-bold text-lg text-lapis-900 dark:text-lapis-100 flex items-center gap-2">
                                <CalendarPlus className="w-5 h-5 text-lapis-600" />
                                毎週の授業を一括登録
                            </h3>
                            <button onClick={() => setIsBulkScheduleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitBulkSchedule} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">対象生徒</label>
                                <div className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-semibold">
                                    {(() => {
                                        const stu = students.find(s => s.id === selectedContract.student_id);
                                        return stu ? `${stu.last_name} ${stu.first_name}` : '不明';
                                    })()}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">タイトル <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black focus:ring-2 focus:ring-lapis-500 focus:outline-none"
                                    value={bulkScheduleForm.title}
                                    onChange={e => setBulkScheduleForm({ ...bulkScheduleForm, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">曜日 <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black focus:ring-2 focus:ring-lapis-500 focus:outline-none"
                                    value={bulkScheduleForm.dayOfWeek}
                                    onChange={e => setBulkScheduleForm({ ...bulkScheduleForm, dayOfWeek: e.target.value })}
                                >
                                    <option value="0">日曜日</option>
                                    <option value="1">月曜日</option>
                                    <option value="2">火曜日</option>
                                    <option value="3">水曜日</option>
                                    <option value="4">木曜日</option>
                                    <option value="5">金曜日</option>
                                    <option value="6">土曜日</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">対象期間 (開始)</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black focus:ring-2 focus:ring-lapis-500 focus:outline-none"
                                        value={bulkScheduleForm.startDate}
                                        onChange={e => setBulkScheduleForm({ ...bulkScheduleForm, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">対象期間 (終了)</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black focus:ring-2 focus:ring-lapis-500 focus:outline-none"
                                        value={bulkScheduleForm.endDate}
                                        onChange={e => setBulkScheduleForm({ ...bulkScheduleForm, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">開始時間</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black focus:ring-2 focus:ring-lapis-500 focus:outline-none"
                                        value={bulkScheduleForm.startTime}
                                        onChange={e => setBulkScheduleForm({ ...bulkScheduleForm, startTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">終了時間</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black focus:ring-2 focus:ring-lapis-500 focus:outline-none"
                                        value={bulkScheduleForm.endTime}
                                        onChange={e => setBulkScheduleForm({ ...bulkScheduleForm, endTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 font-bold transition-colors"
                                    onClick={() => setIsBulkScheduleModalOpen(false)}
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingSchedule}
                                    className={`flex-1 p-3 rounded-xl bg-lapis-600 hover:bg-lapis-700 text-white font-bold transition-all shadow-md shadow-lapis-500/20 ${isSubmittingSchedule ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                >
                                    {isSubmittingSchedule ? '登録中...' : '一括登録する'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
