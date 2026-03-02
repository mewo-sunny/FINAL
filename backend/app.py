from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import numpy as np
import cv2
import logging
import time

app = Flask(__name__)
CORS(app) 

# Disable internal logging to prevent console flooding
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# --- SMOOTHING CONFIGURATION ---
detection_buffer = {} 
BUFFER_DURATION = 1.5  # Keep notes on screen for 1.5s to bridge detection gaps

model = None
try:
    # Ensure this points to your trained model (last.pt)
    model = YOLO('last.pt') 
    print("✅ YOLO Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")

def update_buffer(current_detections):
    """
    Improved Buffer: Uses spatial tracking to allow multiple notes 
    of the same type to be displayed together.
    """
    global detection_buffer
    now = time.time()
    
    for d in current_detections:
        # Create a spatial key based on the center of the note (rounded to nearest 50px)
        # This prevents two Rs.500 notes from overwriting each other in the buffer
        center_x = (d['x1'] + d['x2']) / 2
        center_y = (d['y1'] + d['y2']) / 2
        spatial_id = f"{d['label']}_{int(center_x/50)}_{int(center_y/50)}"
        
        detection_buffer[spatial_id] = {
            "data": d,
            "timestamp": now
        }
    
    # Remove detections that haven't been seen for the duration
    stale_keys = [k for k, v in detection_buffer.items() if now - v['timestamp'] > BUFFER_DURATION]
    for k in stale_keys:
        del detection_buffer[k]
    
    return [v['data'] for v in detection_buffer.values()]

@app.route('/scan', methods=['POST'])
def scan():
    if model is None: 
        return jsonify({"status": "error", "message": "Model not loaded"}), 500
    
    try:
        if 'image' not in request.files:
            return jsonify({"status": "error", "message": "No image in request"}), 400

        file = request.files['image'].read()
        npimg = np.frombuffer(file, np.uint8)
        img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"status": "error", "message": "Invalid image data"}), 400

        img_h, img_w = img.shape[:2]

        # 🟢 HIGH CONFIDENCE FIX:
        # We set conf=0.4 to catch both notes, but we filter strictly in the loop.
        # iou=0.3 is lower to ensure boxes 'split' even if notes are touching.
        results = model(img, conf=0.4, iou=0.3, imgsz=640, verbose=False)
        
        current_frame_detections = []
        
        if len(results) > 0 and results[0].boxes:
            for box in results[0].boxes:
                confidence = float(box.conf)
                
                # Filter for high confidence detections
                if confidence >= 0.85:
                    coords = box.xyxy[0].tolist() 
                    label = model.names[int(box.cls)]
                    
                    current_frame_detections.append({
                        "label": label,
                        "confidence": round(confidence, 2),
                        "x1": coords[0],
                        "y1": coords[1],
                        "x2": coords[2],
                        "y2": coords[3]
                    })

        # Apply spatial temporal smoothing to keep both notes visible together
        smoothed_detections = update_buffer(current_frame_detections)

        if len(smoothed_detections) > 1:
            labels = [d['label'] for d in smoothed_detections]
            print(f"🔥 MULTI-SCAN SUCCESS: {', '.join(labels)}")
        elif len(smoothed_detections) == 1:
            print(f"🎯 Detected: {smoothed_detections[0]['label']}")
        
        return jsonify({
            "status": "success",
            "detections": smoothed_detections,
            "imgW": img_w,
            "imgH": img_h
        })

    except Exception as e:
        print(f"⚠️ Server Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)