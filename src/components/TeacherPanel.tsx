import React, { useState, useRef } from 'react';
import {
  QuestionBank,
  MysteryImage,
  Question,
  GradeLevel,
} from '../types';
import { extractTextFromFile, parseQuestionsFromText } from '../utils/fileParser';
import { compressAndResizeImage } from '../utils/imageSlice';
import { soundManager } from '../utils/audio';
import {
  YouTubeMusicConfig,
  loadYouTubeMusicConfig,
  saveYouTubeMusicConfig,
  extractYouTubeVideoId,
  YOUTUBE_PRESETS,
} from '../utils/youtube';
import { YouTubePlayer } from './YouTubePlayer';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Sliders,
  Check,
  HardDrive,
  Eye,
  BookOpen,
  Clock,
  Timer,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Play,
  Music,
  Radio,
  ExternalLink,
  RotateCcw,
  Link2,
} from 'lucide-react';

interface TeacherPanelProps {
  questionBanks: QuestionBank[];
  currentBankId: string;
  mysteryImages: MysteryImage[];
  currentImageId: string;
  answerTimeLimit: number;
  motionDuration?: number;
  initialTab?: 'questions' | 'images' | 'settings';
  onSelectQuestionBank: (bankId: string) => void;
  onSaveQuestionBank: (bank: QuestionBank) => void;
  onDeleteQuestionBank: (bankId: string) => void;
  onSelectMysteryImage: (imageId: string) => void;
  onSaveMysteryImage: (image: MysteryImage) => void;
  onDeleteMysteryImage: (imageId: string) => void;
  onUpdateAnswerTimeLimit: (seconds: number) => void;
  onUpdateMotionDuration?: (seconds: number) => void;
  onClose: () => void;
}

