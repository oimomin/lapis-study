"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { FileSignature, Download, Calendar, Activity, CheckCircle2, XCircle, FileText, ShieldCheck } from "lucide-react";
import { ContractDownloadButton } from "@/components/contracts/ContractDownloadButton";

export default function ParentContractsPage() {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [contracts, setContracts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContracts = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("認証エラー: 再ログインしてください。");

                // Fetch contracts where parent_id matches the user
                const { data: contractsData, error: contractsError } = await supabase
                    .from('contracts')
                    .select(`
                        id,
                        contract_type,
                        subjects,
                        monthly_fee,
                        admission_fee,
                        system_fee,
                        status,
                        created_at,
                        student_id,
                        parent_signature_name,
                        ip_address,
                        contract_snapshot,
                        terms_snapshot,
                        privacy_snapshot
                    `)
                    .eq('parent_id', user.id)
                    .order('created_at', { ascending: false });

                if (contractsError) throw contractsError;

                // We need to fetch the student names. Since Parent RLS on users table 
                // requires a record in family_connections, this will cleanly fetch only 
                // the linked students.
                if (contractsData && contractsData.length > 0) {
                    const studentIds = contractsData.map(c => c.student_id);
                    const { data: studentsData, error: studentsError } = await supabase
                        .from('users')
                        .select('id, last_name, first_name, grade_level')
                        .in('id', studentIds);

                    if (studentsError) throw studentsError;

                    // Merge student details into contract object
                    const mergedContracts = contractsData.map(contract => ({
                        ...contract,
                        student: studentsData?.find(s => s.id === contract.student_id)
                    }));

                    setContracts(mergedContracts);
                } else {
                    setContracts([]);
                }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                console.error("契約情報の取得に失敗しました:", err);
                setError(err.message || "データの取得に失敗しました。");
            } finally {
                setIsLoading(false);
            }
        };

        fetchContracts();
    }, [supabase]);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'active':
                return { color: 'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-300', label: '利用中', icon: <CheckCircle2 className="w-4 h-4" /> };
            case 'pending':
                return { color: 'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-300', label: '手続き中', icon: <Activity className="w-4 h-4" /> };
            case 'canceled':
            case 'terminated':
                return { color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', label: '解約済', icon: <XCircle className="w-4 h-4" /> };
            default:
                return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', label: status, icon: null };
        }
    };

    const getContractTypeLabel = (type: string) => {
        return type === 'trial' ? '3月 お試し契約' : '4月〜 年間契約';
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lapis-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50 flex items-center gap-3">
                    <FileSignature className="w-8 h-8 text-lapis-600" />
                    契約確認
                </h1>
                <Link
                    href="/dashboard/contracts/new"
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-lapis-600 hover:bg-lapis-700 text-white font-bold shadow-md shadow-lapis-500/20 transition-all active:scale-[0.98]"
                >
                    + 新規契約の手続き
                </Link>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800">
                    {error}
                </div>
            )}

            {contracts.length === 0 && !error ? (
                <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-12 rounded-2xl shadow-sm backdrop-blur-xl text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <FileSignature className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">契約情報がありません</h3>
                    <p className="text-gray-500 mb-6">現在、オンラインで締結された契約は存在しません。</p>
                    <Link
                        href="/dashboard/contracts/new"
                        className="inline-flex font-bold text-lapis-600 hover:text-lapis-800 hover:underline dark:text-lapis-400 dark:hover:text-lapis-300"
                    >
                        新しい契約のお手続きはこちら →
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6">
                    {contracts.map(contract => {
                        const statusConfig = getStatusConfig(contract.status);
                        const totalFee = contract.monthly_fee + contract.system_fee + contract.admission_fee;

                        return (
                            <div key={contract.id} className="bg-white/80 dark:bg-black/60 border border-gray-200 dark:border-gray-800 p-6 sm:p-8 rounded-2xl shadow-sm backdrop-blur-xl hover:shadow-md transition-shadow">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-xl font-bold">
                                                {contract.student ? `${contract.student.last_name} ${contract.student.first_name}` : '不明な生徒'} 様
                                            </h2>
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}>
                                                {statusConfig.icon}
                                                {statusConfig.label}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4" />
                                            契約日: {new Date(contract.created_at).toLocaleDateString('ja-JP')}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 min-w-[200px] mt-4 sm:mt-0">
                                        <ContractDownloadButton
                                            type="contract"
                                            data={{
                                                contractType: contract.contract_type,
                                                studentName: contract.student ? `${contract.student.last_name} ${contract.student.first_name}` : '生徒氏名',
                                                parentName: contract.parent_signature_name || '保護者氏名',
                                                signatureName: contract.parent_signature_name || '署名済',
                                                subjects: contract.subjects || [],
                                                monthlyFee: contract.monthly_fee || 0,
                                                admissionFee: contract.admission_fee || 0,
                                                systemFee: contract.system_fee || 0,
                                                signedAt: contract.created_at,
                                                ipAddress: contract.ip_address || "記録なし",
                                                termsSnapshot: contract.terms_snapshot,
                                                privacySnapshot: contract.privacy_snapshot,
                                                contractSnapshot: contract.contract_snapshot,
                                            }}
                                            fileName={`LapisStudy_指導受託契約書_${contract.student ? contract.student.first_name : '控'}.pdf`}
                                            label="契約書をダウンロード"
                                            className="w-full flex justify-center items-center gap-2 px-3 py-2 bg-lapis-600 hover:bg-lapis-700 text-white rounded-lg transition-colors font-bold text-xs"
                                        />
                                        <ContractDownloadButton
                                            type="terms"
                                            data={{
                                                contractType: contract.contract_type,
                                                studentName: contract.student ? `${contract.student.last_name} ${contract.student.first_name}` : '生徒氏名',
                                                parentName: contract.parent_signature_name || '保護者氏名',
                                                signatureName: contract.parent_signature_name || '署名済',
                                                subjects: contract.subjects || [],
                                                monthlyFee: contract.monthly_fee || 0,
                                                admissionFee: contract.admission_fee || 0,
                                                systemFee: contract.system_fee || 0,
                                                signedAt: contract.created_at,
                                                ipAddress: contract.ip_address || "記録なし",
                                                termsSnapshot: contract.terms_snapshot,
                                                privacySnapshot: contract.privacy_snapshot,
                                                contractSnapshot: contract.contract_snapshot,
                                            }}
                                            fileName={`システム利用規約_${contract.student ? contract.student.first_name : '控'}.pdf`}
                                            label="利用規約をダウンロード"
                                            className="w-full flex justify-center items-center gap-2 px-3 py-2 border border-lapis-200 text-lapis-700 hover:bg-lapis-50 rounded-lg transition-colors font-bold text-xs"
                                        />
                                        <ContractDownloadButton
                                            type="privacy"
                                            data={{
                                                contractType: contract.contract_type,
                                                studentName: contract.student ? `${contract.student.last_name} ${contract.student.first_name}` : '生徒氏名',
                                                parentName: contract.parent_signature_name || '保護者氏名',
                                                signatureName: contract.parent_signature_name || '署名済',
                                                subjects: contract.subjects || [],
                                                monthlyFee: contract.monthly_fee || 0,
                                                admissionFee: contract.admission_fee || 0,
                                                systemFee: contract.system_fee || 0,
                                                signedAt: contract.created_at,
                                                ipAddress: contract.ip_address || "記録なし",
                                                termsSnapshot: contract.terms_snapshot,
                                                privacySnapshot: contract.privacy_snapshot,
                                                contractSnapshot: contract.contract_snapshot,
                                            }}
                                            fileName={`個人情報保護方針同意書_${contract.student ? contract.student.first_name : '控'}.pdf`}
                                            label="個人情報方針をダウンロード"
                                            className="w-full flex justify-center items-center gap-2 px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-bold text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">契約区分</p>
                                        <p className="font-semibold">{getContractTypeLabel(contract.contract_type)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">受講教科 ({contract.subjects?.length || 0}科目)</p>
                                        <div className="flex flex-wrap gap-1">
                                            {contract.subjects?.map((sub: string) => (
                                                <span key={sub} className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                                                    {sub}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right sm:text-left">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">基本月謝 (システム料込)</p>
                                        <p className="font-semibold text-lg">{(contract.monthly_fee + contract.system_fee).toLocaleString()} <span className="text-sm font-normal text-gray-500">円</span></p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">初回お支払い合計</p>
                                        <p className="font-extrabold text-xl text-lapis-600 dark:text-lapis-400">{totalFee.toLocaleString()} <span className="text-sm font-normal text-gray-500">円</span></p>
                                        {contract.admission_fee > 0 && (
                                            <p className="text-xs text-gray-400 mt-1">(内、入会金 {contract.admission_fee.toLocaleString()}円)</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
