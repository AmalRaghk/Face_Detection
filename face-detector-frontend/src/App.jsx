import React, { useState, useRef } from 'react';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [faces, setFaces] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showLiveFeed, setShowLiveFeed] = useState(false);
  // A key to force the live feed to reload (changes each time we start it)
  const [liveFeedKey, setLiveFeedKey] = useState(Date.now());
  const fileInputRef = useRef(null);

  const API_URL = 'http://localhost:5000/api/detect-faces';
  const LIVE_FEED_URL = 'http://localhost:5000/video_feed';
  const STOP_CAMERA_URL = 'http://localhost:5000/api/stop_camera';

  const toggleLiveFeed = async () => {
    if (showLiveFeed) {
      try {
        await fetch(STOP_CAMERA_URL, { method: 'POST' });
        setShowLiveFeed(false);
      } catch (err) {
        console.error("Error stopping camera:", err);
        setError("Failed to stop the camera feed.");
      }
    } else {
      // Ask for camera permission before starting the live feed
      const allowed = window.confirm("This app needs to access the camera. Do you allow it?");
      if (!allowed) return;
      // Reset any image upload view
      setImage(null);
      setImageUrl(null);
      setFaces([]);
      setError(null);
      // Update liveFeedKey so that the stream reloads
      setLiveFeedKey(Date.now());
      setShowLiveFeed(true);
    }
  };

  const detectFaces = async (imageFile) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Create form data for the API request
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // Make API call to Flask backend
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      setFaces(result.faces || []);
      // Use the annotated image returned from the model as output
      if (result.annotatedImage) {
        setImageUrl(`data:image/jpeg;base64,${result.annotatedImage}`);
      }
    } catch (err) {
      console.error("Face detection error:", err);
      setError("Failed to detect faces. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (file) => {
    if (!file) return;
    
    // If live feed is on, switch it off
    if (showLiveFeed) {
      setShowLiveFeed(false);
    }
    
    // Set the file and trigger detection
    setImage(file);
    detectFaces(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="min-h-screen flex flex-cols items-center align-center justify-center bg-blue-900">
      <div className="bg-white/30 backdrop-blur-lg border border-white/30 rounded-lg w-full h-screen md:h-full md:w-auto md:max-w-4xl p-5 flex flex-col space-y-8 items-center justify-center">
        <h1 className="text-3xl font-bold text-center mb-2">FaceFinder</h1>
        <p className="text-center text-gray-100 mb-2">Detect faces and eyes in images or real-time video</p>
        
        <div className="mb-6 flex justify-center">
          <button
            onClick={toggleLiveFeed}
            className={`px-4 py-2 rounded transition-colors ${
              showLiveFeed 
                ? "bg-red-600 text-white hover:bg-red-700" 
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {showLiveFeed ? "Stop Live Camera" : "Start Live Camera"}
          </button>
        </div>
        
        {showLiveFeed ? (
          <div className="w-full max-w-md bg-white rounded-lg shadow-md overflow-hidden mx-auto">
            <div className="p-3 border-b">
              <h2 className="text-xl font-semibold">Live Face Detection</h2>
              <p className="text-sm text-white">Detecting faces and eyes in real-time</p>
            </div>
            <div className="relative h-full flex items-center justify-center">
              <img 
                // Append liveFeedKey as a query parameter to force reload
                src={`${LIVE_FEED_URL}?t=${liveFeedKey}`} 
                alt="Live webcam feed with face detection"
                className="max-h-full object-cover"
              />
            </div>
          </div>
        ) : !image ? (
          <div
            className={`w-full max-w-md border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors mx-auto ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
              className="hidden"
            />
            <div className="flex flex-col items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg mb-2">Drag and drop an image here</p>
              <p className="text-sm text-white-500">or click to browse files</p>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md relative border rounded-lg overflow-hidden mx-auto">
            {/* Display the annotated image output from the model */}
            <img 
              src={imageUrl} 
              alt="Processed" 
              className="w-full object-cover"
            />
            
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Detecting faces...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-20">
                <div className="bg-white p-4 rounded-lg shadow-lg">
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
              </div>
            )}
            
            <div className="p-3 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {faces.length > 0 
                      ? `${faces.length} face${faces.length > 1 ? 's' : ''} detected` 
                      : isProcessing ? 'Processing...' : 'No faces detected'}
                  </p>
                  {faces.length > 0 && (
                    <p className="text-sm text-gray-600">
                      {faces.reduce((total, face) => total + face.eyes.length, 0)} eyes detected
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setImage(null);
                    setImageUrl(null);
                    setFaces([]);
                    setError(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Upload New Image
                </button>
              </div>
            </div>
          </div>
        )}
        
        <button 
          onClick={() => setShowModal(true)}
          className="text-sm text-white-900 underline mx-auto"
        >
          help
        </button>
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div 
              className="absolute inset-0 bg-black opacity-50" 
              onClick={() => setShowModal(false)}
            ></div>
            <div className="relative bg-white bg-opacity-20 backdrop-blur-lg border border-white/30 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">How to Use</h2>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-800 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-gray-800">
                <li>Choose between <strong>Live Camera</strong> mode or <strong>Image Upload</strong> mode</li>
                <li>For live detection, click "Start Live Camera" and allow camera access</li>
                <li>For image upload, drag and drop or click to select an image</li>
                <li>View the annotated output from the model</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
