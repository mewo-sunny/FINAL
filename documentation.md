# NoteVision App: Detailed Technical Documentation

This document serves as a comprehensive breakdown of the NoteVision React Native application, outlining the architecture, libraries used, and the intricate logic inside each module, complete with code explanations.

## 1. Technology Stack and Libraries Used
- **React Native (0.81.5)**: Core UI framework.
- **Expo (~54.0.31)**: Development SDK, build pipeline, and core native module ecosystem.
- **Expo Router (~6.0.21)**: Filesystem-based routing strategy handling layouts and views natively.
- **react-native-vision-camera (^4.7.3)**: Highly efficient, frame-processor capable camera module used for capturing live real-time feeds without locking the main JS thread.
- **react-native-fast-tflite (^2.0.0)**: Hardware-accelerated local execution of TensorFlow Lite object detection models. Uses NNAPI (Android GPU) for fast inference.
- **expo-speech (~14.0.8)**: Local TTS engine used for voicing accessibility instructions and ML predictions.
- **expo-image-manipulator (~14.0.8)**: Used in the processing pipeline to synchronously scale down and format the real-time camera frames.
- **expo-haptics (~15.0.8)**: Native vibrational feedback for interactive elements.
- **react-native-gesture-handler (~2.28.0)**: Powers native, smooth gesture tracking.
- **react-native-pager-view (^8.0.0)**: Handles horizontal, animated swiping between the app's three primary screens.

---

## 2. Core Architecture & Routing (`_layout.tsx`)
```tsx
<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen
    name="settings"
    options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true, gestureDirection: 'vertical' }}
  />
</Stack>
```
**Explanation:** The root architecture leverages `expo-router` using a `Stack` navigator wrapper inside a `GestureHandlerRootView` and our custom `ThemeProvider`. The primary app runs inside the `(tabs)` nested router, while `settings.tsx` is pushed modally over the entire application. Native options like `presentation: 'modal'` and `gestureDirection: 'vertical'` provide a fluid, iOS-native card-style swipe-to-dismiss behavior.

---

## 3. Global Theme Management (`context/ThemeContext.tsx`)
```tsx
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemPrefersDark = useColorScheme() === "dark";
  const [isDarkMode, setIsDarkMode] = useState(systemPrefersDark);

  const theme = isDarkMode ? Colors.dark : Colors.light;
  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  
  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```
**Explanation:** We isolate Theme state globally. Instead of forcing every component to re-read system status via `Appearance`, we wrap the entire application inside `ThemeProvider`. This allows the `/app/settings.tsx` to call `toggleTheme()` explicitly which instantly shifts the `theme` prop globally across all screens immediately without app restarts.

---

## 4. Main Swiping Interface (`index.tsx`)
```tsx
<PagerView 
  style={styles.pagerView} 
  initialPage={1}
  onPageScrollStateChanged={(e) => {
    if (e.nativeEvent.pageScrollState === 'dragging') Speech.stop();
  }}
  onPageSelected={(e) => handlePageChange(e.nativeEvent.position)}
>
```
**Explanation:** `index.tsx` acts as the orchestrator for the three main tabs (Scanner, Home Hub, Help Center). We use `PagerView` instead of native bottom tabs to allow physical swipe logic. 
- `onPageScrollStateChanged` fires instantly: The moment a thumb touches the screen to drag, `Speech.stop()` is triggered to abruptly silence any long-reading accessibility voices.
- `onPageSelected` fires when the animation successfully commits to the new page, triggering `handlePageChange` which reads the relevant title of the active screen using `Speech.speak()`.

---

## 5. Home Hub Screen (`HomeContent.tsx`)
```tsx
useEffect(() => {
  Animated.loop(Animated.sequence([
    Animated.timing(logoScale, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
    Animated.timing(logoScale, { toValue: 1, duration: 2000, useNativeDriver: true }),
  ])).start();
}, []);
```
**Explanation:** This is the default landing page. It uses React Native's `Animated` API to create a continuous, non-blocking breathing animation (`logoScale`) on the central logo, running purely on the native thread (`useNativeDriver: true`). Tapping the center logo triggers a manual TTS read-out guiding the user on the available swipe gestures (Swipe Left for Scan, Right for Help).

---

## 6. The Machine Learning Pipeline (`scan.tsx`)
The most complex file in the app is `scan.tsx`, which runs a manual object detection loop locally.

