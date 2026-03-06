"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function TermsSettingsPage() {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [contractTemplateAnnual, setContractTemplateAnnual] = useState("");
    const [contractTemplateTrial, setContractTemplateTrial] = useState("");
    const [termsContent, setTermsContent] = useState("");
    const [privacyContent, setPrivacyContent] = useState("");

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("system_settings")
                .select("contract_template_annual, contract_template_trial, terms_content, privacy_content")
                .eq("id", 1)
                .single();

            if (error) {
                console.error("Error fetching settings:", error);
                setError("設定の読み込みに失敗しました");
            } else if (data) {
                setContractTemplateAnnual(data.contract_template_annual || "");
                setContractTemplateTrial(data.contract_template_trial || "");
                setTermsContent(data.terms_content);
                setPrivacyContent(data.privacy_content);
            }
            setIsLoading(false);
        };
        fetchSettings();
    }, [supabase]);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        const { error } = await supabase
            .from("system_settings")
            .update({
                contract_template_annual: contractTemplateAnnual,
                contract_template_trial: contractTemplateTrial,
                terms_content: termsContent,
                privacy_content: privacyContent,
                updated_at: new Date().toISOString()
            })
            .eq("id", 1);

        if (error) {
            console.error("Error updating settings:", error);
            setError("保存に失敗しました：" + error.message);
        } else {
            setSuccessMessage("規約と同意書を保存しました");
            setTimeout(() => setSuccessMessage(null), 3000);
        }
        setIsSaving(false);
    };

    const handleExport = (content: string, filename: string) => {
        const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setter(event.target.result as string);
                setSuccessMessage(`${file.name} の読み込みに成功しました`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        };
        reader.onerror = () => {
            setError("ファイルの読み込みに失敗しました");
        };
        reader.readAsText(file);
        // Reset the input so the same file could be selected again if needed
        e.target.value = '';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-4 border-lapis-200 border-t-lapis-600 animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center bg-white/60 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm sticky top-4 z-10">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-lapis-900 dark:text-lapis-50">
                        規約・同意書の設定
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        ここで設定した文章が、新規契約時の画面と出力されるPDF書類に反映されます。<br />
                        指導受託契約書では <code>{`{{生徒氏名}}`}</code> のような変数を使用して、自動的に各契約の情報を差し込むことができます。
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-lapis-600 hover:bg-lapis-700 text-white rounded-xl font-bold shadow-lg shadow-lapis-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                    )}
                    保存する
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl">
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="p-4 bg-success-50 text-success-600 border border-success-200 rounded-xl">
                    {successMessage}
                </div>
            )}

            <div className="space-y-6">
                {/* Contract Template */}
                <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm backdrop-blur-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lapis-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" /></svg>
                            指導受託契約書 (1年間方針)
                        </h2>
                        <div className="flex gap-2">
                            <label className="text-xs flex items-center gap-1 text-lapis-600 hover:text-lapis-700 transition-colors bg-lapis-50 dark:bg-lapis-900/30 px-3 py-1.5 rounded-lg font-bold cursor-pointer border border-lapis-200 dark:border-lapis-800">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                MDアップロード
                                <input type="file" accept=".md" className="hidden" onChange={(e) => handleFileUpload(e, setContractTemplateAnnual)} />
                            </label>
                            <button onClick={() => handleExport(contractTemplateAnnual, "LapisStudy_指導受託契約書テンプレート_1年間.md")} className="text-xs flex items-center gap-1 text-gray-500 hover:text-lapis-600 transition-colors bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-bold">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                MDエクスポート
                            </button>
                        </div>
                    </div>

                    <div className="bg-lapis-50 dark:bg-lapis-900/30 border border-lapis-100 dark:border-lapis-800/50 rounded-xl p-4 text-sm text-lapis-800 dark:text-lapis-200">
                        <p className="font-bold mb-2">💡 利用可能な変数：</p>
                        <div className="flex flex-wrap gap-2 font-mono text-xs">
                            <span className="bg-white dark:bg-black/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{`{{生徒氏名}}`}</span>
                            <span className="bg-white dark:bg-black/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{`{{保護者氏名}}`}</span>
                            <span className="bg-white dark:bg-black/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{`{{作成日}}`}</span>
                            <span className="bg-white dark:bg-black/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{`{{契約期間}}`}</span>
                            <span className="bg-white dark:bg-black/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{`{{学年}}`}</span>
                            <span className="bg-white dark:bg-black/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{`{{選択科目}}`}</span>
                            <span className="bg-white dark:bg-black/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{`{{入会金}}`}</span>
                            <span className="bg-white dark:bg-black/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{`{{月謝}}`}</span>
                            <span className="bg-white dark:bg-black/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{`{{システム利用料}}`}</span>
                            <span className="bg-white dark:bg-black/50 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">{`{{IPアドレス}}`}</span>
                        </div>
                    </div>

                    <textarea
                        value={contractTemplateAnnual}
                        onChange={(e) => setContractTemplateAnnual(e.target.value)}
                        placeholder="指導受託契約書(1年間)のテンプレートを入力してください"
                        className="w-full h-[300px] p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-lapis-500 focus:border-lapis-500 font-serif text-sm leading-relaxed resize-none"
                    />
                </div>

                {/* Contract Template (Trial) */}
                <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm backdrop-blur-xl space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lapis-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" /></svg>
                            指導受託契約書 (1ヶ月お試し)
                        </h2>
                        <div className="flex gap-2">
                            <label className="text-xs flex items-center gap-1 text-lapis-600 hover:text-lapis-700 transition-colors bg-lapis-50 dark:bg-lapis-900/30 px-3 py-1.5 rounded-lg font-bold cursor-pointer border border-lapis-200 dark:border-lapis-800">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                MDアップロード
                                <input type="file" accept=".md" className="hidden" onChange={(e) => handleFileUpload(e, setContractTemplateTrial)} />
                            </label>
                            <button onClick={() => handleExport(contractTemplateTrial, "LapisStudy_指導受託契約書テンプレート_1ヶ月お試し.md")} className="text-xs flex items-center gap-1 text-gray-500 hover:text-lapis-600 transition-colors bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-bold">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                MDエクスポート
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={contractTemplateTrial}
                        onChange={(e) => setContractTemplateTrial(e.target.value)}
                        placeholder="指導受託契約書(1ヶ月お試し)のテンプレートを入力してください"
                        className="w-full h-[300px] p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-lapis-500 focus:border-lapis-500 font-serif text-sm leading-relaxed resize-none"
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Terms of Service */}
                    <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm backdrop-blur-xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lapis-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                システム利用規約
                            </h2>
                            <div className="flex gap-2">
                                <label className="text-xs flex items-center gap-1 text-lapis-600 hover:text-lapis-700 transition-colors bg-lapis-50 dark:bg-lapis-900/30 px-3 py-1.5 rounded-lg font-bold cursor-pointer border border-lapis-200 dark:border-lapis-800">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                    MDアップロード
                                    <input type="file" accept=".md" className="hidden" onChange={(e) => handleFileUpload(e, setTermsContent)} />
                                </label>
                                <button onClick={() => handleExport(termsContent, "LapisStudy_システム利用規約.md")} className="text-xs flex items-center gap-1 text-gray-500 hover:text-lapis-600 transition-colors bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-bold">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    MDエクスポート
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={termsContent}
                            onChange={(e) => setTermsContent(e.target.value)}
                            placeholder="システム利用規約の本文(Markdown)を入力してください"
                            className="w-full h-[400px] p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-lapis-500 focus:border-lapis-500 font-serif text-sm leading-relaxed resize-none"
                        />
                    </div>

                    {/* Privacy Policy */}
                    <div className="bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm backdrop-blur-xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lapis-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
                                個人情報保護に関する同意書
                            </h2>
                            <div className="flex gap-2">
                                <label className="text-xs flex items-center gap-1 text-lapis-600 hover:text-lapis-700 transition-colors bg-lapis-50 dark:bg-lapis-900/30 px-3 py-1.5 rounded-lg font-bold cursor-pointer border border-lapis-200 dark:border-lapis-800">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                    MDアップロード
                                    <input type="file" accept=".md" className="hidden" onChange={(e) => handleFileUpload(e, setPrivacyContent)} />
                                </label>
                                <button onClick={() => handleExport(privacyContent, "LapisStudy_個人情報保護に関する同意書.md")} className="text-xs flex items-center gap-1 text-gray-500 hover:text-lapis-600 transition-colors bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg font-bold">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    MDエクスポート
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={privacyContent}
                            onChange={(e) => setPrivacyContent(e.target.value)}
                            placeholder="個人情報保護方針の本文(Markdown)を入力してください"
                            className="w-full h-[400px] p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-lapis-500 focus:border-lapis-500 font-serif text-sm leading-relaxed resize-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
