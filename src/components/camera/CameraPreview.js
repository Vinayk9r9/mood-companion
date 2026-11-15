export class CameraPreview {
  constructor(stateManager, themeManager) {
    this.stateManager = stateManager;
    this.themeManager = themeManager;
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasContext = null;
    this.faceLandmarker = null;
    this.isRunning = false;
    this.animationFrameId = null;
    this.detectionInterval = null;
    this.lastDetectionTime = 0;
    this.detectionFPS = 10; // Run detection at 10 FPS for smoother tracking
    this.lastVideoTime = -1;
    this.lastProcessTime = 0;
  }

  mount(videoElement, canvasElement) {
    console.log('[CameraPreview] mount() called with:', {
      videoElement: videoElement ? 'found' : 'MISSING',
      canvasElement: canvasElement ? 'found' : 'MISSING'
    });

    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasContext = canvasElement.getContext('2d');

    if (!this.canvasContext) {
      console.error('[CameraPreview] Failed to get canvas 2d context!');
    }

    // Set canvas size to match video
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // MediaPipe will be initialized lazily when camera starts
    this.faceMeshInitialized = false;

    // Listen for camera control events from CameraToggle or other components
    this.unsubscribes = [];
    this.unsubscribes.push(
      this.stateManager.on('camera:start', () => this.start())
    );
    this.unsubscribes.push(
      this.stateManager.on('camera:stop', () => this.stop())
    );
    this.unsubscribes.push(
      this.stateManager.on('camera:toggle-pause', () => this.togglePause())
    );
  }

  resizeCanvas() {
    if (this.videoElement && this.canvasElement) {
      const rect = this.videoElement.getBoundingClientRect();
      this.canvasElement.width = rect.width;
      this.canvasElement.height = rect.height;
    }
  }

  
async initFaceLandmarker() {
  try {
    console.log('[CameraPreview] Initializing MediaPipe FaceLandmarker...');

    const { FaceLandmarker, FilesetResolver } = await import(
      '/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs'
    );

    const vision = await FilesetResolver.forVisionTasks(
      '/node_modules/@mediapipe/tasks-vision/wasm'
    );

    this.faceLandmarker = await FaceLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      }
    );

    console.log('[CameraPreview] FaceLandmarker initialized successfully');

  } catch (error) {
    console.error('[CameraPreview] Failed to initialize FaceLandmarker:', error);

    this.stateManager.addNotification({
      type: 'error',
      title: 'Face Detection Error',
      message: 'Unable to initialize face detection. Check the console for details.'
    });

    throw error;
  }
}


  loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.hasAttribute('data-loaded')) {
          resolve();
        } else {
          existing.onload = resolve;
          existing.onerror = reject;
        }
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.setAttribute('data-loaded', 'true');
        resolve();
      };
      script.onerror = (err) => {
        console.warn(`[CameraPreview] Failed to load script: ${src}`, err);
        reject(err);
      };
      document.head.appendChild(script);
    });
  }

  async start() {
    if (this.isRunning) return;

    try {
      // Check if we're in a secure context (required for camera)
      if (!window.isSecureContext) {
        throw new Error('Camera requires HTTPS or localhost. Please serve this page over HTTPS or use localhost.');
      }

      console.log('[CameraPreview] start() called');

      // Initialize MediaPipe FaceLandmarker lazily
      if (!this.faceLandmarker) {
        await this.initFaceLandmarker();

        if (!this.faceLandmarker) {
          throw new Error('Face detection failed to initialize');
        }

        console.log('[CameraPreview] FaceLandmarker initialized successfully');
      }

      // Request camera permission
      this.stateManager.setCameraPermission('prompt');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.stateManager.setCameraStream(stream);
      this.stateManager.setCameraPermission('granted');
      this.stateManager.setCameraActive(true);

      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      console.log('[CameraPreview] Video playing, videoElement.readyState:', this.videoElement.readyState);
      console.log('[CameraPreview] Video dimensions:', this.videoElement.videoWidth, 'x', this.videoElement.videoHeight);

      // Resize canvas to match video dimensions
      this.resizeCanvas();

      console.log('[CameraPreview] Canvas size after resize:', this.canvasElement.width, 'x', this.canvasElement.height);

      this.isRunning = true;
      this.startDetectionLoop();

      this.stateManager.addNotification({
        type: 'success',
        title: 'Camera Started',
        message: 'Face detection is now active.'
      });
    } catch (error) {
      console.error('Camera error:', error);
      this.stateManager.setCameraPermission('denied');
      this.stateManager.addNotification({
        type: 'error',
        title: 'Camera Access Denied',
        message: error.name === 'NotAllowedError'
          ? 'Please allow camera access in your browser settings.'
          : 'Unable to access camera. Please check your device.'
      });
      throw error;
    }
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    const stream = this.stateManager.getCameraStream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    this.stateManager.setCameraStream(null);
    this.stateManager.setCameraActive(false);
    this.stateManager.setExpressionDetecting(false);
    this.stateManager.setFaceDetected(false);

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    // Clear canvas
    if (this.canvasContext && this.canvasElement) {
      this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
  }

  togglePause() {
    const isPaused = this.stateManager.get('camera.isPaused');
    this.stateManager.setCameraPaused(!isPaused);

    if (!isPaused) {
      // Pausing - stop detection but keep stream
      if (this.detectionInterval) {
        clearInterval(this.detectionInterval);
        this.detectionInterval = null;
      }
      this.stateManager.setExpressionDetecting(false);
    } else {
      // Resuming - restart detection
      this.startDetectionLoop();
    }
  }

  startDetectionLoop() {
    if (!this.isRunning || this.stateManager.get('camera.isPaused')) return;

    this.stateManager.setExpressionDetecting(true);
    this.lastVideoTime = -1;

    // Process frames at specified FPS using requestAnimationFrame for smoother video sync
    const processFrame = () => {
      if (!this.isRunning || this.stateManager.get('camera.isPaused') || !this.faceLandmarker || this.videoElement.readyState !== 4) {
        if (this.isRunning && !this.stateManager.get('camera.isPaused')) {
          this.animationFrameId = requestAnimationFrame(processFrame);
        }
        return;
      }

      const videoTime = this.videoElement.currentTime * 1000; // Convert to milliseconds

      // Skip if video time hasn't advanced (prevents duplicate processing)
      if (videoTime <= this.lastVideoTime) {
        this.animationFrameId = requestAnimationFrame(processFrame);
        return;
      }
      this.lastVideoTime = videoTime;

      // Throttle to target FPS
      const now = performance.now();
      if (now - this.lastProcessTime < 1000 / this.detectionFPS) {
        this.animationFrameId = requestAnimationFrame(processFrame);
        return;
      }
      this.lastProcessTime = now;

      console.log('[CameraPreview] Detecting frame at time:', videoTime);
      try {
        const results = this.faceLandmarker.detectForVideo(this.videoElement, videoTime);
        this.onFaceLandmarkerResults(results);
      } catch (err) {
        console.warn('[CameraPreview] FaceLandmarker detect error:', err);
      }

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  onFaceLandmarkerResults(results) {
    if (!this.isRunning) return;

    const now = Date.now();
    this.lastDetectionTime = now;

    console.log('[CameraPreview] FaceLandmarker results:', results.faceLandmarks ? results.faceLandmarks.length : 'no landmarks');

    // Draw face mesh on canvas
    this.drawFaceMesh(results);

    // Update face detection status
    const faceDetected = results.faceLandmarks && results.faceLandmarks.length > 0;
    this.stateManager.setFaceDetected(faceDetected);

    if (faceDetected && results.faceLandmarks[0]) {
      const landmarks = results.faceLandmarks[0];

      // Classify expression
      const { expression, confidence } = this.classifyExpression(landmarks);

      // Update state
      this.stateManager.updateExpression(expression, confidence, landmarks);
    } else {
      // No face detected - reset expression after a delay
      this.stateManager.updateExpression('neutral', 0, null);
    }
  }

  drawFaceMesh(results) {
    if (!this.canvasContext || !this.canvasElement) {
      console.warn('[CameraPreview] drawFaceMesh: canvasContext or canvasElement missing');
      return;
    }

    const ctx = this.canvasContext;
    const canvas = this.canvasElement;

    console.log('[CameraPreview] drawFaceMesh: canvas size', canvas.width, 'x', canvas.height);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
      console.log('[CameraPreview] No face landmarks in results');
      return;
    }

    const landmarks = results.faceLandmarks[0];
    const scaleX = canvas.width;
    const scaleY = canvas.height;

    // Draw face bounding box
    this.drawBoundingBox(ctx, landmarks, scaleX, scaleY);

    // Draw connections (simplified - only key features)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.lineWidth = 1;

    // Draw key facial features - CSS handles mirroring for both video and canvas
    this.drawFeature(ctx, landmarks, scaleX, scaleY, [
      // Left eye
      33, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7,
      // Right eye
      362, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382,
      // Mouth
      61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
      // Face oval (key points)
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
    ], true);
  }

  drawBoundingBox(ctx, landmarks, scaleX, scaleY) {
    // Face oval landmark indices (MediaPipe Face Mesh) - these define the face boundary
    const faceOvalIndices = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
      397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
      172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
    ];

    let minX = 1, minY = 1, maxX = 0, maxY = 0;

    for (const idx of faceOvalIndices) {
      const point = landmarks[idx];
      if (point) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }

    console.log('[CameraPreview] Face bounds:', { minX, minY, maxX, maxY, scaleX, scaleY });

    // Add padding (10% of box size)
    const paddingX = (maxX - minX) * 0.1;
    const paddingY = (maxY - minY) * 0.1;
    minX = Math.max(0, minX - paddingX);
    minY = Math.max(0, minY - paddingY);
    maxX = Math.min(1, maxX + paddingX);
    maxY = Math.min(1, maxY + paddingY);

    // Convert to canvas coordinates - CSS handles mirroring
    const x = minX * scaleX;
    const y = minY * scaleY;
    const width = (maxX - minX) * scaleX;
    const height = (maxY - minY) * scaleY;

    console.log('[CameraPreview] Drawing box at:', { x, y, width, height });

    // Draw bounding box
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Draw corner accents for a modern look
    const cornerLength = Math.min(width, height) * 0.15;
    ctx.strokeStyle = 'rgba(168, 85, 247, 1)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + cornerLength);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLength, y);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + width - cornerLength, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + cornerLength);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + height - cornerLength);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + cornerLength, y + height);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + width - cornerLength, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y + height - cornerLength);
    ctx.stroke();

    // Draw face count label
    

    // Counter-flip the text so it reads normally
    ctx.save();

    ctx.translate(2 * x, 0);
    ctx.scale(-1, 1);

    ctx.fillStyle = 'rgba(101, 85, 247, 0.68)';
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('1 Face Detected', x, y - 8);

    ctx.restore();
  }

  drawFeature(ctx, landmarks, scaleX, scaleY, indices, closed = false) {
    if (indices.length < 2) return;

    ctx.beginPath();
    const first = landmarks[indices[0]];
    ctx.moveTo(first.x * scaleX, first.y * scaleY);

    for (let i = 1; i < indices.length; i++) {
      const point = landmarks[indices[i]];
      ctx.lineTo(point.x * scaleX, point.y * scaleY);
    }

    if (closed) ctx.closePath();
    ctx.stroke();
  }

  classifyExpression(landmarks) {
    // Calculate geometric features from landmarks
    const features = this.extractFeatures(landmarks);

    // Rule-based classification with confidence scoring
    const scores = this.calculateExpressionScores(features);

    // Find highest scoring expression
    let bestExpression = 'neutral';
    let bestScore = 0;

    for (const [expr, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestExpression = expr;
      }
    }

    // Only return expression if confidence is above threshold
    if (bestScore < 0.3) {
      return { expression: 'neutral', confidence: 0 };
    }

    return { expression: bestExpression, confidence: Math.min(bestScore, 1.0) };
  }

  extractFeatures(landmarks) {
    // Helper to get point
    const p = (idx) => landmarks[idx];
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    // Eye Aspect Ratio (EAR) - measures eye openness
    const leftEAR = this.eyeAspectRatio(
      p(159), p(145), p(133), p(173), p(157), p(158)
    );
    const rightEAR = this.eyeAspectRatio(
      p(386), p(374), p(362), p(466), p(387), p(388)
    );
    const avgEAR = (leftEAR + rightEAR) / 2;

    // Mouth Aspect Ratio (MAR) - measures mouth openness
    const mar = this.mouthAspectRatio(
      p(13), p(14), p(78), p(308), p(82), p(87), p(312), p(317)
    );

    // Mouth curvature - smile/frown detection
    const mouthLeft = p(61);
    const mouthRight = p(291);
    const mouthTop = p(13);
    const mouthBottom = p(14);
    const mouthCenter = p(17);

    const mouthWidth = dist(mouthLeft, mouthRight);
    const mouthHeight = dist(mouthTop, mouthBottom);
    const mouthCornerAvg = (dist(mouthLeft, mouthCenter) + dist(mouthRight, mouthCenter)) / 2;

    // Smile detection: corners raised relative to center
    const smileScore = (mouthCornerAvg - mouthHeight / 2) / mouthWidth;

    // Eyebrow position - surprise/anger
    const leftBrow = p(70);
    const rightBrow = p(300);
    const leftEyeTop = p(159);
    const rightEyeTop = p(386);
    const browHeight = ((leftBrow.y - leftEyeTop.y) + (rightBrow.y - rightEyeTop.y)) / 2;

    // Head pose estimation (simplified)
    const noseTip = p(1);
    const leftCheek = p(234);
    const rightCheek = p(454);
    const faceWidth = dist(leftCheek, rightCheek);
    const noseOffset = (noseTip.x - (leftCheek.x + rightCheek.x) / 2) / faceWidth;

    return {
      avgEAR,
      mar,
      smileScore,
      browHeight,
      noseOffset,
      mouthWidth,
      mouthHeight
    };
  }

  eyeAspectRatio(p1, p2, p3, p4, p5, p6) {
    // Vertical distances
    const v1 = Math.hypot(p2.x - p6.x, p2.y - p6.y);
    const v2 = Math.hypot(p3.x - p5.x, p3.y - p5.y);
    // Horizontal distance
    const h = Math.hypot(p1.x - p4.x, p1.y - p4.y);
    return (v1 + v2) / (2 * h);
  }

  mouthAspectRatio(p1, p2, p3, p4, p5, p6, p7, p8) {
    // Vertical distances (inner and outer)
    const v1 = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const v2 = Math.hypot(p5.x - p6.x, p5.y - p6.y);
    const v3 = Math.hypot(p7.x - p8.x, p7.y - p8.y);
    // Horizontal distance
    const h = Math.hypot(p3.x - p4.x, p3.y - p4.y);
    return (v1 + v2 + v3) / (3 * h);
  }

  calculateExpressionScores(features) {
    const { avgEAR, mar, smileScore, browHeight, noseOffset } = features;

    // Normalize features (approximate ranges based on testing)
    const normEAR = Math.max(0, Math.min(1, (avgEAR - 0.15) / 0.15)); // 0.15-0.3 typical
    const normMAR = Math.max(0, Math.min(1, (mar - 0.3) / 0.5)); // 0.3-0.8 typical
    const normSmile = Math.max(-1, Math.min(1, smileScore * 10)); // -0.1 to 0.1 typical
    const normBrow = Math.max(-1, Math.min(1, browHeight * 50)); // -0.02 to 0.02 typical

    const scores = {};

    // Happy: High smile, normal EAR, moderate MAR
    scores.happy = Math.max(0,
      (normSmile > 0 ? normSmile * 0.8 : 0) +
      (normEAR > 0.3 && normEAR < 0.7 ? 0.3 : 0) +
      (normMAR > 0.2 && normMAR < 0.6 ? 0.2 : 0)
    );

    // Sad: Low smile (frown), droopy eyes, low brows
    scores.sad = Math.max(0,
      (normSmile < -0.1 ? Math.abs(normSmile) * 0.6 : 0) +
      (normEAR < 0.3 ? (0.3 - normEAR) * 1.5 : 0) +
      (normBrow < -0.1 ? Math.abs(normBrow) * 0.5 : 0)
    );

    // Angry: Low brows, tight eyes, slight frown
    scores.angry = Math.max(0,
      (normBrow < -0.2 ? Math.abs(normBrow) * 1.2 : 0) +
      (normEAR < 0.25 ? (0.25 - normEAR) * 2 : 0) +
      (normSmile < 0 ? Math.abs(normSmile) * 0.3 : 0)
    );

    // Surprised: High brows, wide eyes, open mouth
    scores.surprised = Math.max(0,
      (normBrow > 0.3 ? (normBrow - 0.3) * 2 : 0) +
      (normEAR > 0.4 ? (normEAR - 0.4) * 2 : 0) +
      (normMAR > 0.5 ? (normMAR - 0.5) * 1.5 : 0)
    );

    // Confused: Asymmetric brows, slight frown, tilted head
    scores.confused = Math.max(0,
      (Math.abs(noseOffset) > 0.1 ? Math.abs(noseOffset) * 2 : 0) +
      (normSmile < -0.05 ? Math.abs(normSmile) * 0.5 : 0) +
      (normBrow < 0 && normBrow > -0.3 ? 0.2 : 0)
    );

    // Tired: Low EAR (droopy eyes), low MAR, neutral mouth
    scores.tired = Math.max(0,
      (normEAR < 0.2 ? (0.2 - normEAR) * 3 : 0) +
      (normMAR < 0.2 ? (0.2 - normMAR) * 1 : 0) +
      (Math.abs(normSmile) < 0.1 ? 0.2 : 0)
    );

    // Neutral: Everything in middle ranges
    scores.neutral = Math.max(0,
      (normEAR > 0.2 && normEAR < 0.4 ? 0.4 : 0) +
      (normMAR > 0.2 && normMAR < 0.5 ? 0.3 : 0) +
      (Math.abs(normSmile) < 0.1 ? 0.3 : 0) +
      (Math.abs(normBrow) < 0.15 ? 0.3 : 0) +
      (Math.abs(noseOffset) < 0.08 ? 0.2 : 0)
    );

    // Normalize scores
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const key in scores) {
        scores[key] = scores[key] / total;
      }
    }

    return scores;
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', () => this.resizeCanvas());
    this.unsubscribes?.forEach(unsub => unsub());
  }
}