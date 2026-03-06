"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const signupSchema = z.object({
    email: z.string().email("有効なメールアドレスを入力してください"),
    password: z
        .string()
        .min(8, "8文字以上で入力してください")
        .regex(/[A-Z]/, "大文字を1つ以上含めてください")
        .regex(/[a-z]/, "小文字を1つ以上含めてください")
        .regex(/[0-9]/, "数字を1つ以上含めてください")
        .regex(/[^A-Za-z0-9]/, "記号を1つ以上含めてください"),
    role: z.string().refine(val => ["student", "parent", "admin"].includes(val), { message: "役割を選択してください" }),
    lastName: z.string().min(1, "姓を入力してください").max(50, "50文字以内で入力してください"),
    firstName: z.string().min(1, "名を入力してください").max(50, "50文字以内で入力してください"),
    birthdate: z.string().optional(),
    gradeLevel: z.string().optional(),
    schoolName: z.string().max(100, "100文字以内で入力してください").optional(),
    targetHighSchool: z.string().max(100, "100文字以内で入力してください").optional(),
}).superRefine((data, ctx) => {
    if (data.role === "student") {
        if (!data.gradeLevel) {
            ctx.addIssue({ path: ["gradeLevel"], code: z.ZodIssueCode.custom, message: "学年を選択してください" });
        }
        if (!data.birthdate) {
            ctx.addIssue({ path: ["birthdate"], code: z.ZodIssueCode.custom, message: "生年月日を入力してください" });
        } else {
            const date = new Date(data.birthdate);
            if (date >= new Date()) {
                ctx.addIssue({ path: ["birthdate"], code: z.ZodIssueCode.custom, message: "過去の日付を入力してください" });
            }
        }
    }
});

type FormData = z.infer<typeof signupSchema>;

