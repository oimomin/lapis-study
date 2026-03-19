"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";

const forgotPasswordSchema = z.object({
    email: z.string().email("有効なメールアドレスを入力してください"),
});

type FormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<FormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" }
    });

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        setSubmitError(null);
        setSuccessMessage(null);

        try {
            const supabase = createClient();
            const redirectTo = `${window.location.origin}/reset-password`;

            const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo,
            });

            if (error) {
                console.error("Reset password email error:", error);
                setSubmitError("再設定メールの送信に失敗しました。");
                return;
            }

            setSuccessMessage("再設定用のメールを送信しました。受信ボックスをご確認ください。");
        } catch (error) {
            console.error("Unexpected error during reset email request:", error);
            setSubmitError("エラーが発生しました。もう一度お試しください。");
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
                        パスワード再設定
                    </h1>
                    <p className="text-app-text2 dark:text-app-text2-dark">
                        登録済みメールアドレスに再設定用リンクを送ります
                    </p>
                </div>

                {successMessage && (
                    <div className="p-4 mb-6 rounded-xl bg-success-500/10 border border-success-500/20 text-success-600 dark:text-success-400 text-sm text-center">
                        {successMessage}
                    </div>
                )}

                {submitError && (
                    <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                        {submitError}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-app-text dark:text-app-text-dark mb-1">
                            メールアドレス
                        </label>
                        <input
                            type="email"
                            {...register("email")}
                            placeholder="you@example.com"
                            className={`w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-app-text dark:text-app-text-dark backdrop-blur-sm ${errors.email ? "border-red-400 focus:ring-red-400" : "border-app-border dark:border-app-border-dark focus:ring-lapis-400"}`}
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-700 hover:to-lapis-600 text-white font-semibold shadow-lg shadow-lapis-500/30 transform transition-all active:scale-[0.98] hover:shadow-lapis-500/50 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            "再設定メールを送信"
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-app-text2 dark:text-app-text2-dark">
                    <Link href="/signin" className="font-semibold text-lapis-600 dark:text-lapis-400 hover:text-lapis-500 transition-colors">
                        ログイン画面へ戻る
                    </Link>
                </div>
            </div>
        </div>
    );
}
