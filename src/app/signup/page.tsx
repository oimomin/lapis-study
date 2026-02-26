import Link from "next/link";

export default function SignUpPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Decorative background blur elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-lapis-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-accent-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-success-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>

            {/* Glassmorphism Card */}
            <div className="relative z-10 w-full max-w-md p-8 md:p-10 rounded-3xl backdrop-blur-xl bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">

                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-lapis-900 dark:text-lapis-50 mb-2 tracking-tight">
                        Join LapisStudy
                    </h1>
                    <p className="text-app-text2 dark:text-app-text2-dark">
                        Create an account to jumpstart your learning
                    </p>
                </div>

                <form className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-app-text dark:text-app-text-dark mb-1">
                            Full Name
                        </label>
                        <input
                            type="text"
                            placeholder="John Doe"
                            className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-app-border dark:border-app-border-dark focus:ring-2 focus:ring-lapis-400 focus:border-transparent outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 text-app-text dark:text-app-text-dark backdrop-blur-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-app-text dark:text-app-text-dark mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-app-border dark:border-app-border-dark focus:ring-2 focus:ring-lapis-400 focus:border-transparent outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 text-app-text dark:text-app-text-dark backdrop-blur-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-app-text dark:text-app-text-dark mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-app-border dark:border-app-border-dark focus:ring-2 focus:ring-lapis-400 focus:border-transparent outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 text-app-text dark:text-app-text-dark backdrop-blur-sm"
                            required
                        />
                    </div>

                    <button
                        type="button"
                        className="w-full py-3 px-4 mt-2 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-700 hover:to-lapis-600 text-white font-semibold shadow-lg shadow-lapis-500/30 transform transition-all active:scale-[0.98] hover:shadow-lapis-500/50"
                    >
                        Sign Up
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-app-text2 dark:text-app-text2-dark">
                    Already have an account?{" "}
                    <Link href="/signin" className="font-semibold text-lapis-600 dark:text-lapis-400 hover:text-lapis-500 transition-colors">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
