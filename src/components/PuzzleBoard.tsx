import React, { useState, useEffect } from 'react';
import { PuzzlePiece, Team, MysteryImage } from '../types';
import { soundManager } from '../utils/audio';
import {
  JIGSAW_GEOMETRY,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  JIGSAW_COLS,
  JIGSAW_ROWS,
  JIGSAW_TOTAL,
  JigsawPieceGeometry,
} from '../utils/jigsaw';
import { TOTAL_PIECES } from '../utils/imageSlice';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Trophy,
  Layers,
  Shuffle,
  Eye,
  EyeOff,
  Flame,
  Lightbulb,
} from 'lucide-react';

interface PuzzleBoardProps {
  pieces: PuzzlePiece[];
  mysteryImage: MysteryImage;
  activeTeam: Team;
  canPlacePiece: boolean;
  onPiecePlaced: (pieceId: number, teamId: 'teamA' | 'teamB') => void;
}

export const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
  pieces,
  mysteryImage,
  activeTeam,
  canPlacePiece,
  onPiecePlaced,
}) => {
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const [draggedPieceId, setDraggedPieceId] = useState<number | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<number | null>(null);
  const [wrongSlotId, setWrongSlotId] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false); // Default FALSE: No spoiler numbers so students have to think!
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Scrambled order of loose piece IDs (lộn xộn không theo thứ tự từ 1-9)
  const [shuffledIds, setShuffledIds] = useState<number[]>([]);

  const isTeamA = activeTeam.id === 'teamA';
  const unplacedPieces = pieces.filter((p) => !p.isPlaced);
  const placedCount = pieces.filter((p) => p.isPlaced).length;

  // Initialize and maintain scrambled order for unplaced pieces
  useEffect(() => {
    const unplacedIds = pieces.filter((p) => !p.isPlaced).map((p) => p.id);
    setShuffledIds((prev) => {
      const existing = prev.filter((id) => unplacedIds.includes(id));
      const newlyAdded = unplacedIds.filter((id) => !existing.includes(id));
      if (newlyAdded.length > 0 || existing.length === 0) {
        // Fisher-Yates shuffle to scramble pieces randomly
        const combined = [...existing, ...newlyAdded];
        for (let i = combined.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [combined[i], combined[j]] = [combined[j], combined[i]];
        }
        return combined;
      }
      return existing;
    });
  }, [pieces]);

  // Reshuffle tray manually
  const handleReshuffleTray = () => {
    soundManager.playClick();
    const unplacedIds = pieces.filter((p) => !p.isPlaced).map((p) => p.id);
    const shuffled = [...unplacedIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setShuffledIds(shuffled);
    setFeedbackMsg({
      text: 'Đã xáo trộn lộn xộn các mảnh ghép! Các em hãy quan sát kỹ hình dáng và chi tiết tranh để ghép nhé.',
      isError: false,
    });
  };

  // Active piece is the selected piece, or the first available in the scrambled tray
  const currentActivePieceId =
    selectedPieceId !== null && unplacedPieces.some((p) => p.id === selectedPieceId)
      ? selectedPieceId
      : shuffledIds.length > 0 && unplacedPieces.some((p) => p.id === shuffledIds[0])
      ? shuffledIds[0]
      : unplacedPieces.length > 0
      ? unplacedPieces[0].id
      : null;

  const activeGeom =
    currentActivePieceId !== null ? JIGSAW_GEOMETRY[currentActivePieceId] : null;

  // Spatial thinking clue helper for primary students
  const getPieceSpatialClue = (geom: JigsawPieceGeometry | null) => {
    if (!geom) return null;
    const isCorner =
      (geom.row === 0 || geom.row === JIGSAW_ROWS - 1) &&
      (geom.col === 0 || geom.col === JIGSAW_COLS - 1);
    const isCenter =
      geom.row > 0 &&
      geom.row < JIGSAW_ROWS - 1 &&
      geom.col > 0 &&
      geom.col < JIGSAW_COLS - 1;

    if (isCorner) {
      const v = geom.row === 0 ? 'trên' : 'dưới';
      const h = geom.col === 0 ? 'trái' : 'phải';
      return {
        tag: `Mảnh góc (${v}-${h})`,
        detail: 'Có 2 cạnh thẳng vuông góc — nằm ở góc khung tranh.',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    }
    if (isCenter) {
      return {
        tag: 'Mảnh trung tâm',
        detail: 'Cả 4 cạnh đều có răng cưa lồi/lõm — nằm ở chính giữa bức tranh.',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }
    // Border piece
    return {
      tag: 'Mảnh viền ngoài',
      detail: 'Có 1 cạnh viền thẳng phẳng — tiếp xúc với khung viền tranh.',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    };
  };

  const spatialClue = getPieceSpatialClue(activeGeom);

  // Attempt placement
  const handleAttemptPlacement = (targetSlotId: number, pieceId: number) => {
    if (!canPlacePiece) {
      setFeedbackMsg({
        text: 'Chỉ được ghép mảnh khi đã trả lời chính xác câu hỏi trong lượt này!',
        isError: true,
      });
      return;
    }

    if (pieceId === targetSlotId) {
      // Correct snap!
      soundManager.playSnap();
      setFeedbackMsg({
        text: `Chính xác xuất sắc! Đội ${activeTeam.name} đã suy luận và ghép hoàn hảo mảnh ghép vào bức tranh!`,
        isError: false,
      });
      setSelectedPieceId(null);
      setDraggedPieceId(null);
      setWrongSlotId(null);
      onPiecePlaced(pieceId, activeTeam.id);
    } else {
      // Incorrect slot
      soundManager.playIncorrect();
      setWrongSlotId(targetSlotId);
      setTimeout(() => setWrongSlotId(null), 800);
      setFeedbackMsg({
        text: 'Chưa đúng vị trí! Hãy quan sát kỹ khớp răng cưa lồi/lõm và chi tiết tranh để thử lại nhé!',
        isError: true,
      });
      setHoveredSlotId(null);
    }
  };

  // Drag & drop
  const handleDragStart = (e: React.DragEvent, pieceId: number) => {
    if (!canPlacePiece) return;
    setDraggedPieceId(pieceId);
    setSelectedPieceId(pieceId);
    e.dataTransfer.setData('text/plain', String(pieceId));
  };

  const handleSlotDrop = (e: React.DragEvent, slotId: number) => {
    e.preventDefault();
    const pId = draggedPieceId !== null ? draggedPieceId : parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(pId)) {
      handleAttemptPlacement(slotId, pId);
    }
  };

  const handleSlotClick = (slotId: number) => {
    const slotPiece = pieces.find((p) => p.id === slotId);
    if (slotPiece?.isPlaced) return;

    if (currentActivePieceId !== null) {
      handleAttemptPlacement(slotId, currentActivePieceId);
    }
  };

  // Quick auto-place for teacher
  const handleTeacherQuickPlace = () => {
    if (currentActivePieceId !== null) {
      handleAttemptPlacement(currentActivePieceId, currentActivePieceId);
    }
  };

  // Filter unplaced pieces in scrambled order
  const scrambledUnplacedPieces = shuffledIds
    .map((id) => pieces.find((p) => p.id === id))
    .filter((p): p is PuzzlePiece => !!p && !p.isPlaced);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 select-none">
      {/* Turn & Status Header */}
      <div
        className={`p-4 rounded-3xl border-2 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 transition-all duration-300 ${
          isTeamA
            ? 'bg-slate-900/90 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.2)]'
            : 'bg-slate-900/90 border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-mono font-black text-xl shadow-lg border ${
              isTeamA
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_15px_#06b6d4]'
                : 'bg-rose-500 text-white border-rose-300 shadow-[0_0_15px_#f43f5e]'
            }`}
          >
            {isTeamA ? '1' : '2'}
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isTeamA ? 'bg-cyan-400' : 'bg-rose-400'} animate-pulse`} />
              QUYỀN GHÉP MẢNH TRANH
            </div>
            <h3
              className={`text-lg sm:text-xl font-black tracking-tight ${
                isTeamA ? 'text-cyan-300' : 'text-rose-300'
              }`}
            >
              Đội {activeTeam.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-700/80 flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono text-slate-300">Tiến độ bức tranh:</span>
            <span className="text-sm font-mono font-black text-amber-300">
              {placedCount} / {TOTAL_PIECES} Mảnh
            </span>
          </div>

          <button
            onClick={handleTeacherQuickPlace}
            title="Trợ giúp: Ghép nhanh mảnh vào đúng vị trí"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ghép nhanh</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center gap-2.5 shadow-md animate-in fade-in slide-in-from-top-1 ${
            feedbackMsg.isError
              ? 'bg-rose-950/80 border-rose-500/60 text-rose-200'
              : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
          }`}
        >
          {feedbackMsg.isError ? (
            <HelpCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Main Authentic Wooden Jigsaw Arena */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-[#3d1f08] bg-gradient-to-b from-[#693916] via-[#542d10] to-[#3a1d08] p-3 sm:p-6">
        {/* Wood grain pattern overlay */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, #000 0px, #000 2px, transparent 2px, transparent 6px)',
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-stretch gap-4 sm:gap-6">
          {/* Left Vertical Wooden Drawer / Tray for scrambled loose pieces */}
          <div className="w-full md:w-72 flex-shrink-0 flex flex-col justify-between bg-[#40200a]/80 border-2 border-[#7e461f]/60 rounded-2xl p-3 sm:p-4 backdrop-blur-sm shadow-inner">
            <div>
              {/* Tray Header */}
              <div className="flex items-center justify-between gap-1 mb-2.5 border-b border-[#7e461f]/40 pb-2">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-200/90">
                    MẢNH GHÉP LỘN XỘN
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleReshuffleTray}
                    title="Xáo trộn lại thứ tự các mảnh để học sinh tự suy nghĩ"
                    className="p-1.5 rounded-lg bg-[#52290c] hover:bg-[#6e3710] text-amber-300 border border-amber-500/40 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Xáo lại</span>
                  </button>
                  {unplacedPieces.length > 0 && (
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Còn {unplacedPieces.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Active loose piece preview slot */}
              {activeGeom && currentActivePieceId !== null ? (
                <div className="space-y-2">
                  <div
                    draggable={canPlacePiece}
                    onDragStart={(e) => handleDragStart(e, currentActivePieceId)}
                    className="relative aspect-square w-full rounded-xl bg-[#2a1406] border-2 border-amber-400/80 p-2 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)] group cursor-grab active:cursor-grabbing"
                    title="Kéo thả mảnh này lên ô trên bức tranh hoặc nhấp ô tương ứng"
                  >
                    {/* Render the piece with its authentic jigsaw cut shape */}
                    <svg
                      viewBox={`${activeGeom.minX - 10} ${activeGeom.minY - 10} ${
                        activeGeom.width + 20
                      } ${activeGeom.height + 20}`}
                      className="w-full h-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] filter transition-transform group-hover:scale-105"
                    >
                      <defs>
                        <clipPath id={`tray-clip-${currentActivePieceId}`}>
                          <path d={activeGeom.pathData} />
                        </clipPath>
                      </defs>

                      {/* Background silhouette */}
                      <path
                        d={activeGeom.pathData}
                        fill="#1a0c04"
                        stroke="#fbbf24"
                        strokeWidth="3"
                      />

                      {/* Clipped piece of the master painting */}
                      <image
                        href={mysteryImage.dataUrl}
                        x="0"
                        y="0"
                        width={BOARD_WIDTH}
                        height={BOARD_HEIGHT}
                        preserveAspectRatio="none"
                        clipPath={`url(#tray-clip-${currentActivePieceId})`}
                      />

                      {/* Highlight border */}
                      <path
                        d={activeGeom.pathData}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        strokeOpacity="0.8"
                      />
                    </svg>

                    {/* Badge: only shows number if teacher enabled showNumbers */}
                    {showNumbers ? (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur border border-amber-400/50 text-[11px] font-mono font-black text-amber-300 shadow">
                        #{currentActivePieceId + 1}
                      </div>
                    ) : (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur border border-amber-400/30 text-[10px] font-mono text-amber-200/80 shadow flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Mảnh bí ẩn</span>
                      </div>
                    )}

                    <div className="absolute bottom-2 inset-x-2 text-center bg-black/75 py-1 rounded text-[10px] font-bold text-amber-200">
                      Kéo thả hoặc Nhấp ô để ghép
                    </div>
                  </div>

                  {/* Pedagogical Clue to help students think without giving away the answer */}
                  {spatialClue && (
                    <div className="p-2.5 rounded-xl bg-[#2a1406]/90 border border-[#7e461f]/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          Gợi ý quan sát:
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${spatialClue.badgeClass}`}>
                          {spatialClue.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-100/80 leading-snug">
                        {spatialClue.detail}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square w-full rounded-xl bg-[#2a1406] border-2 border-dashed border-amber-400/30 flex flex-col items-center justify-center text-center p-3 text-amber-200/60 text-xs">
                  <Trophy className="w-8 h-8 text-amber-400 mb-1 animate-bounce" />
                  <span className="font-bold text-amber-200">ĐÃ HOÀN THÀNH!</span>
                  <span>Tất cả {TOTAL_PIECES} mảnh đã được ghép trọn vẹn</span>
                </div>
              )}

              {/* Scrambled Pieces Pool / Thumbnails Gallery */}
              {scrambledUnplacedPieces.length > 1 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-amber-200/80 block">
                      Các mảnh khác trong khay:
                    </span>
                    <span className="text-[9px] font-mono text-amber-300/60 italic">
                      (Xáo trộn ngẫu nhiên)
                    </span>
                  </div>

                  {/* Scrambled Mini Pieces Grid */}
                  <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {scrambledUnplacedPieces.map((p) => {
                      const isSelected = p.id === currentActivePieceId;
                      const g = JIGSAW_GEOMETRY[p.id];
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPieceId(p.id)}
                          draggable={canPlacePiece}
                          onDragStart={(e) => handleDragStart(e, p.id)}
                          className={`relative aspect-square p-1 rounded-lg border flex items-center justify-center transition-all cursor-pointer group ${
                            isSelected
                              ? 'bg-[#3b1d06] border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                              : 'bg-[#241004] hover:bg-[#341808] border-[#7e461f]/60 hover:border-amber-400/60'
                          }`}
                          title={showNumbers ? `Mảnh số ${p.id + 1}` : 'Nhấp để chọn mảnh này'}
                        >
                          {/* Mini SVG piece cutout */}
                          <svg
                            viewBox={`${g.minX - 5} ${g.minY - 5} ${g.width + 10} ${g.height + 10}`}
                            className="w-full h-full filter drop-shadow group-hover:scale-105 transition-transform"
                          >
                            <defs>
                              <clipPath id={`mini-clip-${p.id}`}>
                                <path d={g.pathData} />
                              </clipPath>
                            </defs>
                            <path d={g.pathData} fill="#1a0c04" />
                            <image
                              href={mysteryImage.dataUrl}
                              x="0"
                              y="0"
                              width={BOARD_WIDTH}
                              height={BOARD_HEIGHT}
                              preserveAspectRatio="none"
                              clipPath={`url(#mini-clip-${p.id})`}
                            />
                            <path
                              d={g.pathData}
                              fill="none"
                              stroke={isSelected ? '#fbbf24' : '#ffffff'}
                              strokeWidth={isSelected ? '2' : '1'}
                              strokeOpacity={isSelected ? '1' : '0.6'}
                            />
                          </svg>

                          {/* Only show piece number if showNumbers is turned on */}
                          {showNumbers && (
                            <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-black/80 font-mono text-[9px] font-black text-amber-300">
                              #{p.id + 1}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Hint & Number Controls */}
            <div className="mt-4 pt-3 border-t border-[#7e461f]/40 flex items-center gap-2">
              <button
                onClick={() => setShowHint(!showHint)}
                title="Bật/Tắt định vị ô cho mảnh đang chọn"
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                  showHint
                    ? 'bg-emerald-600 text-white shadow-[0_0_12px_#10b981]'
                    : 'bg-[#52290c] hover:bg-[#633310] text-amber-200 border border-amber-500/30'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                <span>{showHint ? 'Tắt gợi ý ô' : 'Gợi ý ô'}</span>
              </button>

              <button
                onClick={() => setShowNumbers(!showNumbers)}
                title="Bật/Tắt hiển thị số thứ tự 1-9"
                className={`px-3 py-2 rounded-xl flex items-center justify-center gap-1 font-bold text-xs transition-all cursor-pointer ${
                  showNumbers
                    ? 'bg-amber-600 text-white shadow-[0_0_10px_#f59e0b]'
                    : 'bg-[#52290c] hover:bg-[#633310] text-amber-300/80 border border-amber-500/30'
                }`}
              >
                {showNumbers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showNumbers ? 'Ẩn số 1-9' : 'Hiện số 1-9'}</span>
              </button>
            </div>
          </div>

          {/* Center Jigsaw Master Painting Canvas */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* The Master Puzzle Frame (Aspect ratio 3:2 for 900x600 board) */}
            <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden shadow-2xl border-4 border-[#2b1404] bg-[#1a0c03]">
              {/* Recessed wooden bevel inside frame */}
              <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.9)] pointer-events-none z-20" />

              {/* Master SVG Puzzle Board */}
              <svg
                viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
                className="w-full h-full block"
              >
                <defs>
                  {/* Clip paths for all 9 pieces */}
                  {JIGSAW_GEOMETRY.map((geom) => (
                    <clipPath key={geom.id} id={`jigsaw-clip-${geom.id}`}>
                      <path d={geom.pathData} />
                    </clipPath>
                  ))}

                  {/* Dark carved wood grain pattern for empty cavities */}
                  <pattern
                    id="puzzleWoodGrain"
                    width="60"
                    height="60"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="60" height="60" fill="#241105" />
                    <line
                      x1="0"
                      y1="0"
                      x2="60"
                      y2="0"
                      stroke="#2e1507"
                      strokeWidth="3"
                    />
                    <line
                      x1="0"
                      y1="30"
                      x2="60"
                      y2="30"
                      stroke="#1c0a02"
                      strokeWidth="2"
                    />
                  </pattern>

                  {/* Subtle cavity inner shadow filter */}
                  <filter id="cavityShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.8" />
                  </filter>
                </defs>

                {/* 1. LAYER: Empty Slots (Authentic Carved Cavities on Board) */}
                {JIGSAW_GEOMETRY.map((geom) => {
                  const piece = pieces.find((p) => p.id === geom.id);
                  const isPlaced = piece?.isPlaced;
                  if (isPlaced) return null;

                  const isHovered = hoveredSlotId === geom.id;
                  const isHintTarget = showHint && currentActivePieceId === geom.id;
                  const isWrong = wrongSlotId === geom.id;

                  return (
                    <g
                      key={`slot-${geom.id}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (canPlacePiece) setHoveredSlotId(geom.id);
                      }}
                      onDragLeave={() => setHoveredSlotId(null)}
                      onDrop={(e) => handleSlotDrop(e, geom.id)}
                      onClick={() => handleSlotClick(geom.id)}
                      className={`transition-all duration-200 ${
                        canPlacePiece ? 'cursor-pointer' : ''
                      }`}
                    >
                      {/* Recessed cavity cutout with authentic jigsaw interlocking edge */}
                      <path
                        d={geom.pathData}
                        fill={
                          isWrong
                            ? '#450a0a'
                            : isHovered
                            ? '#3d1d07'
                            : 'url(#puzzleWoodGrain)'
                        }
                        stroke={
                          isWrong
                            ? '#ef4444'
                            : isHintTarget
                            ? '#10b981'
                            : isHovered
                            ? '#fbbf24'
                            : '#3b1c08'
                        }
                        strokeWidth={isWrong || isHintTarget || isHovered ? 3.5 : 1.8}
                        strokeDasharray={isHovered ? '6,4' : undefined}
                      />

                      {/* Deep inner cavity shadow */}
                      <path
                        d={geom.pathData}
                        fill="none"
                        stroke="#000000"
                        strokeWidth="2"
                        strokeOpacity="0.7"
                      />

                      {/* Guide center dot & slot number: ONLY shown if teacher toggled showNumbers OR if isHintTarget */}
                      {(showNumbers || isHintTarget) && (
                        <g className="animate-in fade-in duration-300">
                          {isHintTarget && (
                            <circle
                              cx={geom.centerX}
                              cy={geom.centerY}
                              r={18}
                              fill="#10b981"
                              fillOpacity={0.6}
                              className="animate-ping"
                            />
                          )}
                          <circle
                            cx={geom.centerX}
                            cy={geom.centerY}
                            r={isHintTarget ? 15 : 11}
                            fill={isHintTarget ? '#10b981' : '#ea580c'}
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                          <text
                            x={geom.centerX}
                            y={geom.centerY + 4}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="11"
                            fontWeight="900"
                            fontFamily="monospace"
                            className="pointer-events-none select-none"
                          >
                            {geom.id + 1}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* 2. LAYER: Placed Pieces forming ONE SEAMLESS PAINTING */}
                {JIGSAW_GEOMETRY.map((geom) => {
                  const piece = pieces.find((p) => p.id === geom.id);
                  const isPlaced = piece?.isPlaced;
                  if (!isPlaced) return null;

                  const placedTeam = piece?.placedByTeam;

                  return (
                    <g key={`placed-${geom.id}`} className="transition-all duration-300">
                      {/* Clipped image for this piece */}
                      <image
                        href={mysteryImage.dataUrl}
                        x="0"
                        y="0"
                        width={BOARD_WIDTH}
                        height={BOARD_HEIGHT}
                        preserveAspectRatio="none"
                        clipPath={`url(#jigsaw-clip-${geom.id})`}
                      />

                      {/* Subtle authentic jigsaw cut line stroke between pieces */}
                      <path
                        d={geom.pathData}
                        fill="none"
                        stroke="#000000"
                        strokeWidth="1.6"
                        strokeOpacity="0.45"
                      />

                      {/* Subtle bevel highlight */}
                      <path
                        d={geom.pathData}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="0.8"
                        strokeOpacity="0.25"
                      />

                      {/* Discrete team placement badge on piece */}
                      <g
                        transform={`translate(${geom.centerX + 70}, ${
                          geom.centerY + 55
                        })`}
                        className="pointer-events-none select-none"
                      >
                        <rect
                          x="-22"
                          y="-10"
                          width="44"
                          height="20"
                          rx="6"
                          fill={placedTeam === 'teamA' ? '#0891b2' : '#e11d48'}
                          fillOpacity="0.9"
                          stroke="#ffffff"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="4"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {placedTeam === 'teamA' ? 'Đội 1' : 'Đội 2'}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* 3. Outer Wooden Frame Border */}
                <rect
                  x="0"
                  y="0"
                  width={BOARD_WIDTH}
                  height={BOARD_HEIGHT}
                  fill="none"
                  stroke="#2b1404"
                  strokeWidth="6"
                />
              </svg>

              {/* All pieces placed celebration overlay */}
              {placedCount === TOTAL_PIECES && (
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 via-transparent to-transparent pointer-events-none flex items-center justify-center animate-pulse">
                  <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-2xl border-2 border-amber-400 text-amber-300 font-mono font-black text-base sm:text-lg flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.6)]">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>BỨC TRANH ĐÃ ĐƯỢC GIẢI MÃ HOÀN TOÀN!</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status & Quick Action Bar */}
            <div className="w-full mt-3 px-2 flex flex-wrap items-center justify-between gap-2 text-amber-200/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-mono">
                  Bức tranh: <strong className="text-amber-100">{mysteryImage.title}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-300/80">
                  {canPlacePiece
                    ? 'Quan sát răng cưa và chi tiết tranh, Kéo thả hoặc Nhấp ô để ghép'
                    : 'Đội cần trả lời đúng câu hỏi để ghép mảnh'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
