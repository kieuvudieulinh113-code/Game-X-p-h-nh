import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Team } from '../types';
import { MotionTracker, BodyLandmarks } from '../utils/motionDetector';
import { soundManager } from '../utils/audio';
import { TechCountdown } from './TechCountdown';
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
} from 'lucide-react';

interface MotionPhaseProps {
  teams: [Team, Team];
  currentRound: number;
  onMotionComplete: (winner: 'teamA' | 'teamB', scoreA: number, scoreB: number) => void;
  onRetryMotion: (reason: string) => void;
}

export const MotionPhase: React.FC<MotionPhaseProps> = ({
  teams,
  currentRound,
  onMotionComplete,
  onRetryMotion,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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

  // Validity accumulation count to ensure at least some valid presence during 10s
  const validFramesCountA = useRef(0);
  const validFramesCountB = useRef(0);

  // Energy bars for tech visual equalizer
  const [motionEnergyA, setMotionEnergyA] = useState(0);
  const [motionEnergyB, setMotionEnergyB] = useState(0);

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

  // Draw skeleton landmarks on overlay canvas with high-tech glow
  const drawLandmarks = (
    ctx: CanvasRenderingContext2D,
    landmarks: BodyLandmarks | null,
    isTeamA: boolean,
    width: number,
    height: number
  ) => {
    if (!landmarks || !landmarks.isValidPerson) return;

    const color = isTeamA ? '#06b6d4' : '#f43f5e';
    const glow = isTeamA ? 'rgba(6, 182, 212, 0.6)' : 'rgba(244, 63, 94, 0.6)';

    // Scaling factors from offscreen (320x240) to display canvas
    const scaleX = width / 320;
    const scaleY = height / 240;

    const pts = [
      landmarks.leftShoulder,
      landmarks.rightShoulder,
      landmarks.leftElbow,
      landmarks.rightElbow,
      landmarks.leftWrist,
      landmarks.rightWrist,
      landmarks.leftHip,
      landmarks.rightHip,
      landmarks.leftKnee,
      landmarks.rightKnee,
      landmarks.leftAnkle,
      landmarks.rightAnkle,
    ];

    // Draw connecting bones
    const bones = [
      [landmarks.leftShoulder, landmarks.rightShoulder],
      [landmarks.leftShoulder, landmarks.leftElbow],
      [landmarks.leftElbow, landmarks.leftWrist],
      [landmarks.rightShoulder, landmarks.rightElbow],
      [landmarks.rightElbow, landmarks.rightWrist],
      [landmarks.leftShoulder, landmarks.leftHip],
      [landmarks.rightShoulder, landmarks.rightHip],
      [landmarks.leftHip, landmarks.rightHip],
      [landmarks.leftHip, landmarks.leftKnee],
      [landmarks.leftKnee, landmarks.leftAnkle],
      [landmarks.rightHip, landmarks.rightKnee],
      [landmarks.rightKnee, landmarks.rightAnkle],
    ];

    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;

    bones.forEach(([p1, p2]) => {
      ctx.beginPath();
      ctx.moveTo(p1.x * scaleX, p1.y * scaleY);
      ctx.lineTo(p2.x * scaleX, p2.y * scaleY);
      ctx.stroke();
    });

    // Draw tech joint nodes
    pts.forEach((pt) => {
      const px = pt.x * scaleX;
      const py = pt.y * scaleY;

      // Outer halo
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();

      // Core white joint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    });

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

          // Process motion
          const results = trackerRef.current.processFrame(
            videoRef.current,
            offscreenCanvasRef.current
          );

          setTeamAValid(results.teamA.isValidPerson);
          setTeamBValid(results.teamB.isValidPerson);

          if (results.teamA.isValidPerson) {
            validFramesCountA.current++;
            scoreARef.current += results.teamA.score;
            setTeamAScore(scoreARef.current);
            setMotionEnergyA(Math.min(100, results.teamA.score * 12));
          } else {
            setMotionEnergyA((prev) => Math.max(0, prev - 4));
          }

          if (results.teamB.isValidPerson) {
            validFramesCountB.current++;
            scoreBRef.current += results.teamB.score;
            setTeamBScore(scoreBRef.current);
            setMotionEnergyB(Math.min(100, results.teamB.score * 12));
          } else {
            setMotionEnergyB((prev) => Math.max(0, prev - 4));
          }

          // Draw skeletons
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

  // Stable Finish evaluation when 10 seconds expire (reads from refs to avoid re-rendering timer)
  const handleFinishCountdown = useCallback(() => {
    setIsRunning(false);
    soundManager.playCorrect();

    const minValidFrames = 12;
    const isAValidTotal = validFramesCountA.current >= minValidFrames || isManualMode;
    const isBValidTotal = validFramesCountB.current >= minValidFrames || isManualMode;

    const finalA = isAValidTotal ? scoreARef.current : 0;
    const finalB = isBValidTotal ? scoreBRef.current : 0;

    if (!isAValidTotal && !isBValidTotal) {
      onRetryMotion('Cả hai đội đều chưa phát hiện học sinh đứng vào vị trí vận động hợp lệ. Mời 2 bạn thực hiện lại!');
      return;
    }

    if (finalA === finalB || Math.abs(finalA - finalB) <= 2) {
      onRetryMotion(
        `Kết quả hòa sát nút (${finalA} - ${finalB})! Cả 2 đội đều rất hăng hái, mời 2 bạn vận động thêm một lượt 10 giây để phân thắng bại!`
      );
      return;
    }

    const winner = finalA > finalB ? 'teamA' : 'teamB';
    onMotionComplete(winner, finalA, finalB);
  }, [isManualMode, onMotionComplete, onRetryMotion]);

  // Start round with a brief high-tech 3-second ready phase
  const handleStartRound = async () => {
    soundManager.playClick();
    if (!cameraActive && !isManualMode) {
      await initCamera();
    }
    trackerRef.current.reset();
    validFramesCountA.current = 0;
    validFramesCountB.current = 0;
    scoreARef.current = 0;
    scoreBRef.current = 0;
    setTeamAScore(0);
    setTeamBScore(0);
    setHasStarted(true);

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
  };

  // Pause / Resume
  const handleTogglePause = () => {
    soundManager.playClick();
    setIsRunning(!isRunning);
  };

  // Restart 10s turn
  const handleRestartTurn = () => {
    soundManager.playClick();
    trackerRef.current.reset();
    validFramesCountA.current = 0;
    validFramesCountB.current = 0;
    scoreARef.current = 0;
    scoreBRef.current = 0;
    setTeamAScore(0);
    setTeamBScore(0);
    setIsRunning(true);
    soundManager.playStartWhistle();
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
      setMotionEnergyA(Math.floor(Math.random() * 60 + 30));
      setMotionEnergyB(Math.floor(Math.random() * 60 + 30));
      if (count >= 10) clearInterval(interval);
    }, 1000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950 rounded-3xl shadow-2xl border border-cyan-500/30 overflow-hidden relative">
      {/* High-Tech Cyber Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              AI MOTION ARENA // VÒNG {currentRound}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5 flex items-center gap-2">
            Vươn vai - Nhảy đều - Giành quyền trả lời!
          </h2>
          <p className="text-xs sm:text-sm text-cyan-200/70">
            Khớp cơ thể di chuyển càng nhiều điểm năng lượng càng cao!
          </p>
        </div>

        {/* Compact Tech Timer in Header */}
        <div className="flex items-center gap-3">
          <TechCountdown
            totalSeconds={10}
            isRunning={isRunning}
            onComplete={handleFinishCountdown}
            variant="hud-compact"
            label="ĐẾM NGƯỢC"
          />
        </div>
      </div>

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
                  {teamAValid ? 'AI THEO DÕI KHỚP' : 'CHƯA PHÁT HIỆN'}
                </span>
              </div>
            </div>

            {/* Guide Silhouette Outline if not running */}
            {!hasStarted && !prepCountdown && (
              <div className="self-center flex flex-col items-center justify-center text-cyan-300/60 text-center">
                <div className="w-24 h-36 sm:w-28 sm:h-44 border-2 border-dashed border-cyan-400/50 rounded-full flex flex-col items-center justify-center mb-2 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <Activity className="w-6 h-6 text-cyan-400 animate-pulse mb-1" />
                  <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase">Khu vực Đội 1</span>
                </div>
              </div>
            )}

            {/* Team A Cyber Score HUD */}
            <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-3 border border-cyan-500/40 shadow-lg">
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
                  {teamBValid ? 'AI THEO DÕI KHỚP' : 'CHƯA PHÁT HIỆN'}
                </span>
              </div>
            </div>

            {/* Guide Silhouette Outline if not running */}
            {!hasStarted && !prepCountdown && (
              <div className="self-center flex flex-col items-center justify-center text-rose-300/60 text-center">
                <div className="w-24 h-36 sm:w-28 sm:h-44 border-2 border-dashed border-rose-400/50 rounded-full flex flex-col items-center justify-center mb-2 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                  <Activity className="w-6 h-6 text-rose-400 animate-pulse mb-1" />
                  <span className="text-[11px] font-mono font-bold text-rose-300 uppercase">Khu vực Đội 2</span>
                </div>
              </div>
            )}

            {/* Team B Cyber Score HUD */}
            <div className="bg-slate-950/80 backdrop-blur-md rounded-2xl p-3 border border-rose-500/40 shadow-lg">
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
                CHUẨN BỊ VẬN ĐỘNG
              </div>
              <div className="relative flex items-center justify-center">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-cyan-400/30 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.6)] animate-pulse">
                  <span className="text-6xl sm:text-7xl font-mono font-black text-cyan-300 tracking-tighter">
                    {prepCountdown}
                  </span>
                </div>
              </div>
              <p className="text-white text-base sm:text-lg font-bold mt-4 animate-bounce">
                Vào vị trí &amp; Vươn vai sẵn sàng!
              </p>
            </div>
          )}

          {/* Center Start Overlay before user kicks off */}
          {!hasStarted && prepCountdown === null && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(6,182,212,0.5)] border border-cyan-400/30 animate-pulse">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">
                Sẵn sàng cho Lượt {currentRound}!
              </h3>
              <p className="text-sm text-cyan-200/80 max-w-md mb-6">
                Hai bạn học sinh đứng đối diện camera. Đồng hồ công nghệ sẽ đếm ngược 10 giây siêu mượt để 2 bạn tranh tài!
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  id="btn-start-motion"
                  onClick={handleStartRound}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-lg shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-3 transform hover:scale-105 transition-all border border-cyan-300/40 cursor-pointer"
                >
                  <Play className="w-6 h-6 fill-white" />
                  BẮT ĐẦU VẬN ĐỘNG (10 GIÂY)
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
                Vận động lại 10s
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
