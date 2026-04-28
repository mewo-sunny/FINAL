import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import ScannerScreen from './scan';
import HomeContent from './HomeContent';
import HelpScreen from './help';

export default function AppLayout() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const pagerRef = useRef<PagerView>(null);
  // Guard: prevent the swipe-to-settings from firing multiple times
  // during a single gesture (onGestureEvent fires on every frame).
  const hasFiredRef = useRef(false);

  const navigateToSettings = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/settings');
  }, [router]);

  const onPageSelected = (e: any) => {
    setCurrentPage(e.nativeEvent.position);
  };

  // Fired on every frame while the user is dragging.
  // activeOffsetY={10} — only activates after 10 px of downward movement.
  // failOffsetX={[-20, 20]} — immediately hands control back to PagerView
  //   if the user starts swiping horizontally by more than 20 px.
  const onVerticalGestureEvent = (event: any) => {
    if (hasFiredRef.current) return;
    if (event.nativeEvent.translationY > 80) {
      hasFiredRef.current = true;
      navigateToSettings();
    }
  };

  // Reset the guard when the gesture ends (so next downward drag works).
  const onVerticalGestureEnd = () => {
    hasFiredRef.current = false;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={1}
        onPageSelected={onPageSelected}
        offscreenPageLimit={1}
      >
        {/* Page 0: Scanner */}
        <View key="0" style={styles.page}>
          <ScannerScreen isActive={currentPage === 0} />
        </View>

        {/* Page 1: Home — vertical-only gesture for swipe-down-to-Settings */}
        <View key="1" style={styles.page}>
          <PanGestureHandler
            onGestureEvent={onVerticalGestureEvent}
            onEnded={onVerticalGestureEnd}
            onCancelled={onVerticalGestureEnd}
            onFailed={onVerticalGestureEnd}
            // Activate only after 10 px of downward movement
            activeOffsetY={10}
            // Fail immediately if the user moves more than 20 px horizontally
            // — this lets PagerView handle horizontal swipes natively
            failOffsetX={[-20, 20]}
          >
            <View style={{ flex: 1 }}>
              <HomeContent isActive={currentPage === 1} />
            </View>
          </PanGestureHandler>
        </View>

        {/* Page 2: Help — no gesture wrapper, ScrollView scrolls freely */}
        <View key="2" style={styles.page}>
          <HelpScreen isActive={currentPage === 2} />
        </View>
      </PagerView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  pagerView: { flex: 1 },
  page: { flex: 1 },
});