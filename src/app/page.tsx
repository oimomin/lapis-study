import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      {/* Background blobs for main page too */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-lapis-400/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent-400/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob pointer-events-none"></div>

      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start relative z-10 w-full max-w-2xl mx-auto backdrop-blur-md bg-white/30 dark:bg-black/20 p-12 rounded-3xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]">
        <div className="flex flex-col items-center w-full mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-lapis-400 to-lapis-600 rounded-2xl flex items-center justify-center shadow-lg shadow-lapis-500/30 mb-6">
            <span className="text-4xl text-white font-bold">L</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-lapis-900 dark:text-lapis-50 tracking-tight text-center">
            LapisStudy
          </h1>
          <p className="mt-4 text-app-text2 dark:text-app-text2-dark text-center md:text-lg">
            Empower your learning journey with the best tools.
          </p>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row w-full justify-center mt-6">
          <Link
            className="w-full sm:w-auto text-center rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-700 hover:to-lapis-600 text-white font-semibold flex items-center justify-center border border-transparent h-12 px-8 shadow-lg shadow-lapis-500/30 transform transition-all active:scale-[0.98] hover:shadow-lapis-500/50"
            href="/signin"
          >
            Sign In
          </Link>
          <Link
            className="w-full sm:w-auto text-center rounded-xl backdrop-blur-md bg-white/50 dark:bg-white/10 text-app-text dark:text-lapis-50 hover:bg-white/70 dark:hover:bg-white/20 font-semibold border border-white/60 dark:border-white/20 h-12 px-8 flex items-center justify-center shadow-sm transform transition-all active:scale-[0.98]"
            href="/signup"
          >
            Create Account
          </Link>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-sm text-app-text2 dark:text-app-text2-dark opacity-80 backdrop-blur-sm px-6 py-2 rounded-full bg-white/20 dark:bg-black/20">
        © 2026 LapisStudy. All rights reserved.
      </footer>
    </div>
  );
}