### A. Loading the Model Natively
```tsx
const model = useTensorflowModel(
  require('../../assets/models/epoch50_float32.tflite'),
  'default' 
);
```
**Explanation:** This hook loads the compiled TensorFlow Lite object detection model into memory. We use the `default` CPU delegate to avoid crashes on unsupported or older GPU hardware, which guarantees stability across a wider range of Android devices.

### B. Frame Processing & Inference
```tsx
const resized = await ImageManipulator.manipulateAsync(
  fileUri, [{ resize: { width: 640, height: 640 } }],
  { format: ImageManipulator.SaveFormat.JPEG, base64: true }
);

const decoded = jpeg.decode(Buffer.from(resized.base64!, 'base64'), { useTArray: true });
const float32Input = new Float32Array(640 * 640 * 3);
```
**Explanation:** The camera snapshots an image. To send the image to TFLite, we MUST match the exact mathematical bounds the model was trained on. 
1. We resize it strictly to `640x640`.
2. We extract the raw byte data via `jpeg.decode()`.
3. We generate a 1-Dimensional Array of length `1,228,800` (640x640x3 RGB colors) bounded strictly between `0.0` and `1.0`.

### C. NMS (Non-Maximum Suppression) Math
```tsx
const iou = inter / union;
if (iou > IOU_THRESHOLD) suppressed.add(j);
```
**Explanation:** Object detection models accidentally detect the exact same item multiple times. This logic measures the Intersection-Over-Union (IOU). If two bounding boxes overlap each other by more than 35% (`IOU > 0.35`), the app suppresses the lower-confidence one to guarantee one box per currency note.

### D. Multi-Note Detection Tracking Buffer
```tsx
const key = `${d.label}_${Math.floor(d.x1/20)}_${Math.floor(d.y1/20)}`;
detectionBuffer.current.set(key, { data: d, timestamp: now });
```
**Explanation:** Because inference can sometimes drop frames or jitter, we keep "ghost instances" of a detection alive for a short buffer duration (800 milliseconds). To support robust **Multi-Note Detection**, we track distinct objects across frames by combining their label and a spatial 20-pixel grid coordinate. This allows the app to distinguish between multiple notes of the *same* denomination that are placed side-by-side.

### E. Dynamic Text-to-Speech (TTS) Syncing
```tsx
const labelCounts: Record<string, number> = {};
final.forEach(d => {
  labelCounts[d.label] = (labelCounts[d.label] || 0) + 1;
});
const spokenLabels = Object.entries(labelCounts).map(([label, count]) => {
  const name = SPOKEN_NAMES[label] || label;
  return count > 1 ? `${count} ${name}s` : name;
});
```
**Explanation:** Instead of statically reading out a single hardcoded label, the app groups detections to create dynamic, natural-sounding audio feedback (e.g., "Detected 2 Ten Rupees and 1 Fifty Rupees").

---

## 7. Help & Onboarding Center (`help.tsx`)
```tsx
const toggleFaq = (index: number) => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  Haptics.selectionAsync();
  setOpenFaq(openFaq === index ? null : index);
};
```
**Explanation:** The Help screen contains static instructions, supported notes UI, and a collapsible FAQ. When a user clicks an FAQ, we use React Native's `LayoutAnimation` to effortlessly animate the height change across the entire view hierarchy seamlessly. The 'Read aloud' button triggers `speakHelp`, which programmatically extracts and concatenates all text from `QUICK_STEPS`, `NOTES_SUPPORTED`, and `FAQ` arrays into one massive, cohesive dynamic speech prompt.

---

## 8. Settings Modal & Gestures (`settings.tsx`)
```tsx
const onGestureEvent = (event: any) => {
    if (event.nativeEvent.translationY > 100) {
        router.back();
    }
};
...
<PanGestureHandler onGestureEvent={onGestureEvent}>
    <View style={[styles.container...]}>
```
**Explanation:** This screen leverages native React Native Gesture Handlers. For fluid UX, settings aren't dismissed purely by standard Buttons. `PanGestureHandler` mounts listeners over the absolute root `View`. By checking `translationY` inside the native event buffer, we can determine if the user has dragged their thumb entirely off the top of the interface by 100px. If so, the native router pops the modal stack via `router.back()`. It also manages the global state for "Dark Mode" and "Auto-Read" preferences, triggering immediate haptic/voice confirmation upon toggle.
