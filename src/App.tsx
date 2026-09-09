import React, { useState, useEffect, useCallback } from 'react';
import {
  GamePhase,
  Team,
  PuzzlePiece,
  QuestionBank,
  MysteryImage,
  Question,
} from './types';
import { DEFAULT_QUESTION_BANKS } from './data/sampleQuestions';
import { DEFAULT_MYSTERY_IMAGES } from './data/sampleImages';
import { sliceImageIntoPieces, TOTAL_PIECES } from './utils/imageSlice';
import { soundManager } from './utils/audio';
import { Header } from './components/Header';
import { ScoreBoard } from './components/ScoreBoard';
import { MotionPhase } from './components/MotionPhase';
import { AnswerPhase } from './components/AnswerPhase';
import { PuzzleBoard } from './components/PuzzleBoard';
import { VictoryModal } from './components/VictoryModal';
import { TeacherPanel } from './components/TeacherPanel';
import { QuestionBankSelectorModal } from './components/QuestionBankSelectorModal';
import { JigsawCanvas } from './components/JigsawCanvas';
import {
  Play,
  RotateCcw,
  Sparkles,
  Award,
  AlertCircle,
  HelpCircle,
  Puzzle,
  ChevronRight,
  BookOpen,
  Timer,
} from 'lucide-react';

const INITIAL_TEAMS: [Team, Team] = [
  {
    id: 'teamA',
    name: 'Đội Tia Chớp',
    color: 'blue',
    bgClass: 'bg-blue-600',
    borderClass: 'border-blue-500',
    textClass: 'text-blue-600',
    badgeBg: 'bg-blue-100 text-blue-800',
    score: 0,
    piecesCollected: 0,
    motionScoreTotal: 0,
    correctAnswersCount: 0,
  },
  {
    id: 'teamB',
    name: 'Đội Rồng Lửa',
    color: 'rose',
    bgClass: 'bg-rose-600',
    borderClass: 'border-rose-500',
    textClass: 'text-rose-600',
    badgeBg: 'bg-rose-100 text-rose-800',
    score: 0,
    piecesCollected: 0,
    motionScoreTotal: 0,
    correctAnswersCount: 0,
  },
];

