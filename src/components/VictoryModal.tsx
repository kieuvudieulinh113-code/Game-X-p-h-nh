import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Team, MysteryImage } from '../types';
import { TOTAL_PIECES } from '../utils/imageSlice';
import { soundManager } from '../utils/audio';
import { CertificateModal } from './CertificateModal';
import {
  Trophy,
  Award,
  Sparkles,
  RotateCcw,
  Settings,
  Puzzle,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface VictoryModalProps {
  winningTeam: Team;
  teams: [Team, Team];
  mysteryImage: MysteryImage;
  onPlayAgain: () => void;
  onChangeImageAndBank: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winningTeam,
  teams,
  mysteryImage,
  onPlayAgain,
  onChangeImageAndBank,
}) => {
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    soundManager.playFanfare();

    // Trigger colorful confetti fireworks
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, []);

  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${now.getFullYear()}`;

  const isTeamA = winningTeam.id === 'teamA';

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden text-center animate-in zoom-in-95 duration-300">
          {/* Header Banner */}
          <div
            className={`p-6 sm:p-8 text-white relative overflow-hidden ${
              isTeamA
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                : 'bg-gradient-to-tr from-rose-600 to-amber-600'
            }`}
          >
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur mx-auto flex items-center justify-center mb-3 shadow-lg ring-4 ring-white/30 animate-bounce">
              <Trophy className="w-10 h-10 text-amber-300" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white font-extrabold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Chúc mừng Đội Quán Quân</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-2">
              {winningTeam.name.toUpperCase()}!
            </h2>
            <p className="text-sm sm:text-base text-white/90 max-w-lg mx-auto">
              Đã xuất sắc ghép thành công mảnh ghép thứ 8 và giải mã trọn vẹn bức tranh bí ẩn!
            </p>
          </div>

          {/* Full Secret Picture Revealed */}
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                <Puzzle className="w-4 h-4 text-indigo-600" />
                <span>Bức tranh bí ẩn đã được mở hoàn toàn:</span>
                <strong className="text-slate-800">{mysteryImage.title}</strong>
              </div>

              <div className="w-full max-w-xl mx-auto aspect-[2/1] rounded-2xl overflow-hidden shadow-lg border-4 border-amber-300 relative group">
                <img
                  src={mysteryImage.dataUrl}
                  alt={mysteryImage.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Match Statistics Table for Both Teams */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                Bảng tổng kết thành tích 2 đội
              </h4>
              <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                {teams.map((t) => {
                  const isWinner = t.id === winningTeam.id;
                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        isWinner
                          ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-extrabold text-sm sm:text-base text-slate-800 truncate">
                          {t.name}
                        </span>
                        {isWinner && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-500 text-white">
                            VÔ ĐỊCH
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span className="flex items-center gap-1">
                            <Puzzle className="w-3.5 h-3.5 text-indigo-500" />
                            Mảnh ghép:
                          </span>
                          <strong className="text-slate-900 font-black">{t.piecesCollected} / {TOTAL_PIECES}</strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Câu đúng:
                          </span>
                          <strong className="text-slate-900 font-black">{t.correctAnswersCount}</strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            Điểm vận động:
                          </span>
                          <strong className="text-slate-900 font-black">{t.motionScoreTotal}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                id="btn-open-certificate"
                onClick={() => {
                  soundManager.playClick();
                  setShowCertificate(true);
                }}
                className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-amber-200 transition-transform transform hover:scale-105"
              >
                <Award className="w-5 h-5" />
                <span>XEM &amp; IN GIẤY KHEN ĐIỆN TỬ</span>
              </button>

              <button
                id="btn-play-again"
                onClick={onPlayAgain}
                className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-sm sm:text-base flex items-center gap-2 transition-transform transform hover:scale-105"
              >
                <RotateCcw className="w-5 h-5" />
                <span>CHƠI LẠI VÁN MỚI</span>
              </button>

              <button
                id="btn-change-image-bank"
                onClick={onChangeImageAndBank}
                className="px-4 py-3.5 rounded-2xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm sm:text-base flex items-center gap-2 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Đổi tranh &amp; Bộ câu hỏi</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertificate && (
        <CertificateModal
          winningTeam={winningTeam}
          mysteryImage={mysteryImage}
          dateStr={dateStr}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </>
  );
};
