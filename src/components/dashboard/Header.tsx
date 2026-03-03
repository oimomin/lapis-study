"use client";

import { Menu, Search, Bell } from "lucide-react";
import Image from "next/image";

type UserProfile = {
    role: "student" | "parent" | "admin";
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
};

export default function Header({
    onOpenSidebar,
    user
}: {
    onOpenSidebar: () => void;
    user: UserProfile;
}) {
    return (
        <header className="sticky top-0 z-50 bg-white/70 dark:bg-[#0B1120]/70 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-4 py-3 lg:px-8">

                {/* Mobile Hamburger & Logo Block */}
                <div className="flex items-center gap-4 lg:hidden">
                    <button
                        onClick={onOpenSidebar}
                        className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Image src="/lapis_icon.png" alt="Logo" width={24} height={24} />
                        <span className="font-extrabold text-lapis-900 dark:text-white tracking-tight">LapisStudy</span>
                    </div>
                </div>

                {/* Desktop Search / Breadcrumbs area (hidden on mobile) */}
                <div className="hidden lg:flex flex-1 max-w-md">
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="検索..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-full leading-5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-black focus:ring-2 focus:ring-lapis-500 focus:border-transparent transition-all sm:text-sm backdrop-blur-sm"
                        />
                    </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-4">
                    <button className="relative p-2 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-accent-500 ring-2 ring-white dark:ring-[#0B1120]" />
                        <Bell className="w-6 h-6" />
                    </button>

                    {/* User Profile Mini (Mobile) */}
                    <div className="lg:hidden w-8 h-8 rounded-full bg-lapis-200 dark:bg-lapis-900 flex items-center justify-center text-lapis-700 dark:text-lapis-300 font-bold overflow-hidden border border-gray-200 dark:border-gray-700">
                        {user.avatar_url ? (
                            <Image src={user.avatar_url} alt="User Avatar" width={32} height={32} className="w-full h-full object-cover" />
                        ) : (
                            user.last_name ? user.last_name.charAt(0) : "U"
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
