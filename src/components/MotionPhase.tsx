import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Team } from '../types';
import { MotionTracker, BodyLandmarks, BodyZonesMotion } from '../utils/motionDetector';
import { soundManager } from '../utils/audio';
import { TechCountdown } from './TechCountdown';
import { YouTubePlayer } from './YouTubePlayer';
import {
  YouTubeMusicConfig,
  loadYouTubeMusicConfig,
  saveYouTubeMusicConfig,
} from '../utils/youtube';
import {
  Camera,
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  Zap,
  UserCheck,
  UserX,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Activity,
  Radio,
  Cpu,
  RefreshCw,
  Flame,
  Volume2,
  VolumeX,
  Music,
  Timer,
} from 'lucide-react';

interface MotionPhaseProps {
  teams: [Team, Team];
  currentRound: number;
  motionDuration?: number;
  onMotionComplete: (winner: 'teamA' | 'teamB', scoreA: number, scoreB: number) => void;
  onRetryMotion: (reason: string) => void;
  retryNotice?: string | null;
  onClearRetryNotice?: () => void;
  onUpdateMotionDuration?: (seconds: number) => void;
}

const defaultZones: BodyZonesMotion = {
  head: 0,
  belly: 0,
  arms: 0,
  legs: 0,
  jump: false,
  overall: 0,
};

