import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from "../context/ThemeContext"; // Import your global hook

export default function HelpScreen() {
    // Access global theme state
    const { theme, isDarkMode } = useAppTheme();

    const playAudioHelp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const helpText = "Help and Tips. Top tips: Ensure bright light. Hold the note flat. The app recognizes 10, 20, 50, 100, 200, and 500 Rupee notes.";
        Speech.speak(helpText, { language: 'en-IN', rate: 0.9 });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header with Audio Trigger */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Help Center</Text>
                <Pressable onPress={playAudioHelp} style={[styles.audioButton, { backgroundColor: theme.card }]}>
                    <Ionicons name="volume-high" size={28} color={theme.tint} />
                    <Text style={{ color: theme.tint, fontWeight: '600' }}>Listen</Text>
                </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>

                <Section title="Pro Scanning Tips" theme={theme}>
                    <InstructionItem
                        icon="sunny"
                        text="Natural daylight is best. Avoid yellow dim bulbs."
                        theme={theme}
                    />
                    <InstructionItem
                        icon="scan"
                        text="Smooth out folded notes. Flat notes scan 2x faster."
                        theme={theme}
                    />
                    <InstructionItem
                        icon="phone-portrait"
                        text="Keep your arm tucked in to reduce camera shake."
                        theme={theme}
                    />
                </Section>

                <Section title="Note Identification" theme={theme}>
                    <InstructionItem
                        icon="cash"
                        text="NoteVision supports all new Mahatma Gandhi (New) Series notes."
                        theme={theme}
                    />
                    <InstructionItem
                        icon="hand-right"
                        text="Feel the raised print near the Ashoka Pillar to align the note."
                        theme={theme}
                    />
                </Section>

                <Section title="Gesture Shortcuts" theme={theme}>
                    <View style={[styles.gestureCard, { backgroundColor: theme.card, borderColor: theme.border }]}>

                        <View style={styles.gestureRow}>
                            <Ionicons name="arrow-back-outline" size={18} color={theme.tint} />
                            <Text style={[styles.gestureText, { color: theme.subtext }]}>SWIPE RIGHT: Scanner</Text>
                        </View>

                        <View style={styles.gestureRow}>
                            <Ionicons name="arrow-forward-outline" size={18} color={theme.tint} />
                            <Text style={[styles.gestureText, { color: theme.subtext }]}>SWIPE LEFT: Help</Text>
                        </View>


                    </View>
                </Section>
            </ScrollView>
        </View>
    );
}

// Sub-components
function Section({ title, children, theme }: any) {
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.tint }]}>{title}</Text>
            {children}
        </View>
    );
}

function InstructionItem({ icon, text, theme }: any) {
    return (
        <View style={[styles.instructionRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.iconBox, { backgroundColor: theme.tint + '20' }]}>
                <Ionicons name={icon} size={22} color={theme.tint} />
            </View>
            <Text style={[styles.instructionText, { color: theme.text }]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 32, fontWeight: "900" },
    audioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 12,
    },
    scroll: { padding: 24, paddingBottom: 100 },
    section: { marginTop: 30 },
    sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 15, textTransform: 'uppercase' },
    instructionRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
    },
    iconBox: { padding: 10, borderRadius: 12, marginRight: 15 },
    instructionText: { flex: 1, fontSize: 17, lineHeight: 24, fontWeight: '500' },
    gestureCard: {
        padding: 20,
        borderRadius: 20,
        borderStyle: 'dashed',
        borderWidth: 2,
    },
    gestureText: { fontSize: 16, fontWeight: '700' },
    gestureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    hint: { marginTop: 40, textAlign: "center", fontSize: 16, fontWeight: 'bold' },
});