export interface YouTubePreset {
  id: string;
  videoId: string;
  title: string;
  category: string;
  url: string;
  startOffset: number;
  description: string;
}

export interface YouTubeMusicConfig {
  enabled: boolean;
  url: string;
  videoId: string;
  title: string;
  volume: number; // 0 - 100
  startOffset: number; // seconds
  muteSynthAudio: boolean; // Mute synthetic "ting ting" and bass sounds when YouTube music is on
}

export const YOUTUBE_PRESETS: YouTubePreset[] = [
  {
    id: 'aerobic-fun',
    videoId: '7zp1TbLFPp8',
    title: 'Nhạc Khởi Động Aerobic Thiếu Nhi Cực Bốc',
    category: 'Vui nhộn',
    url: 'https://www.youtube.com/watch?v=7zp1TbLFPp8',
    startOffset: 0,
    description: 'Nhịp điệu tươi vui, kích thích học sinh nhún nhảy toàn thân',
  },
  {
    id: 'gameshow-epic',
    videoId: '3gK_2XdjOdY',
    title: 'Nhạc Đếm Ngược Gameshow 10 Giây Kịch Tính',
    category: 'Kịch tính',
    url: 'https://www.youtube.com/watch?v=3gK_2XdjOdY',
    startOffset: 0,
    description: 'Âm hưởng gameshow truyền hình hồi hộp, đếm ngược dồn dập',
  },
  {
    id: 'edm-energy',
    videoId: 'n8X9_MgEdCg',
    title: 'EDM Thể Dục Năng Lượng Cao (High Energy Beat)',
    category: 'Năng động',
    url: 'https://www.youtube.com/watch?v=n8X9_MgEdCg',
    startOffset: 15,
    description: 'Bass sôi động, phong cách thể thao hiện đại bùng nổ',
  },
  {
    id: 'festival-drum',
    videoId: 'kJQP7ki4-Y0',
    title: 'Trống Hội Hào Hùng Cổ Vũ Thi Đấu',
    category: 'Cổ vũ',
    url: 'https://www.youtube.com/watch?v=kJQP7ki4-Y0',
    startOffset: 0,
    description: 'Tiếng trống giòn giã khích lệ tinh thần thi đua của 2 đội',
  },
  {
    id: 'kids-remix',
    videoId: '04854XqcfCY',
    title: 'Nhạc Thiếu Nhi Remix Bắt Tai Rộn Ràng',
    category: 'Dễ thương',
    url: 'https://www.youtube.com/watch?v=04854XqcfCY',
    startOffset: 0,
    description: 'Giai điệu quen thuộc, dễ vận động theo nhịp',
  },
];

export function extractYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle standard, short, embed, shorts, music, and mobile links
  const patterns = [
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
    /\/embed\/([\w-]{11})/,
    /\/shorts\/([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

const STORAGE_KEY = 'cpmg_youtube_music_config';

export const DEFAULT_YT_CONFIG: YouTubeMusicConfig = {
  enabled: true,
  url: 'https://www.youtube.com/watch?v=7zp1TbLFPp8',
  videoId: '7zp1TbLFPp8',
  title: 'Nhạc Khởi Động Aerobic Thiếu Nhi Cực Bốc',
  volume: 85,
  startOffset: 0,
  muteSynthAudio: true, // User requested: mute "ting ting" and synth bass in favor of YouTube music
};

export function loadYouTubeMusicConfig(): YouTubeMusicConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_YT_CONFIG,
        ...parsed,
      };
    }
  } catch {
    // ignore parse error
  }
  return DEFAULT_YT_CONFIG;
}

export function saveYouTubeMusicConfig(config: YouTubeMusicConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage error
  }
}
