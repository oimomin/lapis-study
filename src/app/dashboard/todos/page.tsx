"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle2, Circle, Clock, Filter, AlertCircle, BookOpen, CheckSquare, ChevronLeft } from "lucide-react";

type EventType = 'homework' | 'todo' | 'payment';

interface TodoEvent {
    id: string;
    title: string;
    type: EventType;
    date: string;
    start_time?: string | null;
    end_time?: string | null;
    description?: string | null;
    student_id?: string | null;
    parent_id?: string | null;
    created_by?: string;
    is_completed?: boolean;
    student?: { first_name: string; last_name: string; } | null;
    subject?: string | null;
}

export default function TodosPage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string>('student');
    const [todos, setTodos] = useState<TodoEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Admin filtering
    const [students, setStudents] = useState<{ id: string, name: string }[]>([]);
    const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>("all");

    // Check auth and role
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
                    if (profile.role === 'admin') {
                        const { data } = await supabase.from('users').select('id, first_name, last_name').eq('role', 'student');
                        if (data) setStudents(data.map(d => ({ id: d.id, name: `${d.last_name || ''} ${d.first_name || ''}` })));
                    } else if (profile.role === 'parent') {
                        const { data } = await supabase.from('family_connections')
                            .select('student:student_id(id, first_name, last_name)')
                            .eq('parent_id', user.id);
                        if (data) setStudents(data.map((d: any) => ({ id: d.student.id, name: `${d.student.last_name || ''} ${d.student.first_name || ''}` })));
                    }
                }
            }
            fetchTodos();
        };
        fetchAuthAndData();
    }, [supabase]);

    const fetchTodos = async () => {
        setIsLoading(true);
        try {
            // Build query
            let query = supabase
                .from('events')
                .select('*, student:student_id(first_name, last_name)')
                .in('type', ['todo', 'homework', 'payment']); // 'payment' added for parents

            // Client-side hard enforcement: students only see events assigned to them
            if (role === 'student' && user?.id) {
                query = query.eq('student_id', user.id);
            }

            // Extra filtering
            if (role === 'admin') {
                // Admins see everything, but if student selected, filter.
                // Admin's own todos are where created_by === admin.id AND student_id === null AND parent_id === null
            } else if (role === 'parent' && user?.id) {
                // Parents should only see records where they are the parent OR it's assigned to their connected students
                const connectedStudentIds = students.map(s => s.id);
                if (connectedStudentIds.length > 0) {
                    query = query.or(`parent_id.eq.${user.id},student_id.in.(${connectedStudentIds.join(',')})`);
                } else {
                    query = query.eq('parent_id', user.id);
                }
            } else if (role === 'student') {
                // Exclude parents' todos/payments from showing up for students
                query = query.is('parent_id', null).neq('type', 'payment');
            }

            const { data, error } = await query
                .order('is_completed', { ascending: true }) // Not completed first
                .order('date', { ascending: true })
                .order('start_time', { ascending: true });

            if (!error && data) {
                setTodos(data as TodoEvent[]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleComplete = async (id: string, currentStatus: boolean) => {
        // Optimistic UI update
        const updatedTodos = todos.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t);
        // Resort so completed ones fall to the bottom visually
        setTodos([...updatedTodos].sort((a, b) => {
            if (a.is_completed === b.is_completed) {
                return a.date.localeCompare(b.date);
            }
            return a.is_completed ? 1 : -1;
        }));

        const { error } = await supabase
            .from('events')
            .update({ is_completed: !currentStatus })
            .eq('id', id);

        if (error) {
            alert("更新に失敗しました: " + error.message);
            fetchTodos(); // Revert on failure
        }
    };

    // Filter logic
    const filteredTodos = selectedStudentFilter === 'all'
        ? (role === 'admin' ? todos : todos) // all includes admin's own
        : todos.filter(t => t.student_id === selectedStudentFilter);

    const isOverdue = (dateStr: string, isCompleted: boolean) => {
        if (isCompleted) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(dateStr);
        return targetDate < today;
    };

    const isToday = (dateStr: string) => {
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 flex items-center gap-3">
                    <CheckSquare className="w-8 h-8 text-lapis-600" />
                    やることリスト
                </h1>

                {/* Student Filter (Admin & Parent Only) */}
                {(role === 'admin' || role === 'parent') && students.length > 0 && (
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none"
                            value={selectedStudentFilter}
                            onChange={(e) => setSelectedStudentFilter(e.target.value)}
                        >
                            <option value="all">すべての生徒</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lapis-600"></div>
                </div>
            ) : filteredTodos.length === 0 ? (
                <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center backdrop-blur-xl">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">やること・宿題はありません！</h3>
                    <p className="text-sm text-gray-500 mt-2">よく頑張りました✨</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTodos.map(todo => {
                        const overdue = isOverdue(todo.date, !!todo.is_completed);
                        const today = isToday(todo.date);

                        return (
                            <div key={todo.id} className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all group">
                                {/* Native mobile horizontal swipe using CSS scroll snap */}
                                <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar w-full">

                                    {/* Main Card Content */}
                                    <div className="snap-start min-w-full flex-shrink-0 flex items-stretch p-0">

                                        {/* Status Toggle Button Area */}
                                        <button
                                            onClick={() => toggleComplete(todo.id, !!todo.is_completed)}
                                            className="px-4 py-5 sm:px-6 flex items-start justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors shrink-0"
                                        >
                                            {todo.is_completed ? (
                                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center animate-in zoom-in">
                                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-lapis-400 dark:group-hover:border-lapis-500 transition-colors" />
                                            )}
                                        </button>

                                        {/* Todo Details */}
                                        <div className={`flex-1 py-5 pr-5 ${todo.is_completed ? 'opacity-50' : ''}`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                <h3 className={`font-bold text-lg leading-tight ${todo.is_completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                                    {todo.title}
                                                </h3>

                                                <div className="flex items-center gap-2 flex-wrap shrink-0">
                                                    {(role === 'admin' || role === 'parent') && todo.student && (
                                                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md font-bold">
                                                            {role === 'parent' ? todo.student.first_name : `${todo.student.last_name} ${todo.student.first_name}`}
                                                        </span>
                                                    )}

                                                    {todo.type === 'homework' && (
                                                        <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded-md font-bold flex items-center gap-1">
                                                            <BookOpen className="w-3 h-3" /> 宿題 {todo.subject ? `(${todo.subject})` : ''}
                                                        </span>
                                                    )}
                                                    {todo.type === 'payment' && (
                                                        <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded-md font-bold flex items-center gap-1">
                                                            振込
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm mt-3">
                                                <div className={`flex items-center gap-1.5 font-bold ${overdue ? 'text-red-500' : today ? 'text-lapis-600 dark:text-lapis-400' : 'text-gray-500'}`}>
                                                    {overdue ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                    <span>{todo.date} 期限</span>
                                                </div>
                                            </div>

                                            {todo.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                                    {todo.description}
                                                </p>
                                            )}

                                            {/* Student Homework Action */}
                                            {role === 'student' && todo.type === 'homework' && !todo.is_completed && (
                                                <div className="mt-4 flex justify-end">
                                                    <a
                                                        href={`/dashboard/homework/${todo.id}/submit`}
                                                        className="px-4 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 rounded-xl shadow-sm transition-colors flex items-center gap-2"
                                                    >
                                                        <BookOpen className="w-4 h-4" />
                                                        宿題を提出する
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Mobile Swipe Hint Indicator */}
                                        {!todo.is_completed && (
                                            <div className="sm:hidden w-8 text-gray-300 dark:text-gray-700 flex flex-col justify-center items-center shadow-[-10px_0_10px_rgba(0,0,0,0.02)] border-l border-gray-50 dark:border-gray-800 shrink-0">
                                                <ChevronLeft className="w-4 h-4 -mb-2" />
                                                <ChevronLeft className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Swipe Action Area (Revealed on Swipe) */}
                                    {!todo.is_completed && (
                                        <div className="snap-center sm:hidden min-w-[100px] flex-shrink-0 flex">
                                            <button
                                                onClick={() => toggleComplete(todo.id, !!todo.is_completed)}
                                                className="w-full h-full bg-green-500 flex flex-col items-center justify-center text-white p-4 active:bg-green-600 transition-colors"
                                            >
                                                <CheckCircle2 className="w-6 h-6 mb-1" />
                                                <span className="text-xs font-bold">完了する</span>
                                            </button>
                                        </div>
                                    )}

                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
