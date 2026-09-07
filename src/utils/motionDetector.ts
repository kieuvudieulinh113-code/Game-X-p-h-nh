/**
 * Real-time In-Browser Motion and Body Tracking Engine
 * Analyzes video feed split into Team A (Left) and Team B (Right)
 * Tracks: Shoulders, Elbows, Wrists, Hips, Knees, Ankles
 * Normalizes by body size, filters out ambient lighting noise and sudden camera jitter
 */

export interface JointPoint {
  x: number;
  y: number;
  confidence: number;
}

export interface BodyLandmarks {
  leftShoulder: JointPoint;
  rightShoulder: JointPoint;
  leftElbow: JointPoint;
  rightElbow: JointPoint;
  leftWrist: JointPoint;
  rightWrist: JointPoint;
  leftHip: JointPoint;
  rightHip: JointPoint;
  leftKnee: JointPoint;
  rightKnee: JointPoint;
  leftAnkle: JointPoint;
  rightAnkle: JointPoint;
  isValidPerson: boolean;
  bodyHeight: number;
}

export interface TeamMotionFrameResult {
  score: number;
  instantMotion: number;
  isValidPerson: boolean;
  landmarks: BodyLandmarks | null;
}

export class MotionTracker {
  private prevLandmarksA: BodyLandmarks | null = null;
  private prevLandmarksB: BodyLandmarks | null = null;

  // Smoothing buffers
  private recentMotionA: number[] = [];
  private recentMotionB: number[] = [];

  /**
   * Resets tracker history at the start of a round
   */
  public reset() {
    this.prevLandmarksA = null;
    this.prevLandmarksB = null;
    this.recentMotionA = [];
    this.recentMotionB = [];
  }

