/**
 * Real-time Full-Body Motion Tracking Engine
 * Analyzes webcam feed split into Team A (Left) and Team B (Right)
 *
 * Tracks movements across the ENTIRE body of students:
 * 1. Head & Neck (Đầu & Cổ): Nodding, tilting, head shaking, jumping
 * 2. Torso & Belly (Bụng & Thân): Abdomen sway, twisting, core dance, breathing
 * 3. Arms & Hands (Tay & Cánh tay): Waving, raising hands, swinging
 * 4. Legs & Feet (Chân & Bàn chân): Stomping, kicking, squatting, jumping
 * 5. Whole-Body Jumps (Nhảy toàn thân): Rapid vertical silhouette translation
 */

export interface JointPoint {
  x: number;
  y: number;
  confidence: number;
  isMoving?: boolean;
}

export interface BodyZonesMotion {
  head: number;      // 0 - 100 energy for head movement
  belly: number;     // 0 - 100 energy for belly/torso movement
  arms: number;      // 0 - 100 energy for arms/hands movement
  legs: number;      // 0 - 100 energy for legs/feet movement
  jump: boolean;     // jumping / rapid vertical translation
  overall: number;   // 0 - 100 combined energy
}

export interface BodyLandmarks {
  // Head
  headTop: JointPoint;
  nose: JointPoint;
  neck: JointPoint;

  // Upper Limbs
  leftShoulder: JointPoint;
  rightShoulder: JointPoint;
  leftElbow: JointPoint;
  rightElbow: JointPoint;
  leftWrist: JointPoint;
  rightWrist: JointPoint;

  // Core & Belly (Bụng / Thân)
  spineChest: JointPoint;
  belly: JointPoint; // Center of abdomen / belly

  // Lower Body (Hông, Chân, Đầu gối, Bàn chân)
  leftHip: JointPoint;
  rightHip: JointPoint;
  leftKnee: JointPoint;
  rightKnee: JointPoint;
  leftAnkle: JointPoint;
  rightAnkle: JointPoint;

  // Status & Metrics
  isValidPerson: boolean;
  bodyHeight: number;
  bodyWidth: number;
  centerX: number;
  centerY: number;
  zones: BodyZonesMotion;
}

export interface TeamMotionFrameResult {
  score: number;
  instantMotion: number;
  isValidPerson: boolean;
  landmarks: BodyLandmarks | null;
  zones: BodyZonesMotion;
}

interface TeamState {
  prevLuminance: Uint8Array | null;
  prevCenterY: number | null;
  prevCenterX: number | null;
  prevHeight: number | null;
  recentScores: number[];
}

export class MotionTracker {
  private teamAState: TeamState = {
    prevLuminance: null,
    prevCenterY: null,
    prevCenterX: null,
    prevHeight: null,
    recentScores: [],
  };

  private teamBState: TeamState = {
    prevLuminance: null,
    prevCenterY: null,
    prevCenterX: null,
    prevHeight: null,
    recentScores: [],
  };

  /**
   * Resets tracker history at the start of a round
   */
  public reset() {
    this.teamAState = {
      prevLuminance: null,
      prevCenterY: null,
      prevCenterX: null,
      prevHeight: null,
      recentScores: [],
    };
    this.teamBState = {
      prevLuminance: null,
      prevCenterY: null,
      prevCenterX: null,
      prevHeight: null,
      recentScores: [],
    };
  }

