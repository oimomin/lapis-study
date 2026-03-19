"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";

const resetPasswordSchema = z.object({
    password: z
        .string()
        .min(8, "8文字以上で入力してください")
        .regex(/[A-Z]/, "大文字を1文字以上含めてください")
        .regex(/[a-z]/, "小文字を1文字以上含めてください")
        .regex(/[0-9]/, "数字を1文字以上含めてください")
        .regex(/[^A-Za-z0-9]/, "記号を1文字以上含めてください"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "確認用パスワードが一致しません",
});

type FormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isRecoveryReady, setIsRecoveryReady] = useState(false);
    const [pageError, setPageError] = useState<string | null>("メールのリンクを確認しています...");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<FormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: "", confirmPassword: "" }
    });

    useEffect(() => {
        const supabase = createClient();

        const bootstrap = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                setIsRecoveryReady(true);
                setPageError(null);
                return;
            }

            setPageError("再設定リンクが無効か期限切れです。もう一度お試しください。");
        };

        void bootstrap();

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
                setIsRecoveryReady(true);
                setPageError(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        setPageError(null);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({
                password: data.password,
            });

            if (error) {
                console.error("Password update error:", error);
                setPageError("パスワードの更新に失敗しました。");
                return;
            }

            router.push("/signin?message=パスワードを更新しました。新しいパスワードでログインしてください。");
        } catch (error) {
            console.error("Unexpected error during password update:", error);
            setPageError("エラーが発生しました。もう一度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-lapis-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-accent-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-success-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>

            <div className="relative z-10 w-full max-w-md p-8 md:p-10 rounded-3xl backdrop-blur-xl bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <Image
                            src="/lapis_icon.png"
                            alt="LapisStudy Icon"
                            width={64}
                            height={64}
                            className="w-16 h-16 drop-shadow-md"
                        />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-lapis-900 dark:text-lapis-50 mb-2 tracking-tight">
                        新しいパスワードを設定
                    </h1>
                    <p className="text-app-text2 dark:text-app-text2-dark">
                        条件を満たす新しいパスワードを入力してください
                    </p>
                </div>

                {pageError && (
                    <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                        {pageError}
                    </div>
                )}

                {isRecoveryReady ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-app-text dark:text-app-text-dark mb-1">
                                新しいパスワード
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    {...register("password")}
                                    placeholder="••••••••"
                                    className={`w-full px-4 py-3 pr-12 rounded-xl bg-white/60 dark:bg-black/40 border focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-app-text dark:text-app-text-dark backdrop-blur-sm ${errors.password ? "border-red-400 focus:ring-red-400" : "border-app-border dark:border-app-border-dark focus:ring-lapis-400"}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-app-text dark:text-app-text-dark mb-1">
                                確認用パスワード
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    {...register("confirmPassword")}
                                    placeholder="••••••••"
                                    className={`w-full px-4 py-3 pr-12 rounded-xl bg-white/60 dark:bg-black/40 border focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-app-text dark:text-app-text-dark backdrop-blur-sm ${errors.confirmPassword ? "border-red-400 focus:ring-red-400" : "border-app-border dark:border-app-border-dark focus:ring-lapis-400"}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-700 hover:to-lapis-600 text-white font-semibold shadow-lg shadow-lapis-500/30 transform transition-all active:scale-[0.98] hover:shadow-lapis-500/50 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                "パスワードを更新"
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="text-center text-sm text-app-text2 dark:text-app-text2-dark">
                        <Link href="/forgot-password" className="font-semibold text-lapis-600 dark:text-lapis-400 hover:text-lapis-500 transition-colors">
                            再設定メールを送り直す
                        </Link>
                    </div>
                )}

                <div className="mt-8 text-center text-sm text-app-text2 dark:text-app-text2-dark">
                    <Link href="/signin" className="font-semibold text-lapis-600 dark:text-lapis-400 hover:text-lapis-500 transition-colors">
                        ログイン画面へ戻る
                    </Link>
                </div>
            </div>
        </div>
    );
}
