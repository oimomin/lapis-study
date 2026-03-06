"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";
import { ContractDownloadButton } from "@/components/contracts/ContractDownloadButton";
import type { ContractData } from "@/components/contracts/ContractDownloadButton";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Define schema matching the API
const contractSchema = z.object({
    studentId: z.string().uuid("対象の生徒を選択してください"),
    contractType: z.enum(["trial", "annual"]),
    subjects: z.array(z.string()).min(1, "1科目以上選択してください"),
    parentSignatureName: z.string().min(1, "保護者氏名を署名として入力してください"),
    parentAddress: z.string().min(1, "保護者の住所を入力してください"),
    parentPhone: z.string().regex(/^0\d{1,4}-?\d{1,4}-?\d{3,4}$/, "有効な電話番号を入力してください"),
    agreedToTerms: z.boolean().refine(val => val === true, { message: "システム利用規約に同意する必要があります" }),
    agreedToPrivacy: z.boolean().refine(val => val === true, { message: "個人情報保護に同意する必要があります" }),
    agreedToContract: z.boolean().refine(val => val === true, { message: "指導受託契約内容に同意する必要があります" })
});

type FormData = z.infer<typeof contractSchema>;

type Student = {
    id: string;
    first_name: string;
    last_name: string;
    grade_level?: string;
};

// The mock constants have been removed; fetching from DB instead.

