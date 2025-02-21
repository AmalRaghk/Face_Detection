import os
import cv2
import numpy as np
from flask import Flask, request, jsonify, Response, render_template
from flask_cors import CORS
import time
import threading
import base64

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)  # Enable CORS for all routes

# Load the Haar Cascade Classifiers for face and eye detection
try:
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
except:
    # Fallback to local files if needed
    face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier('haarcascade_eye.xml')

# Global variables for webcam streaming
camera = None
output_frame = None
lock = threading.Lock()
camera_active = False

def detect_faces_and_eyes(frame):
    """
    Detects faces and eyes in a frame, draws bounding boxes, and returns:
      - the annotated frame
      - a list of detection data for faces and eyes
    """
    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    # Use same parameters as video stream for consistency
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
    face_data = []
    for (x, y, w, h) in faces:
        # Draw rectangle around face
        cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 255, 0), 2)
        roi_gray = gray[y:y+h, x:x+w]
        roi_color = frame[y:y+h, x:x+w]
        eyes = eye_cascade.detectMultiScale(roi_gray)
        eyes_data = []
        for (ex, ey, ew, eh) in eyes:
            # Draw rectangle around eyes
            cv2.rectangle(roi_color, (ex, ey), (ex + ew, ey + eh), (0, 127, 255), 2)
            eyes_data.append({
                'x': int(ex),
                'y': int(ey),
                'width': int(ew),
                'height': int(eh)
            })
        face_data.append({
            'x': int(x),
            'y': int(y),
            'width': int(w),
            'height': int(h),
            'eyes': eyes_data
        })
    return frame, face_data

def generate_frames():
    """Generate frames from the webcam with face and eye detection."""
    global output_frame, camera, camera_active
    
    camera = cv2.VideoCapture(0)
    camera_active = True
    
    while camera_active:
        success, frame = camera.read()
        if not success:
            break
        
        # Process frame for face and eye detection
        frame, _ = detect_faces_and_eyes(frame)
        
        # Update the output frame with thread safety
        with lock:
            output_frame = frame.copy()
        
        # Small delay to reduce CPU usage
        time.sleep(0.03)
    
    if camera is not None:
        camera.release()

@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')

@app.route('/api/detect-faces', methods=['POST'])
def detect_faces():
    """
    API endpoint for image-based face detection.
    Processes the uploaded image, draws rectangles on detected faces and eyes,
    and returns both detection details and the annotated image (base64-encoded).
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    
    # Read and decode the image
    img_bytes = file.read()
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return jsonify({'error': 'Invalid image data'}), 400
    
    # Process the image for face and eye detection
    annotated_img, face_data = detect_faces_and_eyes(img)
    height, width = annotated_img.shape[:2]
    
    # Encode the annotated image as JPEG
    flag, encodedImage = cv2.imencode(".jpg", annotated_img)
    if not flag:
        return jsonify({'error': 'Failed to encode image'}), 500
    # Convert to base64 string for transport
    base64_image = base64.b64encode(encodedImage).decode('utf-8')
    
    return jsonify({
        'faces': face_data,
        'imageWidth': width,
        'imageHeight': height,
        'annotatedImage': base64_image
    })

@app.route('/video_feed')
def video_feed():
    """Video streaming route for the webcam."""
    return Response(stream_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

def stream_frames():
    """Generate the streaming response for the webcam video feed."""
    global output_frame, lock, camera_active
    
    if not camera_active:
        t = threading.Thread(target=generate_frames)
        t.daemon = True
        t.start()
    
    while True:
        with lock:
            if output_frame is None:
                continue
            flag, encodedImage = cv2.imencode(".jpg", output_frame)
            if not flag:
                continue
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + bytearray(encodedImage) + b'\r\n')

@app.route('/api/stop_camera', methods=['POST'])
def stop_camera():
    """API endpoint to stop the webcam."""
    global camera_active, camera
    camera_active = False
    if camera is not None:
        camera.release()
        camera = None
    return jsonify({'status': 'camera stopped'})

@app.route('/health', methods=['GET'])
def health():
    """Simple health check endpoint."""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    # Create the templates directory and a simple index page if not present
    os.makedirs('templates', exist_ok=True)
    with open('templates/index.html', 'w') as f:
        f.write("""
<!DOCTYPE html>
<html>
<head>
    <title>FaceFinder - Real-time Face Detection</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto p-4 max-w-4xl">
        <h1 class="text-3xl font-bold text-center mb-4">FaceFinder</h1>
        <p class="text-center text-gray-600 mb-8">Real-time face and eye detection</p>
        
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 class="text-xl font-semibold mb-4">Webcam Live Feed</h2>
            <div class="relative">
                <img src="/video_feed" class="w-full h-auto border rounded-lg" alt="Live webcam feed with face detection">
            </div>
            <div class="mt-4 text-right">
                <button id="stopCamera" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                    Stop Camera
                </button>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('stopCamera').addEventListener('click', async () => {
            try {
                await fetch('/api/stop_camera', { method: 'POST' });
                alert('Camera stopped. Refresh the page to restart.');
            } catch (err) {
                console.error('Error stopping camera:', err);
            }
        });
    </script>
</body>
</html>
        """)
    
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