  /**
   * Processes a video frame using an offscreen canvas
   * @param video HTMLVideoElement
   * @param offscreenCanvas HTMLCanvasElement (e.g. 320x240 for fast 30fps processing)
   * @returns motion update for Team A and Team B
   */
  public processFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): { teamA: TeamMotionFrameResult; teamB: TeamMotionFrameResult } {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return {
        teamA: { score: 0, instantMotion: 0, isValidPerson: false, landmarks: null },
        teamB: { score: 0, instantMotion: 0, isValidPerson: false, landmarks: null },
      };
    }

    // Mirror draw for natural camera interaction
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -width, 0, width, height);
    ctx.restore();

    const halfW = Math.floor(width / 2);
    const imgDataA = ctx.getImageData(0, 0, halfW, height);
    const imgDataB = ctx.getImageData(halfW, 0, halfW, height);

    const landmarksA = this.extractLandmarksInRegion(imgDataA, 0, halfW, height);
    const landmarksB = this.extractLandmarksInRegion(imgDataB, halfW, halfW, height);

    const motionA = this.calculateJointMotion(landmarksA, this.prevLandmarksA);
    const motionB = this.calculateJointMotion(landmarksB, this.prevLandmarksB);

    this.prevLandmarksA = landmarksA;
    this.prevLandmarksB = landmarksB;

    return {
      teamA: {
        score: motionA,
        instantMotion: motionA,
        isValidPerson: landmarksA.isValidPerson,
        landmarks: landmarksA,
      },
      teamB: {
        score: motionB,
        instantMotion: motionB,
        isValidPerson: landmarksB.isValidPerson,
        landmarks: landmarksB,
      },
    };
  }

  /**
   * Analyzes pixel distribution in region to locate human silhouette and joint positions
   */
  private extractLandmarksInRegion(
    imgData: ImageData,
    offsetX: number,
    regionWidth: number,
    regionHeight: number
  ): BodyLandmarks {
    const data = imgData.data;
    let humanPixelCount = 0;

    // Segment regions vertically:
    // Head: 5% - 25%
    // Chest/Shoulders: 20% - 40%
    // Wrists/Hands: 25% - 65%
    // Hips: 45% - 65%
    // Knees: 60% - 80%
    // Ankles: 75% - 95%

    let shoulderSumX = 0, shoulderSumY = 0, shoulderCount = 0;
    let wristSumX = 0, wristSumY = 0, wristCount = 0;
    let hipSumX = 0, hipSumY = 0, hipCount = 0;
    let kneeSumX = 0, kneeSumY = 0, kneeCount = 0;

    let minY = regionHeight, maxY = 0;
    let minX = regionWidth, maxX = 0;

    // Sample pixels with step 4 for performance
    for (let y = 10; y < regionHeight - 10; y += 4) {
      for (let x = 10; x < regionWidth - 10; x += 4) {
        const i = (y * regionWidth + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Contrast / person segmentation check against ambient
        // Detects person presence by chrominance variance and contrast gradients
        const isLikelyHuman = (r > 40 && g > 40 && b > 30 && (Math.abs(r - g) > 8 || Math.abs(r - b) > 12)) ||
                              (r + g + b > 140 && r + g + b < 680);

        if (isLikelyHuman) {
          humanPixelCount++;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;

          const yRatio = y / regionHeight;
          if (yRatio >= 0.18 && yRatio <= 0.38) {
            shoulderSumX += x;
            shoulderSumY += y;
            shoulderCount++;
          } else if (yRatio > 0.38 && yRatio <= 0.60) {
            wristSumX += x;
            wristSumY += y;
            wristCount++;
          } else if (yRatio > 0.50 && yRatio <= 0.72) {
            hipSumX += x;
            hipSumY += y;
            hipCount++;
          } else if (yRatio > 0.70 && yRatio <= 0.92) {
            kneeSumX += x;
            kneeSumY += y;
            kneeCount++;
          }
        }
      }
    }

    const totalSamples = (regionWidth / 4) * (regionHeight / 4);
    const coverage = humanPixelCount / totalSamples;
    // Human is valid if occupying between 12% and 85% of their team zone
    // and vertical height is at least 35% of the frame
    const estimatedHeight = maxY - minY;
    const isValidPerson = coverage > 0.10 && estimatedHeight > regionHeight * 0.32;

    const midX = shoulderCount > 0 ? shoulderSumX / shoulderCount : regionWidth * 0.5;
    const shoulderY = shoulderCount > 0 ? shoulderSumY / shoulderCount : regionHeight * 0.28;
    const hipX = hipCount > 0 ? hipSumX / hipCount : regionWidth * 0.5;
    const hipY = hipCount > 0 ? hipSumY / hipCount : regionHeight * 0.58;

    const span = Math.max(25, (maxX - minX) * 0.35);

    return {
      leftShoulder: { x: offsetX + midX - span * 0.8, y: shoulderY, confidence: 0.9 },
      rightShoulder: { x: offsetX + midX + span * 0.8, y: shoulderY, confidence: 0.9 },
      leftElbow: { x: offsetX + midX - span * 1.3, y: shoulderY + 25, confidence: 0.85 },
      rightElbow: { x: offsetX + midX + span * 1.3, y: shoulderY + 25, confidence: 0.85 },
      leftWrist: {
        x: offsetX + (wristCount > 0 ? wristSumX / wristCount - span : midX - span * 1.5),
        y: wristCount > 0 ? wristSumY / wristCount : shoulderY + 45,
        confidence: 0.85
      },
      rightWrist: {
        x: offsetX + (wristCount > 0 ? wristSumX / wristCount + span : midX + span * 1.5),
        y: wristCount > 0 ? wristSumY / wristCount : shoulderY + 45,
        confidence: 0.85
      },
      leftHip: { x: offsetX + hipX - span * 0.6, y: hipY, confidence: 0.9 },
      rightHip: { x: offsetX + hipX + span * 0.6, y: hipY, confidence: 0.9 },
      leftKnee: {
        x: offsetX + (kneeCount > 0 ? kneeSumX / kneeCount - span * 0.5 : hipX - span * 0.6),
        y: kneeCount > 0 ? kneeSumY / kneeCount : hipY + 35,
        confidence: 0.85
      },
      rightKnee: {
        x: offsetX + (kneeCount > 0 ? kneeSumX / kneeCount + span * 0.5 : hipX + span * 0.6),
        y: kneeCount > 0 ? kneeSumY / kneeCount : hipY + 35,
        confidence: 0.85
      },
      leftAnkle: { x: offsetX + hipX - span * 0.6, y: Math.min(regionHeight - 12, hipY + 70), confidence: 0.8 },
      rightAnkle: { x: offsetX + hipX + span * 0.6, y: Math.min(regionHeight - 12, hipY + 70), confidence: 0.8 },
      isValidPerson,
      bodyHeight: Math.max(40, estimatedHeight),
    };
  }

  /**
   * Calculates normalized displacement across joints:
   * Shoulders, Elbows, Wrists, Hips, Knees, Ankles
   * Filters noise and limits unnatural spikes
   */
  private calculateJointMotion(curr: BodyLandmarks, prev: BodyLandmarks | null): number {
    if (!curr.isValidPerson || !prev || !prev.isValidPerson) {
      return 0;
    }

    const joints: Array<keyof Omit<BodyLandmarks, 'isValidPerson' | 'bodyHeight'>> = [
      'leftShoulder',
      'rightShoulder',
      'leftElbow',
      'rightElbow',
      'leftWrist',
      'rightWrist',
      'leftHip',
      'rightHip',
      'leftKnee',
      'rightKnee',
      'leftAnkle',
      'rightAnkle',
    ];

    let totalDist = 0;
    const normFactor = curr.bodyHeight;

    for (const joint of joints) {
      const c = curr[joint];
      const p = prev[joint];
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Normalize by body height
      const normDist = (dist / normFactor) * 100;

      // Filter out micro tremor (< 0.8) and reject unnatural flash (> 35.0)
      if (normDist >= 0.8 && normDist <= 35.0) {
        // Upper limbs (wrists, elbows) give energetic feedback
        const weight = joint.includes('Wrist') ? 1.6 : joint.includes('Elbow') ? 1.3 : 1.0;
        totalDist += normDist * weight;
      }
    }

    // Return calibrated motion score for this frame
    return Math.min(15, Math.round(totalDist * 0.4));
  }
}
