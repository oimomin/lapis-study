"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Settings as SettingsIcon, User, Moon, Sun, Monitor, Shield, LogOut, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile form state
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        school_name: "",
        grade_level: "",
        target_high_school: ""
    });

    useEffect(() => {
        const fetchUserAndProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);

                const { data: profileData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);
                    setFormData({
                        first_name: profileData.first_name || "",
                        last_name: profileData.last_name || "",
                        school_name: profileData.school_name || "",
                        grade_level: profileData.grade_level || "",
                        target_high_school: profileData.target_high_school || ""
                    });
                }
            }
            setIsLoading(false);
        };
        fetchUserAndProfile();
    }, [supabase]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    school_name: formData.school_name,
                    grade_level: formData.grade_level,
                    target_high_school: formData.target_high_school,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            setMessage({ type: 'success', text: "プロフィールを更新しました。" });
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            console.error("更新エラー:", error);
            setMessage({ type: 'error', text: "更新に失敗しました。もう一度お試しください。" });
        } finally {
            setIsSaving(false);
        }
    };

    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    // Initialize theme from localStorage on mount
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (storedTheme) {
            setTheme(storedTheme);
            if (storedTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
            document.documentElement.classList.add('dark');
        }
    }, []);

    const handleThemeChange = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lapis-600"></div>
            </div>
        );
    }

    const roleNames: Record<string, string> = {
        admin: '管理者',
        parent: '保護者',
        student: '生徒'
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-lapis-600" />
                設定
            </h1>

            <div className="grid md:grid-cols-3 gap-8">
                {/* User Info Sidebar */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm backdrop-blur-xl text-center">
                        <div className="w-20 h-20 mx-auto bg-lapis-100 dark:bg-lapis-900/50 text-lapis-600 dark:text-lapis-400 rounded-full flex items-center justify-center mb-4 text-3xl font-bold">
                            {profile?.last_name?.[0] || <User className="w-8 h-8" />}
                        </div>
                        <h2 className="text-xl font-bold">{profile?.last_name} {profile?.first_name}</h2>
                        <p className="text-gray-500 text-sm mt-1">{user?.email}</p>

                        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            <Shield className="w-3.5 h-3.5" />
                            {roleNames[profile?.role || 'student']}アカウント
                        </div>
                    </div>

                    {/* Theme Settings */}
                    <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm backdrop-blur-xl">
                        <h3 className="font-bold flex items-center gap-2 mb-4 text-gray-900 dark:text-gray-100">
                            <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            外観設定
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <button
                                onClick={() => handleThemeChange('light')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all ${theme === 'light'
                                        ? 'border-2 border-lapis-500 bg-lapis-50 text-lapis-700'
                                        : 'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                <Sun className="w-4 h-4" /> ライト
                            </button>
                            <button
                                onClick={() => handleThemeChange('dark')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all ${theme === 'dark'
                                        ? 'border-2 border-lapis-500 bg-lapis-900/40 text-lapis-300'
                                        : 'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                <Moon className="w-4 h-4" /> ダーク
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">※ブラウザに保存されます</p>
                    </div>
                </div>

                {/* Main Settings Form */}
                <div className="md:col-span-2">
                    <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-6 md:p-8 rounded-2xl shadow-sm backdrop-blur-xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
                            <User className="w-5 h-5 text-lapis-500" />
                            プロフィール情報
                        </h2>

                        {message && (
                            <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-success-50 text-success-600 border border-success-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                {message.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">姓 (Last Name)</label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-lapis-500 transition-shadow outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">名 (First Name)</label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-lapis-500 transition-shadow outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {profile?.role === 'student' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">学校名</label>
                                        <input
                                            type="text"
                                            value={formData.school_name}
                                            onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-lapis-500 transition-shadow outline-none"
                                        />
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">学年</label>
                                            <select
                                                value={formData.grade_level}
                                                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-lapis-500 outline-none"
                                            >
                                                <option value="">選択してください</option>
                                                <option value="中1">中学1年生</option>
                                                <option value="中2">中学2年生</option>
                                                <option value="中3">中学3年生</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">志望校 / 進学先</label>
                                            <input
                                                type="text"
                                                value={formData.target_high_school}
                                                onChange={(e) => setFormData({ ...formData, target_high_school: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-lapis-500 transition-shadow outline-none"
                                                placeholder="例: 県立〇〇高校"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-8 py-3 rounded-xl bg-lapis-600 hover:bg-lapis-700 text-white font-bold shadow-md shadow-lapis-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {isSaving ? "保存中..." : "変更を保存"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