export const MotionPhase: React.FC<MotionPhaseProps> = ({
  teams,
  currentRound,
  motionDuration = 10,
  onMotionComplete,
  onRetryMotion,
  retryNotice: externalRetryNotice,
  onClearRetryNotice,
  onUpdateMotionDuration,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Attempt tracker to guarantee 100% clean timer resets on restart or retry
  const [attemptId, setAttemptId] = useState(1);
  const [localRetryNotice, setLocalRetryNotice] = useState<string | null>(null);

  // Manual referee mode
  const [isManualMode, setIsManualMode] = useState(false);

  // Motion scores accumulated
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const scoreARef = useRef(0);
  const scoreBRef = useRef(0);

  // Real-time validity
  const [teamAValid, setTeamAValid] = useState(false);
  const [teamBValid, setTeamBValid] = useState(false);

  // Real-time body zones activity (Đầu, Bụng, Tay, Chân)
  const [zonesA, setZonesA] = useState<BodyZonesMotion>(defaultZones);
  const [zonesB, setZonesB] = useState<BodyZonesMotion>(defaultZones);

  // Validity accumulation count to ensure at least some valid presence during 10s
  const validFramesCountA = useRef(0);
  const validFramesCountB = useRef(0);

  // Energy bars for tech visual equalizer
  const [motionEnergyA, setMotionEnergyA] = useState(0);
  const [motionEnergyB, setMotionEnergyB] = useState(0);

  // Motion Audio feedback state (saved in localStorage)
  const [isMotionAudioEnabled, setIsMotionAudioEnabled] = useState<boolean>(() => {
    return localStorage.getItem('cpmg_motion_audio') !== 'false';
  });
  const [audioWaveActive, setAudioWaveActive] = useState(false);

  // YouTube Background Music state (saved in localStorage)
  const [ytConfig, setYtConfig] = useState<YouTubeMusicConfig>(() => loadYouTubeMusicConfig());

  const handleUpdateYtConfig = (newCfg: YouTubeMusicConfig) => {
    setYtConfig(newCfg);
    saveYouTubeMusicConfig(newCfg);
  };

  const toggleYouTubeMusic = () => {
    const updated = { ...ytConfig, enabled: !ytConfig.enabled };
    handleUpdateYtConfig(updated);
    soundManager.playClick();
  };

  // Throttling timestamp refs to ensure clean rhythmic audio
  const lastGeneralSoundTime = useRef(0);
  const lastJumpSoundTimeA = useRef(0);
  const lastJumpSoundTimeB = useRef(0);
  const lastBellySoundTimeA = useRef(0);
  const lastBellySoundTimeB = useRef(0);

  const toggleMotionAudio = () => {
    setIsMotionAudioEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('cpmg_motion_audio', String(next));
      if (next) soundManager.playMotionJump('teamA');
      return next;
    });
  };

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<MotionTracker>(new MotionTracker());
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prepTimerRef = useRef<number | null>(null);

  // Start camera feed on user action
  const initCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setCameraActive(true);
        };
      }
    } catch (err: unknown) {
      console.warn('Camera error or blocked:', err);
      setCameraError(
        'Không thể mở camera (thiết bị không có camera hoặc trình duyệt chưa cấp quyền). Bạn có thể sử dụng "Chế độ trọng tài thủ công" bên dưới để tiếp tục trò chơi!'
      );
      setCameraActive(false);
      setIsManualMode(true);
    }
  }, []);

  // Initialize offscreen canvas once
  useEffect(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = 320;
    offscreen.height = 240;
    offscreenCanvasRef.current = offscreen;

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (prepTimerRef.current) {
        clearInterval(prepTimerRef.current);
      }
    };
  }, []);

  // Draw full-body skeleton landmarks on overlay canvas with high-tech glow
  const drawLandmarks = (
    ctx: CanvasRenderingContext2D,
    landmarks: BodyLandmarks | null,
    isTeamA: boolean,
    width: number,
    height: number
  ) => {
    if (!landmarks || !landmarks.isValidPerson) return;

    const baseColor = isTeamA ? '#06b6d4' : '#f43f5e';
    const glow = isTeamA ? 'rgba(6, 182, 212, 0.6)' : 'rgba(244, 63, 94, 0.6)';

    // Scaling factors from offscreen (320x240) to display canvas
    const scaleX = width / 320;
    const scaleY = height / 240;

    // Full-body anatomical bones:
    // Head -> Neck, Neck -> Shoulders, Neck -> Spine -> Belly -> Hips
    // Shoulders -> Elbows -> Wrists
    // Hips -> Knees -> Ankles
    const bones = [
      [landmarks.headTop, landmarks.nose],
      [landmarks.nose, landmarks.neck],
      [landmarks.leftShoulder, landmarks.rightShoulder],
      [landmarks.neck, landmarks.spineChest],
      [landmarks.spineChest, landmarks.belly],
      [landmarks.belly, landmarks.leftHip],
      [landmarks.belly, landmarks.rightHip],
      [landmarks.leftHip, landmarks.rightHip],
      [landmarks.leftShoulder, landmarks.leftElbow],
      [landmarks.leftElbow, landmarks.leftWrist],
      [landmarks.rightShoulder, landmarks.rightElbow],
      [landmarks.rightElbow, landmarks.rightWrist],
      [landmarks.leftHip, landmarks.leftKnee],
      [landmarks.leftKnee, landmarks.leftAnkle],
      [landmarks.rightHip, landmarks.rightKnee],
      [landmarks.rightKnee, landmarks.rightAnkle],
    ];

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 4;
    ctx.strokeStyle = baseColor;

    // Draw bones
    bones.forEach(([p1, p2]) => {
      ctx.beginPath();
      ctx.moveTo(p1.x * scaleX, p1.y * scaleY);
      ctx.lineTo(p2.x * scaleX, p2.y * scaleY);
      ctx.stroke();
    });

    // 1. Draw Head Halo & Face Node (Đầu)
    const headX = landmarks.nose.x * scaleX;
    const headY = landmarks.nose.y * scaleY;
    const isHeadActive = landmarks.zones.head > 18;

    ctx.beginPath();
    ctx.arc(headX, headY, isHeadActive ? 18 : 14, 0, Math.PI * 2);
    ctx.fillStyle = isHeadActive ? 'rgba(168, 85, 247, 0.4)' : 'rgba(6, 182, 212, 0.2)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isHeadActive ? '#c084fc' : baseColor;
    ctx.stroke();

    // 2. Draw Belly Special Golden Node (Bụng - Highlighted!)
    const bellyX = landmarks.belly.x * scaleX;
    const bellyY = landmarks.belly.y * scaleY;
    const isBellyActive = landmarks.zones.belly > 18;

    // Outer pulsing ring when belly is moving
    if (isBellyActive) {
      ctx.beginPath();
      ctx.arc(bellyX, bellyY, 22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#f59e0b';
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(bellyX, bellyY, 11, 0, Math.PI * 2);
    ctx.fillStyle = isBellyActive ? '#fbbf24' : '#f59e0b';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bellyX, bellyY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Belly text tag
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'center';
    ctx.fillText('BỤNG', bellyX, bellyY - 14);

    // 3. Draw standard joint nodes
    const standardJoints = [
      landmarks.leftShoulder,
      landmarks.rightShoulder,
      landmarks.leftElbow,
      landmarks.rightElbow,
      landmarks.leftWrist,
      landmarks.rightWrist,
      landmarks.spineChest,
      landmarks.leftHip,
      landmarks.rightHip,
      landmarks.leftKnee,
      landmarks.rightKnee,
      landmarks.leftAnkle,
      landmarks.rightAnkle,
    ];

    standardJoints.forEach((pt) => {
      const px = pt.x * scaleX;
      const py = pt.y * scaleY;
      const isMoving = pt.isMoving;

      // Outer halo
      ctx.fillStyle = isMoving ? 'rgba(52, 211, 153, 0.7)' : glow;
      ctx.beginPath();
      ctx.arc(px, py, isMoving ? 11 : 8, 0, Math.PI * 2);
      ctx.fill();

      // Core joint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Draw Jumping visual indicator if jumping
    if (landmarks.zones.jump) {
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ NHẢY TOÀN THÂN! +4đ', headX, headY - 26);
    }

    ctx.restore();
  };

  // Main processing loop
  useEffect(() => {
    let active = true;

    const loop = () => {
      if (!active) return;

      if (
        isRunning &&
        videoRef.current &&
        canvasRef.current &&
        offscreenCanvasRef.current &&
        videoRef.current.readyState >= 2
      ) {
        const displayCanvas = canvasRef.current;
        const displayCtx = displayCanvas.getContext('2d');

        if (displayCtx) {
          // Clear overlay
          displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);

          // Draw mid-divider line
          const midX = displayCanvas.width / 2;
          displayCtx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
          displayCtx.lineWidth = 2;
          displayCtx.setLineDash([8, 8]);
          displayCtx.beginPath();
          displayCtx.moveTo(midX, 0);
          displayCtx.lineTo(midX, displayCanvas.height);
          displayCtx.stroke();
          displayCtx.setLineDash([]);

          // Process full-body motion
          const results = trackerRef.current.processFrame(
            videoRef.current,
            offscreenCanvasRef.current
          );

          setTeamAValid(results.teamA.isValidPerson);
          setTeamBValid(results.teamB.isValidPerson);
          setZonesA(results.teamA.zones);
          setZonesB(results.teamB.zones);

          if (results.teamA.isValidPerson) {
            validFramesCountA.current++;
            scoreARef.current += results.teamA.score;
            setTeamAScore(scoreARef.current);
            setMotionEnergyA(Math.min(100, results.teamA.zones.overall));
          } else {
            setMotionEnergyA((prev) => Math.max(0, prev - 4));
          }

          if (results.teamB.isValidPerson) {
            validFramesCountB.current++;
            scoreBRef.current += results.teamB.score;
            setTeamBScore(scoreBRef.current);
            setMotionEnergyB(Math.min(100, results.teamB.zones.overall));
          } else {
            setMotionEnergyB((prev) => Math.max(0, prev - 4));
          }

          // Trigger dynamic motion audio feedback when students are moving
          // If YouTube background music is active with muteSynthAudio, suppress synthetic bass & pulses
          const isSynthAudioSilenced = ytConfig.enabled && ytConfig.muteSynthAudio;
          if (isRunning && isMotionAudioEnabled) {
            const now = performance.now();
            let triggered = false;

            if (!isSynthAudioSilenced) {
              // 1. High priority: Whole-body Jump
              if (results.teamA.zones.jump && now - lastJumpSoundTimeA.current > 420) {
                lastJumpSoundTimeA.current = now;
                soundManager.playMotionJump('teamA');
                triggered = true;
              } else if (results.teamB.zones.jump && now - lastJumpSoundTimeB.current > 420) {
                lastJumpSoundTimeB.current = now;
                soundManager.playMotionJump('teamB');
                triggered = true;
              }
              // 2. High priority: Belly / Torso sway
              else if (results.teamA.zones.belly > 32 && now - lastBellySoundTimeA.current > 380) {
                lastBellySoundTimeA.current = now;
                soundManager.playMotionBelly('teamA');
                triggered = true;
              } else if (results.teamB.zones.belly > 32 && now - lastBellySoundTimeB.current > 380) {
                lastBellySoundTimeB.current = now;
                soundManager.playMotionBelly('teamB');
                triggered = true;
              }
              // 3. Dynamic general motion pulse
              else {
                const energyA = results.teamA.isValidPerson ? results.teamA.zones.overall : 0;
                const energyB = results.teamB.isValidPerson ? results.teamB.zones.overall : 0;
                const maxEnergy = Math.max(energyA, energyB);

                if (maxEnergy > 14 && now - lastGeneralSoundTime.current > 135) {
                  lastGeneralSoundTime.current = now;
                  const activeTeam = energyA > energyB + 8 ? 'teamA' : energyB > energyA + 8 ? 'teamB' : 'both';
                  soundManager.playMotionPulse(maxEnergy, activeTeam);
                  triggered = true;
                }
              }
            } else {
              // Visual equalizer trigger only without synthetic audio clutter
              const energyA = results.teamA.isValidPerson ? results.teamA.zones.overall : 0;
              const energyB = results.teamB.isValidPerson ? results.teamB.zones.overall : 0;
              if (Math.max(energyA, energyB) > 15) {
                triggered = true;
              }
            }

            if (triggered) {
              setAudioWaveActive(true);
              setTimeout(() => setAudioWaveActive(false), 120);
            }
          }

          // Draw full-body skeletons with Head, Belly, Arms, and Legs
          drawLandmarks(
            displayCtx,
            results.teamA.landmarks,
            true,
            displayCanvas.width,
            displayCanvas.height
          );
          drawLandmarks(
            displayCtx,
            results.teamB.landmarks,
            false,
            displayCanvas.width,
            displayCanvas.height
          );
        }
      }

      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isRunning]);

  // Finish evaluation when motion seconds expire
  const handleFinishCountdown = useCallback(() => {
    setIsRunning(false);
    soundManager.playCorrect();

    const minValidFrames = Math.max(5, Math.min(10, Math.floor(motionDuration * 0.8)));
    const isAValidTotal = validFramesCountA.current >= minValidFrames || isManualMode;
    const isBValidTotal = validFramesCountB.current >= minValidFrames || isManualMode;

    const finalA = isAValidTotal ? scoreARef.current : 0;
    const finalB = isBValidTotal ? scoreBRef.current : 0;

    // Case 1: Neither team stood in front of camera
    if (!isAValidTotal && !isBValidTotal) {
      const msg = 'Cả hai đội đều chưa phát hiện học sinh đứng vào vị trí hợp lệ. Mời 2 bạn đứng lùi lại cách camera 1.5 - 2m và thực hiện lại!';
      setLocalRetryNotice(msg);
      onRetryMotion(msg);
      return;
    }

    // Case 2: Insufficient motion scaled by duration
    const minRequiredEnergy = Math.max(6, Math.floor(motionDuration * 1.2));
    if (finalA < minRequiredEnergy && finalB < minRequiredEnergy && !isManualMode) {
      const msg = `Hai bạn vận động chưa đủ năng lượng (${finalA}đ - ${finalB}đ, yêu cầu tối thiểu ${minRequiredEnergy}đ). Hãy lùi lại, lắc bụng/eo, gật lắc đầu, vung tay và nhún nhảy toàn thân nhé!`;
      setLocalRetryNotice(msg);
      onRetryMotion(msg);
      return;
    }

    // Case 3: Close tie
    if (finalA === finalB || Math.abs(finalA - finalB) <= 2) {
      const msg = `Kết quả hòa sát nút (${finalA} - ${finalB})! Cả 2 bạn đều rất hăng hái, mời 2 bạn vận động thêm một lượt ${motionDuration} giây để phân thắng bại!`;
      setLocalRetryNotice(msg);
      onRetryMotion(msg);
      return;
    }

    // Clear any retry notices
    setLocalRetryNotice(null);
    if (onClearRetryNotice) onClearRetryNotice();

    const winner = finalA > finalB ? 'teamA' : 'teamB';
    onMotionComplete(winner, finalA, finalB);
  }, [isManualMode, motionDuration, onMotionComplete, onRetryMotion, onClearRetryNotice]);

  // Universal reset & start function with 3-2-1 sequence and guaranteed timer countdown
  const launchRoundCountdown = useCallback(() => {
    setLocalRetryNotice(null);
    if (onClearRetryNotice) onClearRetryNotice();

    // Increment attemptId to generate a fresh resetKey for TechCountdown
    setAttemptId((prev) => prev + 1);

    trackerRef.current.reset();
    validFramesCountA.current = 0;
    validFramesCountB.current = 0;
    scoreARef.current = 0;
    scoreBRef.current = 0;
    setTeamAScore(0);
    setTeamBScore(0);
    setZonesA(defaultZones);
    setZonesB(defaultZones);
    setHasStarted(true);

    if (prepTimerRef.current) clearInterval(prepTimerRef.current);

    // Launch 3-second cyber prep sequence
    soundManager.playCyberLaunch();
    let prepCount = 3;
    setPrepCountdown(3);

    prepTimerRef.current = window.setInterval(() => {
      prepCount--;
      if (prepCount > 0) {
        soundManager.playCyberTick(800, false);
        setPrepCountdown(prepCount);
      } else {
        if (prepTimerRef.current) clearInterval(prepTimerRef.current);
        setPrepCountdown(null);
        setIsRunning(true);
        soundManager.playStartWhistle();
      }
    }, 1000);
  }, [onClearRetryNotice]);

  // Start round
  const handleStartRound = async () => {
    soundManager.playClick();
    if (!cameraActive && !isManualMode) {
      await initCamera();
    }
    launchRoundCountdown();
  };

  // Restart 10s turn (guaranteed clean reset without freezing)
  const handleRestartTurn = () => {
    soundManager.playClick();
    launchRoundCountdown();
  };

  // Pause / Resume
  const handleTogglePause = () => {
    soundManager.playClick();
    setIsRunning(!isRunning);
  };

  // Manual referee scoring
  const handleManualAdd = (team: 'teamA' | 'teamB', pts: number) => {
    soundManager.playClick();
    if (team === 'teamA') {
      scoreARef.current += pts;
      setTeamAScore(scoreARef.current);
      validFramesCountA.current += 20;
    } else {
      scoreBRef.current += pts;
      setTeamBScore(scoreBRef.current);
      validFramesCountB.current += 20;
    }
  };

  // Simulation test mode for quick demo
  const handleSimulateMotion = () => {
    soundManager.playCyberLaunch();
    setLocalRetryNotice(null);
    if (onClearRetryNotice) onClearRetryNotice();
    setAttemptId((prev) => prev + 1);

    trackerRef.current.reset();
    validFramesCountA.current = 0;
    validFramesCountB.current = 0;
    scoreARef.current = 0;
    scoreBRef.current = 0;
    setTeamAScore(0);
    setTeamBScore(0);
    setHasStarted(true);
    setIsRunning(true);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      const addA = Math.floor(Math.random() * 8 + 4);
      const addB = Math.floor(Math.random() * 8 + 3);
      scoreARef.current += addA;
      scoreBRef.current += addB;
      setTeamAScore(scoreARef.current);
      setTeamBScore(scoreBRef.current);
      validFramesCountA.current += 10;
      validFramesCountB.current += 10;
      setTeamAValid(true);
      setTeamBValid(true);
      setMotionEnergyA(Math.floor(Math.random() * 60 + 35));
      setMotionEnergyB(Math.floor(Math.random() * 60 + 35));
      setZonesA({
        head: Math.floor(Math.random() * 80 + 20),
        belly: Math.floor(Math.random() * 90 + 20),
        arms: Math.floor(Math.random() * 80 + 20),
        legs: Math.floor(Math.random() * 85 + 20),
        jump: count % 3 === 0,
        overall: Math.floor(Math.random() * 70 + 30),
      });
      setZonesB({
        head: Math.floor(Math.random() * 80 + 20),
        belly: Math.floor(Math.random() * 90 + 20),
        arms: Math.floor(Math.random() * 80 + 20),
        legs: Math.floor(Math.random() * 85 + 20),
        jump: count % 4 === 0,
        overall: Math.floor(Math.random() * 70 + 30),
      });

      if (isMotionAudioEnabled && (!ytConfig.enabled || !ytConfig.muteSynthAudio)) {
        if (count % 3 === 0) {
          soundManager.playMotionJump(count % 2 === 0 ? 'teamA' : 'teamB');
        } else if (count % 2 === 0) {
          soundManager.playMotionBelly(count % 2 === 0 ? 'teamA' : 'teamB');
        } else {
          soundManager.playMotionPulse(65, 'both');
        }
        setAudioWaveActive(true);
        setTimeout(() => setAudioWaveActive(false), 120);
      } else if (isMotionAudioEnabled) {
        setAudioWaveActive(true);
        setTimeout(() => setAudioWaveActive(false), 120);
      }

      if (count >= 10) clearInterval(interval);
    }, 1000);
  };

  const activeNotice = localRetryNotice || externalRetryNotice;

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 rounded-3xl shadow-2xl border border-cyan-500/30 overflow-hidden relative">
      {/* High-Tech Cyber Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              AI FULL-BODY MOTION ARENA // VÒNG {currentRound}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5 flex items-center gap-2">
            Lắc bụng - Nhún chân - Vung tay - Gật đầu!
          </h2>
          <p className="text-xs sm:text-sm text-cyan-200/70">
            Hệ thống AI nhận diện toàn bộ cơ thể: <span className="text-amber-300 font-bold">Bụng</span>, <span className="text-purple-300 font-bold">Đầu</span>, <span className="text-emerald-300 font-bold">Chân</span> và <span className="text-cyan-300 font-bold">Tay</span>!
          </p>
        </div>

        {/* Header Controls: Motion Duration Selector + YouTube Music Toggle + Motion Sound Toggle + Compact Tech Timer */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Quick Motion Duration Picker on Arena */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1.5 rounded-xl sm:rounded-2xl border border-slate-700">
            <Timer className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono font-bold text-slate-300 hidden sm:inline">
              Thời gian:
            </span>
            <span className="text-xs font-mono font-black text-cyan-300">
              {motionDuration}s
            </span>
            <div className="flex items-center gap-0.5 ml-1">
              {[5, 10, 15, 20, 30].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    if (onUpdateMotionDuration) onUpdateMotionDuration(sec);
                    soundManager.playClick();
                  }}
                  disabled={isRunning}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    motionDuration === sec
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  title={`Đổi thời gian vận động thành ${sec} giây`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* YouTube Background Music Toggle */}
          <button
            onClick={toggleYouTubeMusic}
            className={`px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-mono text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              ytConfig.enabled
                ? 'bg-red-950/80 text-red-300 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.35)] hover:bg-red-900'
                : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:bg-slate-800'
            }`}
            title={ytConfig.enabled ? 'Đang bật Nhạc YouTube nền (Bấm để tắt)' : 'Đã tắt Nhạc YouTube (Bấm để bật)'}
          >
            <Music className={`w-4 h-4 ${ytConfig.enabled ? 'text-red-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Nhạc YouTube:</span>
            <span className={ytConfig.enabled ? 'text-red-300 font-black' : 'text-slate-400 font-bold'}>
              {ytConfig.enabled ? 'BẬT' : 'TẮT'}
            </span>
          </button>

          {/* Motion Audio Interactive Push Toggle */}
          <button
            onClick={toggleMotionAudio}
            className={`px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-mono text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              isMotionAudioEnabled
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.35)] hover:bg-cyan-900'
                : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:bg-slate-800'
            }`}
            title={isMotionAudioEnabled ? 'Đang bật đẩy âm thanh khi vận động (Bấm để tắt)' : 'Đã tắt âm thanh vận động (Bấm để bật)'}
          >
            {isMotionAudioEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="hidden sm:inline">Âm vận động:</span>
                <span className="text-cyan-300 font-black">BẬT</span>
                {/* Live sound wave equalizer indicator */}
                <span className="flex items-end gap-0.5 h-3.5 ml-0.5">
                  <span className={`w-1 rounded-full bg-cyan-400 transition-all duration-75 ${audioWaveActive ? 'h-3.5' : 'h-1.5'}`} />
                  <span className={`w-1 rounded-full bg-cyan-300 transition-all duration-75 ${audioWaveActive ? 'h-2.5' : 'h-1'}`} />
                  <span className={`w-1 rounded-full bg-cyan-400 transition-all duration-75 ${audioWaveActive ? 'h-3' : 'h-2'}`} />
                </span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Âm vận động:</span>
                <span className="text-slate-400 font-bold">TẮT</span>
              </>
            )}
          </button>

          <TechCountdown
            key={`header-timer-${attemptId}`}
            resetKey={attemptId}
            totalSeconds={motionDuration}
            isRunning={isRunning}
            onComplete={handleFinishCountdown}
            variant="hud-compact"
            label="ĐẾM NGƯỢC"
            disableTicks={ytConfig.enabled && ytConfig.muteSynthAudio}
          />
        </div>
      </div>

      {/* YouTube Music Player Deck */}
      {ytConfig.enabled && (
        <div className="px-4 sm:px-6 pt-3 pb-1 bg-slate-950 border-b border-cyan-500/20">
          <YouTubePlayer
            config={ytConfig}
            isPlaying={isRunning}
            restartKey={attemptId}
            onConfigChange={handleUpdateYtConfig}
          />
        </div>
      )}

      {/* Main Dual Camera Arena */}
      <div className="p-4 sm:p-6 bg-slate-950 relative">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border-2 border-cyan-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          {/* Subtle Cyber Holographic Scanline Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.45)_51%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-60" />

          {/* Live Video Feed */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-90"
          />

          {/* Skeletons & Overlay Canvas */}
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
          />

          {/* High-Tech HUD Center Stage Countdown */}
          {hasStarted && (
            <div className="absolute top-3 sm:top-5 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
              <TechCountdown
                key={`center-timer-${attemptId}`}
                resetKey={attemptId}
                totalSeconds={10}
                isRunning={isRunning}
                onComplete={handleFinishCountdown}
                variant="hud-circular"
                label="THỜI GIAN"
                size="lg"
              />
            </div>
          )}

          {/* Left Zone: Team A overlay */}
          <div className="absolute top-0 bottom-0 left-0 w-1/2 p-3 sm:p-5 flex flex-col justify-between pointer-events-none z-20 border-r-2 border-dashed border-cyan-500/30">
            <div className="flex items-center justify-between">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 backdrop-blur text-white px-3.5 py-1.5 rounded-xl font-mono font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-300/40">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                {teams[0].name}
              </div>

              {/* Status pill */}
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur ${
                  teamAValid
                    ? 'bg-emerald-500/90 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : 'bg-slate-900/80 text-cyan-300/70 border border-cyan-500/30'
                }`}
              >
                {teamAValid ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5 text-amber-400" />}
                <span className="hidden sm:inline">
                  {teamAValid ? 'AI THEO DÕI TOÀN THÂN' : 'CHƯA PHÁT HIỆN'}
                </span>
              </div>
            </div>

            {/* Guide Silhouette Outline if not running */}
            {!hasStarted && !prepCountdown && !activeNotice && (
              <div className="self-center flex flex-col items-center justify-center text-cyan-300/60 text-center">
                <div className="w-24 h-36 sm:w-28 sm:h-44 border-2 border-dashed border-cyan-400/50 rounded-full flex flex-col items-center justify-center mb-2 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <Activity className="w-6 h-6 text-cyan-400 animate-pulse mb-1" />
                  <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase">Khu vực Đội 1</span>
                </div>
              </div>
            )}

            {/* Team A Cyber Score HUD with 4 Body Zone Indicators */}
            <div className="bg-slate-950/85 backdrop-blur-md rounded-2xl p-3 border border-cyan-500/40 shadow-lg">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-xs font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                  NĂNG LƯỢNG VẬN ĐỘNG
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-cyan-300 tracking-tight">
                  {teamAScore}
                </span>
              </div>

              {/* Progress bar with animated energy glow */}
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-cyan-900">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-150 shadow-[0_0_10px_#06b6d4]"
                  style={{ width: `${Math.min(100, teamAScore * 1.5)}%` }}
                />
              </div>

              {/* Real-time 4 Body Zones Detection Grid (Đầu, Bụng, Tay, Chân) */}
              <div className="grid grid-cols-4 gap-1 mt-2 text-[10px] font-mono">
                <div
                  className={`p-1 rounded text-center transition-all ${
                    zonesA.head > 15
                      ? 'bg-purple-500/40 text-purple-200 border border-purple-400 font-bold shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                      : 'bg-slate-900/60 text-slate-400'
                  }`}
                >
                  🧠 Đầu {zonesA.head > 15 ? '⚡' : ''}
                </div>
                <div
                  className={`p-1 rounded text-center transition-all ${
                    zonesA.belly > 15
                      ? 'bg-amber-500/40 text-amber-200 border border-amber-400 font-bold shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'bg-slate-900/60 text-slate-400'
                  }`}
                >
                  🎽 Bụng {zonesA.belly > 15 ? '⚡' : ''}
                </div>
                <div
                  className={`p-1 rounded text-center transition-all ${
                    zonesA.arms > 15
                      ? 'bg-cyan-500/40 text-cyan-200 border border-cyan-400 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-900/60 text-slate-400'
                  }`}
                >
                  ✋ Tay {zonesA.arms > 15 ? '⚡' : ''}
                </div>
                <div
                  className={`p-1 rounded text-center transition-all ${
                    zonesA.legs > 15
                      ? 'bg-emerald-500/40 text-emerald-200 border border-emerald-400 font-bold shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-900/60 text-slate-400'
                  }`}
                >
                  🦵 Chân {zonesA.legs > 15 ? '⚡' : ''}
                </div>
              </div>

              {/* Micro Equalizer visual bars */}
              <div className="flex items-center gap-1 mt-2">
                {[4, 8, 14, 20, 12, 18, 9, 5].map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 bg-cyan-400/70 rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.max(3, (motionEnergyA * h) / 25)}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Zone: Team B overlay */}
          <div className="absolute top-0 bottom-0 right-0 w-1/2 p-3 sm:p-5 flex flex-col justify-between pointer-events-none z-20">
            <div className="flex items-center justify-between">
              <div className="bg-gradient-to-r from-rose-600 to-pink-600 backdrop-blur text-white px-3.5 py-1.5 rounded-xl font-mono font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.5)] border border-rose-300/40">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                {teams[1].name}
              </div>

              {/* Status pill */}
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur ${
                  teamBValid
                    ? 'bg-emerald-500/90 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : 'bg-slate-900/80 text-rose-300/70 border border-rose-500/30'
                }`}
              >
                {teamBValid ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5 text-amber-400" />}
                <span className="hidden sm:inline">
                  {teamBValid ? 'AI THEO DÕI TOÀN THÂN' : 'CHƯA PHÁT HIỆN'}
                </span>
              </div>
            </div>

            {/* Guide Silhouette Outline if not running */}
            {!hasStarted && !prepCountdown && !activeNotice && (
              <div className="self-center flex flex-col items-center justify-center text-rose-300/60 text-center">
                <div className="w-24 h-36 sm:w-28 sm:h-44 border-2 border-dashed border-rose-400/50 rounded-full flex flex-col items-center justify-center mb-2 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                  <Activity className="w-6 h-6 text-rose-400 animate-pulse mb-1" />
                  <span className="text-[11px] font-mono font-bold text-rose-300 uppercase">Khu vực Đội 2</span>
                </div>
              </div>
            )}

            {/* Team B Cyber Score HUD with 4 Body Zone Indicators */}
            <div className="bg-slate-950/85 backdrop-blur-md rounded-2xl p-3 border border-rose-500/40 shadow-lg">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-xs font-mono text-rose-300 font-bold flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-rose-400 animate-pulse" />
                  NĂNG LƯỢNG VẬN ĐỘNG
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-rose-300 tracking-tight">
                  {teamBScore}
                </span>
              </div>

              {/* Progress bar with animated energy glow */}
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-rose-900">
                <div
                  className="bg-gradient-to-r from-rose-500 to-pink-500 h-full transition-all duration-150 shadow-[0_0_10px_#f43f5e]"
                  style={{ width: `${Math.min(100, teamBScore * 1.5)}%` }}
                />
              </div>

              {/* Real-time 4 Body Zones Detection Grid (Đầu, Bụng, Tay, Chân) */}
              <div className="grid grid-cols-4 gap-1 mt-2 text-[10px] font-mono">
                <div
                  className={`p-1 rounded text-center transition-all ${
                    zonesB.head > 15
                      ? 'bg-purple-500/40 text-purple-200 border border-purple-400 font-bold shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                      : 'bg-slate-900/60 text-slate-400'
                  }`}
                >
                  🧠 Đầu {zonesB.head > 15 ? '⚡' : ''}
                </div>
                <div
                  className={`p-1 rounded text-center transition-all ${
                    zonesB.belly > 15
                      ? 'bg-amber-500/40 text-amber-200 border border-amber-400 font-bold shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'bg-slate-900/60 text-slate-400'
                  }`}
                >
                  🎽 Bụng {zonesB.belly > 15 ? '⚡' : ''}
                </div>
                <div
                  className={`p-1 rounded text-center transition-all ${
                    zonesB.arms > 15
                      ? 'bg-rose-500/40 text-rose-200 border border-rose-400 font-bold shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                      : 'bg-slate-900/60 text-slate-400'
                  }`}
                >
                  ✋ Tay {zonesB.arms > 15 ? '⚡' : ''}
                </div>
                <div
                  className={`p-1 rounded text-center transition-all ${
                    zonesB.legs > 15
                      ? 'bg-emerald-500/40 text-emerald-200 border border-emerald-400 font-bold shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                      : 'bg-slate-900/60 text-slate-400'
                  }`}
                >
                  🦵 Chân {zonesB.legs > 15 ? '⚡' : ''}
                </div>
              </div>

              {/* Micro Equalizer visual bars */}
              <div className="flex items-center gap-1 mt-2">
                {[5, 9, 18, 12, 20, 14, 8, 4].map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 bg-rose-400/70 rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.max(3, (motionEnergyB * h) / 25)}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Cyber Launch 3-2-1 Preparation Overlay */}
          {prepCountdown !== null && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-40 flex flex-col items-center justify-center select-none animate-in fade-in duration-200">
              <div className="text-cyan-400 font-mono text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <Radio className="w-4 h-4 animate-ping" />
                CHUẨN BỊ VẬN ĐỘNG TOÀN THÂN
              </div>
              <div className="relative flex items-center justify-center">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-cyan-400/30 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.6)] animate-pulse">
                  <span className="text-6xl sm:text-7xl font-mono font-black text-cyan-300 tracking-tighter">
                    {prepCountdown}
                  </span>
                </div>
              </div>
              <p className="text-white text-base sm:text-lg font-bold mt-4 animate-bounce text-center px-4">
                Vào vị trí: Lắc bụng/eo, gật đầu, vung tay và nhún chân!
              </p>
            </div>
          )}

          {/* Retry Overlay when students didn't move enough or tied */}
          {activeNotice && prepCountdown === null && !isRunning && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-35 flex flex-col items-center justify-center p-5 text-center select-none animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-bounce">
                <RefreshCw className="w-8 h-8" />
              </div>
              <span className="text-amber-400 font-mono text-xs uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
                <Flame className="w-4 h-4" />
                VẬN ĐỘNG CHƯA ĐỦ HOẶC HÒA ĐIỂM
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2 max-w-lg">
                Mời hai bạn chuẩn bị vận động lại!
              </h3>
              <p className="text-sm text-amber-200/90 max-w-md mb-4 bg-amber-950/50 p-3 rounded-xl border border-amber-500/40">
                {activeNotice}
              </p>

              {/* Visual guidance pills for kids */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-md">
                <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-bold">
                  🧠 Gật lắc đầu
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                  🎽 Lắc bụng / uốn eo
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
                  ✋ Vung tay lên cao
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                  🦵 Nhún nhảy tại chỗ
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  id="btn-retry-motion-action"
                  onClick={handleRestartTurn}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-base sm:text-lg shadow-[0_0_30px_rgba(6,182,212,0.6)] flex items-center gap-2.5 transform hover:scale-105 transition-all border border-cyan-300/50 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>BẮT ĐẦU VẬN ĐỘNG LẠI ({motionDuration} GIÂY)</span>
                </button>
                <button
                  onClick={() => setIsManualMode(true)}
                  className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-2 border border-amber-500/40 shadow-md cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Giáo viên chấm điểm thủ công</span>
                </button>
              </div>
            </div>
          )}

          {/* Center Start Overlay before user kicks off */}
          {!hasStarted && prepCountdown === null && !activeNotice && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(6,182,212,0.5)] border border-cyan-400/30 animate-pulse">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">
                Sẵn sàng cho Lượt {currentRound}!
              </h3>
              <p className="text-sm text-cyan-200/80 max-w-md mb-6">
                Hai bạn học sinh đứng đối diện camera (cách 1.5 - 2m). AI sẽ nhận diện toàn thân: lắc bụng, gật đầu, vung tay và nhún chân trong {motionDuration} giây!
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  id="btn-start-motion"
                  onClick={handleStartRound}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-lg shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-3 transform hover:scale-105 transition-all border border-cyan-300/40 cursor-pointer"
                >
                  <Play className="w-6 h-6 fill-white" />
                  BẮT ĐẦU VẬN ĐỘNG ({motionDuration} GIÂY)
                </button>
                <button
                  onClick={handleSimulateMotion}
                  className="px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-cyan-300 font-bold text-xs sm:text-sm flex items-center gap-2 border border-cyan-500/40 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Chạy thử mô phỏng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Camera warning / Notice */}
        {cameraError && (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-200 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Thông báo camera:</p>
              <p>{cameraError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cyber Control Deck */}
      <div className="p-4 bg-slate-900 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {hasStarted && (
            <>
              <button
                id="btn-toggle-motion-pause"
                onClick={handleTogglePause}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                {isRunning ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-cyan-400" />}
                {isRunning ? 'Tạm dừng' : 'Tiếp tục'}
              </button>
              <button
                id="btn-restart-motion"
                onClick={handleRestartTurn}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                Vận động lại {motionDuration}s
              </button>
            </>
          )}

          <button
            onClick={() => setIsManualMode(!isManualMode)}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              isManualMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'border border-slate-700 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{isManualMode ? 'Đang bật trọng tài thủ công' : 'Chế độ trọng tài thủ công'}</span>
          </button>
        </div>

        {/* Finish early button for teacher */}
        {hasStarted && isRunning && (
          <button
            onClick={handleFinishCountdown}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
          >
            <span>Kết thúc sớm &amp; Chấm điểm</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Teacher Manual Referee Controls Drawer */}
      {isManualMode && (
        <div className="p-4 bg-slate-900/90 border-t border-amber-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Bảng trọng tài chấm điểm giáo viên (Không cần camera)
            </span>
            <span className="text-[11px] text-amber-300/80">
              Giáo viên bấm để cộng điểm trực tiếp cho 2 đội
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Team A controls */}
            <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/40 flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-cyan-300 block">{teams[0].name}</span>
                <span className="text-lg font-mono font-black text-cyan-400">{teamAScore} điểm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleManualAdd('teamA', 10)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-bold text-xs border border-cyan-500/40 cursor-pointer"
                >
                  +10 đ
                </button>
                <button
                  onClick={() => handleManualAdd('teamA', 25)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer"
                >
                  +25 đ
                </button>
                <button
                  onClick={() => onMotionComplete('teamA', Math.max(50, teamAScore + 30), teamBScore)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  Thắng lượt
                </button>
              </div>
            </div>

            {/* Team B controls */}
            <div className="bg-slate-950 p-3 rounded-xl border border-rose-500/40 flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-rose-300 block">{teams[1].name}</span>
                <span className="text-lg font-mono font-black text-rose-400">{teamBScore} điểm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleManualAdd('teamB', 10)}
                  className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-xs border border-rose-500/40 cursor-pointer"
                >
                  +10 đ
                </button>
                <button
                  onClick={() => handleManualAdd('teamB', 25)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                >
                  +25 đ
                </button>
                <button
                  onClick={() => onMotionComplete('teamB', teamAScore, Math.max(50, teamBScore + 30))}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  Thắng lượt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
