import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

// 1. IMPORT GLOBAL THEME
import { useAppTheme } from '../context/ThemeContext';

export default function HomeContent() {
  // 2. USE GLOBAL THEME HOOK
  const { theme, isDarkMode } = useAppTheme();

  const logoScale = useRef(new Animated.Value(1)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(hintOpacity, {
      toValue: 0.6,
      duration: 1000,
      delay: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleManualSpeak = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Speech.stop();
    Speech.speak("NoteVision Home Hub. Swipe right to scan, left for help, or down for settings.", {
      language: 'en-IN',
      rate: 0.85
    });
  };

  return (
    // 3. BACKGROUND UPDATES DYNAMICALLY
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      <Animated.View style={[styles.settingsHint, { opacity: hintOpacity }]}>
        <Ionicons name="chevron-down" size={24} color={isDarkMode ? "#444" : "#BBB"} />
        <Text style={[styles.hintText, { color: isDarkMode ? "#444" : "#BBB" }]}>SETTINGS</Text>
      </Animated.View>

      {/* LEFT: SCAN */}
      <View style={styles.sideZone}>
        <Ionicons name="chevron-back" size={32} color={theme.tint} />
        <Text style={[styles.label, { color: theme.tint, marginTop: 5, marginBottom: 5 }]}>SCAN</Text>
      </View>

      {/* CENTER: LOGO & STATUS */}
      <Pressable style={styles.centerPoint} onPress={handleManualSpeak}>
        <Animated.View
          style={[
            styles.nvCircle,
            {
              borderColor: theme.tint,
              backgroundColor: theme.card, // USES THEME CARD COLOR
              shadowColor: theme.tint,
              transform: [{ scale: logoScale }]
            }
          ]}
        >
          <Text style={[styles.nvText, { color: theme.text }]}>NV</Text>
        </Animated.View>

        <Text style={[styles.appName, { color: theme.text }]}>
          NOTE<Text style={{ color: theme.tint }}>VISION</Text>
        </Text>

        <View style={[styles.statusBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.statusDot, { backgroundColor: '#00FF00' }]} />
          <Text style={[styles.statusText, { color: theme.subtext }]}>Start Scanning</Text>
        </View>
      </Pressable>

      {/* RIGHT: HELP */}
      <View style={styles.sideZone}>
        <Ionicons name="chevron-forward" size={32} color={theme.subtext} />
        <Text style={[styles.label, { color: theme.subtext, marginTop: 5, marginBottom: 5 }]}>HELP</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  settingsHint: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 40, left: 0, right: 0, alignItems: 'center' },
  hintText: { fontSize: 11, fontWeight: '900', letterSpacing: 3, marginTop: -4 },
  sideZone: { alignItems: 'center', justifyContent: 'center', width: 75 },
  centerPoint: { alignItems: 'center', justifyContent: 'center' },
  nvCircle: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10, marginBottom: 25,
  },
  nvText: { fontSize: 48, fontWeight: '900', letterSpacing: -3 },
  appName: { fontSize: 20, fontWeight: '800', letterSpacing: 5, textAlign: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  label: { fontSize: 13, fontWeight: '900' }
});