// Global variables
let videoElement, canvasElement, canvasCtx;
let faceDetection, objectDetectionModel;
let isDetecting = false;
let isSessionActive = false;
let sessionStartTime = null;
let sessionTimer = null;
let currentSessionId = null;
const API_BASE_URL = '/api'; 

// Timing variables
let noFaceStartTime = null;
let lookingAwayStartTime = null;
let lastFaceDetectionTime = Date.now();

// Event counters
let eventCounts = {
    noFaceEvents: 0,
    lookingAwayEvents: 0,
    multipleFaceEvents: 0,
    suspiciousObjectEvents: 0,
    totalEvents: 0
};

// Thresholds (in milliseconds)
const NO_FACE_THRESHOLD = 10000; // 10 seconds
const LOOKING_AWAY_THRESHOLD = 5000; // 5 seconds

// Suspicious object classes (updated to better detect books)
const SUSPICIOUS_OBJECTS = ['book', 'notebook', 'cell phone', 'laptop', 'mouse', 'keyboard', 'remote'];

// DOM elements
document.addEventListener('DOMContentLoaded', async () => {
    videoElement = document.getElementById('videoElement');
    canvasElement = document.getElementById('canvasElement');
    canvasCtx = canvasElement.getContext('2d');
    
    // Initialize event listeners
    document.getElementById('startBtn').addEventListener('click', startCamera);
    document.getElementById('stopBtn').addEventListener('click', stopCamera);
    document.getElementById('clearLogBtn').addEventListener('click', clearEventLog);
    document.getElementById('startSessionBtn').addEventListener('click', startSession);
    document.getElementById('endSessionBtn').addEventListener('click', endSession);
    
    // Initialize AI models
    await initializeModels();
    
    // Initialize welcome message
    logEvent('Focus & Object Detection System initialized', 'info');
    logEvent('Click "Start Camera" to begin monitoring', 'info');
});

// Initialize MediaPipe and TensorFlow models
async function initializeModels() {
    logEvent('Loading AI models...', 'info');
    
    try {
        // Initialize MediaPipe Face Detection
        faceDetection = new FaceDetection({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
            }
        });
        
        faceDetection.setOptions({
            model: 'short',
            minDetectionConfidence: 0.7, // Increased confidence threshold to reduce false positives
        });
        
        faceDetection.onResults(onFaceDetectionResults);
        
        // Initialize TensorFlow.js Object Detection
        objectDetectionModel = await cocoSsd.load();
        
        logEvent('AI models loaded successfully', 'success');
    } catch (error) {
        logEvent(`Error loading AI models: ${error.message}`, 'alert');
        console.error('Model loading error:', error);
    }
}

// Start camera
async function startCamera() {
    try {
        logEvent('Starting camera...', 'info');
        document.getElementById('cameraStatus').textContent = 'Requesting camera access...';
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        });
        
        videoElement.srcObject = stream;
        
        videoElement.onloadedmetadata = () => {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
            document.getElementById('cameraStatus').textContent = 'Camera active';
            
            isDetecting = true;
            startDetectionLoop();
            
            logEvent('Camera started successfully', 'success');
        };
        
    } catch (error) {
        logEvent(`Camera error: ${error.message}`, 'alert');
        document.getElementById('cameraStatus').textContent = 'Camera access denied';
    }
}

// Stop camera
function stopCamera() {
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    
    isDetecting = false;
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('cameraStatus').textContent = 'Camera stopped';
    
    // Reset timers
    resetTimers();
    
    logEvent('Camera stopped', 'info');
}

// Start detection loop
async function startDetectionLoop() {
    if (!isDetecting) return;
    
    try {
        // Face detection
        if (faceDetection && videoElement.videoWidth > 0) {
            await faceDetection.send({image: videoElement});
        }
        
        // Object detection (run every 3 seconds to save resources)
        if (objectDetectionModel) {
            await runObjectDetection();
        }
        
    } catch (error) {
        console.error('Detection error:', error);
    }
    
    // Reduce frame rate to 10 FPS instead of 60 FPS to prevent spam
    setTimeout(() => {
        requestAnimationFrame(startDetectionLoop);
    }, 100);
}

