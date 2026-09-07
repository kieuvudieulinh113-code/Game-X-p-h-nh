import { MysteryImage } from '../types';

// Crisp, high-resolution SVG illustrations for primary school education
// Converted to data URLs so they load reliably offline and without external assets

const SVG_COMPUTER_LAB = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="800" height="400">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="60%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <linearGradient id="deskGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  
  <!-- Classroom Wall & Floor -->
  <rect width="800" height="400" fill="url(#skyGrad)"/>
  <rect y="280" width="800" height="120" fill="#475569"/>
  <rect y="260" width="800" height="20" fill="#334155"/>

  <!-- Chalkboard / Smart Board -->
  <rect x="220" y="30" width="360" height="180" rx="12" fill="#065f46" stroke="#fbbf24" stroke-width="6"/>
  <text x="400" y="80" fill="#fef08a" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle">PHÒNG TIN HỌC VUI NHỘN</text>
  <text x="400" y="125" fill="#ffffff" font-family="sans-serif" font-size="18" text-anchor="middle">"Chăm ngoan - Sáng tạo - Yêu Công nghệ"</text>
  <text x="400" y="165" fill="#a7f3d0" font-family="sans-serif" font-size="15" text-anchor="middle">Lớp 3 &amp; Lớp 4 Chinh Phục Tri Thức</text>

  <!-- Left Computer Station -->
  <rect x="60" y="210" width="180" height="12" rx="4" fill="url(#deskGrad)" stroke="#64748b" stroke-width="2"/>
  <rect x="80" y="222" width="12" height="60" fill="#94a3b8"/>
  <rect x="208" y="222" width="12" height="60" fill="#94a3b8"/>
  <!-- Monitor Left -->
  <rect x="90" y="110" width="120" height="85" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="3"/>
  <rect x="96" y="116" width="108" height="73" rx="4" fill="url(#screenGrad)"/>
  <circle cx="150" cy="152" r="20" fill="#38bdf8" opacity="0.6"/>
  <!-- Robot Icon on Left Monitor -->
  <rect x="140" y="142" width="20" height="18" rx="3" fill="#ffffff"/>
  <circle cx="145" cy="148" r="2" fill="#0284c7"/>
  <circle cx="155" cy="148" r="2" fill="#0284c7"/>
  <rect x="143" y="195" width="14" height="15" fill="#64748b"/>
  <ellipse cx="150" cy="210" rx="24" ry="4" fill="#334155"/>
  <!-- Keyboard & Mouse Left -->
  <rect x="95" y="202" width="80" height="6" rx="2" fill="#cbd5e1" stroke="#64748b"/>
  <ellipse cx="195" cy="205" rx="7" ry="4" fill="#38bdf8"/>

  <!-- Right Computer Station -->
  <rect x="560" y="210" width="180" height="12" rx="4" fill="url(#deskGrad)" stroke="#64748b" stroke-width="2"/>
  <rect x="580" y="222" width="12" height="60" fill="#94a3b8"/>
  <rect x="708" y="222" width="12" height="60" fill="#94a3b8"/>
  <!-- Monitor Right -->
  <rect x="590" y="110" width="120" height="85" rx="6" fill="#1e293b" stroke="#f43f5e" stroke-width="3"/>
  <rect x="596" y="116" width="108" height="73" rx="4" fill="url(#screenGrad)"/>
  <circle cx="650" cy="152" r="20" fill="#f43f5e" opacity="0.6"/>
  <!-- Star on Right Monitor -->
  <polygon points="650,135 656,148 670,149 659,158 663,172 650,163 637,172 641,158 630,149 644,148" fill="#fbbf24"/>
  <rect x="643" y="195" width="14" height="15" fill="#64748b"/>
  <ellipse cx="650" cy="210" rx="24" ry="4" fill="#334155"/>
  <!-- Keyboard & Mouse Right -->
  <rect x="595" y="202" width="80" height="6" rx="2" fill="#cbd5e1" stroke="#64748b"/>
  <ellipse cx="695" cy="205" rx="7" ry="4" fill="#f43f5e"/>

  <!-- Cute friendly Mascot in Center -->
  <ellipse cx="400" cy="350" rx="70" ry="12" fill="#1e293b" opacity="0.3"/>
  <!-- Robot Body -->
  <rect x="350" y="230" width="100" height="100" rx="24" fill="#f8fafc" stroke="#6366f1" stroke-width="5"/>
  <!-- Screen Belly -->
  <rect x="365" y="250" width="70" height="50" rx="12" fill="#0f172a"/>
  <text x="400" y="282" fill="#4ade80" font-family="monospace" font-size="18" font-weight="bold" text-anchor="middle">&lt;AI&gt; 100%</text>
  <!-- Robot Head -->
  <rect x="360" y="150" width="80" height="70" rx="20" fill="#ffffff" stroke="#6366f1" stroke-width="5"/>
  <!-- Antenna -->
  <line x1="400" y1="150" x2="400" y2="125" stroke="#6366f1" stroke-width="4"/>
  <circle cx="400" cy="120" r="8" fill="#e11d48"/>
  <!-- Eyes -->
  <ellipse cx="380" cy="180" rx="8" ry="11" fill="#3b82f6"/>
  <circle cx="383" cy="177" r="3" fill="#ffffff"/>
  <ellipse cx="420" cy="180" rx="8" ry="11" fill="#3b82f6"/>
  <circle cx="423" cy="177" r="3" fill="#ffffff"/>
  <!-- Smiling Mouth -->
  <path d="M 385 202 Q 400 214 415 202" stroke="#4f46e5" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Cheeks -->
  <circle cx="373" cy="195" r="4" fill="#fda4af"/>
  <circle cx="427" cy="195" r="4" fill="#fda4af"/>
  <!-- Hands -->
  <circle cx="330" cy="275" r="14" fill="#818cf8"/>
  <circle cx="470" cy="275" r="14" fill="#818cf8"/>
  <path d="M 330 275 Q 315 255 320 240" stroke="#6366f1" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M 470 275 Q 485 255 480 240" stroke="#6366f1" stroke-width="6" fill="none" stroke-linecap="round"/>
