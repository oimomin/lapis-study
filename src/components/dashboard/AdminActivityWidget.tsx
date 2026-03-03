"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Activity, PenTool, BookOpen, GraduationCap, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";

type ActivityItem = {
    id: string;
    type: "homework_submission" | "grade_upload" | "homework_evaluation";
    title: string;
    description: string;
    date: Date;
    link: string;
    icon: any;
    colorClass: string;
    bgColorClass: string;
};

export default function AdminActivityWidget() {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);
    const [activities, setActivities] = useState<ActivityItem[]>([]);

    useEffect(() => {
        fetchActivityData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchActivityData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch recent homework submissions (Last 10)
            const { data: homeworkData } = await supabase
                .from('homework_submissions')
                .select(`
                    id, 
                    status, 
                    subject, 
                    created_at, 
                    updated_at,
                    feedback_evaluation,
                    student:users!student_id(first_name, last_name)
                `)
                .order('updated_at', { ascending: false })
                .limit(10);

            // 2. Fetch recent grade uploads (Last 10)
            const { data: gradeData } = await supabase
                .from('grades')
                .select(`
                    id,
                    subject,
                    test_type,
                    created_at,
                    student:users!student_id(first_name, last_name)
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            let allActivities: ActivityItem[] = [];

            // Process Homework Data
            if (homeworkData) {
                homeworkData.forEach(hw => {
                    const studentObj = Array.isArray(hw.student) ? hw.student[0] : hw.student;
                    const studentName = studentObj ? `${studentObj.last_name || ''} ${studentObj.first_name || ''}`.trim() : '不明な生徒';
                    const subject = hw.subject || '宿題';

                    if (hw.status === 'submitted') {
                        // Just submitted
                        allActivities.push({
                            id: `hw-sub-${hw.id}`,
                            type: "homework_submission",
                            title: "生徒が宿題を提出しました",
                            description: `${studentName}さんが${subject}の宿題を提出しました。`,
                            date: new Date(hw.created_at),
                            link: `/dashboard/homework/feedback/${hw.id}`,
                            icon: PenTool,
                            colorClass: "text-blue-600 dark:text-blue-400",
                            bgColorClass: "bg-blue-100 dark:bg-blue-900/30"
                        });
                    } else if (hw.status === 'graded' && hw.feedback_evaluation) {
                        // Student evaluated the grading
                        allActivities.push({
                            id: `hw-eval-${hw.id}`,
                            type: "homework_evaluation",
                            title: "生徒が自己評価しました",
                            description: `${studentName}さんが${subject}の自己評価（${hw.feedback_evaluation}）を完了しました。`,
                            date: new Date(hw.updated_at),
                            link: `/dashboard/homework/feedback/${hw.id}`,
                            icon: CheckCircle,
                            colorClass: "text-emerald-600 dark:text-emerald-400",
                            bgColorClass: "bg-emerald-100 dark:bg-emerald-900/30"
                        });
                    }
                });
            }

            // Process Grade Data
            if (gradeData) {
                gradeData.forEach(grade => {
                    const studentObj = Array.isArray(grade.student) ? grade.student[0] : grade.student;
                    const studentName = studentObj ? `${studentObj.last_name || ''} ${studentObj.first_name || ''}`.trim() : '不明な生徒';
                    let testTypeName = "テスト";
                    switch (grade.test_type) {
                        case 'quiz': testTypeName = "小テスト"; break;
                        case 'midterm': testTypeName = "定期テスト"; break;
                        case 'mock': testTypeName = "模試"; break;
                        case 'other': testTypeName = "その他テスト"; break;
                    }

                    allActivities.push({
                        id: `grade-${grade.id}`,
                        type: "grade_upload",
                        title: "成績データが追加されました",
                        description: `${studentName}さんの${grade.subject}の${testTypeName}成績がアップロードされました。`,
                        date: new Date(grade.created_at),
                        link: `/dashboard/grades/manage`,
                        icon: GraduationCap,
                        colorClass: "text-fuchsia-600 dark:text-fuchsia-400",
                        bgColorClass: "bg-fuchsia-100 dark:bg-fuchsia-900/30"
                    });
                });
            }

            // Sort all activities by date descending and take top 8
            allActivities.sort((a, b) => b.date.getTime() - a.date.getTime());
            setActivities(allActivities.slice(0, 8));

        } catch (error) {
            console.error("Error fetching activity data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 h-full min-h-[300px] flex items-center justify-center backdrop-blur-xl">
                <Loader2 className="w-8 h-8 animate-spin text-lapis-500" />
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 h-full min-h-[300px] flex flex-col items-center justify-center backdrop-blur-xl text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">最近のアクティビティはありません</h3>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    生徒の宿題提出や成績のアップロードがあると、<br />ここにタイムラインが表示されます。
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 h-full flex flex-col backdrop-blur-xl shadow-sm">
            <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-lapis-600 dark:text-lapis-400" />
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">最近のアクティビティ</h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                <div className="relative border-l-2 border-gray-100 dark:border-gray-800/60 ml-3 md:ml-4 space-y-6 pb-4 pt-2">
                    {activities.map((activity) => (
                        <div key={activity.id} className="relative pl-6 sm:pl-8">
                            {/* Timeline Node */}
                            <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full ${activity.bgColorClass} flex items-center justify-center border-4 border-white dark:border-[#0B1120] shadow-sm`}>
                                <activity.icon className={`w-3.5 h-3.5 ${activity.colorClass}`} />
                            </div>

                            {/* Content */}
                            <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-3 border border-gray-100 dark:border-gray-800 hover:bg-gray-100 hover:dark:bg-gray-800/50 transition-colors">
                                <div className="flex justify-between items-start mb-1 gap-4">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug">
                                        {activity.title}
                                    </h4>
                                    <span className="text-[10px] whitespace-nowrap font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                                        {formatDistanceToNow(activity.date, { addSuffix: true, locale: ja })}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                                    {activity.description}
                                </p>
                                <Link
                                    href={activity.link}
                                    className="inline-flex text-[10px] font-bold text-lapis-600 dark:text-lapis-400 hover:text-lapis-700 dark:hover:text-lapis-300"
                                >
                                    詳細を見る →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
