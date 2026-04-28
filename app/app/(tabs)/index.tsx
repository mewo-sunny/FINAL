import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

// 1. Import the global theme hook
import { useAppTheme } from '../context/ThemeContext';

import ScannerScreen from './scan';      
import HomeContent from './HomeContent'; 
import HelpScreen from './help';            

const PAGE_TITLES = ["Scanner", "Home Hub", "Help Center"];
const BUTTON_LABELS = {
  settings: "SETTINGS"
};

export default function MainController() {
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  
  // 2. Access the global theme
  const { theme, isDarkMode } = useAppTheme();

  const handlePageChange = useCallback((index: number) => {
    setCurrentPage(index);
    
    Speech.stop();
    Speech.speak(PAGE_TITLES[index]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  return (
    // 3. Apply dynamic background color to the main container
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PagerView 
        style={styles.pagerView} 
        initialPage={1}
        onPageScrollStateChanged={(e) => {
          if (e.nativeEvent.pageScrollState === 'dragging') {
             Speech.stop();
          }
        }}
        onPageSelected={(e) => handlePageChange(e.nativeEvent.position)}
      >
        <View key="0" style={styles.page}><ScannerScreen isActive={currentPage === 0} /></View>
        
        <View key="1" style={styles.page}>
          <HomeContent isActive={currentPage === 1} />
        </View>

        <View key="2" style={styles.page}><HelpScreen isActive={currentPage === 2} /></View>
      </PagerView>

      {/* Persistent Overlay Button */}
      {currentPage === 1 && (
        <Pressable 
          style={({ pressed }) => [
            styles.settingsButton,
            { 
              // 4. Update button colors based on theme
              backgroundColor: isDarkMode ? 'rgba(17, 17, 17, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: theme.tint,
              shadowColor: theme.tint,
              opacity: pressed ? 0.7 : 1, 
              transform: [{ scale: pressed ? 0.96 : 1 }] 
            }
          ]}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.push('/settings');
          }}
        >
          {/* 5. Update text color to match the tint */}
          <Text style={[styles.settingsText, { color: theme.tint }]}>⚙️ {BUTTON_LABELS.settings}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pagerView: { flex: 1 },
  page: { flex: 1 },
  settingsButton: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    borderWidth: 1.5,
    elevation: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  settingsText: { 
    fontWeight: 'bold', 
    letterSpacing: 1.2 
  }
});