// Handle face detection results
function onFaceDetectionResults(results) {
    if (!canvasCtx) return;
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    const currentTime = Date.now();
    const faceCount = results.detections.length;
    
    // Update face count display - this is the REAL face count from MediaPipe
    document.getElementById('faceCount').textContent = faceCount;
    
    if (faceCount === 0) {
        // No face detected by MediaPipe
        handleNoFace(currentTime);
    } else if (faceCount === 1) {
        // Single face detected by MediaPipe
        handleSingleFace(results.detections[0], currentTime);
        drawFaceDetection(results.detections[0], '#00ff00');
    } else {
        // Multiple faces detected by MediaPipe (2 or more actual faces)
        handleMultipleFaces(faceCount, currentTime);
        results.detections.forEach((detection, index) => {
            drawFaceDetection(detection, index === 0 ? '#00ff00' : '#ff0000');
        });
    }
}

// Handle no face detection
let lastNoFaceAlert = 0;
function handleNoFace(currentTime) {
    if (noFaceStartTime === null) {
        noFaceStartTime = currentTime;
    }
    
    const duration = (currentTime - noFaceStartTime) / 1000;
    updateTimer('noFaceTimer', duration);
    
    if (duration >= NO_FACE_THRESHOLD / 1000) {
        // Only alert once when threshold is first crossed
        if (currentTime - lastNoFaceAlert > NO_FACE_THRESHOLD) {
            logEvent(`No face detected for ${duration.toFixed(1)} seconds`, 'alert');
            eventCounts.noFaceEvents++;
            eventCounts.totalEvents++;
            lastNoFaceAlert = currentTime;
        }
    }
    
    // Reset looking away timer when no face is detected
    lookingAwayStartTime = null;
    updateTimer('lookingAwayTimer', 0);
}

// Handle single face detection
let lastLookingAwayAlert = 0;
function handleSingleFace(detection, currentTime) {
    lastFaceDetectionTime = currentTime;
    
    // Reset no face timer
    if (noFaceStartTime !== null) {
        logEvent('Face detected again', 'success');
        noFaceStartTime = null;
    }
    updateTimer('noFaceTimer', 0);
    
    // Check if looking away using simple heuristic
    const isLookingAway = checkIfLookingAway(detection);
    
    if (isLookingAway) {
        if (lookingAwayStartTime === null) {
            lookingAwayStartTime = currentTime;
        }
        
        const duration = (currentTime - lookingAwayStartTime) / 1000;
        updateTimer('lookingAwayTimer', duration);
        
        if (duration >= LOOKING_AWAY_THRESHOLD / 1000) {
            // Only alert once when threshold is first crossed
            if (currentTime - lastLookingAwayAlert > LOOKING_AWAY_THRESHOLD) {
                logEvent(`Looking away for ${duration.toFixed(1)} seconds`, 'warning');
                eventCounts.lookingAwayEvents++;
                eventCounts.totalEvents++;
                lastLookingAwayAlert = currentTime;
            }
        }
    } else {
        // Reset looking away timer
        if (lookingAwayStartTime !== null) {
            logEvent('Looking at camera again', 'success');
            lookingAwayStartTime = null;
        }
        updateTimer('lookingAwayTimer', 0);
    }
}

// Handle multiple faces detection
let lastMultipleFaceAlert = 0;
function handleMultipleFaces(count, currentTime) {
    // Only log if it's been more than 5 seconds since last alert
    if (currentTime - lastMultipleFaceAlert > 5000) {
        logEvent(`Multiple faces detected: ${count} people in frame`, 'alert');
        eventCounts.multipleFaceEvents++;
        eventCounts.totalEvents++;
        lastMultipleFaceAlert = currentTime;
    }
    
    // Reset timers for multiple faces
    noFaceStartTime = null;
    lookingAwayStartTime = null;
    updateTimer('noFaceTimer', 0);
    updateTimer('lookingAwayTimer', 0);
}

// Simple heuristic to check if looking away
function checkIfLookingAway(detection) {
    // This is a simplified heuristic - in practice you'd use more sophisticated methods
    const bbox = detection.boundingBox;
    const centerX = bbox.xCenter;
    
    // If face is too far from center, consider it as looking away
    return Math.abs(centerX - 0.5) > 0.2;
}

// Draw face detection
function drawFaceDetection(detection, color) {
    const bbox = detection.boundingBox;
    const x = bbox.xCenter * canvasElement.width - (bbox.width * canvasElement.width) / 2;
    const y = bbox.yCenter * canvasElement.height - (bbox.height * canvasElement.height) / 2;
    const width = bbox.width * canvasElement.width;
    const height = bbox.height * canvasElement.height;
    
    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = 3;
    canvasCtx.strokeRect(x, y, width, height);
    
    // Draw keypoints if available
    if (detection.landmarks) {
        canvasCtx.fillStyle = color;
        detection.landmarks.forEach(landmark => {
            const x = landmark.x * canvasElement.width;
            const y = landmark.y * canvasElement.height;
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
            canvasCtx.fill();
        });
    }
}

