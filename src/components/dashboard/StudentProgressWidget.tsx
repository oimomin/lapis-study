"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2, TrendingUp, CheckCircle2 } from "lucide-react";

type StudentProgressWidgetProps = {
    studentId: string;
};

export default function StudentProgressWidget({ studentId }: StudentProgressWidgetProps) {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalAssigned: 0,
        completed: 0,
        evaluations: {
            great: 0, // ✨
            good: 0,  // 👍
            okay: 0,  // 🔥
            none: 0,
        }
    });

    useEffect(() => {
        if (studentId) {
            fetchProgressData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    const fetchProgressData = async () => {
        setIsLoading(true);
        try {
            // 1. Calculate past 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

            // 2. Fetch total homework assigned in the last 30 days
            const { count: totalAssignedCount } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('type', 'homework')
                .eq('student_id', studentId)
                .gte('date', thirtyDaysAgoStr);

            // 3. Fetch submissions from the last 30 days
            const { data: submissions } = await supabase
                .from('homework_submissions')
                .select('status, feedback_evaluation')
                .eq('student_id', studentId)
                .gte('created_at', thirtyDaysAgoStr); // Using created_at for simplicity

            let completed = 0;
            let great = 0;
            let good = 0;
            let okay = 0;
            let none = 0;

            if (submissions) {
                submissions.forEach(sub => {
                    // Count anything submitted or graded as "completed" towards the progress bar
                    completed++;

                    // Count the self-evaluations for the pie chart
                    if (sub.status === 'graded') {
                        switch (sub.feedback_evaluation) {
                            case '✨':
                                great++;
                                break;
                            case '👍':
                                good++;
                                break;
                            case '🔥':
                                okay++;
                                break;
                            default:
                                none++;
                                break;
                        }
                    } else {
                        none++;
                    }
                });
            }

            setStats({
                // Ensure total assigned is at least as much as completed to avoid >100% bug if events were deleted
                totalAssigned: Math.max(totalAssignedCount || 0, completed),
                completed,
                evaluations: { great, good, okay, none }
            });

        } catch (error) {
            console.error("Error fetching progress data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const completionRate = stats.totalAssigned > 0
        ? Math.round((stats.completed / stats.totalAssigned) * 100)
        : 0;

    const pieData = [
        { name: "完璧！✨", value: stats.evaluations.great, color: "#10B981" }, // Emerald 500
        { name: "できた👍", value: stats.evaluations.good, color: "#3B82F6" },  // Blue 500
        { name: "がんばった🔥", value: stats.evaluations.okay, color: "#F59E0B" }, // Amber 500
        { name: "評価待ち等", value: stats.evaluations.none, color: "#E5E7EB" }, // Gray 200
    ].filter(d => d.value > 0); // Only show segments with values

    if (isLoading) {
        return (
            <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 h-full min-h-[300px] flex items-center justify-center backdrop-blur-xl">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    // Default empty state UI if absolutely no data in last 30 days
    if (stats.totalAssigned === 0 && stats.completed === 0) {
        return (
            <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 h-full min-h-[300px] flex flex-col items-center justify-center backdrop-blur-xl text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <TrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">学習データがありません</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">直近30日間の宿題データがないため、<br />グラフを表示できません。</p>
            </div>
        );
    }

    return (
        <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 h-full flex flex-col backdrop-blur-xl shadow-sm">
            <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-lapis-600 dark:text-lapis-400" />
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">今月の学習状況</h3>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md ml-auto">
                    過去30日
                </span>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-8">
                {/* Progress Bar Section */}
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-lapis-500" />
                            宿題提出率
                        </span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-lapis-600 dark:text-lapis-400 leading-none">{completionRate}</span>
                            <span className="text-sm font-bold text-gray-400">%</span>
                        </div>
                    </div>
                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-lapis-400 to-lapis-600 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${completionRate}%` }}
                        />
                    </div>
                    <p className="text-xs font-bold text-gray-400 mt-2 text-right">
                        {stats.completed} / {stats.totalAssigned} 提出済
                    </p>
                </div>

                {/* Pie Chart Section */}
                {stats.completed > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                        <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-4 text-center">
                            自己評価の割合
                        </p>

                        {pieData.filter(d => d.name !== "評価待ち等" && d.value > 0).length === 0 ? (
                            <div className="text-center text-xs font-medium text-gray-400 py-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                まだ自己評価のデータがありません
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className="h-32 w-32 relative shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={60}
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                formatter={(value: any) => [`${value}回`, '回数']}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                                itemStyle={{ color: '#111827' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    {/* Center Text */}
                                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                        <span className="text-[10px] font-bold text-gray-400">合計</span>
                                        <span className="text-lg font-black text-gray-900 dark:text-gray-100 leading-none mt-0.5">
                                            {pieData.reduce((acc, curr) => curr.name !== "評価待ち等" ? acc + curr.value : acc, 0)}
                                        </span>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="flex-1 space-y-2.5">
                                    {pieData.filter(d => d.name !== "評価待ち等").map((entry, index) => (
                                        <div key={`legend-${index}`} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{entry.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-gray-900 dark:text-white">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
    );
}
