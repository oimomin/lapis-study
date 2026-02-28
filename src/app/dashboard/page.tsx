import MonthlySchedule from "@/components/dashboard/MonthlySchedule";

export default function DashboardPage() {
    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50">
                ダッシュボード
            </h1>
            <p className="text-app-text2 dark:text-app-text2-dark">
                LapisStudyへようこそ！ここから学習の進捗やスケジュールを確認できます。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* News & Progress */}
                <div className="md:col-span-1 space-y-6">
                    <div className="p-6 rounded-2xl bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-xl h-full">
                        <h3 className="font-semibold text-lg mb-2">最近のお知らせ</h3>
                        <p className="text-sm text-app-text2 dark:text-app-text2-dark">新着のお知らせはありません。</p>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <MonthlySchedule />
                </div>
            </div>
        </div>
    );
}
