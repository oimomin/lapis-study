"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Video } from "lucide-react";

// Types
type EventType = 'class' | 'meeting' | 'homework' | 'other';

interface ScheduleEvent {
    id: string;
    title: string;
    type: EventType;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    description?: string;
    location?: string;
    isOnline?: boolean;
}

// Mock Data
const MOCK_EVENTS: ScheduleEvent[] = [
    {
        id: "1",
        title: "中3 数学",
        type: "class",
        date: new Date().toISOString().split('T')[0], // Today
        startTime: "18:00",
        endTime: "19:30",
        location: "オンライン (Zoom)",
        isOnline: true,
    },
    {
        id: "2",
        title: "面談 (進路相談)",
        type: "meeting",
        date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // Day after tomorrow
        startTime: "20:00",
        endTime: "21:00",
        location: "オンライン",
        isOnline: true,
    }
];

export default function MonthlySchedule() {
    const [currentDate, setCurrentDate] = useState(new Date());

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
        return MOCK_EVENTS.filter(e => e.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    const getEventStyle = (type: EventType) => {
        switch (type) {
            case 'class': return 'bg-lapis-100 text-lapis-800 border-lapis-200 dark:bg-lapis-900/40 dark:text-lapis-300 dark:border-lapis-800';
            case 'meeting': return 'bg-accent-100 text-accent-800 border-accent-200 dark:bg-accent-900/40 dark:text-accent-300 dark:border-accent-800';
            case 'homework': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800';
            default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        }
    };

    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

    return (
        <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm backdrop-blur-xl overflow-hidden flex flex-col h-full min-h-[500px]">
            {/* Header */}
            <div className="p-3 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 flex-shrink-0">
                    <CalendarIcon className="w-5 h-5 text-lapis-600 dark:text-lapis-400" />
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        月間スケジュール
                    </h2>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-2 flex-1 md:flex-none">
                    <button
                        onClick={jumpToToday}
                        className="px-2 sm:px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                        今日
                    </button>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full md:w-auto justify-between flex-shrink-0">
                        <button
                            onClick={prevMonth}
                            className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-300 flex-shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-1 sm:px-3 py-1 text-sm sm:text-base font-bold min-w-[90px] sm:min-w-[120px] text-center text-gray-700 dark:text-gray-300 truncate whitespace-nowrap">
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
                                                className={`px-0.5 sm:px-1.5 py-0.5 sm:py-1 rounded-sm sm:rounded-md border text-[8px] sm:text-[10px] md:text-xs text-left cursor-pointer hover:shadow-md transition-shadow truncate ${getEventStyle(event.type)}`}
                                                title={`${event.title} (${event.startTime}-${event.endTime})`}
                                            >
                                                <span className="hidden sm:inline-block font-bold opacity-80 mr-0.5">{event.startTime}</span>
                                                <span className="hidden sm:inline-block">{event.title}</span>
                                                <span className="sm:hidden">{event.title.substring(0, 3)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
