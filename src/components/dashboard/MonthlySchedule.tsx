"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Video, X, Trash2 } from "lucide-react";

import { createClient } from "@/utils/supabase/client";

// Types
type EventType = 'class' | 'meeting' | 'homework' | 'todo' | 'payment';

interface ScheduleEvent {
    id: string;
    title: string;
    type: EventType;
    date: string; // YYYY-MM-DD
    start_time?: string; // HH:MM
    end_time?: string; // HH:MM
    description?: string;
    student?: { first_name: string; last_name: string; } | null;
    parent?: { first_name: string; last_name: string; } | null;
    subject?: string | null;
}

export default function MonthlySchedule() {
    const supabase = createClient();
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [role, setRole] = useState<string>('student');
    const [user, setUser] = useState<any>(null);

    // Modal state
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    useEffect(() => {
        const fetchAuthAndEvents = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            let currentRole = 'student';

            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile) {
                    currentRole = profile.role;
                    setRole(currentRole);
                }
                setUser(user);
            }

            let query = supabase
                .from('events')
                .select('*, student:student_id(first_name, last_name), parent:parent_id(first_name, last_name)');

            if (currentRole === 'student' && user?.id) {
                query = query.or(`and(student_id.eq.${user.id},parent_id.is.null),and(student_id.is.null,parent_id.is.null)`);
            } else if (currentRole === 'parent' && user?.id) {
                const { data: family } = await supabase.from('family_connections').select('student_id').eq('parent_id', user.id);
                if (family && family.length > 0) {
                    const studentIds = family.map(f => f.student_id);
                    query = query.or(`parent_id.eq.${user.id},student_id.in.(${studentIds.join(',')}),and(student_id.is.null,parent_id.is.null)`);
                } else {
                    query = query.or(`parent_id.eq.${user.id},and(student_id.is.null,parent_id.is.null)`);
                }
            }

            const { data, error } = await query.order('start_time', { ascending: true });

            if (!error && data) {
                setEvents(data);
            }
        };
        fetchAuthAndEvents();
    }, [supabase]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const jumpToToday = () => {
        setCurrentDate(new Date());
    };

    const isToday = (day: number, monthOffset: number) => {
        const today = new Date();
        const checkDate = new Date(year, month + monthOffset, day);
        return checkDate.getDate() === today.getDate() &&
            checkDate.getMonth() === today.getMonth() &&
            checkDate.getFullYear() === today.getFullYear();
    };

    // Generate array of days for the calendar grid
    const calendarDays = [];
    const prevMonthDays = getDaysInMonth(year, month - 1);

    // Previous month padding
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push({
            date: prevMonthDays - firstDay + i + 1,
            isCurrentMonth: false,
            monthOffset: -1
        });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({
            date: i,
            isCurrentMonth: true,
            monthOffset: 0
        });
    }

    // Next month padding to complete 6 weeks (42 cells)
    const remainingCells = 42 - calendarDays.length;
    for (let i = 1; i <= remainingCells; i++) {
        calendarDays.push({
            date: i,
            isCurrentMonth: false,
            monthOffset: 1
        });
    }

    // Helper functions
    const getEventsForDate = (day: number, monthOffset: number) => {
        const eventDate = new Date(year, month + monthOffset, day);
        const y = eventDate.getFullYear();
        const m = String(eventDate.getMonth() + 1).padStart(2, '0');
        const d = String(eventDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        return events.filter(e => e.date === dateStr).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    };

    const handleEventClick = (event: ScheduleEvent, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setIsViewModalOpen(true);
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

    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

    return (
        <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm backdrop-blur-xl overflow-hidden flex flex-col h-full min-h-[500px]">
            {/* Header */}
            <div className="p-3 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-lapis-600 dark:text-lapis-400" />
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                        月間スケジュール
                    </h2>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-1 sm:gap-2">
                    <button
                        onClick={jumpToToday}
                        className="px-2 sm:px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                        今日
                    </button>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full flex-1 md:w-auto justify-between items-center min-w-0">
                        <button
                            onClick={prevMonth}
                            className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-300 flex-shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-1 py-1 text-sm sm:text-base font-bold text-center text-gray-700 dark:text-gray-300 truncate whitespace-nowrap flex-1">
                            {year}年 {month + 1}月
                        </span>
                        <button
                            onClick={nextMonth}
                            className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-300 flex-shrink-0"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid Wrapper */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
                <div className="w-full flex flex-col h-full bg-gray-100 dark:bg-gray-800/50 gap-[1px]">
                    {/* Day Names */}
                    <div className="grid grid-cols-7 bg-white dark:bg-black/50">
                        {dayNames.map((day, i) => (
                            <div key={i} className={`py-2 text-center text-xs font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Cells */}
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr gap-[1px] bg-gray-100 dark:bg-gray-800/50">
                        {calendarDays.map((dayObj, i) => {
                            const isCurrentDay = dayObj.isCurrentMonth && isToday(dayObj.date, dayObj.monthOffset);
                            const events = getEventsForDate(dayObj.date, dayObj.monthOffset);
                            const isSunday = i % 7 === 0;
                            const isSaturday = i % 7 === 6;

                            return (
                                <div
                                    key={i}
                                    className={`
                                        min-h-[70px] sm:min-h-[90px] p-0.5 sm:p-2 bg-white dark:bg-gray-900/60 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80
                                        ${!dayObj.isCurrentMonth ? 'opacity-40' : ''}
                                        ${isCurrentDay ? 'bg-lapis-50/50 dark:bg-lapis-900/20' : ''}
                                        relative
                                    `}
                                >
                                    <div className="flex justify-center mb-0.5 sm:mb-1">
                                        <span className={`
                                            flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-bold
                                            ${isCurrentDay
                                                ? 'bg-lapis-600 text-white shadow-md shadow-lapis-500/20'
                                                : isSunday ? 'text-red-500'
                                                    : isSaturday ? 'text-blue-500'
                                                        : 'text-gray-700 dark:text-gray-300'
                                            }
                                        `}>
                                            {dayObj.date}
                                        </span>
                                    </div>

                                    <div className="space-y-0.5 sm:space-y-1">
                                        {events.map((event: ScheduleEvent) => (
                                            <div
                                                key={event.id}
                                                className={`px-0.5 sm:px-1.5 py-0.5 sm:py-1 rounded-sm sm:rounded-md border text-[8px] sm:text-[10px] md:text-xs text-left cursor-pointer hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between ${getEventStyle(event.type)}`}
                                                title={`${event.title} (${event.start_time || ''})`}
                                                onClick={(e) => handleEventClick(event, e)}
                                            >
                                                <div className="flex items-center gap-1 overflow-hidden truncate">
                                                    <span className="hidden sm:inline-block truncate">
                                                        {event.type === 'homework' && event.subject && `【${event.subject}】`}
                                                        {event.title}
                                                    </span>
                                                    <span className="sm:hidden truncate">
                                                        {event.type === 'homework' && event.subject && `【${event.subject.substring(0, 1)}】`}
                                                        {event.title.substring(0, 3)}
                                                    </span>

                                                    {role === 'admin' && (event.student?.last_name || event.parent?.last_name) && (
                                                        <span className="hidden sm:inline-block shrink-0 text-[8px] sm:text-[10px] bg-white/50 dark:bg-black/20 px-1 rounded-sm font-bold">
                                                            {event.parent ? `[保] ${event.parent.last_name}` : event.student?.last_name}
                                                        </span>
                                                    )}
                                                    {role === 'parent' && event.student?.first_name && !event.parent && (
                                                        <span className="hidden sm:inline-block shrink-0 text-[8px] sm:text-[10px] bg-white/50 dark:bg-black/20 px-1 rounded-sm font-bold">
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
                </div>
            </div>

            {/* Event View Modal */}
            {isViewModalOpen && selectedEvent && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
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

                        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                            <a
                                href={`/dashboard/schedule`}
                                className="px-4 py-2 text-sm font-bold text-lapis-700 bg-lapis-50 hover:bg-lapis-100 dark:bg-lapis-900/40 dark:text-lapis-300 dark:hover:bg-lapis-900/60 rounded-xl transition-colors block text-center"
                            >
                                詳細・編集はスケジュール画面へ
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
