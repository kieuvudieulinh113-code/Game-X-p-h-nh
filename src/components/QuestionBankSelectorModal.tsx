import React, { useState, useRef } from 'react';
import { QuestionBank, Question, GradeLevel } from '../types';
import { extractTextFromFile, parseQuestionsFromText } from '../utils/fileParser';
import { soundManager } from '../utils/audio';
import {
  BookOpen,
  Upload,
  Search,
  Check,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  AlertTriangle,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Flame,
} from 'lucide-react';

interface QuestionBankSelectorModalProps {
  questionBanks: QuestionBank[];
  currentBankId: string;
  onSelectQuestionBank: (bankId: string) => void;
  onSaveQuestionBank: (bank: QuestionBank) => void;
  onDeleteQuestionBank: (bankId: string) => void;
  onClose: () => void;
}

export const QuestionBankSelectorModal: React.FC<QuestionBankSelectorModalProps> = ({
  questionBanks,
  currentBankId,
  onSelectQuestionBank,
  onSaveQuestionBank,
  onDeleteQuestionBank,
  onClose,
}) => {
  const [gradeFilter, setGradeFilter] = useState<'all' | 'lop3' | 'lop4' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewingBankId, setPreviewingBankId] = useState<string | null>(null);

  // Quick Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<Question[] | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadGrade, setUploadGrade] = useState<GradeLevel>('lop3');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filtered Banks
  const filteredBanks = questionBanks.filter((bank) => {
    // Grade filter
    if (gradeFilter === 'lop3' && bank.grade !== 'lop3') return false;
    if (gradeFilter === 'lop4' && bank.grade !== 'lop4') return false;
    if (gradeFilter === 'custom' && bank.isDefault) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = bank.title.toLowerCase().includes(q);
      const matchDesc = bank.description?.toLowerCase().includes(q);
      const matchQ = bank.questions.some((item) => item.text.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchQ;
    }
    return true;
  });

  // Upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadError(null);

    try {
      const text = await extractTextFromFile(file);
      const questions = parseQuestionsFromText(text);

      if (questions.length === 0) {
        throw new Error(
          'Không tìm thấy câu hỏi trắc nghiệm hợp lệ trong file. Vui lòng kiểm tra định dạng (ví dụ: Câu 1: ... A. ... B. ... C. ... D. ...).'
        );
      }

      setParsedQuestions(questions);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      soundManager.playCorrect();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi đọc file tài liệu.';
      setUploadError(msg);
      soundManager.playIncorrect();
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Save parsed bank
  const handleSaveBank = () => {
    if (!parsedQuestions || parsedQuestions.length === 0) return;

    const unconfirmed = parsedQuestions.filter((q) => q.needsConfirmation);
    if (unconfirmed.length > 0) {
      setUploadError(
        `Còn ${unconfirmed.length} câu hỏi chưa xác nhận rõ đáp án đúng. Hãy kiểm tra các câu hỏi màu cam trước khi lưu.`
      );
      soundManager.playIncorrect();
      return;
    }

    const newBank: QuestionBank = {
      id: 'bank_' + Date.now(),
      title: uploadTitle.trim() || 'Bộ câu hỏi mới tải lên',
      grade: uploadGrade,
      description: `Bộ gồm ${parsedQuestions.length} câu trắc nghiệm được thầy cô tải lên.`,
      questions: parsedQuestions,
      createdAt: Date.now(),
    };

    onSaveQuestionBank(newBank);
    onSelectQuestionBank(newBank.id);
    setParsedQuestions(null);
    setUploadTitle('');
    soundManager.playSnap();
  };

  const lop3Count = questionBanks.filter((b) => b.grade === 'lop3').length;
  const lop4Count = questionBanks.filter((b) => b.grade === 'lop4').length;
  const customCount = questionBanks.filter((b) => !b.isDefault).length;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-5xl w-full border border-cyan-500/40 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-950 border-b border-cyan-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500 text-slate-950 flex items-center justify-center font-black shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-300">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Kho &amp; Lựa Chọn Bộ Câu Hỏi Cho Học Sinh
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700">
                  {questionBanks.length} Bộ sẵn có
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Thầy cô có thể tải lên nhiều bộ câu hỏi (Word, PDF) và tự do chọn bộ đề phù hợp cho lượt thi đấu.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Quick Upload Toolbar */}
        <div className="p-4 sm:px-6 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Grade filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setGradeFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                gradeFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)] font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Tất cả ({questionBanks.length})
            </button>
            <button
              onClick={() => setGradeFilter('lop3')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                gradeFilter === 'lop3'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)] font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Tin học Lớp 3 ({lop3Count})
            </button>
            <button
              onClick={() => setGradeFilter('lop4')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                gradeFilter === 'lop4'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)] font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Tin học Lớp 4 ({lop4Count})
            </button>
            <button
              onClick={() => setGradeFilter('custom')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                gradeFilter === 'custom'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)] font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Tự tải lên ({customCount})
            </button>
          </div>

          {/* Right actions: Search + Upload trigger */}
          <div className="flex items-center gap-2.5 flex-1 sm:flex-none justify-end">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bộ câu hỏi..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl pl-9 pr-3 py-2 focus:border-cyan-400 focus:outline-none placeholder:text-slate-500"
              />
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow flex items-center gap-1.5 flex-shrink-0 cursor-pointer border border-cyan-400/30"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Đang đọc...' : 'Tải lên bộ mới (.docx / .pdf)'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Upload Error banner */}
          {uploadError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs font-semibold flex items-center gap-2 shadow">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Pending Parsed Upload Review */}
          {parsedQuestions && (
            <div className="bg-amber-950/40 border-2 border-amber-500/60 p-4 sm:p-5 rounded-2xl space-y-3 animate-in fade-in shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-200">
                      Đã trích xuất thành công: {parsedQuestions.length} câu hỏi trắc nghiệm!
                    </h3>
                    <p className="text-xs text-amber-300/80">
                      Đặt tên và chọn khối lớp để lưu vĩnh viễn vào danh sách bộ câu hỏi.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Tên bộ câu hỏi..."
                    className="px-3 py-1.5 text-xs font-bold bg-slate-900 border border-amber-500/50 rounded-xl text-white"
                  />
                  <select
                    value={uploadGrade}
                    onChange={(e) => setUploadGrade(e.target.value as GradeLevel)}
                    className="px-2.5 py-1.5 text-xs font-bold bg-slate-900 border border-amber-500/50 rounded-xl text-white"
                  >
                    <option value="lop3">Tin học Lớp 3</option>
                    <option value="lop4">Tin học Lớp 4</option>
                    <option value="khac">Khối khác</option>
                  </select>
                  <button
                    onClick={handleSaveBank}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu &amp; Chọn Chơi Ngay</span>
                  </button>
                  <button
                    onClick={() => setParsedQuestions(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBanks.map((bank) => {
              const isActive = bank.id === currentBankId;
              const isPreviewing = previewingBankId === bank.id;
              const gradeLabel =
                bank.grade === 'lop3'
                  ? 'Tin học Lớp 3'
                  : bank.grade === 'lop4'
                  ? 'Tin học Lớp 4'
                  : 'Tiểu học';

              return (
                <div
                  key={bank.id}
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all backdrop-blur-md ${
                    isActive
                      ? 'bg-slate-950 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-2 ring-cyan-400/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                            bank.grade === 'lop3'
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                              : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                          }`}
                        >
                          {gradeLabel}
                        </span>
                        {!bank.isDefault && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                            Tự tải lên
                          </span>
                        )}
                      </div>

                      {isActive && (
                        <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 flex items-center gap-1 shadow-[0_0_10px_#06b6d4]">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ĐANG DÙNG CHO TIẾT HỌC
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-black text-white leading-snug">
                      {bank.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {bank.description || 'Bộ câu hỏi rèn luyện kiến thức Tin học cho học sinh.'}
                    </p>

                    {/* Metadata stats */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1 text-cyan-300">
                        <FileText className="w-3.5 h-3.5" />
                        <strong>{bank.questions.length}</strong> câu hỏi
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(bank.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    {/* Question List Preview */}
                    {isPreviewing && (
                      <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 max-h-56 overflow-y-auto pr-1">
                        <div className="text-[11px] font-mono uppercase text-slate-400 mb-1">
                          Danh sách câu hỏi trong bộ:
                        </div>
                        {bank.questions.map((q, idx) => (
                          <div
                            key={q.id || idx}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                          >
                            <div className="font-bold text-slate-200">
                              Câu {idx + 1}: {q.text}
                            </div>
                            <div className="mt-1 text-[11px] text-emerald-400 font-semibold">
                              ✓ Đáp án đúng: {q.options[q.correctOptionIndex]}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() =>
                        setPreviewingBankId(isPreviewing ? null : bank.id)
                      }
                      className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {isPreviewing ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Thu gọn</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Xem {bank.questions.length} câu</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      {!bank.isDefault && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Bạn có chắc muốn xóa bộ câu hỏi "${bank.title}" không?`
                              )
                            ) {
                              onDeleteQuestionBank(bank.id);
                              soundManager.playClick();
                            }
                          }}
                          className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/50 transition-all cursor-pointer"
                          title="Xóa bộ câu hỏi này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {isActive ? (
                        <button
                          disabled
                          className="px-4 py-2 rounded-xl bg-cyan-950 text-cyan-300 font-bold text-xs border border-cyan-800 flex items-center gap-1.5 cursor-default"
                        >
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                          <span>Đang hoạt động</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            soundManager.playCyberTick(900, true);
                            onSelectQuestionBank(bank.id);
                            onClose();
                          }}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs shadow flex items-center gap-1.5 transition-all transform hover:scale-105 cursor-pointer border border-cyan-400/40"
                        >
                          <Flame className="w-3.5 h-3.5 text-amber-300" />
                          <span>CHỌN BỘ NÀY CHO HỌC SINH</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredBanks.length === 0 && (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <BookOpen className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-semibold">
                Không tìm thấy bộ câu hỏi nào phù hợp với bộ lọc hiện tại.
              </p>
              <button
                onClick={() => {
                  setGradeFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs text-cyan-400 underline cursor-pointer"
              >
                Xóa bộ lọc &amp; xem tất cả
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 bg-slate-950 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              Bộ đang thi đấu:{' '}
              <strong className="text-white">
                {questionBanks.find((b) => b.id === currentBankId)?.title}
              </strong>
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer"
          >
            Đóng bảng chọn
          </button>
        </div>
      </div>
    </div>
  );
};