export const TeacherPanel: React.FC<TeacherPanelProps> = ({
  questionBanks,
  currentBankId,
  mysteryImages,
  currentImageId,
  answerTimeLimit,
  motionDuration = 10,
  initialTab = 'questions',
  onSelectQuestionBank,
  onSaveQuestionBank,
  onDeleteQuestionBank,
  onSelectMysteryImage,
  onSaveMysteryImage,
  onDeleteMysteryImage,
  onUpdateAnswerTimeLimit,
  onUpdateMotionDuration,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'images' | 'settings'>(initialTab);
  const [motionAudioSetting, setMotionAudioSetting] = useState<boolean>(() => {
    return localStorage.getItem('cpmg_motion_audio') !== 'false';
  });

  // YouTube Background Music Settings
  const [ytConfig, setYtConfig] = useState<YouTubeMusicConfig>(() => loadYouTubeMusicConfig());
  const [customYtUrlInput, setCustomYtUrlInput] = useState(ytConfig.url);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [ytInputFeedback, setYtInputFeedback] = useState<string | null>(null);

  const handleUpdateYtConfig = (newConfig: YouTubeMusicConfig) => {
    setYtConfig(newConfig);
    saveYouTubeMusicConfig(newConfig);
  };

  const handleApplyCustomUrl = () => {
    const videoId = extractYouTubeVideoId(customYtUrlInput);
    if (!videoId) {
      setYtInputFeedback('Link YouTube không hợp lệ! Vui lòng kiểm tra lại đường dẫn.');
      return;
    }
    const updated: YouTubeMusicConfig = {
      ...ytConfig,
      url: customYtUrlInput.trim(),
      videoId,
      title: ytConfig.title || 'Nhạc Nền Tự Chọn',
    };
    handleUpdateYtConfig(updated);
    setYtInputFeedback('Đã nhận diện thành công mã video YouTube: ' + videoId);
    setTimeout(() => setYtInputFeedback(null), 4000);
  };

  // Question file upload & preview state
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedPreviewQuestions, setParsedPreviewQuestions] = useState<Question[] | null>(null);
  const [previewBankTitle, setPreviewBankTitle] = useState('');
  const [previewGrade, setPreviewGrade] = useState<GradeLevel>('lop3');
  const [isParsing, setIsParsing] = useState(false);

  // Manual Question Editing inside active bank
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingNewQ, setIsAddingNewQ] = useState(false);

  // Mystery Image upload state
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [previewImageSlice, setPreviewImageSlice] = useState<string | null>(null);
  const [newImageTitle, setNewImageTitle] = useState('');

  // Storage usage estimate
  const getStorageEstimate = () => {
    let totalBytes = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += (localStorage[key].length + key.length) * 2;
      }
    }
    const kb = (totalBytes / 1024).toFixed(1);
    const mb = (totalBytes / (1024 * 1024)).toFixed(2);
    return { kb, mb, percent: Math.min(100, (totalBytes / (5 * 1024 * 1024)) * 100) };
  };

  const storageInfo = getStorageEstimate();

  const activeBank = questionBanks.find((b) => b.id === currentBankId) || questionBanks[0];
  const activeImage = mysteryImages.find((img) => img.id === currentImageId) || mysteryImages[0];

  // File Upload for Question Bank (Word .docx or PDF or txt)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setUploadError(null);

    try {
      const text = await extractTextFromFile(file);
      const questions = parseQuestionsFromText(text);

      if (questions.length === 0) {
        throw new Error(
          'Không tìm thấy câu hỏi nào hợp lệ trong file. Vui lòng kiểm tra định dạng câu hỏi (Ví dụ: "Câu 1: ... A. ... B. ... C. ... D. ...").'
        );
      }

      setParsedPreviewQuestions(questions);
      setPreviewBankTitle(file.name.replace(/\.[^/.]+$/, ''));
      soundManager.playCorrect();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi trích xuất file.';
      setUploadError(msg);
      soundManager.playIncorrect();
    } finally {
      setIsParsing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Confirm and Save Uploaded Question Bank
  const handleSaveUploadedBank = () => {
    if (!parsedPreviewQuestions || parsedPreviewQuestions.length === 0) return;

    // Check if any question still requires confirmation
    const unconfirmed = parsedPreviewQuestions.filter((q) => q.needsConfirmation);
    if (unconfirmed.length > 0) {
      setUploadError(
        `Còn ${unconfirmed.length} câu hỏi chưa được giáo viên xác nhận đáp án đúng. Vui lòng kiểm tra các câu có nhãn màu cam bên dưới trước khi lưu!`
      );
      soundManager.playIncorrect();
      return;
    }

    const newBank: QuestionBank = {
      id: 'bank_' + Date.now(),
      title: previewBankTitle.trim() || 'Bộ câu hỏi mới tải lên',
      grade: previewGrade,
      description: `Gồm ${parsedPreviewQuestions.length} câu trắc nghiệm được trích xuất từ file.`,
      questions: parsedPreviewQuestions,
      createdAt: Date.now(),
    };

    onSaveQuestionBank(newBank);
    onSelectQuestionBank(newBank.id);
    setParsedPreviewQuestions(null);
    setPreviewBankTitle('');
    soundManager.playCorrect();
  };

  // Image Upload handler
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploadError(null);

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setImageUploadError('Vui lòng chọn ảnh định dạng JPG, PNG hoặc WebP.');
      return;
    }

    try {
      const compressedDataUrl = await compressAndResizeImage(file);
      setPreviewImageSlice(compressedDataUrl);
      setNewImageTitle(file.name.replace(/\.[^/.]+$/, ''));
      soundManager.playCorrect();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi đọc file ảnh.';
      setImageUploadError(msg);
      soundManager.playIncorrect();
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Confirm and save uploaded image
  const handleSaveUploadedImage = () => {
    if (!previewImageSlice) return;

    try {
      const newImg: MysteryImage = {
        id: 'img_' + Date.now(),
        title: newImageTitle.trim() || 'Tranh bí ẩn mới',
        dataUrl: previewImageSlice,
        description: 'Tranh do giáo viên tải lên.',
      };

      onSaveMysteryImage(newImg);
      onSelectMysteryImage(newImg.id);
      setPreviewImageSlice(null);
      setNewImageTitle('');
      soundManager.playCorrect();
    } catch {
      setImageUploadError('Vượt giới hạn dung lượng lưu trữ trình duyệt (localStorage). Vui lòng xóa bớt tranh cũ hoặc chọn ảnh nhẹ hơn.');
      soundManager.playIncorrect();
    }
  };

  // Save manual question edit/create
  const handleSaveQuestion = (q: Question) => {
    if (!activeBank) return;

    let updatedQuestions = [...activeBank.questions];
    if (isAddingNewQ) {
      updatedQuestions.push(q);
    } else {
      updatedQuestions = updatedQuestions.map((item) => (item.id === q.id ? q : item));
    }

    onSaveQuestionBank({
      ...activeBank,
      questions: updatedQuestions,
    });

    setEditingQuestion(null);
    setIsAddingNewQ(false);
    soundManager.playCorrect();
  };

  const handleDeleteQuestion = (qId: string) => {
    if (!activeBank) return;
    if (activeBank.questions.length <= 1) {
      alert('Bộ câu hỏi cần có ít nhất 1 câu!');
      return;
    }

    const updatedQuestions = activeBank.questions.filter((q) => q.id !== qId);
    onSaveQuestionBank({
      ...activeBank,
      questions: updatedQuestions,
    });
    soundManager.playClick();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black shadow">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold">Bảng Quản Lý Dành Cho Giáo Viên</h2>
              <p className="text-xs text-slate-400">
                Tải file câu hỏi, quản lý tranh bí ẩn 8 mảnh và cài đặt trận đấu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 gap-2">
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'questions'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm -mb-px rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bộ câu hỏi trắc nghiệm</span>
          </button>

          <button
            onClick={() => setActiveTab('images')}
            className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'images'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm -mb-px rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Tranh bí ẩn (Lưới 4×2)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm -mb-px rounded-t-xl'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Cài đặt thời gian</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: QUESTIONS */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              {/* Top: Upload Box & Active Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Select Bank */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Chọn bộ câu hỏi đang thi đấu:
                  </label>
                  <select
                    value={currentBankId}
                    onChange={(e) => onSelectQuestionBank(e.target.value)}
                    className="w-full text-sm font-bold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    {questionBanks.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.grade === 'lop3' ? 'Lớp 3' : b.grade === 'lop4' ? 'Lớp 4' : 'Tiểu học'}]{' '}
                        {b.title} ({b.questions.length} câu)
                      </option>
                    ))}
                  </select>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Số câu hiện có: <strong>{activeBank?.questions.length || 0}</strong></span>
                    {!activeBank?.isDefault && (
                      <button
                        onClick={() => onDeleteQuestionBank(activeBank.id)}
                        className="text-rose-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa bộ này
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload Word / PDF file */}
                <div className="md:col-span-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-indigo-950 flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-indigo-600" />
                        Tải lên file câu hỏi Word (.docx) hoặc PDF
                      </h4>
                      <p className="text-xs text-indigo-800/80 mt-1">
                        Xử lý trực tiếp trong trình duyệt, tự động nhận diện câu hỏi, phương án A-B-C-D và đáp án đúng.
                      </p>
                    </div>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsing}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isParsing ? 'Đang đọc...' : 'Chọn file Word / PDF'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.pdf,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {uploadError && (
                    <div className="mt-3 p-2.5 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Question Banks Quick Gallery */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    Kho bộ câu hỏi đã lưu ({questionBanks.length} bộ)
                  </h4>
                  <span className="text-xs text-slate-500">
                    Bấm vào bộ bất kỳ để chuyển sang bộ đó cho học sinh thi đấu
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {questionBanks.map((b) => {
                    const isSelected = b.id === currentBankId;
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          onSelectQuestionBank(b.id);
                          soundManager.playClick();
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              b.grade === 'lop3'
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {b.grade === 'lop3' ? 'Lớp 3' : b.grade === 'lop4' ? 'Lớp 4' : 'Tiểu học'}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-black text-indigo-600 flex items-center gap-0.5">
                              <Check className="w-3 h-3 stroke-[3]" />
                              Đang chọn
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight">
                          {b.title}
                        </div>
                        <div className="mt-1.5 text-[11px] text-slate-500 flex items-center justify-between">
                          <span>{b.questions.length} câu</span>
                          {!b.isDefault && (
                            <span className="text-[10px] text-amber-600 font-semibold">Tự tải lên</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Parsed Preview Table before saving */}
              {parsedPreviewQuestions && (
                <div className="bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-300 animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                        <Eye className="w-4 h-4 text-amber-600" />
                        Bản xem trước trích xuất ({parsedPreviewQuestions.length} câu)
                      </span>
                      <p className="text-xs text-amber-800 mt-0.5">
                        {parsedPreviewQuestions.some((q) => q.needsConfirmation)
                          ? `Có ${parsedPreviewQuestions.filter((q) => q.needsConfirmation).length} câu cần xác nhận. Các câu có đáp án sẵn đã được tự động nhận diện.`
                          : `Tuyệt vời! Toàn bộ ${parsedPreviewQuestions.length} câu đã được tự động nhận diện đáp án chính xác.`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={previewBankTitle}
                        onChange={(e) => setPreviewBankTitle(e.target.value)}
                        placeholder="Tên bộ câu hỏi..."
                        className="px-3 py-1.5 text-xs font-bold bg-white border border-amber-300 rounded-lg"
                      />
                      <select
                        value={previewGrade}
                        onChange={(e) => setPreviewGrade(e.target.value as GradeLevel)}
                        className="px-2 py-1.5 text-xs font-bold bg-white border border-amber-300 rounded-lg"
                      >
                        <option value="lop3">Tin học Lớp 3</option>
                        <option value="lop4">Tin học Lớp 4</option>
                        <option value="khac">Khác</option>
                      </select>
                      <button
                        onClick={handleSaveUploadedBank}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Xác nhận &amp; Lưu bộ này</span>
                      </button>
                      <button
                        onClick={() => setParsedPreviewQuestions(null)}
                        className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>

                  {/* Questions list preview */}
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-2">
                    {parsedPreviewQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border bg-white ${
                          q.needsConfirmation ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-extrabold text-xs text-slate-900">
                                Câu {idx + 1}:
                              </span>
                              {q.needsConfirmation ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Cần giáo viên chọn đáp án đúng!
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Tự động nhận diện: {String.fromCharCode(65 + q.correctOptionIndex)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-slate-800">{q.text}</p>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-slate-600">
                              {q.options.map((opt, oIdx) => (
                                <div
                                  key={oIdx}
                                  className={`p-1.5 rounded-lg border ${
                                    q.correctOptionIndex === oIdx
                                      ? 'bg-emerald-50 border-emerald-500 font-bold text-emerald-800'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Teacher confirmation dropdown */}
                          <div className="text-right flex-shrink-0">
                            <span className="text-[10px] text-slate-500 block mb-1">Đáp án đúng:</span>
                            <select
                              value={q.correctOptionIndex}
                              onChange={(e) => {
                                const newCorrect = parseInt(e.target.value, 10);
                                setParsedPreviewQuestions((prev) =>
                                  prev
                                    ? prev.map((item, i) =>
                                        i === idx
                                          ? { ...item, correctOptionIndex: newCorrect, needsConfirmation: false }
                                          : item
                                      )
                                    : null
                                );
                              }}
                              className="text-xs font-black p-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900"
                            >
                              {q.options.map((_, oIdx) => (
                                <option key={oIdx} value={oIdx}>
                                  Phương án {String.fromCharCode(65 + oIdx)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Bank Questions List & Manual Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <span>Danh sách câu hỏi trong bộ: <strong>{activeBank?.title}</strong></span>
                    <span className="text-xs text-slate-500 font-normal">
                      ({activeBank?.questions.length} câu)
                    </span>
                  </h4>

                  <button
                    onClick={() => {
                      setIsAddingNewQ(true);
                      setEditingQuestion({
                        id: 'q_' + Date.now(),
                        text: '',
                        options: ['', '', '', ''],
                        correctOptionIndex: 0,
                      });
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-indigo-200"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm câu hỏi mới
                  </button>
                </div>

                {/* Edit / Create Question Form Modal */}
                {editingQuestion && (
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-900">
                        {isAddingNewQ ? 'Thêm câu hỏi mới' : 'Chỉnh sửa câu hỏi'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingQuestion(null);
                          setIsAddingNewQ(false);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Hủy
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Nội dung câu hỏi:
                      </label>
                      <textarea
                        value={editingQuestion.text}
                        onChange={(e) =>
                          setEditingQuestion({ ...editingQuestion, text: e.target.value })
                        }
                        placeholder="Nhập nội dung câu hỏi..."
                        className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-300 rounded-xl"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {editingQuestion.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <span className="w-6 font-black text-xs text-slate-600 text-center">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...editingQuestion.options];
                              newOpts[oIdx] = e.target.value;
                              setEditingQuestion({ ...editingQuestion, options: newOpts });
                            }}
                            placeholder={`Phương án ${String.fromCharCode(65 + oIdx)}`}
                            className="flex-1 text-xs font-medium p-2 bg-white border border-slate-300 rounded-lg"
                          />
                          <input
                            type="radio"
                            name="correctOpt"
                            checked={editingQuestion.correctOptionIndex === oIdx}
                            onChange={() =>
                              setEditingQuestion({ ...editingQuestion, correctOptionIndex: oIdx })
                            }
                            className="w-4 h-4 text-emerald-600"
                            title="Chọn làm đáp án đúng"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => handleSaveQuestion(editingQuestion)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow"
                      >
                        Lưu câu hỏi
                      </button>
                    </div>
                  </div>
                )}

                {/* Questions List */}
                <div className="space-y-2">
                  {activeBank?.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-extrabold text-indigo-700">
                            Câu {idx + 1}:
                          </span>
                          <span className="text-xs font-bold text-slate-800">{q.text}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1.5 text-[11px]">
                          {q.options.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              className={`px-2 py-1 rounded truncate ${
                                q.correctOptionIndex === oIdx
                                  ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setIsAddingNewQ(false);
                            setEditingQuestion(q);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100"
                          title="Sửa câu hỏi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MYSTERY IMAGES */}
          {activeTab === 'images' && (
            <div className="space-y-6">
              {/* Storage Quota Monitor */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <HardDrive className="w-4 h-4 text-indigo-600" />
                  <span>
                    Dung lượng bộ nhớ cục bộ (localStorage): <strong>{storageInfo.kb} KB</strong> / ~5 MB
                  </span>
                </div>
                <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full"
                    style={{ width: `${storageInfo.percent}%` }}
                  />
                </div>
              </div>

              {/* Upload Box */}
              <div className="bg-indigo-50/50 p-4 sm:p-5 rounded-2xl border border-indigo-200">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-black text-indigo-950 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-indigo-600" />
                      Tải ảnh bức tranh bí ẩn mới (JPG, PNG, WebP)
                    </h4>
                    <p className="text-xs text-indigo-800/80 mt-1">
                      Ảnh sẽ tự động chia thành đúng 8 mảnh theo lưới 4 cột × 2 hàng.
                    </p>
                  </div>

                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Chọn file ảnh từ máy</span>
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </div>

                {imageUploadError && (
                  <div className="mt-2 p-2 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{imageUploadError}</span>
                  </div>
                )}

                {/* Preview sliced 4x2 grid before saving */}
                {previewImageSlice && (
                  <div className="mt-4 p-4 bg-white rounded-2xl border border-indigo-300 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">Tên bức tranh:</span>
                        <input
                          type="text"
                          value={newImageTitle}
                          onChange={(e) => setNewImageTitle(e.target.value)}
                          placeholder="Ví dụ: Vườn bách thú kỳ thú..."
                          className="px-3 py-1 text-xs font-bold border border-slate-300 rounded-lg"
                        />
                      </div>

                      <button
                        onClick={handleSaveUploadedImage}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Xác nhận &amp; Lưu tranh này</span>
                      </button>
                    </div>

                    {/* Sliced 4x2 preview */}
                    <div className="w-full max-w-lg mx-auto aspect-[2/1] rounded-xl overflow-hidden border-2 border-indigo-400 relative shadow">
                      <img
                        src={previewImageSlice}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      {/* Grid overlay */}
                      <div className="absolute inset-0 grid grid-cols-4 grid-rows-2 pointer-events-none">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <div
                            key={n}
                            className="border border-white/60 flex items-center justify-center"
                          >
                            <span className="text-xs font-black text-white bg-black/50 px-1.5 py-0.5 rounded">
                              Mảnh {n}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Existing Mystery Images Library */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Kho tranh bí ẩn hiện có ({mysteryImages.length} tranh)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {mysteryImages.map((img) => {
                    const isSelected = img.id === currentImageId;
                    return (
                      <div
                        key={img.id}
                        className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="aspect-[2/1] rounded-xl overflow-hidden border border-slate-200 mb-2 relative">
                            <img
                              src={img.dataUrl}
                              alt={img.title}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                                ĐANG DÙNG
                              </div>
                            )}
                          </div>
                          <h5 className="text-sm font-extrabold text-slate-800 truncate">
                            {img.title}
                          </h5>
                          <p className="text-xs text-slate-500 line-clamp-1">{img.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                          <button
                            onClick={() => onSelectMysteryImage(img.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isSelected ? 'Đang chọn' : 'Chọn tranh này'}
                          </button>

                          {!img.isDefault && (
                            <button
                              onClick={() => onDeleteMysteryImage(img.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                              title="Xóa tranh này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GAME SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6 py-2">
              {/* SECTION 1: QUESTION ANSWER COUNTDOWN TIME */}
              <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-200 space-y-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                      <Timer className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <span>Số giây đếm ngược trả lời câu hỏi</span>
                        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-black border border-indigo-200">
                          ĐANG CHỌN: {answerTimeLimit}S
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Thời gian để đội thắng vận động suy nghĩ, thảo luận và chọn đáp án A, B, C, D trước khi hết lượt.
                      </p>
                    </div>
                  </div>

                  {/* Audio tick test button */}
                  <button
                    onClick={() => {
                      soundManager.playCyberTick(800);
                      setTimeout(() => soundManager.playCyberTick(850), 300);
                      setTimeout(() => soundManager.playCyberTick(900, true), 600);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5 transition-all flex-shrink-0"
                    title="Nghe thử âm thanh đếm ngược"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    <span className="hidden sm:inline">Nghe thử âm đếm nhịp</span>
                  </button>
                </div>

                {/* Big Visual Display & Direct Steppers */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex flex-col items-center justify-center shadow-lg font-mono">
                      <span className="text-2xl font-black leading-none">{answerTimeLimit}</span>
                      <span className="text-[10px] font-bold uppercase opacity-80 mt-0.5">Giây</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {answerTimeLimit <= 10 && '⚡ Tốc độ tia chớp - Thử thách phản xạ nhanh'}
                        {answerTimeLimit > 10 && answerTimeLimit <= 20 && '⭐ Tiêu chuẩn - Thích hợp nhất cho học sinh'}
                        {answerTimeLimit > 20 && answerTimeLimit <= 35 && '📖 Thư thái - Đủ thời gian đọc câu hỏi dài'}
                        {answerTimeLimit > 35 && '👥 Thảo luận nhóm sâu / Bài tập tính toán'}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Đồng hồ hiển thị dạng vòng tròn vi tính với hiệu ứng cảnh báo 5 giây cuối.
                      </p>
                    </div>
                  </div>

                  {/* Direct Number Input and + / - Steppers */}
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => onUpdateAnswerTimeLimit(Math.max(5, answerTimeLimit - 5))}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-black text-xs rounded-lg border border-slate-300 transition-colors shadow-sm"
                      title="Giảm 5 giây"
                    >
                      -5s
                    </button>
                    <button
                      onClick={() => onUpdateAnswerTimeLimit(Math.max(5, answerTimeLimit - 1))}
                      className="px-2 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-black text-xs rounded-lg border border-slate-300 transition-colors shadow-sm"
                      title="Giảm 1 giây"
                    >
                      -1s
                    </button>

                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={answerTimeLimit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          onUpdateAnswerTimeLimit(Math.max(5, Math.min(180, val)));
                        }
                      }}
                      className="w-14 text-center font-mono font-black text-sm py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />

                    <button
                      onClick={() => onUpdateAnswerTimeLimit(Math.min(180, answerTimeLimit + 1))}
                      className="px-2 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-black text-xs rounded-lg border border-slate-300 transition-colors shadow-sm"
                      title="Tăng 1 giây"
                    >
                      +1s
                    </button>
                    <button
                      onClick={() => onUpdateAnswerTimeLimit(Math.min(180, answerTimeLimit + 5))}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-black text-xs rounded-lg border border-slate-300 transition-colors shadow-sm"
                      title="Tăng 5 giây"
                    >
                      +5s
                    </button>
                  </div>
                </div>

                {/* Range Slider */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                    <span>5 giây</span>
                    <span>15s</span>
                    <span>20s (Gợi ý)</span>
                    <span>30s</span>
                    <span>60s</span>
                    <span>120 giây</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={1}
                    value={answerTimeLimit}
                    onChange={(e) => onUpdateAnswerTimeLimit(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Quick Selection Buttons */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                    Hoặc bấm chọn nhanh mốc giây mong muốn:
                  </label>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                    {[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => {
                          onUpdateAnswerTimeLimit(sec);
                          soundManager.playClick();
                        }}
                        className={`py-2 rounded-xl font-mono font-bold text-xs border transition-all ${
                          answerTimeLimit === sec
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-black scale-105 ring-2 ring-indigo-300'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-300'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 2: MOTION TIME LIMIT SETTINGS (CÀI ĐẶT THỜI GIAN VẬN ĐỘNG - KHÔNG CỐ ĐỊNH 10S) */}
              <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white flex items-center justify-center font-bold shadow-md shadow-cyan-200 font-mono text-sm">
                      <Zap className="w-5 h-5 text-cyan-200" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Thời gian vận động của học sinh trước camera
                      </h4>
                      <p className="text-xs text-slate-500">
                        Tùy chỉnh số giây đếm ngược để học sinh thi đua vận động (mặc định 10s, có thể chọn 5s - 60s).
                      </p>
                    </div>
                  </div>

                  {/* Direct Number Input and + / - Steppers */}
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => onUpdateMotionDuration && onUpdateMotionDuration(Math.max(5, motionDuration - 5))}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-black text-xs rounded-lg border border-slate-300 transition-colors shadow-sm cursor-pointer"
                      title="Giảm 5 giây"
                    >
                      -5s
                    </button>
                    <button
                      onClick={() => onUpdateMotionDuration && onUpdateMotionDuration(Math.max(3, motionDuration - 1))}
                      className="px-2 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-black text-xs rounded-lg border border-slate-300 transition-colors shadow-sm cursor-pointer"
                      title="Giảm 1 giây"
                    >
                      -1s
                    </button>

                    <input
                      type="number"
                      min={3}
                      max={120}
                      value={motionDuration}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && onUpdateMotionDuration) {
                          onUpdateMotionDuration(Math.max(3, Math.min(120, val)));
                        }
                      }}
                      className="w-14 text-center font-mono font-black text-sm py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />

                    <button
                      onClick={() => onUpdateMotionDuration && onUpdateMotionDuration(Math.min(120, motionDuration + 1))}
                      className="px-2 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-black text-xs rounded-lg border border-slate-300 transition-colors shadow-sm cursor-pointer"
                      title="Tăng 1 giây"
                    >
                      +1s
                    </button>
                    <button
                      onClick={() => onUpdateMotionDuration && onUpdateMotionDuration(Math.min(120, motionDuration + 5))}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-200 text-slate-700 font-black text-xs rounded-lg border border-slate-300 transition-colors shadow-sm cursor-pointer"
                      title="Tăng 5 giây"
                    >
                      +5s
                    </button>
                  </div>
                </div>

                {/* Range Slider */}
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                    <span>5 giây</span>
                    <span>10s (Chuẩn)</span>
                    <span>15s</span>
                    <span>20s</span>
                    <span>30s</span>
                    <span>60 giây</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={motionDuration}
                    onChange={(e) => onUpdateMotionDuration && onUpdateMotionDuration(Number(e.target.value))}
                    className="w-full accent-cyan-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Quick Selection Buttons */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                    Bấm chọn nhanh mốc thời gian vận động:
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {[
                      { sec: 5, label: '5s (Nhanh)' },
                      { sec: 10, label: '10s (Chuẩn)' },
                      { sec: 15, label: '15s (Hăng say)' },
                      { sec: 20, label: '20s (Sôi nổi)' },
                      { sec: 30, label: '30s (Năng lượng)' },
                      { sec: 45, label: '45s' },
                      { sec: 60, label: '60s' },
                    ].map(({ sec, label }) => (
                      <button
                        key={sec}
                        onClick={() => {
                          if (onUpdateMotionDuration) onUpdateMotionDuration(sec);
                          soundManager.playClick();
                        }}
                        className={`py-2 px-1 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer text-center ${
                          motionDuration === sec
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-md font-black scale-105 ring-2 ring-cyan-300'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-cyan-50 hover:border-cyan-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 3: YOUTUBE BACKGROUND MUSIC FOR MOTION (ĐẨY NHẠC NỀN YOUTUBE KHI VẬN ĐỘNG) */}
              <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-200 space-y-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-200">
                      <Music className="w-6 h-6 fill-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                          Nhạc Nền YouTube Khi Học Sinh Vận Động
                        </h4>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          YOUTUBE AUDIO
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tự động phát nhạc từ link YouTube khi học sinh bước vào {motionDuration} giây vận động (thay thế tiếng ting ting hoặc tiếng bass).
                      </p>
                    </div>
                  </div>

                  {/* Master Toggle */}
                  <button
                    onClick={() => {
                      const updated = { ...ytConfig, enabled: !ytConfig.enabled };
                      handleUpdateYtConfig(updated);
                      soundManager.playClick();
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
                      ytConfig.enabled
                        ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {ytConfig.enabled ? (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>BẬT NHẠC YOUTUBE</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4" />
                        <span>ĐÃ TẮT</span>
                      </>
                    )}
                  </button>
                </div>

                {/* URL Input & Verification */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-red-500" />
                      Dán đường link YouTube bài hát mong muốn:
                    </span>
                    {ytConfig.videoId && (
                      <span className="text-[10px] font-mono text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ID: {ytConfig.videoId}
                      </span>
                    )}
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customYtUrlInput}
                      onChange={(e) => setCustomYtUrlInput(e.target.value)}
                      placeholder="Dán link (https://www.youtube.com/watch?v=... hoặc https://youtu.be/...)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={handleApplyCustomUrl}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                    >
                      <Check className="w-4 h-4" />
                      <span>Áp dụng link</span>
                    </button>
                  </div>

                  {ytInputFeedback && (
                    <p
                      className={`text-xs font-medium ${
                        ytInputFeedback.includes('không hợp lệ') ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {ytInputFeedback}
                    </p>
                  )}
                </div>

                {/* 1-Click Preset Suggestions */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                    Hoặc chọn nhanh bài hát khởi động thể dục vui nhộn có sẵn:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {YOUTUBE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setCustomYtUrlInput(preset.url);
                          handleUpdateYtConfig({
                            ...ytConfig,
                            url: preset.url,
                            videoId: preset.videoId,
                            title: preset.title,
                            startOffset: preset.startOffset,
                          });
                          soundManager.playClick();
                        }}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          ytConfig.videoId === preset.videoId
                            ? 'bg-red-50 border-red-400 ring-2 ring-red-200 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              {preset.category}
                            </span>
                            {ytConfig.videoId === preset.videoId && (
                              <CheckCircle2 className="w-4 h-4 text-red-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs font-extrabold line-clamp-1">{preset.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{preset.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume, Offset & Mute Synth settings */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200">
                  {/* Volume Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                        Âm lượng nhạc nền:
                      </label>
                      <span className="text-xs font-mono font-bold text-red-600">
                        {ytConfig.volume}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={ytConfig.volume}
                      onChange={(e) =>
                        handleUpdateYtConfig({ ...ytConfig, volume: Number(e.target.value) })
                      }
                      className="w-full accent-red-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Start Offset */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                        Phát từ giây thứ:
                      </label>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {ytConfig.startOffset}s
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 10, 15, 30].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => handleUpdateYtConfig({ ...ytConfig, startOffset: sec })}
                          className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold border ${
                            ytConfig.startOffset === sec
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mute Synth Checkbox */}
                  <div className="flex flex-col justify-center">
                    <label className="flex items-start gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={ytConfig.muteSynthAudio}
                        onChange={(e) =>
                          handleUpdateYtConfig({ ...ytConfig, muteSynthAudio: e.target.checked })
                        }
                        className="mt-1 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                      />
                      <span className="text-xs text-slate-700 font-bold leading-tight">
                        Tắt tiếng "ting ting" &amp; "tiếng bass" điện tử (chỉ nghe trọn vẹn nhạc nền YouTube)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Embedded Live Test Player Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-600">
                    <span>Nghe thử và kiểm tra âm thanh trước khi vào trận:</span>
                    <a
                      href={`https://www.youtube.com/watch?v=${ytConfig.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-red-600 hover:text-red-700 flex items-center gap-1 text-xs"
                    >
                      <span>Mở link gốc YouTube</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <YouTubePlayer
                    config={ytConfig}
                    isPlaying={isTestingAudio}
                    onConfigChange={handleUpdateYtConfig}
                  />
                </div>
              </div>

              {/* SECTION 3: RULES SUMMARY */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Quy tắc tính điểm &amp; Chiến thắng:
                </span>
                <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                  <li>Vận động {motionDuration} giây qua camera: Bụng, đầu, tay, chân di chuyển sẽ được nhận diện và cộng điểm năng lượng liên tục.</li>
                  <li>Đội có điểm năng lượng cao hơn sẽ giành quyền trả lời câu hỏi trong số giây đã cài đặt bên trên.</li>
                  <li>Trả lời đúng được lật mở 1 mảnh tranh bí ẩn. Đội ghép đúng mảnh thứ 8 (mảnh cuối) sẽ là Đội Quán Quân!</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
