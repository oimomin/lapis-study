import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    h1: { fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
    h2: { fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
    h3: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
    p: { fontSize: 10, marginBottom: 6, lineHeight: 1.6 },
    li: {
        flexDirection: 'row',
        marginBottom: 4,
        paddingLeft: 10
    },
    liBullet: {
        width: 15,
        fontSize: 10,
        lineHeight: 1.6
    },
    liText: {
        flex: 1,
        fontSize: 10,
        lineHeight: 1.6
    }
});

interface PdfMarkdownProps {
    children: string;
}

export function PdfMarkdown({ children }: PdfMarkdownProps) {
    if (!children) return null;

    // Remove bold markers for cleaner PDF text
    const cleanText = children.replace(/\*\*(.*?)\*\*/g, '$1');
    const lines = cleanText.split('\n');
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Headings
        if (line.startsWith('# ')) {
            elements.push(<Text key={i} style={styles.h1}>{line.substring(2)}</Text>);
        } else if (line.startsWith('## ')) {
            elements.push(<Text key={i} style={styles.h2}>{line.substring(3)}</Text>);
        } else if (line.startsWith('### ')) {
            elements.push(<Text key={i} style={styles.h3}>{line.substring(4)}</Text>);
        }
        // List items
        else if (line.startsWith('- ')) {
            elements.push(
                <View key={i} style={styles.li}>
                    <Text style={styles.liBullet}>・</Text>
                    <Text style={styles.liText}>{line.substring(2)}</Text>
                </View>
            );
        } else if (line.match(/^\d+\.\s/)) {
            const match = line.match(/^(\d+\.)\s(.*)/);
            if (match) {
                elements.push(
                    <View key={i} style={styles.li}>
                        <Text style={styles.liBullet}>{match[1]}</Text>
                        <Text style={styles.liText}>{match[2]}</Text>
                    </View>
                );
            }
        }
        // Normal paragraph
        else {
            elements.push(<Text key={i} style={styles.p}>{line}</Text>);
        }
    }

    return <View>{elements}</View>;
}
