"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Bell,
    Calendar,
    BookOpen,
    CircleHelp,
    Settings,
    FileSignature,
    FilePenLine,
    LineChart,
    FileText,
    NotebookPen,
    ListTodo,
    LogOut,
    Users
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

type UserProfile = {
    role: "student" | "parent" | "admin";
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
};

export default function Sidebar({ user, onClose }: { user: UserProfile, onClose: () => void }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/signin");
    };

    const commonLinks = [
        { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
        { name: "お知らせ", href: "/dashboard/notices", icon: Bell },
        { name: "スケジュール", href: "/dashboard/schedule", icon: Calendar },
        { name: "やること", href: "/dashboard/todos", icon: ListTodo },
        { name: "教材一覧", href: "/dashboard/materials", icon: BookOpen },
    ];

    const bottomLinks = [
        { name: "ヘルプ", href: "/dashboard/help", icon: CircleHelp },
        { name: "設定", href: "/dashboard/settings", icon: Settings },
    ];

    let roleLinks: { name: string, href: string, icon: any }[] = [];

    if (user.role === "admin") {
        roleLinks = [
            { name: "ユーザー管理", href: "/dashboard/users", icon: Users },
            { name: "成績管理", href: "/dashboard/grades/manage", icon: FilePenLine },
            { name: "宿題管理", href: "/dashboard/homework", icon: NotebookPen },
            { name: "契約管理", href: "/dashboard/contracts/manage", icon: FileSignature },
            { name: "新規契約", href: "/dashboard/contracts/new", icon: FileSignature },
        ];
    } else if (user.role === "parent") {
        roleLinks = [
            { name: "成績報告", href: "/dashboard/grades", icon: LineChart },
            { name: "契約確認", href: "/dashboard/contracts", icon: FileText },
            { name: "新規契約", href: "/dashboard/contracts/new", icon: FileSignature },
        ];
    } else if (user.role === "student") {
        roleLinks = [
            { name: "成績報告", href: "/dashboard/grades", icon: LineChart },
            { name: "宿題報告", href: "/dashboard/homework/submit", icon: NotebookPen },
        ];
    }

    const NavItem = ({ link }: { link: any }) => {
        const isActive = pathname === link.href;
        return (
            <Link
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? "bg-lapis-500 text-white shadow-md shadow-lapis-500/30"
                    : "text-app-text2 dark:text-app-text2-dark hover:bg-lapis-50 dark:hover:bg-lapis-900/30 hover:text-lapis-600 dark:hover:text-lapis-400"
                    }`}
            >
                <link.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400 group-hover:text-lapis-500"}`} />
                <span className="font-semibold">{link.name}</span>
            </Link>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800">
            {/* Logo Area */}
            <div className="p-6 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800/50">
                <Image src="/lapis_icon.png" alt="LapisStudy Logo" width={32} height={32} />
                <span className="text-xl font-extrabold text-lapis-900 dark:text-lapis-50 tracking-tight">LapisStudy</span>
            </div>

            {/* User Profile Summary */}
            <div className="p-4 mx-4 mt-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3 border border-gray-100 dark:border-gray-800">
                <div className="w-10 h-10 rounded-full bg-lapis-200 dark:bg-lapis-900 flex items-center justify-center text-lapis-700 dark:text-lapis-300 font-bold overflow-hidden">
                    {user.avatar_url ? (
                        <Image src={user.avatar_url} alt="User Avatar" width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                        user.last_name ? user.last_name.charAt(0) : "U"
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-app-text dark:text-white truncate">
                        {user.last_name} {user.first_name}
                    </p>
                    <p className="text-xs text-app-text2 dark:text-app-text2-dark capitalize bg-lapis-100 dark:bg-lapis-900/50 text-lapis-700 dark:text-lapis-300 px-2 py-0.5 rounded-full inline-block mt-0.5">
                        {user.role === "student" ? "生徒" : user.role === "parent" ? "保護者" : "管理者"}
                    </p>
                </div>
            </div>

            {/* Navigation Menus */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 no-scrollbar">

                {/* Main Menu */}
                <div className="space-y-1">
                    <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">メイン</p>
                    {commonLinks.map((link) => (
                        <NavItem key={link.href} link={link} />
                    ))}
                </div>

                {/* Role Specific Menu */}
                <div className="space-y-1">
                    <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                        {user.role === "admin" ? "管理機能" : user.role === "parent" ? "保護者機能" : "学習・提出"}
                    </p>
                    {roleLinks.map((link) => (
                        <NavItem key={link.href} link={link} />
                    ))}
                </div>
            </div>

            {/* Bottom Menu & Sign Out */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800/50 space-y-1">
                {bottomLinks.map((link) => (
                    <NavItem key={link.href} link={link} />
                ))}

                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-semibold">ログアウト</span>
                </button>
            </div>
        </div>
    );
}