export default function App() {
  // Persistence states
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>(() => {
    const saved = localStorage.getItem('cpmg_question_banks');
    return saved ? JSON.parse(saved) : DEFAULT_QUESTION_BANKS;
  });

  const [currentBankId, setCurrentBankId] = useState<string>(() => {
    return localStorage.getItem('cpmg_active_bank') || DEFAULT_QUESTION_BANKS[0].id;
  });

  const [mysteryImages, setMysteryImages] = useState<MysteryImage[]>(() => {
    const saved = localStorage.getItem('cpmg_mystery_images');
    return saved ? JSON.parse(saved) : DEFAULT_MYSTERY_IMAGES;
  });

  const [currentImageId, setCurrentImageId] = useState<string>(() => {
    return localStorage.getItem('cpmg_active_image') || DEFAULT_MYSTERY_IMAGES[0].id;
  });

  const [answerTimeLimit, setAnswerTimeLimit] = useState<number>(() => {
    const saved = localStorage.getItem('cpmg_answer_time');
    return saved ? parseInt(saved, 10) : 20;
  });

  // Game Loop States
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [currentRound, setCurrentRound] = useState(1);
  const [teams, setTeams] = useState<[Team, Team]>(() => {
    const saved = localStorage.getItem('cpmg_teams');
    return saved ? JSON.parse(saved) : INITIAL_TEAMS;
  });

  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [activeMotionWinner, setActiveMotionWinner] = useState<'teamA' | 'teamB' | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

  // Modals & Panels
  const [isTeacherPanelOpen, setIsTeacherPanelOpen] = useState(false);
  const [teacherPanelInitialTab, setTeacherPanelInitialTab] = useState<'questions' | 'images' | 'settings'>('questions');
  const [isBankSelectorOpen, setIsBankSelectorOpen] = useState(false);
  const [motionRetryNotice, setMotionRetryNotice] = useState<string | null>(null);
  const [roundNotification, setRoundNotification] = useState<string | null>(null);

  // Active question bank & mystery image
  const activeBank =
    questionBanks.find((b) => b.id === currentBankId) || questionBanks[0] || DEFAULT_QUESTION_BANKS[0];
  const activeImage =
    mysteryImages.find((img) => img.id === currentImageId) ||
    mysteryImages[0] ||
    DEFAULT_MYSTERY_IMAGES[0];

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('cpmg_question_banks', JSON.stringify(questionBanks));
  }, [questionBanks]);

  useEffect(() => {
    localStorage.setItem('cpmg_active_bank', currentBankId);
  }, [currentBankId]);

  useEffect(() => {
    localStorage.setItem('cpmg_mystery_images', JSON.stringify(mysteryImages));
  }, [mysteryImages]);

  useEffect(() => {
    localStorage.setItem('cpmg_active_image', currentImageId);
  }, [currentImageId]);

  useEffect(() => {
    localStorage.setItem('cpmg_teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('cpmg_answer_time', String(answerTimeLimit));
  }, [answerTimeLimit]);

  // Initialize or re-slice puzzle pieces when mystery image changes or on start
  const initPuzzlePieces = useCallback(async (imageSrc: string) => {
    try {
      const sliced = await sliceImageIntoPieces(imageSrc);
      setPieces(sliced);
    } catch (err) {
      console.error('Error slicing puzzle image:', err);
    }
  }, []);

  useEffect(() => {
    if (activeImage) {
      initPuzzlePieces(activeImage.dataUrl);
    }
  }, [activeImage, initPuzzlePieces]);

  // Reset entire game match
  const handleResetGame = () => {
    soundManager.playClick();
    if (window.confirm('Bạn có chắc chắn muốn làm mới ván chơi này? Tiến độ ghép tranh sẽ được đặt lại từ đầu.')) {
      setPhase('ready');
      setCurrentRound(1);
      setUsedQuestionIds([]);
      setActiveMotionWinner(null);
      setCurrentQuestion(null);
      setMotionRetryNotice(null);
      setRoundNotification(null);
      setTeams((prev) => [
        { ...prev[0], score: 0, piecesCollected: 0, motionScoreTotal: 0, correctAnswersCount: 0 },
        { ...prev[1], score: 0, piecesCollected: 0, motionScoreTotal: 0, correctAnswersCount: 0 },
      ]);
      if (activeImage) {
        initPuzzlePieces(activeImage.dataUrl);
      }
    }
  };

  // Update team name inline
  const handleUpdateTeamName = (teamId: 'teamA' | 'teamB', newName: string) => {
    soundManager.playClick();
    setTeams((prev) => [
      teamId === 'teamA' ? { ...prev[0], name: newName } : prev[0],
      teamId === 'teamB' ? { ...prev[1], name: newName } : prev[1],
    ]);
  };

  // Select next unused question
  const pickNextQuestion = useCallback((): Question => {
    const allQuestions = activeBank.questions;
    const available = allQuestions.filter((q) => !usedQuestionIds.includes(q.id));

    if (available.length === 0) {
      // All questions used! Auto-reset pool so game never breaks
      setUsedQuestionIds([]);
      return allQuestions[Math.floor(Math.random() * allQuestions.length)];
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    const selected = available[randomIndex];
    setUsedQuestionIds((prev) => [...prev, selected.id]);
    return selected;
  }, [activeBank.questions, usedQuestionIds]);

  // Callback when 10s motion completes
  const handleMotionComplete = (winner: 'teamA' | 'teamB', scoreA: number, scoreB: number) => {
    setActiveMotionWinner(winner);
    setMotionRetryNotice(null);

    // Update motion totals on teams
    setTeams((prev) => [
      { ...prev[0], motionScoreTotal: prev[0].motionScoreTotal + scoreA },
      { ...prev[1], motionScoreTotal: prev[1].motionScoreTotal + scoreB },
    ]);

    // Select question for answering team
    const nextQ = pickNextQuestion();
    setCurrentQuestion(nextQ);
    setPhase('answer');
  };

  // Callback when motion needs retry (both invalid or too close)
  const handleRetryMotion = (reason: string) => {
    soundManager.playIncorrect();
    setMotionRetryNotice(reason);
    setPhase('motion');
  };

  // Callback when answering question
  const handleAnswerResult = (isCorrect: boolean) => {
    if (!activeMotionWinner) return;

    if (isCorrect) {
      // Increment correct count
      setTeams((prev) => [
        activeMotionWinner === 'teamA'
          ? { ...prev[0], correctAnswersCount: prev[0].correctAnswersCount + 1 }
          : prev[0],
        activeMotionWinner === 'teamB'
          ? { ...prev[1], correctAnswersCount: prev[1].correctAnswersCount + 1 }
          : prev[1],
      ]);

      // Move to puzzle placement phase
      setPhase('puzzle');
    }
  };

  // Callback when answer is wrong -> turn ends without puzzle placement
  const handleEndTurnWithoutPuzzle = () => {
    const winningTeam = activeMotionWinner === 'teamA' ? teams[0] : teams[1];
    setRoundNotification(
      `Lượt ${currentRound} kết thúc! Đội ${winningTeam.name} trả lời chưa đúng nên không được ghép mảnh. Hãy cố gắng ở lượt sau nhé!`
    );
    setPhase('round_end');
  };

  // Callback when a puzzle piece is correctly placed
  const handlePiecePlaced = (pieceId: number, teamId: 'teamA' | 'teamB') => {
    // Lock piece
    const updatedPieces = pieces.map((p) =>
      p.id === pieceId ? { ...p, isPlaced: true, placedByTeam: teamId } : p
    );
    setPieces(updatedPieces);

    // Increment pieces count
    setTeams((prev) => [
      teamId === 'teamA' ? { ...prev[0], piecesCollected: prev[0].piecesCollected + 1 } : prev[0],
      teamId === 'teamB' ? { ...prev[1], piecesCollected: prev[1].piecesCollected + 1 } : prev[1],
    ]);

    const totalPlaced = updatedPieces.filter((p) => p.isPlaced).length;

    // Victory condition check: 8th piece placed!
    // "Đội ghép đúng mảnh thứ 8 là đội chiến thắng."
    if (totalPlaced >= TOTAL_PIECES) {
      setPhase('victory');
    } else {
      const placingTeam = teamId === 'teamA' ? teams[0] : teams[1];
      setRoundNotification(
        `Xuất sắc! Đội ${placingTeam.name} đã ghép thành công mảnh ghép vào bức tranh! Khung tranh hiện đã có ${totalPlaced}/${TOTAL_PIECES} mảnh.`
      );
      setPhase('round_end');
    }
  };

  // Proceed to next round
  const handleProceedToNextRound = () => {
    soundManager.playClick();
    setCurrentRound((r) => r + 1);
    setActiveMotionWinner(null);
    setCurrentQuestion(null);
    setRoundNotification(null);
    setPhase('ready');
  };

  // Question bank selection & storage helpers
  const handleSelectQuestionBank = (bankId: string) => {
    setCurrentBankId(bankId);
    setUsedQuestionIds([]);
    const found = questionBanks.find((b) => b.id === bankId);
    if (found) {
      setRoundNotification(`Đã chuyển sang bộ câu hỏi: "${found.title}" (${found.questions.length} câu)`);
      setTimeout(() => setRoundNotification(null), 4500);
    }
  };

  const handleSaveQuestionBank = (b: QuestionBank) => {
    setQuestionBanks((prev) => {
      const idx = prev.findIndex((item) => item.id === b.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = b;
        return copy;
      }
      return [b, ...prev];
    });
  };

  const handleDeleteQuestionBank = (bankId: string) => {
    setQuestionBanks((prev) => prev.filter((item) => item.id !== bankId));
    if (currentBankId === bankId) {
      const remaining = questionBanks.filter((item) => item.id !== bankId);
      if (remaining.length > 0) {
        setCurrentBankId(remaining[0].id);
      }
    }
  };

  const winningTeam =
    teams[0].piecesCollected > teams[1].piecesCollected
      ? teams[0]
      : teams[1].piecesCollected > teams[0].piecesCollected
      ? teams[1]
      : activeMotionWinner === 'teamA'
      ? teams[0]
      : teams[1];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col selection:bg-cyan-500 text-slate-100 relative overflow-x-hidden">
      {/* Subtle Tech Grid / Cyber Ambient Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(6,182,212,0.2),rgba(0,0,0,0))] pointer-events-none z-0" />

      {/* Top Navigation Bar */}
      <Header
        bankTitle={activeBank.title}
        grade={activeBank.grade}
        onOpenTeacherPanel={() => setIsTeacherPanelOpen(true)}
        onOpenBankSelector={() => setIsBankSelectorOpen(true)}
        onResetGame={handleResetGame}
        canReset={currentRound > 1 || pieces.some((p) => p.isPlaced)}
      />

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto space-y-4 relative z-10">
        {/* Persistent ScoreBoard */}
        <ScoreBoard
          teams={teams}
          currentRound={currentRound}
          phase={phase}
          activeTeamId={activeMotionWinner}
          onUpdateTeamName={handleUpdateTeamName}
        />

        {/* Dynamic Game Phase Section */}

        {/* PHASE: READY - Choose Representative & Start */}
        {phase === 'ready' && (
          <div className="w-full max-w-4xl mx-auto bg-slate-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl border border-cyan-500/30 text-center space-y-6 animate-in fade-in backdrop-blur-md">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>GIAI ĐOẠN KHỞI ĐỘNG // LƯỢT THI #{currentRound}</span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Mỗi đội cử 01 bạn học sinh đại diện
              </h2>
              <p className="text-sm text-cyan-200/80 max-w-lg mx-auto mt-2 leading-relaxed">
                Hai bạn đại diện tiến lên đứng trước camera. Khi bắt đầu, hệ thống AI sẽ kích hoạt <strong>đồng hồ 10 giây đếm ngược siêu mượt</strong> để 2 bạn tranh tài vận động!
              </p>
            </div>

            {/* Active Question Bank Card for Teacher */}
            <div className="bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-4 max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-3 text-left shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/50 text-cyan-300 flex items-center justify-center font-bold flex-shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                      BỘ CÂU HỎI ĐANG ÁP DỤNG:
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                      {activeBank.grade === 'lop3' ? 'Lớp 3' : activeBank.grade === 'lop4' ? 'Lớp 4' : 'Tiểu học'}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white mt-0.5">{activeBank.title}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Gồm {activeBank.questions.length} câu hỏi • Đã dùng {usedQuestionIds.length}/{activeBank.questions.length} câu
                  </p>
                </div>
              </div>

              <button
                id="btn-switch-bank-ready"
                onClick={() => setIsBankSelectorOpen(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/40 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-cyan-200" />
                <span>Đổi bộ câu hỏi khác</span>
              </button>
            </div>

            {/* Answer Countdown & Sound Quick Settings Card */}
            <div className="bg-slate-950/90 border border-indigo-500/30 rounded-2xl p-4 max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-3 text-left shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/50 text-indigo-300 flex items-center justify-center font-bold flex-shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.3)] font-mono">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                      THỜI GIAN TRẢ LỜI CÂU HỎI:
                    </span>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-600 font-black">
                      {answerTimeLimit} GIÂY
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Thời gian đếm ngược để học sinh suy nghĩ và chọn đáp án trước khi hết giờ.
                  </p>
                </div>
              </div>

              <button
                id="btn-config-answer-time-ready"
                onClick={() => {
                  setTeacherPanelInitialTab('settings');
                  setIsTeacherPanelOpen(true);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border border-indigo-400/40 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all cursor-pointer"
              >
                <Timer className="w-4 h-4 text-indigo-200" />
                <span>Cài đặt số giây</span>
              </button>
            </div>

            {/* Two Teams Representative Staging Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* Team 1 Staging */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border-2 border-cyan-500/40 text-center space-y-2 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500 text-slate-950 font-mono font-black text-xl flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                  1
                </div>
                <h3 className="text-lg font-black text-cyan-300">{teams[0].name}</h3>
                <p className="text-xs text-cyan-400 font-mono">
                  Học sinh đại diện: Đứng bên TRÁI màn hình
                </p>
              </div>

              {/* Team 2 Staging */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border-2 border-rose-500/40 text-center space-y-2 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white font-mono font-black text-xl flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                  2
                </div>
                <h3 className="text-lg font-black text-rose-300">{teams[1].name}</h3>
                <p className="text-xs text-rose-400 font-mono">
                  Học sinh đại diện: Đứng bên PHẢI màn hình
                </p>
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-2">
              <button
                id="btn-enter-motion"
                onClick={() => {
                  soundManager.playCyberLaunch();
                  setPhase('motion');
                }}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-lg shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center gap-3 mx-auto transform hover:scale-105 transition-all border border-cyan-300/40 cursor-pointer"
              >
                <Play className="w-6 h-6 fill-white" />
                <span>BƯỚC VÀO VẬN ĐỘNG 10 GIÂY</span>
              </button>
            </div>
          </div>
        )}

        {/* PHASE: MOTION - 10s Webcam Joint Movement Evaluation */}
        {phase === 'motion' && (
          <div className="space-y-3">
            {motionRetryNotice && (
              <div className="p-4 bg-amber-500/90 text-slate-950 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-bounce border border-amber-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-slate-950" />
                <span>{motionRetryNotice}</span>
              </div>
            )}

            <MotionPhase
              teams={teams}
              currentRound={currentRound}
              onMotionComplete={handleMotionComplete}
              onRetryMotion={handleRetryMotion}
              retryNotice={motionRetryNotice}
              onClearRetryNotice={() => setMotionRetryNotice(null)}
            />
          </div>
        )}

        {/* PHASE: ANSWER - Winning Team Multiple Choice */}
        {phase === 'answer' && currentQuestion && activeMotionWinner && (
          <AnswerPhase
            question={currentQuestion}
            answeringTeam={activeMotionWinner === 'teamA' ? teams[0] : teams[1]}
            timeLimitSeconds={answerTimeLimit}
            onAnswerResult={handleAnswerResult}
            onEndTurnWithoutPuzzle={handleEndTurnWithoutPuzzle}
          />
        )}

        {/* PHASE: PUZZLE - Placement into 8 slots */}
        {phase === 'puzzle' && activeMotionWinner && (
          <PuzzleBoard
            pieces={pieces}
            mysteryImage={activeImage}
            activeTeam={activeMotionWinner === 'teamA' ? teams[0] : teams[1]}
            canPlacePiece={true}
            onPiecePlaced={handlePiecePlaced}
          />
        )}

        {/* PHASE: ROUND END - Summary before next round */}
        {phase === 'round_end' && (
          <div className="w-full max-w-3xl mx-auto bg-slate-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl border border-cyan-500/30 text-center space-y-6 animate-in fade-in backdrop-blur-md">
            <div className="w-16 h-16 rounded-3xl bg-cyan-950 border border-cyan-500/50 text-cyan-300 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Puzzle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">
                Kết thúc Lượt {currentRound}
              </h3>
              {roundNotification && (
                <p className="text-sm text-cyan-200/80 max-w-lg mx-auto mt-2 leading-relaxed">
                  {roundNotification}
                </p>
              )}
            </div>

            {/* Current mini preview of 8 pieces */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-cyan-500/30 max-w-md mx-auto">
              <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-300 mb-2">
                <span>TIẾN ĐỘ BỨC TRANH BÍ ẨN:</span>
                <span className="text-cyan-300">
                  {pieces.filter((p) => p.isPlaced).length} / {TOTAL_PIECES} Mảnh
                </span>
              </div>
              <div className="max-w-md mx-auto">
                <JigsawCanvas
                  pieces={pieces}
                  imageUrl={activeImage.dataUrl}
                  showBadges={true}
                  showSeams={true}
                />
              </div>
            </div>

            <button
              id="btn-next-round"
              onClick={handleProceedToNextRound}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-base shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-2 mx-auto transform hover:scale-105 transition-all border border-cyan-300/40 cursor-pointer"
            >
              <span>BẮT ĐẦU LƯỢT TIẾP THEO</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* PHASE: VICTORY MODAL */}
        {phase === 'victory' && (
          <VictoryModal
            winningTeam={winningTeam}
            teams={teams}
            mysteryImage={activeImage}
            onPlayAgain={() => {
              setPhase('ready');
              setCurrentRound(1);
              setUsedQuestionIds([]);
              setActiveMotionWinner(null);
              setCurrentQuestion(null);
              setRoundNotification(null);
              setTeams((prev) => [
                { ...prev[0], score: 0, piecesCollected: 0, motionScoreTotal: 0, correctAnswersCount: 0 },
                { ...prev[1], score: 0, piecesCollected: 0, motionScoreTotal: 0, correctAnswersCount: 0 },
              ]);
              if (activeImage) {
                initPuzzlePieces(activeImage.dataUrl);
              }
            }}
            onChangeImageAndBank={() => {
              setIsTeacherPanelOpen(true);
            }}
          />
        )}
      </main>

      {/* Teacher Management Modal */}
      {isTeacherPanelOpen && (
        <TeacherPanel
          questionBanks={questionBanks}
          currentBankId={currentBankId}
          mysteryImages={mysteryImages}
          currentImageId={currentImageId}
          answerTimeLimit={answerTimeLimit}
          onSelectQuestionBank={handleSelectQuestionBank}
          onSaveQuestionBank={handleSaveQuestionBank}
          onDeleteQuestionBank={handleDeleteQuestionBank}
          onSelectMysteryImage={(imgId) => {
            setCurrentImageId(imgId);
            const found = mysteryImages.find((img) => img.id === imgId);
            if (found) {
              initPuzzlePieces(found.dataUrl);
            }
          }}
          onSaveMysteryImage={(img) => {
            setMysteryImages((prev) => {
              const idx = prev.findIndex((item) => item.id === img.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = img;
                return copy;
              }
              return [...prev, img];
            });
          }}
          onDeleteMysteryImage={(imgId) => {
            setMysteryImages((prev) => prev.filter((item) => item.id !== imgId));
            if (currentImageId === imgId) {
              const remaining = mysteryImages.filter((item) => item.id !== imgId);
              if (remaining.length > 0) {
                setCurrentImageId(remaining[0].id);
                initPuzzlePieces(remaining[0].dataUrl);
              }
            }
          }}
          onUpdateAnswerTimeLimit={(sec) => setAnswerTimeLimit(sec)}
          initialTab={teacherPanelInitialTab}
          onClose={() => setIsTeacherPanelOpen(false)}
        />
      )}

      {/* Dedicated Question Bank Selector Modal */}
      {isBankSelectorOpen && (
        <QuestionBankSelectorModal
          questionBanks={questionBanks}
          currentBankId={currentBankId}
          onSelectQuestionBank={handleSelectQuestionBank}
          onSaveQuestionBank={handleSaveQuestionBank}
          onDeleteQuestionBank={handleDeleteQuestionBank}
          onClose={() => setIsBankSelectorOpen(false)}
        />
      )}

      {/* Projector-friendly Classroom Footer */}
      <footer className="bg-slate-950/90 border-t border-cyan-500/20 py-3 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-300">
            Trò chơi học tập Tin học Tiểu học — <strong className="text-cyan-300">Chinh phục mảnh ghép</strong>
          </span>
          <span className="text-slate-500">
            Hỗ trợ máy tính, máy chiếu &amp; bảng tương tác thông minh
          </span>
        </div>
      </footer>
    </div>
  );
}
