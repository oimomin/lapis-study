import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DashboardLayoutClient from "@/components/dashboard/DashboardLayoutClient";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    // 1. Check if user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/signin");
    }

    // 2. Fetch the user's custom profile to get their role
    const { data: profile } = await supabase
        .from("users")
        .select("role, first_name, last_name, avatar_url")
        .eq("id", user.id)
        .single();

    if (!profile) {
        // If profile is missing (e.g. trigger failed in the past), returning to signin will cause a loop
        // because middleware says they are logged in. So we show a setup/error page instead.
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
                <div className="max-w-md w-full p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-red-200 dark:border-red-900 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-4">プロフィールが見つかりません</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
                        お手数ですが、一度ログアウトして再度サインアップ（アカウント作成）からやり直していただくか、管理者へお問い合わせください。
                    </p>
                    <form action="/auth/signout" method="POST">
                        <button className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium">
                            ログアウトする
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayoutClient user={profile}>
            {children}
        </DashboardLayoutClient>
    );
}
