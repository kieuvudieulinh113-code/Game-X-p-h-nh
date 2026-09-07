import React, { useState } from 'react';
import { Team, GamePhase } from '../types';
import { TOTAL_PIECES } from '../utils/imageSlice';
import {
  Puzzle,
  Zap,
  CheckCircle2,
  Edit3,
  Check,
  UserCheck,
  Cpu,
  Flame,
} from 'lucide-react';

interface ScoreBoardProps {
  teams: [Team, Team];
  currentRound: number;
  phase: GamePhase;
  activeTeamId?: 'teamA' | 'teamB' | null;
  onUpdateTeamName: (teamId: 'teamA' | 'teamB', newName: string) => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  teams,
  currentRound,
  activeTeamId,
  onUpdateTeamName,
}) => {
  const [editingTeamA, setEditingTeamA] = useState(false);
  const [editingTeamB, setEditingTeamB] = useState(false);
  const [nameA, setNameA] = useState(teams[0].name);
  const [nameB, setNameB] = useState(teams[1].name);

  const handleSaveNameA = () => {
    if (nameA.trim()) {
      onUpdateTeamName('teamA', nameA.trim());
    }
    setEditingTeamA(false);
  };

  const handleSaveNameB = () => {
    if (nameB.trim()) {
      onUpdateTeamName('teamB', nameB.trim());
    }
    setEditingTeamB(false);
  };

  const renderTeamCard = (
    team: Team,
    isLeft: boolean,
    isEditing: boolean,
    setIsEditing: (v: boolean) => void,
    nameInput: string,
    setNameInput: (v: string) => void,
    onSaveName: () => void
  ) => {
    const isActive = activeTeamId === team.id;
    const isTeamA = team.id === 'teamA';

    return (
      <div
        className={`flex-1 rounded-2xl border-2 transition-all p-3 sm:p-4 backdrop-blur-md ${
          isTeamA
            ? isActive
              ? 'bg-slate-900/95 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)] ring-2 ring-cyan-400/50'
              : 'bg-slate-900/80 border-cyan-500/30'
            : isActive
            ? 'bg-slate-900/95 border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.4)] ring-2 ring-rose-400/50'
            : 'bg-slate-900/80 border-rose-500/30'
        }`}
      >
        {/* Header row: Team Name & Edit */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${
                isTeamA ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-rose-400 shadow-[0_0_8px_#fb7185]'
              } ${isActive ? 'animate-ping' : ''}`}
            />
            {isEditing ? (
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSaveName()}
                  className="w-full text-sm font-bold px-2 py-1 bg-slate-950 text-white border border-cyan-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  autoFocus
                  maxLength={25}
                />
                <button
                  onClick={onSaveName}
                  className="p-1 text-emerald-400 hover:bg-slate-800 rounded cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 truncate">
                <h3
                  className={`text-base sm:text-lg font-black tracking-tight truncate ${
                    isTeamA ? 'text-cyan-300' : 'text-rose-300'
                  }`}
                >
                  {team.name}
                </h3>
                <button
                  onClick={() => {
                    setNameInput(team.name);
                    setIsEditing(true);
                  }}
                  title="Đổi tên đội"
                  className="p-1 text-slate-400 hover:text-cyan-300 rounded transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Active Turn Badge */}
          {isActive && (
            <span
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider animate-pulse shadow-md ${
                isTeamA
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                  : 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.6)]'
              }`}
            >
              GIÀNH QUYỀN
            </span>
          )}
        </div>

        {/* Representative status indicator */}
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 mb-3 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
          <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Đại diện: <strong className="text-slate-200">Học sinh Lượt {currentRound}</strong></span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Pieces */}
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-slate-400 mb-0.5">
              <Puzzle className="w-3 h-3 text-cyan-400" />
              <span>Mảnh ghép</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-black text-white">
              {team.piecesCollected} <span className="text-xs font-normal text-slate-500">/ {TOTAL_PIECES}</span>
            </div>
          </div>

          {/* Correct Answers */}
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-slate-400 mb-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Câu đúng</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-black text-emerald-400">
              {team.correctAnswersCount}
            </div>
          </div>

          {/* Motion Total */}
          <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-slate-400 mb-0.5">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Vận động</span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-black text-amber-300">
              {team.motionScoreTotal}
            </div>
          </div>
        </div>

        {/* Progress mini bar for TOTAL_PIECES */}
        <div className="mt-3">
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                isTeamA
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_8px_#06b6d4]'
                  : 'bg-gradient-to-r from-rose-500 to-pink-500 shadow-[0_0_8px_#f43f5e]'
              }`}
              style={{ width: `${(team.piecesCollected / TOTAL_PIECES) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto mb-4">
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        {renderTeamCard(
          teams[0],
          true,
          editingTeamA,
          setEditingTeamA,
          nameA,
          setNameA,
          handleSaveNameA
        )}

        {/* Round Center Pill */}
        <div className="flex sm:flex-col items-center justify-center bg-slate-900/90 border border-cyan-500/30 text-white px-4 py-2 sm:py-3 rounded-2xl shadow-lg text-center flex-shrink-0">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            LƯỢT THI
          </span>
          <span className="text-xl sm:text-2xl font-mono font-black text-cyan-300 mx-2 sm:mx-0">
            #{currentRound}
          </span>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:block">
            Mục tiêu: 8 mảnh
          </span>
        </div>

        {renderTeamCard(
          teams[1],
          false,
          editingTeamB,
          setEditingTeamB,
          nameB,
          setNameB,
          handleSaveNameB
        )}
      </div>
    </div>
  );
};
