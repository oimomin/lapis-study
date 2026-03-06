import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { PdfMarkdown } from './PdfMarkdown';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// フォントの登録
try {
    Font.register({
        family: 'BIZ UDMincho',
        src: '/BIZUDMincho-Regular.ttf', // TTCの代わりに単独のTTFファイルを指定します
    });
} catch (e) {
    console.warn("Font registration failed (expected during SSR/Build):", e);
}

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 40,
        fontFamily: 'BIZ UDMincho',
        fontSize: 10,
        lineHeight: 1.5,
    },
    header: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    content: {
        marginBottom: 20,
        whiteSpace: 'pre-wrap',
    },
    table: {
        width: "100%",
        marginTop: 30,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#000",
        borderBottomWidth: 0,
        borderRightWidth: 0,
    },
    tableRow: {
        flexDirection: "row",
    },
    tableColTitle: {
        width: "20%",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#000",
        borderTopWidth: 0,
        borderLeftWidth: 0,
        backgroundColor: "#f9fafb",
        padding: 6,
        textAlign: "center",
    },
    tableColHeader: {
        width: "40%",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#000",
        borderTopWidth: 0,
        borderLeftWidth: 0,
        backgroundColor: "#f9fafb",
        padding: 6,
        textAlign: "center",
        fontWeight: "bold",
    },
    tableCell: {
        width: "40%",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#000",
        borderTopWidth: 0,
        borderLeftWidth: 0,
        padding: 6,
        textAlign: "center",
    },
    ipText: {
        fontSize: 8,
        color: '#666',
        marginTop: 8,
        textAlign: 'right',
    },
    footerText: {
        marginTop: 20,
        fontSize: 8,
        color: '#666',
        textAlign: 'center',
    }
});

type ContractData = {
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

export const ContractPDF = ({ data }: { data: ContractData }) => {
    const signedDate = data.signedAt ? new Date(data.signedAt) : new Date();
    const formattedDate = format(signedDate, 'yyyy年MM月dd日', { locale: ja });

    // 契約期間の計算 (仮)
    const endDate = new Date(signedDate);
    if (data.contractType === 'trial') {
        endDate.setMonth(endDate.getMonth() + 1);
    } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
    }
    const formattedEndDate = format(endDate, 'yyyy年MM月dd日', { locale: ja });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.header}>指導受託契約書</Text>

                <View style={styles.content}>
                    <PdfMarkdown>{data.contractSnapshot || "（指導受託契約書の記録がありません）"}</PdfMarkdown>
                </View>

                {/* 3-Column Signature Table */}
                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        <View style={styles.tableColTitle}><Text></Text></View>
                        <View style={styles.tableColHeader}><Text>当方：Lapis Study</Text></View>
                        <View style={styles.tableColHeader}><Text>保護者</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={styles.tableColTitle}><Text>氏名</Text></View>
                        <View style={styles.tableCell}><Text>佐藤 みのり</Text></View>
                        <View style={styles.tableCell}><Text>{data.parentName || data.signatureName}</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={styles.tableColTitle}><Text>住所</Text></View>
                        <View style={styles.tableCell}><Text>秋田県大仙市若竹町30番10号</Text></View>
                        <View style={styles.tableCell}><Text>{data.parentAddress || "【　　　　　　　　　　　　　】"}</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={styles.tableColTitle}><Text>連絡先</Text></View>
                        <View style={styles.tableCell}><Text>080-1679-3764</Text></View>
                        <View style={styles.tableCell}><Text>{data.parentPhone || "【　　　　　　　　　　　　　】"}</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={styles.tableColTitle}><Text>日付</Text></View>
                        <View style={styles.tableCell}><Text>{formattedDate}</Text></View>
                        <View style={styles.tableCell}><Text>{formattedDate}</Text></View>
                    </View>
                </View>
                <Text style={styles.ipText}>電子署名タイムスタンプ: {format(signedDate, 'yyyy-MM-dd HH:mm:ss')} (IP: {data.ipAddress})</Text>

                <Text style={styles.footerText}>
                    本書はシステム上での同意をもって法的に有効な電子契約として成立しています。
                </Text>
            </Page>
        </Document>
    );
};
