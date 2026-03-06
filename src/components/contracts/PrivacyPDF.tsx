import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { PdfMarkdown } from './PdfMarkdown';

// Register the TrueType font
Font.register({
    family: 'BIZ UDMincho',
    src: '/BIZUDMincho-Regular.ttf',
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'BIZ UDMincho',
        fontSize: 10,
        lineHeight: 1.6,
        color: '#111827',
    },
    header: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    content: {
        marginBottom: 20,
        whiteSpace: 'pre-wrap',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 8,
    }
});

interface PrivacyPDFProps {
    privacySnapshot: string;
}

export function PrivacyPDF({ privacySnapshot }: PrivacyPDFProps) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.header}>個人情報保護に関する同意書</Text>
                <View style={styles.content}>
                    <PdfMarkdown>{privacySnapshot}</PdfMarkdown>
                </View>
                <Text style={styles.footer}>
                    Lapis Study
                </Text>
            </Page>
        </Document>
    );
}
