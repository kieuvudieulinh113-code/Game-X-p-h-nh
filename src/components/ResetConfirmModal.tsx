import React, { useState } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  X,
  Sparkles,
  Check,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface ResetConfirmModalProps {
  isOpen: boolean;
  currentRound: number;
  placedPiecesCount: number;
  totalPieces: number;
  onConfirm: (options: { randomizeImage: boolean; resetTeamNames: boolean }) => void;
  onClose: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  currentRound,
  placedPiecesCount,
  totalPieces,
  onConfirm,
  onClose,
}) => {
  const [randomizeImage, setRandomizeImage] = useState(false);
  const [resetTeamNames, setResetTeamNames] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    soundManager.playCyberLaunch();
    onConfirm({ randomizeImage, resetTeamNames });
    onClose();
  };

  const handleCancel = () => {
    soundManager.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(244,63,94,0.3)] relative text-left text-white space-y-5 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 flex-shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.4)]">
            <RotateCcw className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                THIẾT LẬP LẠI TRẬN ĐẤU
              </span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">
              Bạn có chắc muốn chơi ván mới?
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Thao tác này sẽ đặt lại tiến trình thi đấu và cho phép 2 đội bắt đầu tranh tài lại từ Lượt 1.
            </p>
          </div>
        </div>

        {/* Current Match Status Preview Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 space-y-2">
          <div className="flex justify-between items-center text-[11px] font-mono font-bold text-slate-400 border-b border-slate-800/80 pb-1.5">
            <span>TIẾN ĐỘ HIỆN TẠI ĐƯỢC RESET:</span>
            <span className="text-amber-400">Đang ở Lượt #{currentRound}</span>
          </div>
          <ul className="space-y-1.5 text-slate-300 pl-1">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>
                Toàn bộ <strong className="text-white">{placedPiecesCount}/{totalPieces} mảnh ghép</strong> đã lật sẽ được úp lại hoàn toàn.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Điểm vận động &amp; số câu đúng của 2 đội sẽ trở về <strong className="text-white">0</strong>.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Ván đấu sẽ trở về trạng thái chuẩn bị Lượt 1.</span>
            </li>
          </ul>
        </div>

        {/* Options */}
        <div className="space-y-2.5 bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Tùy chọn cho ván mới:
          </span>

          <label className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-800/50 cursor-pointer transition-colors select-none">
            <input
              type="checkbox"
              checked={randomizeImage}
              onChange={(e) => setRandomizeImage(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700 focus:ring-rose-500 cursor-pointer"
            />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Đổi ngẫu nhiên bức tranh bí ẩn khác</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tự động chọn một bức tranh khác trong thư viện tranh để học sinh khám phá hình mới.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-800/50 cursor-pointer transition-colors select-none">
            <input
              type="checkbox"
              checked={resetTeamNames}
              onChange={(e) => setResetTeamNames(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700 focus:ring-rose-500 cursor-pointer"
            />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Đặt lại tên 2 đội về mặc định (Đội Xanh &amp; Đội Đỏ)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Nếu không chọn, tên 2 đội đã đặt trước đó vẫn sẽ được giữ nguyên.
              </p>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            id="btn-confirm-reset-game"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.5)] border border-rose-400/40 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>XÁC NHẬN CHƠI VÁN MỚI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