// Run object detection
let lastObjectDetection = 0;
let detectedObjects = new Map(); // Track objects to avoid spam
let currentSuspiciousCount = 0;

async function runObjectDetection() {
    try {
        const currentTime = Date.now();
        
        // Only run object detection every 2 seconds to avoid spam
        if (currentTime - lastObjectDetection < 2000) {
            return;
        }
        lastObjectDetection = currentTime;
        
        const predictions = await objectDetectionModel.detect(videoElement);
        
        currentSuspiciousCount = 0;
        
        // Filter out 'person' detections to avoid conflict with face detection
        const filteredPredictions = predictions.filter(pred => pred.class !== 'person');
        
        filteredPredictions.forEach(prediction => {
            if (SUSPICIOUS_OBJECTS.includes(prediction.class) && prediction.score > 0.6) {
                const objectKey = prediction.class;
                
                currentSuspiciousCount++;
                
                // Only log if this object wasn't detected in the last 10 seconds
                if (!detectedObjects.has(objectKey) || 
                    currentTime - detectedObjects.get(objectKey) > 10000) {
                    
                    logEvent(`Suspicious object detected: ${prediction.class} (${(prediction.score * 100).toFixed(1)}% confidence)`, 'alert');
                    eventCounts.suspiciousObjectEvents++;
                    eventCounts.totalEvents++;
                    
                    detectedObjects.set(objectKey, currentTime);
                }
                
                // Draw bounding box for suspicious object
                drawObjectDetection(prediction, '#ff0000');
            } else if (prediction.score > 0.5) {
                // Draw bounding box for other objects in different color
                drawObjectDetection(prediction, '#ffff00');
            }
        });
        
        // Update the suspicious object count display
        document.getElementById('objectCount').textContent = currentSuspiciousCount;
        
        // Clean up old detections (older than 15 seconds)
        for (let [key, time] of detectedObjects.entries()) {
            if (currentTime - time > 15000) {
                detectedObjects.delete(key);
            }
        }
        
    } catch (error) {
        console.error('Object detection error:', error);
    }
}

// Draw object detection
function drawObjectDetection(prediction, color) {
    const [x, y, width, height] = prediction.bbox;
    
    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeRect(x, y, width, height);
    
    // Draw label
    canvasCtx.fillStyle = color;
    canvasCtx.font = '16px Arial';
    canvasCtx.fillText(
        `${prediction.class} ${(prediction.score * 100).toFixed(0)}%`,
        x,
        y > 20 ? y - 5 : y + 20
    );
}

// Update timer display
function updateTimer(elementId, seconds) {
    const element = document.getElementById(elementId);
    element.textContent = `${seconds.toFixed(1)}s`;
    
    // Add warning/alert classes based on duration
    element.className = 'status-value';
    if (seconds >= 5 && seconds < 10) {
        element.classList.add('timer-warning');
    } else if (seconds >= 10) {
        element.classList.add('timer-alert');
    }
}

// Reset all timers
function resetTimers() {
    updateTimer('noFaceTimer', 0);
    updateTimer('lookingAwayTimer', 0);
    document.getElementById('faceCount').textContent = '0';
    document.getElementById('objectCount').textContent = '0';
    
    noFaceStartTime = null;
    lookingAwayStartTime = null;
}

