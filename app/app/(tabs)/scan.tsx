import React, { useState, useEffect, useRef } from 'react';
// These imports are standard for a React Native environment. 
// For this preview, we handle them carefully to ensure the file remains editable.
import { StyleSheet, Text, View, Dimensions, Platform } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import * as Speech from 'expo-speech';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Detection {
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * App Component
 * Focus: Correcting bounding box split (multi-detection) and precise coordinate alignment.
 */
export default function App() {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const camera = useRef<Camera>(null);
  
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const lastSpoken = useRef("");

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
    
    const interval = setInterval(() => { 
      if (isCameraReady) {
        captureAndSend(); 
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [hasPermission, isCameraReady]);

  const captureAndSend = async () => {
    if (!camera.current || !hasPermission || !isCameraReady) return;

    try {
      const photo = await camera.current.takeSnapshot({ quality: 40 });
      const formData = new FormData();
      const fileUri = Platform.OS === 'android' ? `file://${photo.path}` : photo.path;
      
      formData.append('image', {
        uri: fileUri,
        type: 'image/jpeg',
        name: 'scan.jpg',
      } as any);

      // Replace with your Laptop's actual local IP
      const response = await fetch('http://192.168.1.39:5000/scan', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const result = await response.json();
      
      // Check if server returned the detections array
      if (result.status === "success" && result.detections && result.detections.length > 0) {
        const { imgW, imgH } = result;

        // ALIGNMENT LOGIC: Calculate precise scaling for 'contain' mode
        const screenAspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
        const imageAspectRatio = imgH / imgW;

        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;

        if (imageAspectRatio > screenAspectRatio) {
          // Image is taller than the screen
          scale = SCREEN_HEIGHT / imgH;
          offsetX = (SCREEN_WIDTH - imgW * scale) / 2;
        } else {
          // Image is wider than the screen
          scale = SCREEN_WIDTH / imgW;
          offsetY = (SCREEN_HEIGHT - imgH * scale) / 2;
        }

        const mapped = result.detections.map((d: any) => {
          const x1 = parseFloat(d.x1);
          const y1 = parseFloat(d.y1);
          const x2 = parseFloat(d.x2);
          const y2 = parseFloat(d.y2);

          // Map normalized or pixel coordinates from server to screen pixels
          return {
            label: d.label,
            left: (x1 * scale) + offsetX,
            top: (y1 * scale) + offsetY,
            width: (x2 - x1) * scale,
            height: (y2 - y1) * scale,
          };
        });

        setDetections(mapped);

        // Feedback Logic
        const uniqueLabels = [...new Set(mapped.map((d: any) => d.label))];
        const speechText = uniqueLabels.join(" and ");
        
        if (speechText !== lastSpoken.current && speechText.length > 0) {
          await Speech.stop();
          Speech.speak(`Detected ${speechText}`, { rate: 0.9 });
          lastSpoken.current = speechText;
        }
      } else {
        setDetections([]);
        lastSpoken.current = "";
      }
    } catch (e) {
      console.log("Server connection failed.");
    }
  };

  if (!hasPermission) {
    return <View style={styles.centered}><Text style={styles.errorText}>Camera Permission Required</Text></View>;
  }

  if (!device) {
    return <View style={styles.centered}><Text style={styles.errorText}>Searching for Camera...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        video={false}
        onInitialized={() => setIsCameraReady(true)}
        onError={() => setIsCameraReady(false)}
        resizeMode="contain" 
      />

      {/* MULTI-DETECTION: This loop creates a separate box for EACH note */}
      {detections.map((d, index) => (
        <View 
          key={`${d.label}-${index}`} 
          style={[styles.boundingBox, {
            left: d.left,
            top: d.top,
            width: d.width,
            height: d.height,
          }]}
        >
          <View style={styles.labelContainer}>
             <Text style={styles.boxLabel}>{d.label}</Text>
          </View>
        </View>
      ))}

      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>
          {detections.length > 0 
            ? detections.map(d => d.label).join(" + ") 
            : "Scanning for Currency..."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  errorText: { color: '#00FF00', fontSize: 18, fontWeight: 'bold' },
  boundingBox: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#00FF00',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderRadius: 8,
    zIndex: 10,
  },
  labelContainer: {
    position: 'absolute',
    top: -24,
    left: -3,
    backgroundColor: '#00FF00',
    paddingHorizontal: 6,
    borderRadius: 2,
  },
  boxLabel: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  bottomBar: { 
    position: 'absolute', 
    bottom: 50, 
    alignSelf: 'center', 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    padding: 18, 
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#00FF00',
    minWidth: '80%',
  },
  bottomText: { color: '#00FF00', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }
});