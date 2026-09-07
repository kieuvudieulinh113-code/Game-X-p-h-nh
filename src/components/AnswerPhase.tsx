import React, { useState, useEffect } from 'react';
import { Question, Team } from '../types';
import { soundManager } from '../utils/audio';
import { TechCountdown } from './TechCountdown';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Puzzle,
  RotateCcw,
  Cpu,
  Keyboard,
  Sparkles,
} from 'lucide-react';

interface AnswerPhaseProps {
  question: Question;
  answeringTeam: Team;
  timeLimitSeconds: number;
  onAnswerResult: (isCorrect: boolean) => void;
  onEndTurnWithoutPuzzle: () => void;
}

export const AnswerPhase: React.FC<AnswerPhaseProps> = ({
  question,
  answeringTeam,
  timeLimitSeconds,
  onAnswerResult,
  onEndTurnWithoutPuzzle,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isTimeOut, setIsTimeOut] = useState(false);

  const isTeamA = answeringTeam.id === 'teamA';

  const handleTimeOut = () => {
    if (isEvaluated) return;
    setIsTimeOut(true);
    setIsEvaluated(true);
    setIsCorrect(false);
    soundManager.playIncorrect();
  };

  const handleSelectOption = (index: number) => {
    if (isEvaluated) return;
    setSelectedOption(index);
    setIsEvaluated(true);

    const correct = index === question.correctOptionIndex;
    setIsCorrect(correct);

    if (correct) {
      soundManager.playCorrect();
    } else {
      soundManager.playIncorrect();
    }
  };

  // Keyboard shortcut listener for A, B, C, D or 1, 2, 3, 4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEvaluated) {
        if (e.key === 'Enter') {
          if (isCorrect) {
            onAnswerResult(true);
          } else {
            onEndTurnWithoutPuzzle();
          }
        }
        return;
      }

      const key = e.key.toUpperCase();
      let index = -1;
      if (key === 'A' || key === '1') index = 0;
      else if (key === 'B' || key === '2') index = 1;
      else if (key === 'C' || key === '3') index = 2;
      else if (key === 'D' || key === '4') index = 3;

      if (index >= 0 && index < question.options.length) {
        handleSelectOption(index);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEvaluated, isCorrect, question.options.length]);

  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-950 rounded-3xl shadow-2xl border border-cyan-500/30 overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
      {/* Cyber Header bar */}
      <div
        className={`p-4 sm:p-5 text-white flex flex-wrap items-center justify-between gap-3 border-b ${
          isTeamA
            ? 'bg-gradient-to-r from-cyan-950 via-blue-950 to-slate-900 border-cyan-500/30'
            : 'bg-gradient-to-r from-rose-950 via-pink-950 to-slate-900 border-rose-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-mono font-black text-xl shadow-lg border ${
              isTeamA
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-rose-500/20 text-rose-300 border-rose-400/40 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
            }`}
          >
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isTeamA ? 'bg-cyan-400' : 'bg-rose-400'} animate-pulse`} />
              QUYỀN TRẢ LỜI THUỘC VỀ
            </div>
            <h3
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                isTeamA ? 'text-cyan-300' : 'text-rose-300'
              }`}
            >
              {answeringTeam.name}
            </h3>
          </div>
        </div>

        {/* High-Tech Smooth Countdown Meter */}
        <div className="flex items-center gap-3">
          <TechCountdown
            totalSeconds={timeLimitSeconds}
            isRunning={!isEvaluated}
            onComplete={handleTimeOut}
            variant="hud-circular"
            size="md"
            label="THỜI GIAN"
          />
        </div>
      </div>

      {/* Main Question Body */}
      <div className="p-6 sm:p-8 bg-slate-900/60 relative">
        {/* Holographic question label */}
        <div className="mb-6">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            <span>CÂU HỎI TRẮC NGHIỆM TIN HỌC</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800">
              ĐIỂM GHÉP TRANH
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-snug tracking-tight">
            {question.text}
          </h2>
        </div>

        {/* 4 Options Interactive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          {question.options.map((opt, idx) => {
            const label = optionLabels[idx] || `${idx + 1}`;
            const isSelected = selectedOption === idx;
            const isTargetCorrect = question.correctOptionIndex === idx;

            let cardStyle =
              'bg-slate-900/90 border-slate-700/80 hover:bg-slate-800 hover:border-cyan-500/60 text-slate-200 shadow-sm';

            if (isEvaluated) {
              if (isTargetCorrect) {
                cardStyle =
                  'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-2 ring-emerald-400/50';
              } else if (isSelected && !isTargetCorrect) {
                cardStyle =
                  'bg-rose-950/80 border-rose-500 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.4)] ring-2 ring-rose-400/50';
              } else {
                cardStyle = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50';
              }
            }

            return (
              <button
                key={idx}
                id={`btn-option-${label.toLowerCase()}`}
                disabled={isEvaluated}
                onClick={() => handleSelectOption(idx)}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 group relative cursor-pointer ${cardStyle}`}
              >
                {/* Cyber Option Keycap Badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-lg flex-shrink-0 transition-all ${
                    isEvaluated && isTargetCorrect
                      ? 'bg-emerald-500 text-white shadow-[0_0_12px_#10b981]'
                      : isEvaluated && isSelected && !isTargetCorrect
                      ? 'bg-rose-500 text-white shadow-[0_0_12px_#f43f5e]'
                      : 'bg-slate-800 border border-slate-600 text-cyan-300 group-hover:border-cyan-400 group-hover:bg-cyan-950/50'
                  }`}
                >
                  {label}
                </div>

                <div className="flex-1 text-base sm:text-lg font-bold pt-1 leading-snug">
                  {opt}
                </div>

                {/* Status icon */}
                {isEvaluated && isTargetCorrect && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 self-center animate-bounce" />
                )}
                {isEvaluated && isSelected && !isTargetCorrect && (
                  <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0 self-center animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Evaluation Banner */}
        {isEvaluated && (
          <div
            className={`p-4 sm:p-5 rounded-2xl mb-6 border animate-in fade-in slide-in-from-bottom-2 backdrop-blur-md shadow-xl ${
              isCorrect
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                : 'bg-rose-950/60 border-rose-500/60 text-rose-100 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
            }`}
          >
            <div className="flex items-start gap-3">
              {isCorrect ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_#10b981]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_#f43f5e]">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="text-lg font-black tracking-tight">
                  {isCorrect
                    ? 'Chính xác! Chúc mừng bạn và cả đội!'
                    : isTimeOut
                    ? 'Hết thời gian suy nghĩ!'
                    : 'Rất tiếc, câu trả lời chưa chính xác!'}
                </h4>
                <p className="text-sm mt-1 text-slate-200">
                  {isCorrect
                    ? `Đội ${answeringTeam.name} xuất sắc giành quyền ghép 1 mảnh tranh bí ẩn!`
                    : `Đáp án đúng là: ${optionLabels[question.correctOptionIndex]}. ${
                        question.options[question.correctOptionIndex]
                      }. Đội mất quyền ghép mảnh trong lượt này.`}
                </p>
                {question.explanation && (
                  <p className="text-xs text-slate-300 mt-2.5 bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                    <strong className="text-cyan-300">Giải thích:</strong> {question.explanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-cyan-400" />
            <span>
              Phím tắt nhanh: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-300">A</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-300">B</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-300">C</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-300">D</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-300">Enter</kbd>
            </span>
          </div>

          {isEvaluated && (
            <div>
              {isCorrect ? (
                <button
                  id="btn-proceed-to-puzzle"
                  onClick={() => onAnswerResult(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 cursor-pointer"
                >
                  <Puzzle className="w-4 h-4" />
                  <span>TIẾN HÀNH GHÉP TRANH</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  id="btn-finish-round-wrong"
                  onClick={onEndTurnWithoutPuzzle}
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-sm flex items-center gap-2 transition-all transform hover:scale-105 border border-slate-700 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>KẾT THÚC LƯỢT &amp; LƯỢT TIẾP THEO</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