</svg>
`)}`;

const SVG_SPACE_EXPLORER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="800" height="400">
  <defs>
    <linearGradient id="spaceGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#311042"/>
    </linearGradient>
    <linearGradient id="planetGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#ea580c"/>
    </linearGradient>
  </defs>

  <!-- Deep Space -->
  <rect width="800" height="400" fill="url(#spaceGrad)"/>

  <!-- Twinkling Stars -->
  <circle cx="50" cy="40" r="2" fill="#fff" opacity="0.9"/>
  <circle cx="120" cy="80" r="1.5" fill="#fff" opacity="0.7"/>
  <circle cx="210" cy="30" r="2" fill="#fef08a" opacity="0.9"/>
  <circle cx="340" cy="90" r="1" fill="#fff" opacity="0.6"/>
  <circle cx="480" cy="50" r="2.5" fill="#fff" opacity="0.95"/>
  <circle cx="620" cy="35" r="1.5" fill="#67e8f9" opacity="0.8"/>
  <circle cx="740" cy="80" r="2" fill="#fff" opacity="0.9"/>
  <circle cx="70" cy="190" r="1.5" fill="#fff" opacity="0.8"/>
  <circle cx="160" cy="240" r="2" fill="#fbcfe8" opacity="0.8"/>
  <circle cx="680" cy="260" r="2.5" fill="#fef08a" opacity="0.9"/>

  <!-- Giant Planet with Rings -->
  <circle cx="660" cy="140" r="70" fill="url(#planetGrad)"/>
  <ellipse cx="660" cy="140" rx="110" ry="24" fill="none" stroke="#fde047" stroke-width="8" opacity="0.7" transform="rotate(-15 660 140)"/>
  <ellipse cx="660" cy="140" rx="125" ry="28" fill="none" stroke="#f97316" stroke-width="4" opacity="0.5" transform="rotate(-15 660 140)"/>

  <!-- Earth in Distance -->
  <circle cx="140" cy="100" r="40" fill="#0284c7"/>
  <ellipse cx="130" cy="90" rx="14" ry="10" fill="#22c55e" opacity="0.8"/>
  <ellipse cx="155" cy="115" rx="16" ry="8" fill="#22c55e" opacity="0.8"/>
  <ellipse cx="125" cy="120" rx="8" ry="6" fill="#ffffff" opacity="0.6"/>

  <!-- Futuristic Space Shuttle / Rocket -->
  <g transform="translate(320, 110)">
    <!-- Rocket exhaust fire -->
    <polygon points="50,160 80,160 65,220" fill="#f97316"/>
    <polygon points="55,160 75,160 65,195" fill="#fde047"/>
    <!-- Wings -->
    <polygon points="20,130 50,100 50,150" fill="#3b82f6"/>
    <polygon points="110,130 80,100 80,150" fill="#3b82f6"/>
    <!-- Body -->
    <ellipse cx="65" cy="90" rx="25" ry="65" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
    <!-- Tip -->
    <path d="M 40 40 Q 65 0 90 40 Z" fill="#ef4444"/>
    <!-- Porthole window -->
    <circle cx="65" cy="70" r="14" fill="#38bdf8" stroke="#0284c7" stroke-width="3"/>
    <circle cx="62" cy="67" r="4" fill="#ffffff"/>
    <text x="65" y="115" font-family="sans-serif" font-weight="bold" font-size="9" fill="#1e293b" text-anchor="middle">VIETNAM</text>
  </g>

  <!-- Big Title Banner -->
  <rect x="180" y="320" width="440" height="56" rx="28" fill="#1e1b4b" stroke="#ec4899" stroke-width="3"/>
  <text x="400" y="356" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="800" text-anchor="middle" letter-spacing="1">🚀 KHÁM PHÁ VŨ TRỤ CÔNG NGHỆ</text>
</svg>
`)}`;

export const DEFAULT_MYSTERY_IMAGES: MysteryImage[] = [
  {
    id: 'img_computer_lab',
    title: 'Phòng thực hành Tin học tương lai',
    dataUrl: SVG_COMPUTER_LAB,
    description: 'Bức tranh chú robot vui nhộn trong phòng học Tin học hiện đại.',
    isDefault: true,
  },
  {
    id: 'img_space_explorer',
    title: 'Khám phá vũ trụ công nghệ',
    dataUrl: SVG_SPACE_EXPLORER,
    description: 'Tàu vũ trụ mang cờ Việt Nam khám phá các vì sao và hành tinh.',
    isDefault: true,
  }
];