export default function SignUpPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const totalSteps = 4;

    const {
        register,
        handleSubmit,
        trigger,
        watch,
        setValue,
        setError,
        formState: { errors }
    } = useForm<FormData>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            email: "",
            password: "",
            role: "",
            firstName: "",
            lastName: "",
            birthdate: "",
            gradeLevel: "",
            schoolName: "",
            targetHighSchool: "",
        },
        mode: "onChange",
    });

    const currentRole = watch("role");

    const validateStepAndProceed = async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let fieldsToValidate: any[] = [];
        if (step === 1) fieldsToValidate = ["email", "password"];
        if (step === 2) {
            if (!currentRole) {
                setError("role", { message: "役割を選択してください" });
                return;
            }
            fieldsToValidate = ["role"];
        }
        if (step === 3) {
            if (currentRole === "student") {
                fieldsToValidate = ["lastName", "firstName", "birthdate", "gradeLevel", "schoolName", "targetHighSchool"];
            } else {
                fieldsToValidate = ["lastName", "firstName"];
            }
        }

        const isValid = await trigger(fieldsToValidate);
        if (isValid && step < totalSteps) {
            setStep(step + 1);
        }
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        setSubmitError(null);

        try {
            const supabase = createClient();

            // 1. Sign up the user via Supabase Auth
            // The handle_new_user trigger in the database will automatically create the profile row
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        role: data.role,
                        first_name: data.firstName,
                        last_name: data.lastName,
                        school_name: data.schoolName || null,
                        grade_level: data.gradeLevel || null,
                        birthdate: data.birthdate || null,
                        target_high_school: data.targetHighSchool || null,
                    }
                }
            });

            if (authError) {
                console.error("Signup error:", authError);
                setSubmitError(authError.message);
                return;
            }

            // Success - redirect to a confirmation page or home
            // For now, let's redirect to the signin page with a success parameter
            // In a real app with email confirmation enabled, tell them to check their email
            router.push("/signin?message=アカウント作成に成功しました。ログインしてください。");

        } catch (error) {
            console.error("Unexpected error during signup:", error);
            setSubmitError("予期せぬエラーが発生しました。もう一度お試しください。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-lapis-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-accent-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-success-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>

            <div className="relative z-10 w-full max-w-md p-8 md:p-10 rounded-3xl backdrop-blur-xl bg-white/50 dark:bg-black/30 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] overflow-hidden">

                {/* Progress Bar Container */}
                <div className="w-full flex justify-between items-center mb-6 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/30 dark:bg-gray-700/50 rounded-full -z-10"></div>
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-lapis-500 rounded-full -z-10 transition-all duration-300 ease-in-out"
                        style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
                    ></div>

                    {[1, 2, 3, 4].map((i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={async () => {
                                // Only allow going back or clicking current
                                if (i < step) setStep(i);
                            }}
                            disabled={i > step}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= i
                                ? "bg-lapis-500 text-white shadow-md shadow-lapis-500/30 ring-4 ring-white dark:ring-black/30 cursor-pointer"
                                : "bg-white/50 dark:bg-gray-600/50 text-gray-400 dark:text-gray-400 ring-4 ring-transparent cursor-not-allowed"
                                }`}
                        >
                            {step > i ? "✓" : i}
                        </button>
                    ))}
                </div>

                <div className="text-center mb-8">
                    {step === 1 && (
                        <div className="flex justify-center mb-6">
                            <Image
                                src="/lapis_icon.png"
                                alt="LapisStudy Icon"
                                width={64}
                                height={64}
                                className="w-16 h-16 drop-shadow-md"
                            />
                        </div>
                    )}
                    <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 mb-2 tracking-tight transition-all">
                        {step === 1 && "LapisStudyに参加する"}
                        {step === 2 && "役割を教えてください"}
                        {step === 3 && "プロフィール入力"}
                        {step === 4 && "登録内容の確認"}
                    </h1>
                    <p className="text-sm md:text-base text-app-text2 dark:text-app-text2-dark">
                        {step === 1 && "アカウントを作成して学習を始めましょう"}
                        {step === 2 && "あなたに合った体験を提供します"}
                        {step === 3 && "もう少しで完了です！"}
                        {step === 4 && "最後に間違いがないか確認してください"}
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative">

                    {/* STEP 1: Email & Password */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-sm font-medium text-app-text dark:text-app-text-dark mb-1">
                                    メールアドレス
                                </label>
                                <input
                                    type="email"
                                    {...register("email")}
                                    placeholder="you@example.com"
                                    className={`w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-app-text dark:text-app-text-dark backdrop-blur-sm ${errors.email ? 'border-red-400 focus:ring-red-400' : 'border-app-border dark:border-app-border-dark focus:ring-lapis-400'}`}
                                />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-app-text dark:text-app-text-dark mb-1">
                                    パスワード <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(大文字, 小文字, 数字, 記号を各1つ以上含む8文字以上)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        {...register("password")}
                                        placeholder="••••••••"
                                        className={`w-full px-4 py-3 pr-12 rounded-xl bg-white/60 dark:bg-black/40 border focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-app-text dark:text-app-text-dark backdrop-blur-sm ${errors.password ? 'border-red-400 focus:ring-red-400' : 'border-app-border dark:border-app-border-dark focus:ring-lapis-400'}`}
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

                            <button
                                type="button"
                                onClick={validateStepAndProceed}
                                className="w-full py-3 px-4 mt-4 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-700 hover:to-lapis-600 text-white font-semibold shadow-lg shadow-lapis-500/30 transform transition-all active:scale-[0.98] hover:shadow-lapis-500/50 flex justify-center items-center gap-2"
                            >
                                次へ進む
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Role Selection */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid gap-3">
                                {[
                                    { id: "student", label: "👦 生徒", desc: "自分で学習を進める" },
                                    { id: "parent", label: "👩 保護者", desc: "お子様の学習をサポートする" },
                                    { id: "admin", label: "👑 管理者", desc: "塾の運営・管理を行う" }
                                ].map((r) => (
                                    <div
                                        key={r.id}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        onClick={() => setValue("role", r.id as any, { shouldValidate: true })}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${currentRole === r.id
                                            ? "border-lapis-500 bg-lapis-500/10 dark:bg-lapis-500/20"
                                            : "border-transparent bg-white/60 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-white/10"
                                            }`}
                                    >
                                        <div className="font-bold text-lg text-app-text dark:text-app-text-dark">{r.label}</div>
                                        <div className="text-sm text-app-text2 dark:text-app-text2-dark">{r.desc}</div>
                                    </div>
                                ))}
                                {/* Hidden input to register role */}
                                <input type="hidden" {...register("role")} />
                                {errors.role && <p className="text-red-500 text-sm text-center font-medium mt-1">{errors.role.message}</p>}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="w-1/3 py-3 px-4 rounded-xl bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-gray-800 text-app-text dark:text-white font-semibold border border-gray-200 dark:border-gray-700 transition-all font-medium flex justify-center items-center"
                                >
                                    戻る
                                </button>
                                <button
                                    type="button"
                                    onClick={validateStepAndProceed}
                                    className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-700 hover:to-lapis-600 text-white font-semibold shadow-lg shadow-lapis-500/30 transform transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                                >
                                    次へ進む
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Profile Info */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-app-text dark:text-app-text-dark mb-1">
                                        姓
                                    </label>
                                    <input
                                        type="text"
                                        {...register("lastName")}
                                        placeholder="山田"
                                        className={`w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-app-text dark:text-app-text-dark backdrop-blur-sm ${errors.lastName ? 'border-red-400 focus:ring-red-400' : 'border-app-border dark:border-app-border-dark focus:ring-lapis-400'}`}
                                    />
                                    {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-app-text dark:text-app-text-dark mb-1">
                                        名
                                    </label>
                                    <input
                                        type="text"
                                        {...register("firstName")}
                                        placeholder="太郎"
                                        className={`w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-app-text dark:text-app-text-dark backdrop-blur-sm ${errors.firstName ? 'border-red-400 focus:ring-red-400' : 'border-app-border dark:border-app-border-dark focus:ring-lapis-400'}`}
                                    />
                                    {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
                                </div>
                            </div>

                            {currentRole === "student" && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-app-text dark:text-app-text-dark mb-1">生年月日</label>
                                            <input
                                                type="date"
                                                {...register("birthdate")}
                                                className={`w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border focus:ring-2 focus:border-transparent outline-none transition-all text-sm text-app-text dark:text-app-text-dark backdrop-blur-sm ${errors.birthdate ? 'border-red-400 focus:ring-red-400' : 'border-app-border dark:border-app-border-dark focus:ring-lapis-400'}`}
                                            />
                                            {errors.birthdate && <p className="text-red-500 text-xs mt-1">{errors.birthdate.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-app-text dark:text-app-text-dark mb-1">学年</label>
                                            <select
                                                {...register("gradeLevel")}
                                                className={`w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border focus:ring-2 focus:border-transparent outline-none transition-all text-sm text-app-text dark:text-app-text-dark backdrop-blur-sm ${errors.gradeLevel ? 'border-red-400 focus:ring-red-400' : 'border-app-border dark:border-app-border-dark focus:ring-lapis-400'}`}
                                            >
                                                <option value="" disabled>選択</option>
                                                <option value="中1">中学1年生</option>
                                                <option value="中2">中学2年生</option>
                                                <option value="中3">中学3年生</option>
                                                <option value="高1">高校1年生</option>
                                                <option value="高2">高校2年生</option>
                                                <option value="高3">高校3年生</option>
                                            </select>
                                            {errors.gradeLevel && <p className="text-red-500 text-xs mt-1">{errors.gradeLevel.message}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-app-text dark:text-app-text-dark mb-1">中学校名 (任意)</label>
                                        <input
                                            type="text"
                                            {...register("schoolName")}
                                            placeholder="〇〇中学校"
                                            className={`w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border focus:ring-2 focus:border-transparent outline-none transition-all text-sm text-app-text dark:text-app-text-dark placeholder:text-gray-400 backdrop-blur-sm ${errors.schoolName ? 'border-red-400 focus:ring-red-400' : 'border-app-border dark:border-app-border-dark focus:ring-lapis-400'}`}
                                        />
                                        {errors.schoolName && <p className="text-red-500 text-xs mt-1">{errors.schoolName.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-app-text dark:text-app-text-dark mb-1">志望校・進路 (任意)</label>
                                        <input
                                            type="text"
                                            {...register("targetHighSchool")}
                                            placeholder="〇〇高校など"
                                            className={`w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border focus:ring-2 focus:border-transparent outline-none transition-all text-sm text-app-text dark:text-app-text-dark placeholder:text-gray-400 backdrop-blur-sm ${errors.targetHighSchool ? 'border-red-400 focus:ring-red-400' : 'border-app-border dark:border-app-border-dark focus:ring-lapis-400'}`}
                                        />
                                        {errors.targetHighSchool && <p className="text-red-500 text-xs mt-1">{errors.targetHighSchool.message}</p>}
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="w-1/3 py-3 px-4 rounded-xl bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-gray-800 text-app-text dark:text-white font-semibold border border-gray-200 dark:border-gray-700 transition-all font-medium flex justify-center items-center"
                                >
                                    戻る
                                </button>
                                <button
                                    type="button"
                                    onClick={validateStepAndProceed}
                                    className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-lapis-600 to-lapis-500 hover:from-lapis-700 hover:to-lapis-600 text-white font-semibold shadow-lg shadow-lapis-500/30 transform transition-all active:scale-[0.98] flex justify-center items-center gap-2"
                                >
                                    次へ進む
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Review */}
                    {step === 4 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
                            <div className="p-4 rounded-xl bg-white/50 dark:bg-black/40 border border-app-border dark:border-app-border-dark space-y-3">
                                <div>
                                    <div className="text-xs text-app-text2 dark:text-app-text2-dark">メールアドレス</div>
                                    <div className="font-medium text-app-text dark:text-white">{watch("email")}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-app-text2 dark:text-app-text2-dark">氏名 (役割)</div>
                                    <div className="font-medium text-app-text dark:text-white">
                                        {watch("lastName")} {watch("firstName")}
                                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-lapis-500/20 text-lapis-600 dark:text-lapis-300">
                                            {currentRole === "student" ? "生徒" : currentRole === "parent" ? "保護者" : "管理者"}
                                        </span>
                                    </div>
                                </div>
                                {currentRole === "student" && (
                                    <>
                                        {(watch("schoolName") || watch("gradeLevel")) && (
                                            <div>
                                                <div className="text-xs text-app-text2 dark:text-app-text2-dark">学校・学年</div>
                                                <div className="font-medium text-app-text dark:text-white">{watch("schoolName")} {watch("gradeLevel")}</div>
                                            </div>
                                        )}
                                        {watch("targetHighSchool") && (
                                            <div>
                                                <div className="text-xs text-app-text2 dark:text-app-text2-dark">志望校</div>
                                                <div className="font-medium text-app-text dark:text-white">{watch("targetHighSchool")}</div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <p className="text-xs text-center text-app-text2 dark:text-app-text2-dark px-2">
                                登録ボタンを押すと、LapisStudyの利用規約およびプライバシーポリシーに同意したものとみなされます。
                            </p>

                            {submitError && (
                                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                                    {submitError}
                                </div>
                            )}
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    disabled={isLoading}
                                    className="w-1/3 py-3 px-4 rounded-xl bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-gray-800 text-app-text dark:text-white font-semibold border border-gray-200 dark:border-gray-700 transition-all font-medium flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    戻る
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-success-500 to-success-400 hover:from-success-600 hover:to-success-500 text-white font-bold shadow-lg shadow-success-500/30 transform transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                                            登録を完了する
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                <div className="mt-8 text-center text-sm text-app-text2 dark:text-app-text2-dark">
                    すでにアカウントをお持ちですか？{" "}
                    <Link href="/signin" className="font-semibold text-lapis-600 dark:text-lapis-400 hover:text-lapis-500 transition-colors">
                        ログイン
                    </Link>
                </div>
            </div>
        </div>
    );
}
