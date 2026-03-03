"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";

// Define schema matching the API
const contractSchema = z.object({
    studentId: z.string().uuid("対象の生徒を選択してください"),
    contractType: z.enum(["trial", "annual"]),
    subjects: z.array(z.string()).min(1, "1科目以上選択してください"),
    parentSignatureName: z.string().min(1, "保護者氏名を署名として入力してください"),
    agreedToTerms: z.boolean().refine(val => val === true, { message: "システム利用規約に同意する必要があります" }),
    agreedToPrivacy: z.boolean().refine(val => val === true, { message: "個人情報保護に同意する必要があります" })
});

type FormData = z.infer<typeof contractSchema>;

// Mock PDF Text Constants
const TERMS_TEXT = `Lapis Study システム利用規約...
(実際の利用規約がここに入ります)
第1条（適用）本規約は、本システムの利用に関する...`;

const PRIVACY_TEXT = `個人情報保護に関する同意書...
(実際のプラバシーポリシーがここに入ります)
Lapis Studyは、指導業務の遂行にあたり...`;

export default function NewContractPage() {
    const router = useRouter();
    const supabase = createClient();

    // Wizard State
    const [step, setStep] = useState(1);
    const totalSteps = 4;
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [students, setStudents] = useState<any[]>([]);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        trigger,
        formState: { errors }
    } = useForm<FormData>({
        resolver: zodResolver(contractSchema),
        defaultValues: {
            contractType: "annual",
            subjects: [],
            agreedToTerms: false,
            agreedToPrivacy: false,
            parentSignatureName: ""
        }
    });

    // Form Watches for Dynamic Calculation
    const selectedSubjects = watch("subjects");
    const contractType = watch("contractType");
    const selectedStudentId = watch("studentId");

    const selectedStudent = students.find(s => s.id === selectedStudentId);

    // Dynamic Pricing State
    const [fees, setFees] = useState({ base: 0, system: 1000, admission: 0, total: 0 });

    // Fetch related students on mount
    useEffect(() => {
        const fetchStudents = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();

            if (profile?.role === 'admin') {
                const { data: allStudents } = await supabase
                    .from('users')
                    .select('id, first_name, last_name, grade_level')
                    .eq('role', 'student')
                    .order('last_name', { ascending: true });
                if (allStudents) setStudents(allStudents);
            } else {
                // Fetch family connections where parent_id is the current user
                const { data: connections } = await supabase
                    .from('family_connections')
                    .select('student_id')
                    .eq('parent_id', user.id);

                if (connections && connections.length > 0) {
                    const studentIds = connections.map(conn => conn.student_id);

                    // Fetch the student details using the IDs
                    const { data: studentsData } = await supabase
                        .from('users')
                        .select('id, first_name, last_name, grade_level')
                        .in('id', studentIds);

                    if (studentsData) setStudents(studentsData);
                }
            }
        };
        fetchStudents();
    }, [supabase]);

    // Calculate Fees when subjects or student changes
    useEffect(() => {
        if (!selectedStudent || selectedSubjects.length === 0) {
            setFees({ base: 0, system: 1000, admission: 0, total: 0 });
            return;
        }

        const isThirdGrade = selectedStudent.grade_level === "中3";
        let base = 0;

        if (selectedSubjects.length > 0) {
            base = (isThirdGrade ? 13000 : 10000) * selectedSubjects.length;
        }

        const admission = contractType === "annual" ? 3300 : 0;
        const system = 1000;

        setFees({
            base,
            system,
            admission,
            total: base + system + admission
        });

    }, [selectedSubjects, contractType, selectedStudent]);

    const handleNext = async () => {
        let valid = false;
        if (step === 1) valid = await trigger(["studentId"]);
        if (step === 2) valid = await trigger(["contractType", "subjects"]);
        if (step === 3) valid = await trigger(["agreedToTerms", "agreedToPrivacy"]);

        if (valid && step < totalSteps) setStep(step + 1);
    };

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        setSubmitError(null);

        try {
            const res = await fetch("/api/contracts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentId: data.studentId,
                    contractType: data.contractType,
                    subjects: data.subjects,
                    parentSignatureName: data.parentSignatureName,
                    agreedToTerms: data.agreedToTerms,
                    agreedToPrivacy: data.agreedToPrivacy,
                    monthlyFee: fees.base,
                    admissionFee: fees.admission,
                    systemFee: fees.system
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "契約データの送信に失敗しました");
            }

            // Success redirect
            router.push("/dashboard?message=契約が完了しました");

        } catch (error: any) {
            console.error("Submission error:", error);
            setSubmitError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 mb-2">
                オンライン入会・契約
            </h1>

            {/* Stepper UI */}
            <div className="w-full flex justify-between items-center mb-8 relative px-2">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full -z-10"></div>
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-lapis-500 rounded-full -z-10 transition-all duration-300"
                    style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
                ></div>

                {['生徒選択', 'コース・料金', '規約同意', '電子署名'].map((label, i) => (
                    <div key={i} className="flex flex-col items-center relative gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step > i ? 'bg-lapis-500 text-white ring-4 ring-white dark:ring-black/30' : step === i + 1 ? 'bg-white border-2 border-lapis-500 text-lapis-600 ring-4 ring-white dark:ring-black/30' : 'bg-gray-100 text-gray-400 border-2 border-transparent ring-4 ring-white dark:ring-black/30'}`}>
                            {step > i + 1 ? '✓' : i + 1}
                        </div>
                        <span className={`absolute top-10 whitespace-nowrap text-[10px] md:text-xs font-medium ${step >= i + 1 ? 'text-lapis-900 dark:text-lapis-100' : 'text-gray-400'}`}>
                            {label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Added a spacer since the labels are absolutely positioned */}
            <div className="h-6"></div>

            <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-6 md:p-8 rounded-2xl shadow-sm backdrop-blur-xl">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* STEP 1: Student Selection */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <h2 className="text-xl font-bold">1. 指導の対象となる生徒を選択してください</h2>

                            <div className="grid gap-3">
                                {students.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">生徒データが見つかりません</div>
                                ) : (
                                    students.map((student) => (
                                        <label key={student.id} className={`p-4 border-2 rounded-xl cursor-pointer flex items-center gap-4 transition-all ${selectedStudentId === student.id ? 'border-lapis-500 bg-lapis-50/50 dark:bg-lapis-900/20' : 'border-gray-200 dark:border-gray-800 hover:border-lapis-300'}`}>
                                            <input
                                                type="radio"
                                                value={student.id}
                                                {...register("studentId")}
                                                className="w-5 h-5 text-lapis-500"
                                            />
                                            <div>
                                                <div className="font-bold text-lg">{student.last_name} {student.first_name}</div>
                                                <div className="text-sm text-gray-500">{student.grade_level || "学年未登録"}</div>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                            {errors.studentId && <p className="text-red-500 text-sm mt-1">{errors.studentId.message}</p>}
                        </div>
                    )}

                    {/* STEP 2: Course & Subject */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <h2 className="text-xl font-bold">2. コースと受講科目を選択してください</h2>

                            <div className="space-y-3">
                                <label className="block font-medium">契約タイプ</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`p-4 border-2 rounded-xl cursor-pointer text-center ${contractType === 'trial' ? 'border-lapis-500 bg-lapis-50' : 'border-gray-200'}`}>
                                        <input type="radio" value="trial" {...register("contractType")} className="sr-only" />
                                        <div className="font-bold">3月：1ヶ月お試し</div>
                                        <div className="text-xs text-gray-500 mt-1">自動更新なし / 入会金なし</div>
                                    </label>
                                    <label className={`p-4 border-2 rounded-xl cursor-pointer text-center ${contractType === 'annual' ? 'border-lapis-500 bg-lapis-50' : 'border-gray-200'}`}>
                                        <input type="radio" value="annual" {...register("contractType")} className="sr-only" />
                                        <div className="font-bold">4月：1年方針（月払い）</div>
                                        <div className="text-xs text-gray-500 mt-1">入会金 3,300円申し受けます</div>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block font-medium">受講科目 (複数選択可)</label>
                                <div className="flex gap-4">
                                    {['数学', '英語', '国語', '理科', '社会'].map(subject => (
                                        <label key={subject} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" value={subject} {...register("subjects")} className="w-5 h-5 rounded text-lapis-500 focus:ring-lapis-500" />
                                            <span>{subject}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.subjects && <p className="text-red-500 text-sm mt-1">{errors.subjects.message}</p>}
                            </div>

                            {/* Dynamic Pricing Estimate */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-800 mt-8">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                    お支払い見込み額 (税込)
                                </h3>

                                {selectedStudent && selectedSubjects.length > 0 ? (
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span>基本月謝 ({selectedStudent.grade_level} / {selectedSubjects.length}科目)</span>
                                            <span>{fees.base.toLocaleString()} 円</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>システム利用料 (月額)</span>
                                            <span>{fees.system.toLocaleString()} 円</span>
                                        </div>
                                        {fees.admission > 0 && (
                                            <div className="flex justify-between text-accent-600">
                                                <span>入会金 (初回のみ)</span>
                                                <span>{fees.admission.toLocaleString()} 円</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-200 dark:border-gray-700">
                                            <span>初回合計</span>
                                            <span className="text-lapis-600 dark:text-lapis-400">{fees.total.toLocaleString()} 円</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">生徒と科目を選択すると自動計算されます。</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Agreements */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <h2 className="text-xl font-bold">3. 規約と同意書の確認</h2>
                            <p className="text-sm text-gray-500">内容を最後までスクロールして確認し、同意のチェックを入れてください。</p>

                            {/* Terms */}
                            <div className="space-y-2">
                                <div className="h-48 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-serif leading-relaxed whitespace-pre-wrap">
                                    {TERMS_TEXT}
                                    {"\n\n".repeat(10)}
                                    【第16条】その他...
                                </div>
                                <label className="flex items-center gap-3 p-2 cursor-pointer">
                                    <input type="checkbox" {...register("agreedToTerms")} className="w-5 h-5 rounded text-lapis-500 focus:ring-lapis-500" />
                                    <span className="font-bold text-sm">システム利用規約および指導受託契約に同意します</span>
                                </label>
                                {errors.agreedToTerms && <p className="text-red-500 text-xs ml-8">{errors.agreedToTerms.message}</p>}
                            </div>

                            {/* Privacy */}
                            <div className="space-y-2">
                                <div className="h-48 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-serif leading-relaxed whitespace-pre-wrap">
                                    {PRIVACY_TEXT}
                                    {"\n\n".repeat(10)}
                                    【第10条】窓口...
                                </div>
                                <label className="flex items-center gap-3 p-2 cursor-pointer">
                                    <input type="checkbox" {...register("agreedToPrivacy")} className="w-5 h-5 rounded text-lapis-500 focus:ring-lapis-500" />
                                    <span className="font-bold text-sm">個人情報保護に関する同意書に同意します</span>
                                </label>
                                {errors.agreedToPrivacy && <p className="text-red-500 text-xs ml-8">{errors.agreedToPrivacy.message}</p>}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Digital Signature */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <h2 className="text-xl font-bold">4. 電子署名</h2>
                            <p className="text-sm text-gray-500 mb-8">
                                本入力をもって前項までの契約内容に法的に同意したものとみなされます。
                            </p>

                            <div className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-900/20 text-center space-y-6">
                                <div className="inline-block px-4 py-2 bg-lapis-100 dark:bg-lapis-900/40 text-lapis-700 dark:text-lapis-300 rounded-full text-sm font-bold mb-4">
                                    署名欄
                                </div>

                                <div className="max-w-xs mx-auto text-left">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">保護者氏名を入力してください</label>
                                    <input
                                        type="text"
                                        {...register("parentSignatureName")}
                                        placeholder="山田 太郎"
                                        className="w-full text-center text-xl tracking-widest font-serif border-b-2 border-lapis-500 bg-transparent px-2 py-3 focus:outline-none focus:border-lapis-700"
                                    />
                                    {errors.parentSignatureName && <p className="text-red-500 text-sm mt-2 text-center">{errors.parentSignatureName.message}</p>}
                                </div>

                                <div className="text-xs text-gray-400 mt-8">
                                    日付: {new Date().toLocaleDateString('ja-JP')}
                                    <br />
                                    IPアドレス等のログ情報を共に記録します。
                                </div>
                            </div>

                            {submitError && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
                                    {submitError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-4 pt-6 mt-8 border-t border-gray-100 dark:border-gray-800">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-50 flex-1 font-bold disabled:opacity-50"
                                disabled={isLoading}
                            >
                                戻る
                            </button>
                        )}

                        {step < totalSteps ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-6 py-3 rounded-xl bg-lapis-600 hover:bg-lapis-700 text-white flex-[2] font-bold shadow-lg shadow-lapis-500/30 transition-all active:scale-[0.98]"
                            >
                                次へ
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white flex-[2] font-bold shadow-lg shadow-success-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                                        契約を確定して送信
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                </form>
            </div>
        </div>
    );
}
