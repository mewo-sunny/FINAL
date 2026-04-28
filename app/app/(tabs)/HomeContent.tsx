import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Animated, Platform, AccessibilityInfo } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../context/ThemeContext';

const UI_LABELS = {
  scan: 'SCAN',
  help: 'HELP',
  settings: 'SETTINGS',
};

// isActive is passed from _layout.tsx so we know when this PagerView page is visible
interface HomeContentProps {
  isActive: boolean;
}

export default function HomeContent({ isActive }: HomeContentProps) {
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

  // useEffect on isActive (not useFocusEffect) because this screen lives inside
  // PagerView — it never gets a React Navigation focus event on page swipe.
  useEffect(() => {
    let talkBackTimer: ReturnType<typeof setTimeout>;
    let speechTimer: ReturnType<typeof setTimeout>;
    // Reminder: fires after 8 s idle, then repeats every 15 s
    let reminderTimer: ReturnType<typeof setTimeout>;
    let reminderInterval: ReturnType<typeof setInterval>;

    if (isActive) {
      // Delay TalkBack announcement ~400 ms so it fires after PagerView's own
      // page-change event (otherwise the announcement is silently swallowed).
      talkBackTimer = setTimeout(() => {
        AccessibilityInfo.announceForAccessibility(
          'NoteVision Home. Swipe right to Scan, swipe left for Help, swipe down for Settings.'
        );
      }, 400);

      // Give TalkBack's announcement a head-start before Speech.speak takes over.
      speechTimer = setTimeout(() => {
        Speech.speak(
          `NoteVision Home Hub. Swipe right to ${UI_LABELS.scan.toLowerCase()}, left for ${UI_LABELS.help.toLowerCase()}, or down for ${UI_LABELS.settings.toLowerCase()}.`,
          { language: 'en-IN', rate: 0.85 }
        );
      }, 500);

      // After 8 seconds of inactivity, remind the user how to navigate.
      // Then repeat the reminder every 15 seconds until they leave.
      const speakReminder = () => {
        Speech.speak(
          `Swipe left to scan a note. Swipe right for help. Swipe down for settings.`,
          { language: 'en-IN', rate: 0.9 }
        );
      };
      reminderTimer = setTimeout(() => {
        speakReminder();
        reminderInterval = setInterval(speakReminder, 15000);
      }, 8000);

    } else {
      Speech.stop();
    }

    return () => {
      clearTimeout(talkBackTimer);
      clearTimeout(speechTimer);
      clearTimeout(reminderTimer);
      clearInterval(reminderInterval);
    };
  }, [isActive]);

  const handleManualSpeak = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Speech.stop();
    Speech.speak(
      `NoteVision Home Hub. Swipe right to ${UI_LABELS.scan.toLowerCase()}, left for ${UI_LABELS.help.toLowerCase()}, or down for ${UI_LABELS.settings.toLowerCase()}.`,
      { language: 'en-IN', rate: 0.85 }
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      accessible={false}
    >
      {/* Settings hint arrow — decorative, hidden from TalkBack */}
      <Animated.View
        style={[styles.settingsHint, { opacity: hintOpacity }]}
        accessible={false}
        importantForAccessibility="no"
      >
        <Ionicons name="chevron-down" size={24} color={isDarkMode ? '#444' : '#BBB'} />
        <Text style={[styles.hintText, { color: isDarkMode ? '#444' : '#BBB' }]}>
          {UI_LABELS.settings}
        </Text>
      </Animated.View>

      {/* LEFT: SCAN indicator */}
      <View
        style={styles.sideZone}
        accessible={true}
        accessibilityLabel="Swipe right to open the Scanner"
        importantForAccessibility="yes"
      >
        <Ionicons name="chevron-back" size={32} color={theme.tint} />
        <Text style={[styles.label, { color: theme.tint, marginTop: 5, marginBottom: 5 }]}>
          {UI_LABELS.scan}
        </Text>
      </View>

      {/* CENTER: Logo & tap-to-repeat button */}
      <Pressable
        style={styles.centerPoint}
        onPress={handleManualSpeak}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="NoteVision logo"
        accessibilityHint="Double tap to hear navigation instructions"
      >
        <Animated.View
          style={[
            styles.nvCircle,
            {
              borderColor: theme.tint,
              backgroundColor: theme.card,
              shadowColor: theme.tint,
              transform: [{ scale: logoScale }],
            },
          ]}
          accessible={false}
        >
          <Text style={[styles.nvText, { color: theme.text }]}>NV</Text>
        </Animated.View>

        <Text style={[styles.appName, { color: theme.text }]}>
          NOTE<Text style={{ color: theme.tint }}>VISION</Text>
        </Text>

        <View
          style={[styles.statusBadge, { backgroundColor: theme.card, borderColor: theme.border }]}
          accessible={true}
          accessibilityLabel="Status: Ready to scan"
        >
          <View style={[styles.statusDot, { backgroundColor: '#00FF00' }]} />
          <Text style={[styles.statusText, { color: theme.subtext }]}>Start Scanning</Text>
        </View>
      </Pressable>

      {/* RIGHT: HELP indicator */}
      <View
        style={styles.sideZone}
        accessible={true}
        accessibilityLabel="Swipe left to open Help"
        importantForAccessibility="yes"
      >
        <Ionicons name="chevron-forward" size={32} color={theme.subtext} />
        <Text style={[styles.label, { color: theme.subtext, marginTop: 5, marginBottom: 5 }]}>
          {UI_LABELS.help}
        </Text>
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
  label: { fontSize: 13, fontWeight: '900' },
});