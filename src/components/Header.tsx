import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  RotateCcw,
  Cpu,
  BookOpen,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HeaderProps {
  bankTitle: string;
  grade: string;
  onOpenTeacherPanel: () => void;
  onOpenBankSelector: () => void;
  onResetGame: () => void;
  canReset: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  bankTitle,
  grade,
  onOpenTeacherPanel,
  onOpenBankSelector,
  onResetGame,
  canReset,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundManager.playCyberTick(800, false);
    }
  };

  const toggleFullscreen = () => {
    soundManager.playCyberTick(1000, true);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const gradeLabel = grade === 'lop3' ? 'Tin học Lớp 3' : grade === 'lop4' ? 'Tin học Lớp 4' : 'Tiểu học';

  return (
    <header className="bg-slate-950/90 backdrop-blur-md shadow-lg border-b border-cyan-500/20 px-4 py-3 sm:px-6 sticky top-0 z-30 text-white">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand & Question Bank Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-300/40 flex-shrink-0">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>CHINH PHỤC MẢNH GHÉP</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                {gradeLabel}
              </span>
            </div>

            {/* Clickable Active Bank Chip */}
            <button
              id="btn-quick-switch-bank-header"
              onClick={onOpenBankSelector}
              title="Nhấp để xem danh sách và chọn bộ câu hỏi khác cho học sinh"
              className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-300 hover:text-cyan-300 group cursor-pointer transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="text-slate-400">Bộ câu hỏi:</span>
              <span className="font-bold text-cyan-300 underline underline-offset-2 decoration-cyan-500/40 group-hover:decoration-cyan-300 truncate max-w-[200px] sm:max-w-xs">
                {bankTitle}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400 opacity-70 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {/* Direct Button: Choose Question Bank */}
          <button
            id="btn-choose-question-bank"
            onClick={onOpenBankSelector}
            title="Chọn hoặc tải lên các bộ câu hỏi"
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white font-bold text-xs sm:text-sm border border-cyan-500/40 hover:border-cyan-400 flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Chọn bộ câu hỏi</span>
          </button>

          {/* Sound Toggle */}
          <button
            id="btn-toggle-sound"
            onClick={toggleSound}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>

          {/* Fullscreen Toggle for Projector */}
          <button
            id="btn-toggle-fullscreen"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình máy chiếu'}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all hidden sm:flex cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Reset Game */}
          {canReset && (
            <button
              id="btn-reset-game"
              onClick={onResetGame}
              title="Chơi ván mới"
              className="px-3 py-2 rounded-xl border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden md:inline">Ván mới</span>
            </button>
          )}

          {/* Teacher Settings Panel */}
          <button
            id="btn-open-teacher-panel"
            onClick={onOpenTeacherPanel}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-400/30 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Quản lý giáo viên</span>
          </button>
        </div>
      </div>
    </header>
  );
};
