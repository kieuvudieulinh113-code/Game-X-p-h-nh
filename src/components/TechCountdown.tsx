import React, { useEffect, useRef, useState } from 'react';
import { soundManager } from '../utils/audio';
import { Timer, Zap, AlertTriangle, Radio } from 'lucide-react';

interface TechCountdownProps {
  totalSeconds: number;
  isRunning: boolean;
  onComplete: () => void;
  onTick?: (secondsLeft: number) => void;
  variant?: 'hud-circular' | 'hud-banner' | 'hud-compact';
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const TechCountdown: React.FC<TechCountdownProps> = ({
  totalSeconds,
  isRunning,
  onComplete,
  onTick,
  variant = 'hud-circular',
  label = 'THỜI GIAN',
  size = 'lg',
}) => {
  // Store callbacks in refs to avoid restarting effects on parent re-renders
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  // Remaining time in milliseconds (for buttery 60fps animations)
  const totalMs = totalSeconds * 1000;
  const [remainingMs, setRemainingMs] = useState(totalMs);

  const lastSecondRef = useRef(totalSeconds);
  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const hasFinishedRef = useRef(false);

  // Sync totalSeconds change if reset
  useEffect(() => {
    elapsedBeforePauseRef.current = 0;
    startTimeRef.current = null;
    hasFinishedRef.current = false;
    lastSecondRef.current = totalSeconds;
    setRemainingMs(totalSeconds * 1000);
  }, [totalSeconds]);

  // Robust RAF timer loop immune to parent re-renders
  useEffect(() => {
    if (!isRunning) {
      if (startTimeRef.current !== null) {
        elapsedBeforePauseRef.current += performance.now() - startTimeRef.current;
        startTimeRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      return;
    }

    if (hasFinishedRef.current) return;

    startTimeRef.current = performance.now();

    const loop = (now: number) => {
      if (!startTimeRef.current) return;

      const currentElapsed = elapsedBeforePauseRef.current + (now - startTimeRef.current);
      const newRemainingMs = Math.max(0, totalMs - currentElapsed);

      setRemainingMs(newRemainingMs);

      const currentIntegerSec = Math.ceil(newRemainingMs / 1000);

      // Trigger integer tick event and audio
      if (currentIntegerSec !== lastSecondRef.current && currentIntegerSec >= 0) {
        lastSecondRef.current = currentIntegerSec;
        if (onTickRef.current) {
          onTickRef.current(currentIntegerSec);
        }

        // Play high-tech tick sound
        if (currentIntegerSec <= 3 && currentIntegerSec > 0) {
          soundManager.playCyberTick(950, true);
        } else if (currentIntegerSec > 0) {
          soundManager.playCyberTick(650 + (10 - currentIntegerSec) * 25, false);
        }
      }

      if (newRemainingMs <= 0) {
        hasFinishedRef.current = true;
        soundManager.playCyberWarning();
        onCompleteRef.current();
        return;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRunning, totalMs]);

  // Compute display values
  const secondsInt = Math.ceil(remainingMs / 1000);
  const progressFraction = Math.max(0, Math.min(1, remainingMs / totalMs));
  const isUrgent = secondsInt <= 3 && isRunning;
  const isWarning = secondsInt <= 5 && !isUrgent && isRunning;

  // Visual color tokens based on urgency
  const themeColor = isUrgent
    ? {
        primary: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.6)',
        text: 'text-rose-400',
        bg: 'bg-rose-950/40',
        border: 'border-rose-500/70',
        track: '#881337',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      }
    : isWarning
    ? {
        primary: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.5)',
        text: 'text-amber-400',
        bg: 'bg-amber-950/40',
        border: 'border-amber-500/60',
        track: '#78350f',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      }
    : {
        primary: '#06b6d4',
        glow: 'rgba(6, 182, 212, 0.5)',
        text: 'text-cyan-400',
        bg: 'bg-cyan-950/30',
        border: 'border-cyan-500/50',
        track: '#164e63',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      };

  // Dimensions for circular variant
  const radius = size === 'xl' ? 56 : size === 'lg' ? 46 : size === 'md' ? 36 : 28;
  const strokeWidth = size === 'xl' ? 7 : size === 'lg' ? 6 : size === 'md' ? 5 : 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressFraction);
  const boxSize = (radius + strokeWidth + 6) * 2;

  // VARIANT: Circular HUD
  if (variant === 'hud-circular') {
    return (
      <div className="relative inline-flex flex-col items-center justify-center select-none group">
        {/* Futuristic outer cyber ring with rotation */}
        <div
          className={`relative flex items-center justify-center rounded-full p-2 backdrop-blur-md ${themeColor.bg} border ${themeColor.border} transition-colors duration-300 shadow-xl`}
          style={{
            boxShadow: `0 0 24px ${themeColor.glow}, inset 0 0 16px ${themeColor.glow}`,
          }}
        >
          {/* SVG Animated Dial */}
          <svg width={boxSize} height={boxSize} className="transform -rotate-90">
            {/* Background circular track */}
            <circle
              cx={boxSize / 2}
              cy={boxSize / 2}
              r={radius}
              fill="transparent"
              stroke={themeColor.track}
              strokeWidth={strokeWidth}
              strokeOpacity="0.35"
            />

            {/* Dashed tech marks along track */}
            <circle
              cx={boxSize / 2}
              cy={boxSize / 2}
              r={radius}
              fill="transparent"
              stroke="#ffffff"
              strokeWidth={1}
              strokeDasharray="2 8"
              strokeOpacity="0.25"
            />

            {/* Active Smooth Progress Circle */}
            <circle
              cx={boxSize / 2}
              cy={boxSize / 2}
              r={radius}
              fill="transparent"
              stroke={themeColor.primary}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: isRunning ? 'stroke 0.3s ease' : 'none',
                filter: `drop-shadow(0 0 6px ${themeColor.primary})`,
              }}
            />
          </svg>

          {/* Center Digital Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {/* Cyber Status micro tag */}
            <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-slate-300/80 mb-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isUrgent ? 'bg-rose-400 animate-ping' : isRunning ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              />
              <span className="hidden sm:inline">{isRunning ? 'CHRONO' : 'READY'}</span>
            </div>

            {/* Glowing Big Digital Number */}
            <div
              className={`font-mono font-black tracking-tighter ${
                size === 'xl'
                  ? 'text-4xl sm:text-5xl'
                  : size === 'lg'
                  ? 'text-3xl sm:text-4xl'
                  : 'text-2xl'
              } ${themeColor.text} transition-transform ${
                isUrgent ? 'scale-110 animate-pulse' : ''
              }`}
              style={{
                textShadow: `0 0 12px ${themeColor.glow}`,
              }}
            >
              {secondsInt < 10 ? `0${secondsInt}` : secondsInt}
              <span className="text-xs sm:text-sm font-sans font-bold ml-0.5 text-slate-300">s</span>
            </div>

            {/* Label */}
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-300 mt-0.5">
              {label}
            </span>
          </div>

          {/* Warning pulsing halo if <= 3 seconds */}
          {isUrgent && (
            <div
              className="absolute inset-0 rounded-full border-2 border-rose-500 animate-ping opacity-40 pointer-events-none"
            />
          )}
        </div>
      </div>
    );
  }

  // VARIANT: HUD Banner (horizontal tech meter with bar & circular gauge)
  if (variant === 'hud-banner') {
    return (
      <div
        className={`w-full rounded-2xl p-3.5 sm:p-4 backdrop-blur-md ${themeColor.bg} border ${themeColor.border} shadow-lg transition-all flex flex-wrap items-center justify-between gap-3 relative overflow-hidden`}
        style={{
          boxShadow: `0 0 20px ${themeColor.glow}`,
        }}
      >
        {/* Background circuit grid watermark */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 border border-cyan-500/10 rounded-full pointer-events-none" />

        {/* Left: Indicator & Status */}
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border font-mono font-black text-xl shadow-inner ${themeColor.badge}`}
          >
            {secondsInt < 10 ? `0${secondsInt}` : secondsInt}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              <Radio className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
              <span>{label}</span>
              {isUrgent && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-500 text-white animate-bounce">
                  GẤP!
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {isUrgent
                ? 'Thời gian sắp hết! Hãy nhanh chóng hoàn thành!'
                : 'Đồng hồ điện tử đồng bộ chuẩn xác.'}
            </div>
          </div>
        </div>

        {/* Right: Fluid Cyber Progress Bar */}
        <div className="flex-1 max-w-xs sm:max-w-md min-w-[140px]">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
            <span>0s</span>
            <span className={`font-bold ${themeColor.text}`}>
              {Math.round(progressFraction * 100)}%
            </span>
            <span>{totalSeconds}s</span>
          </div>
          <div className="w-full bg-slate-900/80 rounded-full h-3 p-0.5 border border-slate-700/80 overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${progressFraction * 100}%`,
                backgroundColor: themeColor.primary,
                boxShadow: `0 0 10px ${themeColor.primary}`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // VARIANT: HUD Compact Badge
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md ${themeColor.bg} ${themeColor.border} transition-all shadow-md`}
      style={{
        boxShadow: `0 0 12px ${themeColor.glow}`,
      }}
    >
      <Timer className={`w-4 h-4 ${themeColor.text} ${isUrgent ? 'animate-spin' : ''}`} />
      <span className="text-xs text-slate-300 font-semibold">{label}:</span>
      <span
        className={`font-mono font-black text-sm sm:text-base ${themeColor.text} ${
          isUrgent ? 'animate-pulse' : ''
        }`}
      >
        {secondsInt < 10 ? `0${secondsInt}` : secondsInt}s
      </span>
    </div>
  );
};
