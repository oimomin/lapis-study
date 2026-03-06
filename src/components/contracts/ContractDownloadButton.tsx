"use client";

import dynamic from "next/dynamic";
import { Download, FileText, ShieldCheck } from "lucide-react";
import { ContractPDF } from "./ContractPDF";
import { TermsPDF } from "./TermsPDF";
import { PrivacyPDF } from "./PrivacyPDF";

// Since @react-pdf/renderer generates blobs on the client side using browser APIs,
// we must load the PDFDownloadLink component dynamically with SSR disabled.
const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => (
            <button disabled className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm font-bold text-gray-400 cursor-wait whitespace-nowrap">
                <Download className="w-4 h-4 animate-pulse" />
                準備中...
            </button>
        )
    }
);

export type ContractData = {
    contractType: 'trial' | 'annual' | 'pending' | 'canceled';
    studentName: string;
    parentName: string;
    parentAddress?: string;
    parentPhone?: string;
    signatureName: string;
    subjects: string[];
    monthlyFee: number;
    admissionFee: number;
    systemFee: number;
    signedAt: string;
    ipAddress: string;
    termsSnapshot?: string;
    privacySnapshot?: string;
    contractSnapshot?: string;
};

interface Props {
    data: ContractData;
    fileName: string;
    className?: string;
    label?: string; // Customize button text
    type?: 'contract' | 'terms' | 'privacy'; // Which PDF to download
}

export function ContractDownloadButton({ data, fileName, className, label, type = 'contract' }: Props) {
    const baseClassName = className || "inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap";

    let documentElement = <ContractPDF data={data} />;
    let IconComponent = Download;

    if (type === 'terms') {
        documentElement = <TermsPDF termsSnapshot={data.termsSnapshot || ""} />;
        IconComponent = FileText;
    } else if (type === 'privacy') {
        documentElement = <PrivacyPDF privacySnapshot={data.privacySnapshot || ""} />;
        IconComponent = ShieldCheck;
    }

    return (
        <PDFDownloadLink
            document={documentElement}
            fileName={fileName}
            className={baseClassName}
        >
            {({ loading }: { loading: boolean }) =>
                loading ? (
                    <>
                        <Download className="w-4 h-4 animate-pulse" />
                        PDF構築中...
                    </>
                ) : (
                    <>
                        <IconComponent className="w-4 h-4" />
                        {label || '控（PDF）をダウンロード'}
                    </>
                )
            }
        </PDFDownloadLink>
    );
}
