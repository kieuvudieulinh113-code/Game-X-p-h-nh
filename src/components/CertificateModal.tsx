import React, { useRef } from 'react';
import { Team, MysteryImage } from '../types';
import { TOTAL_PIECES } from '../utils/imageSlice';
import { Award, Printer, Download, X, CheckCircle2, Star } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface CertificateModalProps {
  winningTeam: Team;
  mysteryImage: MysteryImage;
  dateStr: string;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  winningTeam,
  mysteryImage,
  dateStr,
  onClose,
}) => {
  const certRef = useRef<HTMLDivElement | null>(null);

  const handlePrint = () => {
    soundManager.playClick();
    window.print();
  };

  const handleDownloadImage = () => {
    soundManager.playClick();
    // Render the certificate to a downloadable canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background gradient: warm parchment gold
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 800);
    bgGrad.addColorStop(0, '#fefce8');
    bgGrad.addColorStop(1, '#fffbeb');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 800);

    // Outer decorative border
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, 1140, 740);

    // Inner gold border
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.strokeRect(46, 46, 1108, 708);

    // Header text
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRÒ CHƠI HỌC TẬP TIN HỌC TIỂU HỌC', 600, 110);

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('★ CHINH PHỤC MẢNH GHÉP ★', 600, 140);

    // Main Title
    ctx.fillStyle = '#dc2626';
    ctx.font = '900 58px sans-serif';
    ctx.fillText('GIẤY KHEN', 600, 225);

    ctx.fillStyle = '#451a03';
    ctx.font = 'italic 24px sans-serif';
    ctx.fillText('Nhiệt liệt biểu dương và trao tặng danh hiệu Quán quân cho:', 600, 280);

    // Team Name
    ctx.fillStyle = '#1e3a8a';
    ctx.font = '900 48px sans-serif';
    ctx.fillText(winningTeam.name.toUpperCase(), 600, 355);

    // Commendation text
    ctx.fillStyle = '#374151';
    ctx.font = '22px sans-serif';
    ctx.fillText(
      'Đã xuất sắc hoàn thành vận động thể chất, trả lời đúng các câu hỏi Tin học',
      600,
      415
    );
    ctx.fillText(
      `và xuất sắc ghép thành công mảnh ghép thứ 8 của bức tranh "${mysteryImage.title}"`,
      600,
      450
    );

    // Achievement box
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(320, 480, 560, 90);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(320, 480, 560, 90);

    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(
      `★ Mảnh ghép: ${winningTeam.piecesCollected}/${TOTAL_PIECES}    ★ Điểm vận động: ${winningTeam.motionScoreTotal}    ★ Câu đúng: ${winningTeam.correctAnswersCount}`,
      600,
      535
    );

    // Signatures row
    ctx.font = 'italic 20px sans-serif';
    ctx.fillStyle = '#4b5563';
    ctx.fillText(`Ngày ${dateStr}`, 900, 630);

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#1f2937';
    ctx.fillText('BAN TỔ CHỨC HỘI THI', 900, 665);
    ctx.font = 'italic 18px sans-serif';
    ctx.fillText('(Giáo viên bộ môn Tin học ký tên)', 900, 715);

    // Download file
    const link = document.createElement('a');
    link.download = `Giay-Khen-${winningTeam.name.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base">Giấy Khen Điện Tử Đội Chiến Thắng</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
            >
              <Printer className="w-4 h-4" />
              <span>In Giấy Khen</span>
            </button>
            <button
              onClick={handleDownloadImage}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Download className="w-4 h-4" />
              <span>Lưu Ảnh (PNG)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Viewable Certificate Sheet */}
        <div className="p-4 sm:p-8 bg-slate-100 overflow-y-auto flex items-center justify-center">
          <div
            ref={certRef}
            id="printable-certificate"
            className="w-full max-w-2xl bg-amber-50 border-[10px] border-amber-600 outline outline-4 outline-amber-400 p-6 sm:p-10 rounded-2xl shadow-xl text-center relative selection:bg-amber-200 print:shadow-none print:m-0 print:w-full"
          >
            {/* Corner ornaments */}
            <div className="absolute top-2 left-2 text-amber-600 font-serif text-2xl">✤</div>
            <div className="absolute top-2 right-2 text-amber-600 font-serif text-2xl">✤</div>
            <div className="absolute bottom-2 left-2 text-amber-600 font-serif text-2xl">✤</div>
            <div className="absolute bottom-2 right-2 text-amber-600 font-serif text-2xl">✤</div>

            {/* Emblem icon */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-4 border-amber-600 mx-auto flex items-center justify-center text-amber-900 shadow-md mb-2">
              <Star className="w-8 h-8 fill-amber-700 text-amber-700" />
            </div>

            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-amber-800">
              TRÒ CHƠI HỌC TẬP TIN HỌC TIỂU HỌC
            </p>
            <p className="text-xs font-semibold text-amber-700 tracking-wider mb-2">
              « CHINH PHỤC MẢNH GHÉP »
            </p>

            <h1 className="text-3xl sm:text-4xl font-black text-rose-600 tracking-tight my-2">
              GIẤY KHEN
            </h1>

            <p className="text-sm font-medium text-slate-700 italic">
              Trao tặng danh hiệu Đội Quán Quân xuất sắc nhất cho:
            </p>

            <div className="my-4 py-2 px-6 bg-amber-100/80 border-y-2 border-amber-300 inline-block">
              <h2 className="text-2xl sm:text-3xl font-black text-blue-900 tracking-wide">
                {winningTeam.name.toUpperCase()}
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 max-w-lg mx-auto leading-relaxed mb-4">
              Đã xuất sắc hoàn thành xuất sắc các lượt vận động thể chất, trả lời đúng các câu hỏi trắc nghiệm Tin học và ghép hoàn chỉnh mảnh thứ 8 của bức tranh bí ẩn:{' '}
              <strong className="text-slate-900">"{mysteryImage.title}"</strong>.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 bg-white/90 p-3 rounded-xl border border-amber-300 max-w-md mx-auto mb-6 text-xs">
              <div>
                <span className="text-slate-500 block">Số mảnh ghép</span>
                <strong className="text-amber-800 text-sm">{winningTeam.piecesCollected} / {TOTAL_PIECES}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Điểm vận động</span>
                <strong className="text-amber-800 text-sm">{winningTeam.motionScoreTotal} điểm</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Số câu đúng</span>
                <strong className="text-amber-800 text-sm">{winningTeam.correctAnswersCount} câu</strong>
              </div>
            </div>

            {/* Signature & Date */}
            <div className="flex justify-between items-end text-xs text-slate-600 pt-2 border-t border-amber-200">
              <div className="text-left">
                <span className="block font-semibold">TẬP THỂ LỚP</span>
                <span className="italic text-[11px]">Tin học 3 &amp; 4</span>
              </div>

              <div className="text-right">
                <p className="italic text-[11px]">Ngày {dateStr}</p>
                <p className="font-bold text-slate-800 text-xs mt-0.5">TRƯỞNG BAN TỔ CHỨC</p>
                <p className="italic text-[11px] text-slate-400 mt-6">(Giáo viên bộ môn ký duyệt)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
