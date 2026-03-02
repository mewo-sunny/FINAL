// app/app/_layout.tsx

import { Stack } from 'expo-router';
import { ThemeProvider, useAppTheme } from './context/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function RootStack() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      
      <Stack.Screen
        name="settings"
        options={{
          // 'modal' gives the iOS card look with swipe-to-close
          presentation: 'modal', 
          animation: 'slide_from_bottom',
          gestureEnabled: true,
          gestureDirection: 'vertical', // Crucial for swipe-down logic
          // Optional: prevents the modal from being "full screen" so it feels swipeable
          headerShown: false, 
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}