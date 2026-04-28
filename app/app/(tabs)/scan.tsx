import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import jpeg from 'jpeg-js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission } from 'react-native-vision-camera';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── SETTINGS ───────────────────────────────────────────────────────────────
const MODEL_INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.65; // Slightly lowered to catch notes faster
const IOU_THRESHOLD = 0.35;
const BUFFER_DURATION_MS = 800; 

const CLASS_LABELS = ['Rs.10', 'Rs.20', 'Rs.50', 'Rs.100', 'Rs.200', 'Rs.500', 'rs1', 'rs2', 'rs5', 'rs10', 'rs20', 'reverse'];
const NOTE_COLORS: Record<string, string> = { 'Rs.10': '#C97B2A', 'Rs.20': '#B8A030', 'Rs.50': '#6B7FC4', 'Rs.100': '#9B7EB8', 'Rs.200': '#E8B830', 'Rs.500': '#8BAFC8', 'rs1': '#A8A8A8', 'rs2': '#B8A070', 'rs5': '#C8A000', 'rs10': '#D4B840', 'rs20': '#E0CC60', 'reverse': '#55AA77' };

const SPOKEN_NAMES: Record<string, string> = {
  'Rs.10': 'Ten Rupees',
  'Rs.20': 'Twenty Rupees',
  'Rs.50': 'Fifty Rupees',
  'Rs.100': 'One Hundred Rupees',
  'Rs.200': 'Two Hundred Rupees',
  'Rs.500': 'Five Hundred Rupees',
  'rs1': 'One Rupee Coin',
  'rs2': 'Two Rupee Coin',
  'rs5': 'Five Rupee Coin',
  'rs10': 'Ten Rupee Coin',
  'rs20': 'Twenty Rupee Coin',
  'reverse': 'Reverse Side'
};

interface ScannerScreenProps {
  isActive: boolean;
}

