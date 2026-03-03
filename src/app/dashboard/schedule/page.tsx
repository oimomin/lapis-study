"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Clock, Trash2, CheckSquare, Search, Filter } from "lucide-react";

// Local types since we haven't generated Supabase types yet
type EventType = 'class' | 'meeting' | 'homework' | 'todo' | 'payment';

interface AppEvent {
    id: string;
    title: string;
    type: EventType;
    date: string; // YYYY-MM-DD
    start_time?: string | null;
    end_time?: string | null;
    description?: string | null;
    student_id?: string | null;
    parent_id?: string | null;
    created_by: string;
    created_at: string;
    is_completed?: boolean;
    student?: { first_name: string; last_name: string; } | null;
    parent?: { first_name: string; last_name: string; } | null;
    subject?: string | null;
}

export default function SchedulePage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string>('student');
    const [events, setEvents] = useState<AppEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filtering state
    const [assignableUsers, setAssignableUsers] = useState<{ id: string, name: string, userType: 'student' | 'parent' }[]>([]);
    const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");

    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date());

    // Modal state
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedDateStr, setSelectedDateStr] = useState<string>("");
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

    // Drag and Drop State
    const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<{
        title: string;
        type: EventType;
        start_time: string;
        end_time: string;
        description: string;
        assigned_user?: string;
        subject?: string;
    }>({
        title: "",
        type: "todo",
        start_time: "",
        end_time: "",
        description: "",
        assigned_user: "all",
        subject: ""
    });

    // Track if we are editing an existing event
    const [isEditing, setIsEditing] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

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

                    // Fetch users for filter/assign
                    if (profile.role === 'admin') {
                        const { data } = await supabase.from('users').select('id, first_name, last_name, role').in('role', ['student', 'parent']);
                        if (data) {
                            setAssignableUsers(data.map(d => ({
                                id: d.id,
                                name: `[${d.role === 'student' ? '生徒' : '保護者'}] ${d.last_name || ''} ${d.first_name || ''}`,
                                userType: d.role as 'student' | 'parent'
                            })));
                        }
                    } else if (profile.role === 'parent') {
                        const { data } = await supabase.from('family_connections')
                            .select('student:student_id(id, first_name, last_name)')
                            .eq('parent_id', user.id);
                        if (data) {
                            setAssignableUsers(data.map((d: any) => ({
                                id: d.student.id,
                                name: `[生徒] ${d.student.last_name || ''} ${d.student.first_name || ''}`,
                                userType: 'student'
                            })));
                        }
                    }
                }
            }
            fetchEvents();
        };
        fetchAuthAndData();
    }, [supabase]);

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            // Build query
            let query = supabase
                .from('events')
                .select('*, student:student_id(first_name, last_name), parent:parent_id(first_name, last_name)');

            // Role-based filtering
            if (role === 'student' && user?.id) {
                // Students only see their own OR global events
                query = query.or(`and(student_id.eq.${user.id},parent_id.is.null),and(student_id.is.null,parent_id.is.null)`);
            } else if (role === 'parent' && user?.id) {
                // Parents see their own, their connected students, OR global events
                const connectedStudentIds = assignableUsers.map(u => u.id);
                if (connectedStudentIds.length > 0) {
                    query = query.or(`parent_id.eq.${user.id},student_id.in.(${connectedStudentIds.join(',')}),and(student_id.is.null,parent_id.is.null)`);
                } else {
                    query = query.or(`parent_id.eq.${user.id},and(student_id.is.null,parent_id.is.null)`);
                }
            }

            const { data, error } = await query.order('start_time', { ascending: true });

            if (!error && data) {
                setEvents(data as AppEvent[]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calendar logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const prevMonthDays = new Date(year, month, 0).getDate();

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push({ date: prevMonthDays - firstDay + i + 1, isCurrent: false, offset: -1 });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({ date: i, isCurrent: true, offset: 0 });
    }
    const rem = 42 - calendarDays.length;
    for (let i = 1; i <= rem; i++) {
        calendarDays.push({ date: i, isCurrent: false, offset: 1 });
    }

    const handleDateClick = (dayStr: string) => {
        // Can only add events if Role allows
        setSelectedDateStr(dayStr);
        setFormData({
            title: '', type: role === 'admin' ? 'class' : 'todo', start_time: '', end_time: '', description: '',
            assigned_user: selectedUserFilter !== 'all' ? selectedUserFilter : 'all',
            subject: ''
        });
        setIsEditing(false);
        setEditingEventId(null);
        setIsEventModalOpen(true);
    };

    const handleEventClick = (event: AppEvent, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setIsViewModalOpen(true);
    };

    const handleEditClick = () => {
        if (!selectedEvent) return;
        setIsViewModalOpen(false);
        setSelectedDateStr(selectedEvent.date);

        let assignedVal = 'all';
        if (role === 'admin' && selectedEvent.student_id === user?.id) {
            assignedVal = 'self_admin';
        } else if (selectedEvent.parent_id) {
            assignedVal = `parent_${selectedEvent.parent_id}`;
        } else if (selectedEvent.student_id) {
            assignedVal = `student_${selectedEvent.student_id}`;
        }

        setFormData({
            title: selectedEvent.title,
            type: selectedEvent.type,
            start_time: selectedEvent.start_time || '',
            end_time: selectedEvent.end_time || '',
            description: selectedEvent.description || '',
            assigned_user: assignedVal,
            subject: selectedEvent.subject || ''
        });
        setIsEditing(true);
        setEditingEventId(selectedEvent.id);
        setIsEventModalOpen(true);
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prepare base payload
        const payload: any = {
            title: formData.title,
            type: formData.type,
            date: selectedDateStr,
            start_time: formData.start_time || null,
            end_time: formData.end_time || null,
            description: formData.description || null,
            subject: formData.type === 'homework' ? (formData.subject || null) : null
        };

        const assignedUserStr = formData.assigned_user || 'all';

        if (role === 'student' && (formData.type === 'homework' || formData.type === 'todo')) {
            payload.student_id = user?.id; // Assign to self
        } else if (role === 'parent' && formData.type === 'todo') {
            payload.parent_id = user?.id; // Assign to self
            if (assignedUserStr !== 'all' && assignedUserStr.startsWith('student_')) {
                payload.student_id = assignedUserStr.replace('student_', '');
            }
        } else if (role === 'admin') {
            if (assignedUserStr === 'self_admin') {
                payload.student_id = user?.id; // Bind to admin's own ID
                payload.parent_id = null;
            } else if (assignedUserStr === 'all') {
                payload.student_id = null;
                payload.parent_id = null;
            } else if (assignedUserStr.startsWith('parent_')) {
                payload.parent_id = assignedUserStr.replace('parent_', '');
                payload.student_id = null; // Ensuring no overlap
            } else if (assignedUserStr.startsWith('student_')) {
                payload.student_id = assignedUserStr.replace('student_', '');
                payload.parent_id = null;
            }
        }

        if (role === 'admin') {
            const actionText = isEditing ? '変更' : '登録';
            if (!window.confirm(`この予定を${actionText}してよろしいですか？`)) {
                return;
            }
        }

        let error;

        if (isEditing && editingEventId) {
            const { error: updateError } = await supabase.from('events').update(payload).eq('id', editingEventId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from('events').insert([payload]);
            error = insertError;
        }

        if (!error) {
            setIsEventModalOpen(false);
            fetchEvents();
        } else {
            alert("エラーが発生しました: " + error.message);
        }
    };

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm("この予定を削除しますか？")) return;
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (!error) {
            setEvents(events.filter(ev => ev.id !== id));
            setIsViewModalOpen(false);
        } else {
            alert("削除に失敗しました: " + error.message);
        }
    };

    // --- Drag and Drop Logic ---
    const handleDragStart = (e: React.DragEvent, eventId: string) => {
        e.dataTransfer.setData("eventId", eventId);
        setDraggedEventId(eventId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // allow drop
    };

    const handleDrop = async (e: React.DragEvent, targetDateStr: string) => {
        e.preventDefault();
        const eventId = e.dataTransfer.getData("eventId");
        setDraggedEventId(null);

        if (!eventId) return;

        if (role === 'admin') {
            if (!window.confirm("この予定の日程を変更してよろしいですか？")) {
                return;
            }
        }

        // Optimistically update UI
        const updatedEvents = events.map(ev =>
            ev.id === eventId ? { ...ev, date: targetDateStr } : ev
        );
        setEvents(updatedEvents);

        // Update DB
        const { error } = await supabase.from('events').update({ date: targetDateStr }).eq('id', eventId);
        if (error) {
            alert("予定の移動に失敗しました: " + error.message);
            fetchEvents(); // Revert
        }
    };

    // Styling logic
    const getTypeLabel = (type: EventType) => {
        switch (type) {
            case 'class': return '授業';
            case 'meeting': return '面談';
            case 'homework': return '宿題';
            case 'todo': return 'やること';
            case 'payment': return '振込期限';
            default: return '予定';
        }
    };

    const getEventStyle = (type: EventType) => {
        switch (type) {
            case 'class': return 'bg-lapis-100 text-lapis-800 border-lapis-300 dark:bg-lapis-900/40 dark:text-lapis-300 dark:border-lapis-800';
            case 'meeting': return 'bg-accent-100 text-accent-800 border-accent-300 dark:bg-accent-900/40 dark:text-accent-300 dark:border-accent-800';
            case 'homework': return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800';
            case 'todo': return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
            case 'payment': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800';
            default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        }
    };

    // Form permissions based on role
    const allowedTypes = role === 'admin'
        ? ['class', 'meeting', 'homework', 'todo', 'payment']
        : role === 'student'
            ? ['homework', 'todo']
            : ['todo']; // Parent

    const canEditEvent = (event: AppEvent) => {
        if (role === 'admin') return true;
        if (role === 'student' && event.student_id === user?.id && ['homework', 'todo'].includes(event.type)) return true;
        if (role === 'parent' && event.type === 'todo') return true;
        return false;
    };

    // Filtering logic
    const filteredEvents = selectedUserFilter === 'all'
        ? events
        : events.filter(e => {
            if (selectedUserFilter.startsWith('student_')) {
                return e.student_id === selectedUserFilter.replace('student_', '') || (!e.student_id && !e.parent_id);
            } else if (selectedUserFilter.startsWith('parent_')) {
                return e.parent_id === selectedUserFilter.replace('parent_', '') || (!e.student_id && !e.parent_id);
            }
            return true;
        });

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 flex items-center gap-3">
                    <CalendarIcon className="w-8 h-8 text-lapis-600" />
                    スケジュール管理
                </h1>

                {/* Student Filter (Admin & Parent Only) */}
                {(role === 'admin' || role === 'parent') && assignableUsers.length > 0 && (
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none max-w-[200px]"
                            value={selectedUserFilter}
                            onChange={(e) => setSelectedUserFilter(e.target.value)}
                        >
                            <option value="all">指定しない（全体）</option>
                            {assignableUsers.map(u => (
                                <option key={u.id} value={`${u.userType}_${u.id}`}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm backdrop-blur-xl overflow-hidden flex flex-col min-h-[600px]">

                {/* Header Navbar */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="px-4 py-1.5 text-lg font-bold min-w-[140px] text-center text-gray-800 dark:text-gray-200">
                            {year}年 {month + 1}月
                        </span>
                        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-4 py-2 font-bold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 rounded-xl transition-all"
                        >
                            今日
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                {isLoading ? (
                    <div className="flex-1 flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lapis-600"></div>
                    </div>
                ) : (
                    <div className="flex-1 grid grid-cols-7 bg-gray-200 dark:bg-gray-800 gap-[1px]">
                        {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
                            <div key={i} className={`py-3 text-center text-sm font-bold bg-white dark:bg-gray-900 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'}`}>{d}</div>
                        ))}

                        {calendarDays.map((d, i) => {
                            const dateObj = new Date(year, month + d.offset, d.date);
                            const yStr = dateObj.getFullYear();
                            const mStr = String(dateObj.getMonth() + 1).padStart(2, '0');
                            const dStr = String(dateObj.getDate()).padStart(2, '0');
                            const targetDateStr = `${yStr}-${mStr}-${dStr}`;

                            const dayEvents = filteredEvents.filter(e => e.date === targetDateStr);

                            return (
                                <div
                                    key={i}
                                    onClick={() => handleDateClick(targetDateStr)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, targetDateStr)}
                                    className={`
                                        min-h-[120px] p-2 bg-white dark:bg-gray-900/80 cursor-pointer hover:bg-lapis-50 dark:hover:bg-gray-800 transition-colors relative group
                                        ${!d.isCurrent ? 'opacity-50' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                                            ${dateObj.toDateString() === new Date().toDateString() ? 'bg-lapis-600 text-white shadow-md' : 'text-gray-700 dark:text-gray-300'}
                                        `}>
                                            {d.date}
                                        </span>
                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                    </div>

                                    <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                        {dayEvents.map(event => (
                                            <div
                                                key={event.id}
                                                draggable={canEditEvent(event)}
                                                onDragStart={(e) => handleDragStart(e, event.id)}
                                                className={`text-[10px] md:text-xs p-1 sm:p-1.5 rounded-md border text-left group/event flex flex-col sm:flex-row sm:items-center justify-between ${getEventStyle(event.type)} ${draggedEventId === event.id ? 'opacity-50' : ''} ${canEditEvent(event) ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                                                onClick={(e) => handleEventClick(event, e)}
                                                title={`${event.title} (${event.start_time || ''})`}
                                            >
                                                <div className="flex items-center gap-1 overflow-hidden truncate">
                                                    {event.is_completed && (
                                                        <CheckSquare className="w-3 h-3 text-green-600 shrink-0" />
                                                    )}
                                                    <span className={`truncate ${event.is_completed ? 'line-through opacity-70' : ''}`}>
                                                        {event.type === 'homework' && event.subject && `【${event.subject}】`}
                                                        {event.title}
                                                    </span>

                                                    {role === 'admin' && (event.student?.last_name || event.parent?.last_name) && (
                                                        <span className="shrink-0 text-[8px] sm:text-[10px] bg-white/50 dark:bg-black/20 px-1 rounded-sm">
                                                            {event.parent ? `[保] ${event.parent.last_name}` : event.student?.last_name}
                                                        </span>
                                                    )}
                                                    {role === 'parent' && event.student?.first_name && !event.parent && (
                                                        <span className="shrink-0 text-[8px] sm:text-[10px] bg-white/50 dark:bg-black/20 px-1 rounded-sm">
                                                            {event.student.first_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Event View Modal */}
            {isViewModalOpen && selectedEvent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setIsViewModalOpen(false)} // Background click to close
                >
                    <div
                        className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform scale-100 transition-transform"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                    >
                        <div className={`p-5 flex justify-between items-start ${getEventStyle(selectedEvent.type)} border-b-0`}>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider mb-1 block opacity-70">
                                    {getTypeLabel(selectedEvent.type)}
                                </span>
                                <h3 className="font-extrabold text-xl leading-tight text-inherit">
                                    {selectedEvent.title}
                                </h3>
                            </div>
                            <button onClick={() => setIsViewModalOpen(false)} className="opacity-50 hover:opacity-100 transition-opacity p-1 bg-white/20 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <CalendarIcon className="w-5 h-5 text-gray-400" />
                                <span className="font-medium">{selectedEvent.date}</span>
                            </div>

                            {(selectedEvent.start_time || selectedEvent.end_time) && (
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <Clock className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium">
                                        {selectedEvent.start_time?.substring(0, 5) || ''}
                                        {selectedEvent.end_time ? ` ～ ${selectedEvent.end_time.substring(0, 5)}` : ''}
                                    </span>
                                </div>
                            )}

                            {selectedEvent.student && (selectedEvent.student.last_name || selectedEvent.student.first_name) && (
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                        <span className="text-[10px] font-bold text-gray-500">{selectedEvent.student.last_name?.charAt(0) || 'U'}</span>
                                    </div>
                                    <span className="font-medium">対象生徒: {selectedEvent.student.last_name} {selectedEvent.student.first_name}</span>
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-gray-100 dark:border-gray-800">
                                    {selectedEvent.description}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
                            {role === 'student' && selectedEvent.type === 'homework' && !selectedEvent.is_completed && (
                                <a
                                    href={`/dashboard/homework/${selectedEvent.id}/submit`}
                                    className="px-6 py-2 text-sm font-bold text-white bg-lapis-600 hover:bg-lapis-700 rounded-xl shadow-md transition-colors"
                                >
                                    宿題を提出する！
                                </a>
                            )}
                            {canEditEvent(selectedEvent) && (
                                <>
                                    <button
                                        onClick={() => handleDelete(selectedEvent.id)}
                                        className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> 削除
                                    </button>
                                    <button
                                        onClick={handleEditClick}
                                        className="px-4 py-2 text-sm font-bold text-lapis-700 bg-lapis-50 hover:bg-lapis-100 dark:bg-lapis-900/40 dark:text-lapis-300 dark:hover:bg-lapis-900/60 rounded-xl transition-colors"
                                    >
                                        編集する
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Event Form Modal */}
            {isEventModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={() => setIsEventModalOpen(false)} // Background click to close
                >
                    <div
                        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h3 className="font-bold text-lg">{selectedDateStr} の予定を{isEditing ? '編集' : '追加'}</h3>
                            <button onClick={() => setIsEventModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddEvent} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">予定の種類</label>
                                <select
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as EventType })}
                                >
                                    {allowedTypes.map(t => (
                                        <option key={t} value={t}>{getTypeLabel(t as EventType)}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">タイトル <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="例: 中3 数学"
                                />
                            </div>

                            {(role === 'admin' || role === 'parent') && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">対象者</label>
                                    <select
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black"
                                        value={formData.assigned_user}
                                        onChange={e => setFormData({ ...formData, assigned_user: e.target.value })}
                                    >
                                        <option value="all">指定しない（全体）</option>
                                        {role === 'admin' && <option value="self_admin">自分のみ（管理者用）</option>}
                                        {assignableUsers.map(u => (
                                            <option key={u.id} value={`${u.userType}_${u.id}`}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {formData.type === 'homework' && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">教科</label>
                                    <select
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black"
                                        value={formData.subject || ''}
                                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    >
                                        <option value="">指定しない</option>
                                        <option value="国語">国語</option>
                                        <option value="数学">数学</option>
                                        <option value="英語">英語</option>
                                        <option value="理科">理科</option>
                                        <option value="社会">社会</option>
                                        <option value="プログラミング">プログラミング</option>
                                        <option value="その他">その他</option>
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">開始時間</label>
                                    <input
                                        type="time"
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black"
                                        value={formData.start_time}
                                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">終了時間</label>
                                    <input
                                        type="time"
                                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black"
                                        value={formData.end_time}
                                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">メモ (任意)</label>
                                <textarea
                                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black"
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="pt-4">
                                <button type="submit" className="w-full p-3 rounded-xl bg-lapis-600 hover:bg-lapis-700 text-white font-bold transition-all shadow-md shadow-lapis-500/20 active:scale-95">
                                    保存する
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
