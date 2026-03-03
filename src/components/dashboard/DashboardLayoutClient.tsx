"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

type UserProfile = {
    role: "student" | "parent" | "admin";
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
};

export default function DashboardLayoutClient({
    children,
    user,
}: {
    children: React.ReactNode;
    user: UserProfile;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-app-text dark:text-app-text-dark transition-colors duration-300">

            {/* Desktop Sidebar (Always visible lg and up) */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col z-20">
                <Sidebar user={user} onClose={() => { }} />
            </div>

            {/* Mobile Sidebar (Hidden by default, controlled by state) */}
            <>
                {/* Backdrop overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar Slide-in */}
                <div
                    className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                        }`}
                >
                    <Sidebar user={user} onClose={() => setIsSidebarOpen(false)} />
                </div>
            </>

            {/* Main Content Wrapper */}
            <div className="lg:pl-64 flex flex-col min-h-screen">
                <Header
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                    user={user}
                />

                {/* Fixed background decors for the whole dashboard feeling */}
                <div className="fixed top-0 right-0 w-full h-full pointer-events-none -z-10 overflow-hidden hidden dark:block">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lapis-600/10 rounded-full mix-blend-screen filter blur-3xl opacity-50"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-600/10 rounded-full mix-blend-screen filter blur-3xl opacity-50"></div>
                </div>

                <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                </main>
            </div>
        </div>
    );
}