// Start interview session
async function startSession() {
    const candidateName = document.getElementById('candidateName').value || 'Unknown Candidate';
    
    try {
        const response = await fetch(`${API_BASE_URL}/session/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ candidateName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentSessionId = data.sessionId;
            isSessionActive = true;
            sessionStartTime = Date.now();
            
            // Reset all counters
            eventCounts = {
                noFaceEvents: 0,
                lookingAwayEvents: 0,
                multipleFaceEvents: 0,
                suspiciousObjectEvents: 0,
                totalEvents: 0
            };
            
            // Start session timer
            sessionTimer = setInterval(updateSessionTimer, 1000);
            
            // Update UI
            document.getElementById('startSessionBtn').disabled = true;
            document.getElementById('endSessionBtn').disabled = false;
            document.getElementById('sessionStatus').textContent = 'Interview Session Active';
            document.getElementById('sessionStatus').className = 'session-status session-active';
            document.getElementById('reportSection').style.display = 'none';
            document.getElementById('candidateName').disabled = true;
            
            // Clear previous logs
            clearEventLog();
            logEvent(`Interview session started for ${candidateName}`, 'success');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error starting session:', error);
        logEvent(`Failed to start session: ${error.message}`, 'alert');
    }
}

// End interview session
async function endSession() {
    try {
        const response = await fetch(`${API_BASE_URL}/session/end`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId: currentSessionId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            isSessionActive = false;
            
            if (sessionTimer) {
                clearInterval(sessionTimer);
                sessionTimer = null;
            }
            
            // Update UI
            document.getElementById('startSessionBtn').disabled = false;
            document.getElementById('endSessionBtn').disabled = true;
            document.getElementById('sessionStatus').textContent = 'No Active Session';
            document.getElementById('sessionStatus').className = 'session-status session-inactive';
            document.getElementById('candidateName').disabled = false;
            
            logEvent('Interview session ended', 'info');
            
            // Generate and display report
            generateSessionReport();
            
            currentSessionId = null;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error ending session:', error);
        logEvent(`Failed to end session: ${error.message}`, 'alert');
    }
}

// Update session timer display
function updateSessionTimer() {
    if (!sessionStartTime) return;
    
    const elapsed = Date.now() - sessionStartTime;
    const seconds = Math.floor(elapsed / 1000) % 60;
    const minutes = Math.floor(elapsed / (1000 * 60)) % 60;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    
    document.getElementById('sessionTimer').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Generate session report
function generateSessionReport() {
    const sessionDuration = sessionStartTime ? Date.now() - sessionStartTime : 0;
    const durationMinutes = (sessionDuration / (1000 * 60)).toFixed(1);
    
    const reportData = [
        { label: 'Session Duration', value: `${durationMinutes} min`, color: '#3498db' },
        { label: 'Total Events', value: eventCounts.totalEvents, color: '#9b59b6' },
        { label: 'No Face Events', value: eventCounts.noFaceEvents, color: '#e74c3c' },
        { label: 'Looking Away Events', value: eventCounts.lookingAwayEvents, color: '#f39c12' },
        { label: 'Multiple Face Events', value: eventCounts.multipleFaceEvents, color: '#e67e22' },
        { label: 'Suspicious Objects', value: eventCounts.suspiciousObjectEvents, color: '#c0392b' }
    ];
    
    const reportGrid = document.getElementById('reportGrid');
    reportGrid.innerHTML = '';
    
    reportData.forEach(item => {
        const reportItem = document.createElement('div');
        reportItem.className = 'report-item';
        reportItem.innerHTML = `
            <div class="report-value" style="color: ${item.color}">${item.value}</div>
            <div class="report-label">${item.label}</div>
        `;
        reportGrid.appendChild(reportItem);
    });
    
    // Show report section
    document.getElementById('reportSection').style.display = 'block';
    
    logEvent('Session report generated', 'success');
}

// Log event to UI and backend
function logEvent(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const eventElement = document.createElement('div');
    eventElement.className = `event event-${type}`;
    
    eventElement.innerHTML = `
        <div class="event-timestamp">${timestamp}</div>
        <div class="event-message">${message}</div>
    `;
    
    const eventLog = document.getElementById('eventLog');
    eventLog.insertBefore(eventElement, eventLog.firstChild);
    
    // Keep only last 50 events
    while (eventLog.children.length > 50) {
        eventLog.removeChild(eventLog.lastChild);
    }
    
    // Send event to backend if session is active
    if (isSessionActive && currentSessionId) {
        fetch(`${API_BASE_URL}/event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: currentSessionId,
                type: type,
                message: message
            })
        }).catch(error => {
            console.error('Error sending event to backend:', error);
        });
    }
}

// Clear event log
function clearEventLog() {
    document.getElementById('eventLog').innerHTML = '';
    logEvent('Event log cleared', 'info');
}

// Additional function to improve book detection
function enhanceBookDetection(predictions) {
    // Filter out false positive book detections
    return predictions.filter(prediction => {
        // If it's a book detection, apply additional validation
        if (prediction.class === 'book') {
            const [x, y, width, height] = prediction.bbox;
            const aspectRatio = width / height;
            
            // Books typically have aspect ratios between 0.6 and 1.8
            const isLikelyBook = aspectRatio >= 0.6 && aspectRatio <= 1.8;
            
            // Books are usually rectangular, not too small
            const isReasonableSize = width > 50 && height > 30;
            
            return isLikelyBook && isReasonableSize && prediction.score > 0.65;
        }
        return true;
    });
}