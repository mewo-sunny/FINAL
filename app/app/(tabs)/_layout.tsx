import React, { useState, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { runOnJS } from 'react-native-reanimated';

import ScannerScreen from './scan';
import HomeContent from './HomeContent';
import HelpScreen from './help';

export default function AppLayout() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const pagerRef = useRef<PagerView>(null);

  const navigateToSettings = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/settings');
  };

  const panGesture = Gesture.Pan()
    .activeOffsetY([10, 1000]) // Recognize vertical swipe downwards quickly
    .failOffsetX([-20, 20]) // Fail quickly if user starts swiping horizontally (passes to PagerView)
    .onEnd((event) => {
      // Swipe down to Settings threshold lowered for responsiveness
      if (currentPage === 1 && event.translationY > 80 && event.velocityY > 300) {
        runOnJS(navigateToSettings)();
      }
    });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <PagerView
          ref={pagerRef}
          style={styles.pagerView}
          initialPage={1}
          // Logic: Standard props run on JS thread by default
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
        >
          <View key="0"><ScannerScreen /></View>
          <View key="1">
            <GestureDetector gesture={panGesture}>
              <View style={{ flex: 1 }}>
                <HomeContent />
              </View>
            </GestureDetector>
          </View>
          <View key="2"><HelpScreen /></View>
        </PagerView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  pagerView: { flex: 1 },
});