export default function NewContractPage() {
    const supabase = createClient();

    // Wizard State
    const [step, setStep] = useState(1);
    const totalSteps = 5;
    const [isLoading, setIsLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [completedContractData, setCompletedContractData] = useState<ContractData | null>(null);

    // Terms & Privacy
    const [termsText, setTermsText] = useState("読み込み中...");
    const [privacyText, setPrivacyText] = useState("読み込み中...");
    const [baseTemplates, setBaseTemplates] = useState({ trial: "", annual: "" });
    const [contractText, setContractText] = useState("読み込み中...");

    const {
        register,
        handleSubmit,
        watch,
        trigger,
        formState: { errors }
    } = useForm<FormData>({
        resolver: zodResolver(contractSchema),
        defaultValues: {
            contractType: "annual",
            subjects: [],
            agreedToTerms: false,
            agreedToPrivacy: false,
            agreedToContract: false,
            parentSignatureName: "",
            parentAddress: "",
            parentPhone: ""
        }
    });

    // Form Watches for Dynamic Calculation
    const selectedSubjects = watch("subjects");
    const contractType = watch("contractType");
    const selectedStudentId = watch("studentId");
    const parentSignatureName = watch("parentSignatureName");

    const selectedStudent = students.find((s: Student) => s.id === selectedStudentId);

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

            // Fetch System Settings (Terms and Privacy)
            const { data: settings } = await supabase
                .from('system_settings')
                .select('terms_content, privacy_content, contract_template_trial, contract_template_annual')
                .eq('id', 1)
                .single();
            if (settings) {
                setTermsText(settings.terms_content || "読み込み中...");
                setPrivacyText(settings.privacy_content || "読み込み中...");
                setBaseTemplates({
                    trial: settings.contract_template_trial || "",
                    annual: settings.contract_template_annual || ""
                });
            }
        };
        fetchStudents();
    }, [supabase]);

    useEffect(() => {
        let text = baseTemplates[contractType as "trial" | "annual"] || "";

        const today = new Date();
        const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

        let contractPeriod = "";
        if (contractType === 'trial') {
            contractPeriod = "1. 本契約は1ヶ月間のお試し契約とします。\n2. 本契約は期間満了により終了します（自動更新しません）。\n3. 継続を希望する場合は、期間終了の1ヶ月前までに当方へ申し出てください。継続時は別途1年間契約または進級・卒業まで契約へ切り替わります。";
        } else if (contractType === 'annual') {
            contractPeriod = "1. 本契約の期間は1年間とします。\n2. 本契約は、期間満了の1ヶ月前までに双方から更新拒絶の申し出がない場合、同一条件で1年間自動更新します。";
        }

        const replaceMap: Record<string, string> = {
            "{{作成日}}": formattedDate,
            "{{生徒氏名}}": selectedStudent ? `${selectedStudent.last_name || ''} ${selectedStudent.first_name || ''}`.trim() : "(生徒未選択)",
            "{{学年}}": selectedStudent ? (selectedStudent.grade_level || "未設定") : "(学年)",
            "{{保護者氏名}}": parentSignatureName || "[電子署名後に反映]",
            "{{入会金}}": fees.admission.toLocaleString(),
            "{{月謝}}": fees.base.toLocaleString(),
            "{{システム利用料}}": fees.system.toLocaleString(),
            "{{選択科目}}": selectedSubjects.length > 0 ? selectedSubjects.join('・') : "未選択",
            "{{契約期間}}": contractPeriod,
            "{{IPアドレス}}": "[電子署名後に記録されます]"
        };

        Object.keys(replaceMap).forEach(key => {
            text = text.replaceAll(key, replaceMap[key]);
        });

        setContractText(text);
    }, [fees, contractType, baseTemplates, selectedStudent, selectedSubjects, parentSignatureName]);

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
        if (step === 3) valid = await trigger(["agreedToTerms", "agreedToPrivacy", "agreedToContract"]);

        if (valid && step < totalSteps) {
            setStep(step + 1);
        }
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
                    parentAddress: data.parentAddress,
                    parentPhone: data.parentPhone,
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

            const responseData = await res.json();

            // Format for PDF button
            const pdfData = {
                contractType: data.contractType,
                studentName: selectedStudent?.last_name + " " + selectedStudent?.first_name,
                parentName: data.parentSignatureName,
                signatureName: data.parentSignatureName,
                parentAddress: data.parentAddress,
                parentPhone: data.parentPhone,
                subjects: data.subjects,
                monthlyFee: fees.base,
                admissionFee: fees.admission,
                systemFee: fees.system,
                signedAt: new Date().toISOString(),
                ipAddress: responseData.contract?.ip_address || "記録しました",
                termsSnapshot: responseData.contract?.terms_snapshot,
                privacySnapshot: responseData.contract?.privacy_snapshot,
                contractSnapshot: responseData.contract?.contract_snapshot
            };

            setCompletedContractData(pdfData);

            // Go to step 5 indicating completion
            setStep(5);

        } catch (error: unknown) {
            console.error("Submission error:", error);
            if (error instanceof Error) {
                setSubmitError(error.message);
            } else {
                setSubmitError("不明なエラーが発生しました");
            }
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

                {['生徒選択', 'コース・料金', '規約同意', '電子署名', '完了'].map((label, i) => (
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
                                    students.map((student: Student) => (
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
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            <h2 className="text-xl font-bold">3. 規約と同意書の確認</h2>
                            <p className="text-sm text-gray-500">保護者ご本人様による、各規約および契約内容のご確認をお願いいたします。</p>

                            {/* Terms */}
                            <div className="space-y-2">
                                <h3 className="font-bold border-l-4 border-lapis-500 pl-3">システム利用規約</h3>
                                <div className="h-48 overflow-y-auto p-4 md:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner">
                                    <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:text-lapis-900 dark:prose-headings:text-lapis-100 prose-a:text-lapis-600">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {termsText}
                                        </ReactMarkdown>
                                    </article>
                                </div>
                                <label className="flex items-center gap-3 p-2 cursor-pointer bg-lapis-50 dark:bg-lapis-900/30 rounded-lg border border-transparent hover:border-lapis-200 dark:hover:border-lapis-800 transition-colors">
                                    <input type="checkbox" {...register("agreedToTerms")} className="w-5 h-5 rounded text-lapis-500 focus:ring-lapis-500" />
                                    <span className="font-bold text-sm">システム利用規約に同意します</span>
                                </label>
                                {errors.agreedToTerms && <p className="text-red-500 text-xs ml-8">{errors.agreedToTerms.message}</p>}
                            </div>

                            {/* Privacy */}
                            <div className="space-y-2">
                                <h3 className="font-bold border-l-4 border-lapis-500 pl-3">個人情報保護に関する同意書</h3>
                                <div className="h-48 overflow-y-auto p-4 md:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner">
                                    <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:text-lapis-900 dark:prose-headings:text-lapis-100 prose-a:text-lapis-600">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {privacyText}
                                        </ReactMarkdown>
                                    </article>
                                </div>
                                <label className="flex items-center gap-3 p-2 cursor-pointer bg-lapis-50 dark:bg-lapis-900/30 rounded-lg border border-transparent hover:border-lapis-200 dark:hover:border-lapis-800 transition-colors">
                                    <input type="checkbox" {...register("agreedToPrivacy")} className="w-5 h-5 rounded text-lapis-500 focus:ring-lapis-500" />
                                    <span className="font-bold text-sm">個人情報保護に関する同意書に同意します</span>
                                </label>
                                {errors.agreedToPrivacy && <p className="text-red-500 text-xs ml-8">{errors.agreedToPrivacy.message}</p>}
                            </div>

                            {/* Contract Preview */}
                            <div className="space-y-2 mt-8">
                                <h3 className="font-bold border-l-4 border-lapis-500 pl-3">指導受託契約書 (事前確認)</h3>
                                <div className="h-64 overflow-y-auto p-4 md:p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner">
                                    <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:text-lapis-900 dark:prose-headings:text-lapis-100 prose-a:text-lapis-600">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {contractText}
                                        </ReactMarkdown>
                                    </article>
                                </div>
                                <label className="flex items-center gap-3 p-2 cursor-pointer bg-lapis-50 dark:bg-lapis-900/30 rounded-lg border border-transparent hover:border-lapis-200 dark:hover:border-lapis-800 transition-colors mt-2">
                                    <input type="checkbox" {...register("agreedToContract")} className="w-5 h-5 rounded text-lapis-500 focus:ring-lapis-500" />
                                    <span className="font-bold text-sm text-lapis-900 dark:text-lapis-100">指導受託契約内容を確認し、同意します</span>
                                </label>
                                {errors.agreedToContract && <p className="text-red-500 text-xs ml-8">{errors.agreedToContract.message}</p>}
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

                                <div className="max-w-xs mx-auto text-left mt-6">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">住所</label>
                                    <input
                                        type="text"
                                        {...register("parentAddress")}
                                        placeholder="秋田県大仙市..."
                                        className="w-full text-center text-md font-serif border-b-2 border-gray-300 bg-transparent px-2 py-2 focus:outline-none focus:border-lapis-500"
                                    />
                                    {errors.parentAddress && <p className="text-red-500 text-sm mt-1 text-center">{errors.parentAddress.message}</p>}
                                </div>

                                <div className="max-w-xs mx-auto text-left mt-6">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">電話番号</label>
                                    <input
                                        type="tel"
                                        {...register("parentPhone")}
                                        placeholder="090-1234-5678"
                                        className="w-full text-center text-md tracking-wider font-serif border-b-2 border-gray-300 bg-transparent px-2 py-2 focus:outline-none focus:border-lapis-500"
                                    />
                                    {errors.parentPhone && <p className="text-red-500 text-sm mt-1 text-center">{errors.parentPhone.message}</p>}
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

                    {/* STEP 5: Success & Download */}
                    {step === 5 && completedContractData && (
                        <div className="space-y-8 animate-in zoom-in-95 duration-500 text-center py-8">
                            <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(74,222,128,0.3)]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                            </div>

                            <div>
                                <h2 className="text-2xl font-extrabold text-lapis-900 dark:text-lapis-50 mb-4">契約が完了しました</h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto">
                                    ご契約いただき誠にありがとうございます。以下のボタンから各種控え書類（PDF）をダウンロードして保管してください。
                                </p>
                            </div>

                            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                                <ContractDownloadButton
                                    type="contract"
                                    data={completedContractData}
                                    fileName={`指導受託契約書_${selectedStudent?.last_name || ''}_${new Date().toISOString().split('T')[0]}.pdf`}
                                    label="指導受託契約書 をダウンロード"
                                    className="w-full flex justify-center items-center gap-2 px-6 py-4 bg-lapis-600 hover:bg-lapis-700 text-white rounded-xl shadow-lg transition-colors font-bold text-lg"
                                />
                                <ContractDownloadButton
                                    type="terms"
                                    data={completedContractData}
                                    fileName={`システム利用規約_${new Date().toISOString().split('T')[0]}.pdf`}
                                    label="システム利用規約 をダウンロード"
                                    className="w-full flex justify-center items-center gap-2 px-6 py-3 border-2 border-lapis-200 dark:border-lapis-800 text-lapis-700 dark:text-lapis-300 hover:bg-lapis-50 dark:hover:bg-lapis-900/30 rounded-xl transition-colors font-bold"
                                />
                                <ContractDownloadButton
                                    type="privacy"
                                    data={completedContractData}
                                    fileName={`個人情報保護方針同意書_${new Date().toISOString().split('T')[0]}.pdf`}
                                    label="個人情報保護方針同意書 をダウンロード"
                                    className="w-full flex justify-center items-center gap-2 px-6 py-3 border-2 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/30 rounded-xl transition-colors font-bold"
                                />
                            </div>

                            <div className="pt-8">
                                <Link
                                    href="/dashboard"
                                    className="text-lapis-600 hover:text-lapis-700 font-bold hover:underline"
                                >
                                    ダッシュボードへ戻る
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    {step < 5 && (
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

                            {step < 4 ? (
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
                    )}

                </form>
            </div>
        </div>
    );
}
