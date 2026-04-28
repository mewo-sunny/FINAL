import React, { useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, AccessibilityInfo } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
// 1. Import Gesture Handler components
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAppTheme } from "./context/ThemeContext";

export default function SettingsScreen() {
    const router = useRouter();
    const { isDarkMode, theme, toggleTheme } = useAppTheme();
    const [isAutoRead, setIsAutoRead] = React.useState(true);
    // Guard: onGestureEvent fires every frame, so we need to prevent multiple back() calls
    const hasFiredRef = useRef(false);

    useFocusEffect(
        useCallback(() => {
            AccessibilityInfo.announceForAccessibility('Settings. Swipe down to close.');
            Speech.speak('Settings Menu');
            return () => Speech.stop();
        }, [])
    );

    // 2. Gesture Logic: swipe down to dismiss — guard against repeated calls
    const onGestureEvent = (event: any) => {
        if (hasFiredRef.current) return;
        if (event.nativeEvent.translationY > 100) {
            hasFiredRef.current = true;
            router.back();
        }
    };

    const handleThemeToggle = (value: boolean) => {
        toggleTheme(); 
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Speech.speak(`${value ? "Light" : "Dark"} mode active`);
    };

    return (
        <PanGestureHandler onGestureEvent={onGestureEvent}>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                
                {/* Visual handle with extra padding to make it a better "grab" target */}
                <View style={styles.handleWrapper}>
                    <View style={[styles.swipeHandle, { backgroundColor: isDarkMode ? '#ccc' : '#333' }]} />
                </View>

                <View style={styles.header}>
                    <Ionicons name="settings-sharp" size={28} color={theme.tint} />
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
                </View>

                <ScrollView 
                    contentContainerStyle={styles.scroll}
                    // This allows the gesture handler to work even if you start swiping on the scrollview
                >
                    <Text style={[styles.sectionTitle, { color: theme.tint }]}>Appearance</Text>
                    
                    <SettingTile 
                        icon="moon" 
                        title="Dark Mode" 
                        description="Switch between Light and Dark themes" 
                        theme={theme}
                    >
                        <Switch 
                            value={isDarkMode} 
                            onValueChange={handleThemeToggle}
                            trackColor={{ true: theme.tint, false: '#767577' }}
                            thumbColor="#FFF"
                        />
                    </SettingTile>

                    <Text style={[styles.sectionTitle, { color: theme.tint }]}>Voice</Text>
                    
                    <SettingTile 
                        icon="megaphone" 
                        title="Auto-Read" 
                        description="Speak immediately upon scan" 
                        theme={theme}
                    >
                        <Switch 
                            value={isAutoRead} 
                            onValueChange={(val) => {
                                setIsAutoRead(val);
                                Haptics.selectionAsync();
                            }}
                            trackColor={{ true: theme.tint, false: '#767577' }}
                            thumbColor="#FFF"
                        />
                    </SettingTile>

                    <Pressable 
                        style={styles.backButton} 
                        onPress={() => router.back()}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Close settings"
                        accessibilityHint="Double tap to dismiss and return to Home"
                    >
                        <Text style={[styles.backText, { color: theme.subtext }]}>Swipe down or tap to close</Text>
                    </Pressable>
                </ScrollView>
            </View>
        </PanGestureHandler>
    );
}

const SettingTile = ({ icon, title, description, children, theme }: any) => (
    <View style={[styles.tile, { 
        backgroundColor: theme.card, 
        borderColor: theme.border 
    }]}>
        <View style={styles.iconContainer}>
            <Ionicons name={icon} size={24} color={theme.text} />
        </View>
        <View style={styles.tileText}>
            <Text style={[styles.tileTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.tileSub, { color: theme.subtext }]}>{description}</Text>
        </View>
        {children}
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    handleWrapper: {
        paddingVertical: 15,
        width: '100%',
        alignItems: 'center',
    },
    swipeHandle: { width: 40, height: 5, borderRadius: 10 },
    header: { paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    headerTitle: { fontSize: 28, fontWeight: '900' },
    scroll: { paddingHorizontal: 20, paddingBottom: 50 },
    sectionTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginTop: 30, marginBottom: 15 },
    tile: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 20, 
        borderRadius: 24, 
        marginBottom: 12, 
        borderWidth: 1,
    },
    iconContainer: { marginRight: 15 },
    tileText: { flex: 1 },
    tileTitle: { fontSize: 18, fontWeight: '700' },
    tileSub: { fontSize: 13, marginTop: 4 },
    backButton: { marginTop: 40, alignItems: 'center', paddingBottom: 20 },
    backText: { fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }
});