function PulseBadge({ label, color }: { label: string; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.1, duration: 400, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.0, duration: 400, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[styles.badge, { backgroundColor: color, transform: [{ scale }] }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </Animated.View>
  );
}

export default function ScannerScreen({ isActive }: ScannerScreenProps) {
  // Announce screen to TalkBack when isActive changes (PagerView pages don't use useFocusEffect)
  useEffect(() => {
    let talkBackTimer: ReturnType<typeof setTimeout>;
    if (isActive) {
      // 400 ms delay so TalkBack has settled after the PagerView page-flip.
      talkBackTimer = setTimeout(() => {
        AccessibilityInfo.announceForAccessibility('Scanner screen. Point your camera at a currency note to detect it.');
      }, 400);
    } else {
      // Clear last spoken so re-entering will re-announce the same detection
      lastSpokenRef.current = '';
      Speech.stop();
    }
    return () => clearTimeout(talkBackTimer);
  }, [isActive]);
  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [
    { photoResolution: { width: 1280, height: 720 } }, // Lower res snapshot is faster
    { videoResolution: { width: 1280, height: 720 } }
  ]);

  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<Camera>(null);
  
  // 1. DYNAMIC DELEGATE: Fallback to default if GPU crashes on new ops
  const model = useTensorflowModel(
    require('../../assets/models/epoch114_float32.tflite'), 
    'default' 
  );

  const [detections, setDetections] = useState<any[]>([]);
  const [debugError, setDebugError] = useState<string>(''); // NEW: Surface errors
  const isProcessingRef = useRef(false);
  const lastSpokenRef = useRef('');
  const detectionBuffer = useRef(new Map<string, { data: any; timestamp: number }>());
  const sessionStartRef = useRef<number>(0);

  useEffect(() => { if (!hasPermission) requestPermission(); }, [hasPermission]);

  const applyNMS = (dets: any[]) => {
    const sorted = [...dets].sort((a, b) => b.confidence - a.confidence);
    const kept: any[] = [];
    const suppressed = new Set();
    for (let i = 0; i < sorted.length; i++) {
      if (suppressed.has(i)) continue;
      kept.push(sorted[i]);
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]; const b = sorted[j];
        const ix1 = Math.max(a.x1, b.x1); const iy1 = Math.max(a.y1, b.y1);
        const ix2 = Math.min(a.x2, b.x2); const iy2 = Math.min(a.y2, b.y2);
        const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
        
        const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
        const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
        const iou = inter / (areaA + areaB - inter);
        const ioMin = inter / Math.min(areaA, areaB);

        // Suppress if they overlap heavily OR if one is mostly inside the other
        if (iou > IOU_THRESHOLD || ioMin > 0.6) suppressed.add(j);
      }
    }
    return kept;
  };

  const captureAndInfer = useCallback(async () => {
    if (!isActive || !camera.current) return;
    
    if (model.state !== 'loaded') {
        setDebugError(`Model State: ${model.state}`);
        return;
    }

    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    let fileUri = '';

    try {
      const photo = await camera.current.takeSnapshot({
        quality: 70, 
      });

      fileUri = Platform.OS === 'android' ? `file://${photo.path}` : photo.path;

      const pWidth = photo.width || 1280;
      const pHeight = photo.height || 720;
      const halfWidth = Math.floor(pWidth / 2);

      const processCrop = (base64Str: string, originX: number, cropWidth: number) => {
        const decoded = jpeg.decode(Buffer.from(base64Str, 'base64'), { useTArray: true });
        const float32Input = new Float32Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE * 3);
        for (let i = 0; i < MODEL_INPUT_SIZE * MODEL_INPUT_SIZE; i++) {
          float32Input[i * 3 + 0] = decoded.data[i * 4 + 0] / 255.0;
          float32Input[i * 3 + 1] = decoded.data[i * 4 + 1] / 255.0;
          float32Input[i * 3 + 2] = decoded.data[i * 4 + 2] / 255.0;
        }

        const output = model.model.runSync([float32Input])[0] as Float32Array;
        const numBoxes = 8400;
        const dets: any[] = [];

        const scaleX = SCREEN_WIDTH * (cropWidth / pWidth);
        const offsetX = SCREEN_WIDTH * (originX / pWidth);
        const scaleY = SCREEN_HEIGHT;

        for (let i = 0; i < numBoxes; i++) {
          let maxScore = 0; let classIdx = 0;
          for (let c = 0; c < CLASS_LABELS.length; c++) {
            const s = output[(4 + c) * numBoxes + i];
            if (s > maxScore) { maxScore = s; classIdx = c; }
          }

          if (maxScore > CONF_THRESHOLD) {
            const cx = output[i]; const cy = output[numBoxes + i];
            const bw = output[2 * numBoxes + i]; const bh = output[3 * numBoxes + i];
            
            const cropX1 = (cx - bw/2) * MODEL_INPUT_SIZE;
            const cropY1 = (cy - bh/2) * MODEL_INPUT_SIZE;
            const cropX2 = (cx + bw/2) * MODEL_INPUT_SIZE;
            const cropY2 = (cy + bh/2) * MODEL_INPUT_SIZE;

            dets.push({
              label: CLASS_LABELS[classIdx], 
              confidence: maxScore,
              x1: (cropX1 / MODEL_INPUT_SIZE) * scaleX + offsetX, 
              y1: (cropY1 / MODEL_INPUT_SIZE) * scaleY,
              x2: (cropX2 / MODEL_INPUT_SIZE) * scaleX + offsetX, 
              y2: (cropY2 / MODEL_INPUT_SIZE) * scaleY
            });
          }
        }
        return dets;
      };

      const cropWidth = Math.floor(pWidth * 0.65); // 65% width creates a 30% overlap in the middle
      const leftCrop = await ImageManipulator.manipulateAsync(
        fileUri, [
          { crop: { originX: 0, originY: 0, width: cropWidth, height: pHeight } },
          { resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }
        ],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const leftDets = processCrop(leftCrop.base64!, 0, cropWidth);

      const rightOriginX = pWidth - cropWidth;
      const rightCrop = await ImageManipulator.manipulateAsync(
        fileUri, [
          { crop: { originX: rightOriginX, originY: 0, width: cropWidth, height: pHeight } },
          { resize: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE } }
        ],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const rightDets = processCrop(rightCrop.base64!, rightOriginX, cropWidth);

      const rawDets = [...leftDets, ...rightDets];
      const nmsResult = applyNMS(rawDets);
      const now = Date.now();
      const currentExpiry = nmsResult.length === 0 ? 150 : BUFFER_DURATION_MS;

      nmsResult.forEach((d, idx) => {
        // Group by label and a more precise grid (e.g., 20px) to distinguish multiple notes better
        const key = `${d.label}_${Math.floor(d.x1/20)}_${Math.floor(d.y1/20)}`;
        detectionBuffer.current.set(key, { data: d, timestamp: now });
      });

      detectionBuffer.current.forEach((v, k) => {
        if (now - v.timestamp > currentExpiry) detectionBuffer.current.delete(k);
      });

      const final = Array.from(detectionBuffer.current.values()).map(v => ({
        ...v.data,
        left: v.data.x1,
        top: v.data.y1,
        width: v.data.x2 - v.data.x1,
        height: v.data.y2 - v.data.y1,
        color: NOTE_COLORS[v.data.label] || '#FFF'
      }));

      setDetections(final);

      if (final.length > 0) {
        setDebugError(''); // Clear error if successful
        
        // Count occurrences of each label for multi-note speech
        const labelCounts: Record<string, number> = {};
        final.forEach(d => {
          labelCounts[d.label] = (labelCounts[d.label] || 0) + 1;
        });

        const spokenLabels = Object.entries(labelCounts).map(([label, count]) => {
          const name = SPOKEN_NAMES[label] || label;
          return count > 1 ? `${count} ${name}s` : name;
        });

        const speechText = `Detected ${spokenLabels.join(' and ')}`;
        if (speechText !== lastSpokenRef.current) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Speech.speak(speechText, { rate: 1.15 });
          lastSpokenRef.current = speechText;
        }
      } else {
        lastSpokenRef.current = '';
      }

    } catch (e: any) { 
        console.log("Inference Error:", e);
        setDebugError(e.message || "Unknown Inference Error");
    } finally {
      if (fileUri) await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
      isProcessingRef.current = false;
    }
  }, [model, isActive]);

  useEffect(() => {
    if (!isActive) {
      setDetections([]);
      sessionStartRef.current = 0;
      return;
    }

    sessionStartRef.current = Date.now();
    let isRunning = true;

    const runLoop = async () => {
      if (!isRunning) return;
      // Burst every 150ms for first 5 seconds, then 350ms steady
      const interval = (Date.now() - sessionStartRef.current) < 5000 ? 150 : 350;

      if (!isProcessingRef.current) {
        await captureAndInfer();
      }
      setTimeout(runLoop, interval);
    };

    runLoop();
    return () => { isRunning = false; };
  }, [isActive, captureAndInfer]);

  if (!hasPermission || !device) return <View style={styles.centered}><Text style={styles.statusText}>Initializing...</Text></View>;

  return (
    <View
      style={styles.container}
      accessible={false}
    >
      <Camera 
        ref={camera} 
        style={StyleSheet.absoluteFill} 
        device={device} 
        isActive={isActive} 
        photo={true} 
        video={false}
        format={format}
        accessible={true}
        accessibilityLabel={detections.length > 0 ? `Detected: ${detections.map(d => SPOKEN_NAMES[d.label] || d.label).join(' and ')}` : 'Camera viewfinder. Point at a currency note.'}
      />

      {!!debugError && (
        <View style={{position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: 'rgba(255,0,0,0.8)', padding: 10, borderRadius: 8}}>
            <Text style={{color: 'white', fontWeight: 'bold'}}>{debugError}</Text>
        </View>
      )}
      
      {detections.map((d, i) => (
        <View
          key={i}
          style={[styles.box, { left: d.left, top: d.top, width: d.width, height: d.height, borderColor: d.color }]}
          accessible={true}
          accessibilityLabel={`Detected ${SPOKEN_NAMES[d.label] || d.label} with ${Math.round(d.confidence * 100)} percent confidence`}
        >
          <View style={[styles.labelBadge, { backgroundColor: d.color }]}>
             <Text style={styles.labelTitle}>{d.label}</Text>
          </View>
        </View>
      ))}

      <View
        style={styles.bottomBar}
        accessible={true}
        accessibilityLiveRegion="polite"
        accessibilityLabel={detections.length > 0 ? `Detected: ${detections.map(d => SPOKEN_NAMES[d.label] || d.label).join(', ')}` : 'Scanning for currency'}
      >
        {detections.length > 0 ? (
          <View style={styles.badgeRow} accessible={false}>
            {Array.from(new Set(detections.map(d => d.label))).map((label, idx) => (
              <PulseBadge key={idx} label={label} color={NOTE_COLORS[label] || '#FFF'} />
            ))}
          </View>
        ) : (
          <Text style={styles.statusText}>Scanning for currency...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  box: { position: 'absolute', borderWidth: 3, borderRadius: 8, zIndex: 10 },
  labelBadge: { position: 'absolute', top: -28, left: -3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  labelTitle: { color: '#000', fontSize: 12, fontWeight: '900' },
  bottomBar: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 15, borderRadius: 30, minWidth: '85%', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  statusText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  badge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  badgeText: { color: '#000', fontSize: 14, fontWeight: '800' }
});