  /**
   * Processes a video frame using an offscreen canvas (e.g. 320x240)
   * @param video HTMLVideoElement
   * @param canvas HTMLCanvasElement
   */
  public processFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): { teamA: TeamMotionFrameResult; teamB: TeamMotionFrameResult } {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const emptyZones: BodyZonesMotion = {
      head: 0,
      belly: 0,
      arms: 0,
      legs: 0,
      jump: false,
      overall: 0,
    };

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return {
        teamA: { score: 0, instantMotion: 0, isValidPerson: false, landmarks: null, zones: emptyZones },
        teamB: { score: 0, instantMotion: 0, isValidPerson: false, landmarks: null, zones: emptyZones },
      };
    }

    // Mirror draw for natural interactive webcam feed
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -width, 0, width, height);
    ctx.restore();

    const halfW = Math.floor(width / 2);
    const imgDataA = ctx.getImageData(0, 0, halfW, height);
    const imgDataB = ctx.getImageData(halfW, 0, halfW, height);

    const resA = this.analyzeTeamRegion(imgDataA, 0, halfW, height, this.teamAState);
    const resB = this.analyzeTeamRegion(imgDataB, halfW, halfW, height, this.teamBState);

    return {
      teamA: resA,
      teamB: resB,
    };
  }

  /**
   * Analyzes an image region for one team
   */
  private analyzeTeamRegion(
    imgData: ImageData,
    offsetX: number,
    regionWidth: number,
    regionHeight: number,
    state: TeamState
  ): TeamMotionFrameResult {
    const data = imgData.data;
    const step = 4; // 4x4 pixel downsampling for 60fps responsiveness
    const cols = Math.floor(regionWidth / step);
    const rows = Math.floor(regionHeight / step);
    const currentLum = new Uint8Array(cols * rows);

    let humanPixelCount = 0;
    let minX = regionWidth, maxX = 0;
    let minY = regionHeight, maxY = 0;
    let sumX = 0, sumY = 0;

    // Head accumulators (top 0% - 25%)
    let headSumX = 0, headSumY = 0, headCount = 0;
    // Torso / Belly accumulators (25% - 58%)
    let bellySumX = 0, bellySumY = 0, bellyCount = 0;
    // Arm accumulators (outer flanks 20% - 65%)
    let armLeftSumX = 0, armLeftSumY = 0, armLeftCount = 0;
    let armRightSumX = 0, armRightSumY = 0, armRightCount = 0;
    // Leg accumulators (58% - 100%)
    let legSumX = 0, legSumY = 0, legCount = 0;

    // Motion differencing accumulators
    let headMotionPixels = 0;
    let bellyMotionPixels = 0;
    let armMotionPixels = 0;
    let legMotionPixels = 0;

    const prevLum = state.prevLuminance;

    let sampleIdx = 0;
    for (let r = 0; r < rows; r++) {
      const y = r * step;
      const yRatio = y / regionHeight;

      for (let c = 0; c < cols; c++) {
        const x = c * step;
        const i = (y * regionWidth + x) * 4;

        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];

        // Convert to fast luminance
        const lum = (red * 2 + green * 5 + blue) >> 3;
        currentLum[sampleIdx] = lum;

        // Human skin/clothing presence detection
        const isLikelyHuman =
          (red > 35 && green > 35 && blue > 25 && (Math.abs(red - green) > 6 || Math.abs(red - blue) > 10)) ||
          (red + green + blue > 130 && red + green + blue < 700);

        if (isLikelyHuman) {
          humanPixelCount++;
          sumX += x;
          sumY += y;

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          // Spatial clustering by vertical body zones
          if (yRatio < 0.28) {
            headSumX += x;
            headSumY += y;
            headCount++;
          } else if (yRatio >= 0.28 && yRatio < 0.60) {
            bellySumX += x;
            bellySumY += y;
            bellyCount++;

            // Separate outer flanks for arms
            const xRatio = x / regionWidth;
            if (xRatio < 0.35) {
              armLeftSumX += x;
              armLeftSumY += y;
              armLeftCount++;
            } else if (xRatio > 0.65) {
              armRightSumX += x;
              armRightSumY += y;
              armRightCount++;
            }
          } else {
            legSumX += x;
            legSumY += y;
            legCount++;
          }
        }

        // Motion Differencing with previous frame
        if (prevLum) {
          const diff = Math.abs(lum - prevLum[sampleIdx]);
          if (diff > 12) {
            if (yRatio < 0.28) {
              headMotionPixels++;
            } else if (yRatio >= 0.28 && yRatio < 0.60) {
              const xRatio = x / regionWidth;
              if (xRatio < 0.30 || xRatio > 0.70) {
                armMotionPixels++;
              } else {
                bellyMotionPixels++; // Abdomen / Torso sway
              }
            } else {
              legMotionPixels++; // Stomping / Kicking / Squatting
            }
          }
        }

        sampleIdx++;
      }
    }

    state.prevLuminance = currentLum;

    const totalSamples = cols * rows;
    const coverage = humanPixelCount / totalSamples;
    const estimatedHeight = Math.max(0, maxY - minY);
    const estimatedWidth = Math.max(0, maxX - minX);

    // Validate student presence (tolerant so children at various distances are detected)
    const isValidPerson = coverage > 0.08 && estimatedHeight > regionHeight * 0.25;

    const centerX = humanPixelCount > 0 ? sumX / humanPixelCount : regionWidth * 0.5;
    const centerY = humanPixelCount > 0 ? sumY / humanPixelCount : regionHeight * 0.5;

    // Detect whole-body jumping / vertical displacement
    let isJumping = false;
    let jumpIntensity = 0;
    if (state.prevCenterY !== null && isValidPerson) {
      const deltaY = Math.abs(centerY - state.prevCenterY);
      if (deltaY > 3.2) {
        isJumping = true;
        jumpIntensity = Math.min(10, deltaY * 1.5);
      }
    }
    state.prevCenterY = centerY;
    state.prevCenterX = centerX;
    state.prevHeight = estimatedHeight;

    // Calculate Motion Energies across all body zones (0 - 100 scale)
    const headEnergy = Math.min(100, Math.round((headMotionPixels / Math.max(20, totalSamples * 0.15)) * 100));
    // High sensitivity on belly/abdomen
    const bellyEnergy = Math.min(100, Math.round((bellyMotionPixels / Math.max(25, totalSamples * 0.20)) * 120));
    const armEnergy = Math.min(100, Math.round((armMotionPixels / Math.max(25, totalSamples * 0.20)) * 100));
    const legEnergy = Math.min(100, Math.round((legMotionPixels / Math.max(30, totalSamples * 0.25)) * 110));

    const overallEnergy = Math.min(
      100,
      Math.round(headEnergy * 0.25 + bellyEnergy * 0.35 + armEnergy * 0.2 + legEnergy * 0.2 + (isJumping ? 20 : 0))
    );

    const zones: BodyZonesMotion = {
      head: headEnergy,
      belly: bellyEnergy,
      arms: armEnergy,
      legs: legEnergy,
      jump: isJumping,
      overall: overallEnergy,
    };

    // Calculate balanced frame score (Giving equal or higher weight to belly, head, and legs!)
    let frameScore = 0;
    if (isValidPerson) {
      // Head points
      const pHead = headEnergy > 10 ? Math.min(5, Math.round(headEnergy * 0.06)) : 0;
      // Belly / Torso points (generous score for core twists, swaying, breathing)
      const pBelly = bellyEnergy > 8 ? Math.min(7, Math.round(bellyEnergy * 0.08)) : 0;
      // Arm points
      const pArm = armEnergy > 10 ? Math.min(5, Math.round(armEnergy * 0.06)) : 0;
      // Leg / Stomp points
      const pLeg = legEnergy > 10 ? Math.min(6, Math.round(legEnergy * 0.07)) : 0;
      // Jump bonus
      const pJump = isJumping ? Math.round(jumpIntensity * 0.5) : 0;

      frameScore = pHead + pBelly + pArm + pLeg + pJump;
      // Cap per-frame score to 18 to maintain competitive fairness
      frameScore = Math.min(18, frameScore);
    }

    // Synthesize full-body anatomical landmarks
    const span = Math.max(22, estimatedWidth * 0.35);
    const midHeadX = headCount > 0 ? headSumX / headCount : centerX;
    const midHeadY = headCount > 0 ? headSumY / headCount : Math.max(20, minY + 15);

    const midBellyX = bellyCount > 0 ? bellySumX / bellyCount : centerX;
    const midBellyY = bellyCount > 0 ? bellySumY / bellyCount : centerY;

    const shoulderY = Math.min(regionHeight * 0.45, midHeadY + span * 0.7);
    const hipY = Math.max(shoulderY + 30, midBellyY + span * 0.5);

    const leftWristX = armLeftCount > 0 ? armLeftSumX / armLeftCount : centerX - span * 1.4;
    const leftWristY = armLeftCount > 0 ? armLeftSumY / armLeftCount : shoulderY + 35;
    const rightWristX = armRightCount > 0 ? armRightSumX / armRightCount : centerX + span * 1.4;
    const rightWristY = armRightCount > 0 ? armRightSumY / armRightCount : shoulderY + 35;

    const midLegX = legCount > 0 ? legSumX / legCount : centerX;
    const kneeY = Math.min(regionHeight - 25, hipY + 35);
    const ankleY = Math.min(regionHeight - 8, hipY + 70);

    const landmarks: BodyLandmarks = {
      headTop: { x: offsetX + midHeadX, y: Math.max(8, midHeadY - 18), confidence: 0.9, isMoving: headEnergy > 18 },
      nose: { x: offsetX + midHeadX, y: midHeadY, confidence: 0.9, isMoving: headEnergy > 18 },
      neck: { x: offsetX + midHeadX, y: midHeadY + 14, confidence: 0.9 },

      leftShoulder: { x: offsetX + midHeadX - span * 0.8, y: shoulderY, confidence: 0.9 },
      rightShoulder: { x: offsetX + midHeadX + span * 0.8, y: shoulderY, confidence: 0.9 },
      leftElbow: { x: offsetX + (leftWristX + midHeadX - span * 0.8) / 2, y: shoulderY + 20, confidence: 0.85 },
      rightElbow: { x: offsetX + (rightWristX + midHeadX + span * 0.8) / 2, y: shoulderY + 20, confidence: 0.85 },
      leftWrist: { x: offsetX + leftWristX, y: leftWristY, confidence: 0.85, isMoving: armEnergy > 18 },
      rightWrist: { x: offsetX + rightWristX, y: rightWristY, confidence: 0.85, isMoving: armEnergy > 18 },

      spineChest: { x: offsetX + midBellyX, y: (shoulderY + midBellyY) / 2, confidence: 0.9 },
      belly: { x: offsetX + midBellyX, y: midBellyY, confidence: 0.95, isMoving: bellyEnergy > 18 }, // Center belly

      leftHip: { x: offsetX + midBellyX - span * 0.55, y: hipY, confidence: 0.9 },
      rightHip: { x: offsetX + midBellyX + span * 0.55, y: hipY, confidence: 0.9 },

      leftKnee: { x: offsetX + midLegX - span * 0.45, y: kneeY, confidence: 0.85, isMoving: legEnergy > 18 },
      rightKnee: { x: offsetX + midLegX + span * 0.45, y: kneeY, confidence: 0.85, isMoving: legEnergy > 18 },

      leftAnkle: { x: offsetX + midLegX - span * 0.45, y: ankleY, confidence: 0.8, isMoving: legEnergy > 18 },
      rightAnkle: { x: offsetX + midLegX + span * 0.45, y: ankleY, confidence: 0.8, isMoving: legEnergy > 18 },

      isValidPerson,
      bodyHeight: estimatedHeight,
      bodyWidth: estimatedWidth,
      centerX: offsetX + centerX,
      centerY,
      zones,
    };

    return {
      score: frameScore,
      instantMotion: overallEnergy,
      isValidPerson,
      landmarks,
      zones,
    };
  }
}
