import React, { useEffect, useRef, useState } from 'react';
import {
  YouTubeMusicConfig,
  extractYouTubeVideoId,
  YOUTUBE_PRESETS,
} from '../utils/youtube';
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Radio,
  Video,
  VideoOff,
  ListMusic,
  Check,
} from 'lucide-react';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayerProps {
  config: YouTubeMusicConfig;
  isPlaying: boolean;
  restartKey?: string | number;
  onConfigChange?: (newConfig: YouTubeMusicConfig) => void;
  compactMode?: boolean;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  config,
  isPlaying,
  restartKey,
  onConfigChange,
  compactMode = false,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<any>(null);
  const [isApiReady, setIsApiReady] = useState(false);
  // Show/hide song selection panel or video preview (does NOT unmount iframe)
  const [showPresetsPanel, setShowPresetsPanel] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [localMute, setLocalMute] = useState(false);
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused' | 'buffering' | 'idle'>('idle');

  const validVideoId = extractYouTubeVideoId(config.url) || config.videoId || '7zp1TbLFPp8';

  // Load YouTube IFrame API once globally
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.YT) {
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        setIsApiReady(true);
      };
    } else if (window.YT && window.YT.Player) {
      setIsApiReady(true);
    }
  }, []);

  // PostMessage fallback for maximum reliability
  const sendIframeCommand = (func: string, args: any[] = []) => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch {
      // ignore postMessage error
    }
  };

  // Initialize YT Player once iframe and API are ready
  useEffect(() => {
    if (!isApiReady || !window.YT || !iframeRef.current) return;

    try {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }

      playerRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onReady: (event: any) => {
            const vol = localMute ? 0 : config.volume;
            try {
              event.target.setVolume(vol);
              if (isPlaying && config.enabled) {
                if (config.startOffset > 0) {
                  event.target.seekTo(config.startOffset, true);
                }
                event.target.playVideo();
                setPlaybackState('playing');
              }
            } catch {
              // ignore
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              setPlaybackState('playing');
            } else if (event.data === 2) {
              setPlaybackState('paused');
            } else if (event.data === 3) {
              setPlaybackState('buffering');
            } else if (event.data === 0) {
              // Video ended -> loop back
              try {
                event.target.seekTo(config.startOffset || 0, true);
                event.target.playVideo();
              } catch {
                // ignore
              }
            }
          },
        },
      });
    } catch {
      // fallback to postMessage
    }

    return () => {
      // cleanup
    };
  }, [isApiReady, validVideoId]);

  // Sync Play / Pause based on isPlaying and config.enabled
  useEffect(() => {
    if (!config.enabled) {
      if (playerRef.current?.pauseVideo) {
        playerRef.current.pauseVideo();
      }
      sendIframeCommand('pauseVideo');
      setPlaybackState('paused');
      return;
    }

    if (isPlaying) {
      if (playerRef.current?.playVideo) {
        if (config.startOffset > 0) {
          playerRef.current.seekTo(config.startOffset, true);
        }
        playerRef.current.setVolume(localMute ? 0 : config.volume);
        playerRef.current.playVideo();
      }
      sendIframeCommand('seekTo', [config.startOffset || 0, true]);
      sendIframeCommand('setVolume', [localMute ? 0 : config.volume]);
      sendIframeCommand('playVideo');
      setPlaybackState('playing');
    } else {
      if (playerRef.current?.pauseVideo) {
        playerRef.current.pauseVideo();
      }
      sendIframeCommand('pauseVideo');
      setPlaybackState('paused');
    }
  }, [isPlaying, config.enabled, config.startOffset, restartKey]);

  // Sync Volume
  useEffect(() => {
    const vol = localMute ? 0 : config.volume;
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(vol);
    }
    sendIframeCommand('setVolume', [vol]);
  }, [config.volume, localMute]);

  const handleManualToggle = () => {
    if (playbackState === 'playing') {
      if (playerRef.current?.pauseVideo) playerRef.current.pauseVideo();
      sendIframeCommand('pauseVideo');
      setPlaybackState('paused');
    } else {
      if (playerRef.current?.playVideo) {
        playerRef.current.setVolume(localMute ? 0 : config.volume);
        playerRef.current.playVideo();
      }
      sendIframeCommand('setVolume', [localMute ? 0 : config.volume]);
      sendIframeCommand('playVideo');
      setPlaybackState('playing');
    }
  };

  const handleVolumeChange = (newVol: number) => {
    if (onConfigChange) {
      onConfigChange({ ...config, volume: newVol });
    }
  };

  const handleMuteToggle = () => {
    setLocalMute((prev) => !prev);
  };

  const handlePresetSelect = (preset: typeof YOUTUBE_PRESETS[0]) => {
    if (onConfigChange) {
      onConfigChange({
        ...config,
        url: preset.url,
        videoId: preset.videoId,
        title: preset.title,
        startOffset: preset.startOffset,
      });
    }
    setShowPresetsPanel(false);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = `https://www.youtube-nocookie.com/embed/${validVideoId}?enablejsapi=1&origin=${encodeURIComponent(
    origin
  )}&controls=1&rel=0&playsinline=1&modestbranding=1&loop=1&playlist=${validVideoId}&start=${config.startOffset || 0}`;

  return (
    <div className="relative">
      {/* 
        CRITICAL FIX FOR USER REQUIREMENT:
        Keep the YouTube iframe permanently mounted in an invisible, offscreen container.
        This guarantees uninterrupted audio playback at all times, even when the user collapses
        the video or panel. It never consumes screen space or disconnects audio.
      */}
      <div
        className="fixed -left-[9999px] -top-[9999px] w-[200px] h-[200px] pointer-events-none opacity-0 overflow-hidden"
        aria-hidden="true"
      >
        <iframe
          ref={iframeRef}
          id="cpmg-yt-embed-player"
          src={embedUrl}
          title="YouTube Background Audio"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="w-full h-full border-0"
        />
      </div>

      {/* ULTRA-COMPACT AUDIO BAR (Pure Audio, Zero Screen Clutter) */}
      <div
        className={`rounded-xl sm:rounded-2xl border transition-all duration-300 shadow-md ${
          playbackState === 'playing'
            ? 'bg-slate-950/95 border-red-500/40 shadow-[0_0_18px_rgba(239,68,68,0.2)]'
            : 'bg-slate-950/90 border-slate-800'
        }`}
      >
        <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Song Title + Dynamic Equalizer Wave */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Pulsing Audio Icon */}
            <div className="relative w-8 h-8 rounded-lg bg-red-600/90 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
              <Music className={`w-4 h-4 fill-white ${playbackState === 'playing' ? 'animate-pulse' : ''}`} />
            </div>

            {/* Dynamic Equalizer Bars */}
            <div className="flex items-end gap-0.5 h-4 px-1 py-0.5 bg-slate-900/90 rounded border border-slate-800 flex-shrink-0">
              <span
                className={`w-1 rounded-full bg-red-500 transition-all duration-150 ${
                  playbackState === 'playing' ? 'h-3.5 animate-pulse' : 'h-1'
                }`}
              />
              <span
                className={`w-1 rounded-full bg-amber-400 transition-all duration-150 ${
                  playbackState === 'playing' ? 'h-2 animate-pulse' : 'h-1.5'
                }`}
              />
              <span
                className={`w-1 rounded-full bg-cyan-400 transition-all duration-150 ${
                  playbackState === 'playing' ? 'h-3.5 animate-pulse' : 'h-1'
                }`}
              />
              <span
                className={`w-1 rounded-full bg-emerald-400 transition-all duration-150 ${
                  playbackState === 'playing' ? 'h-2.5 animate-pulse' : 'h-1'
                }`}
              />
            </div>

            {/* Song title info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-mono uppercase font-black px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  NHẠC YOUTUBE
                </span>
                {playbackState === 'playing' ? (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    Đang phát
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400">
                    Tạm dừng
                  </span>
                )}
              </div>
              <p className="text-xs font-extrabold text-slate-200 truncate max-w-[180px] sm:max-w-xs md:max-w-md" title={config.title}>
                {config.title || 'Nhạc Nền Sôi Động YouTube'}
              </p>
            </div>
          </div>

          {/* Right: Audio Controls (Play/Pause, Song Selector, Volume) */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Play/Pause Button */}
            <button
              onClick={handleManualToggle}
              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                playbackState === 'playing'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                  : 'bg-red-600 hover:bg-red-500 text-white font-black'
              }`}
              title={playbackState === 'playing' ? 'Tạm dừng nhạc' : 'Bấm phát nhạc'}
            >
              {playbackState === 'playing' ? (
                <>
                  <Pause className="w-3 h-3 fill-current" />
                  <span className="hidden sm:inline">Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span className="hidden sm:inline">Phát nhạc</span>
                </>
              )}
            </button>

            {/* Quick Song Picker Button */}
            <button
              onClick={() => {
                setShowPresetsPanel((prev) => !prev);
                if (showVideoPreview) setShowVideoPreview(false);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showPresetsPanel
                  ? 'bg-red-900/60 border-red-500 text-white'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="Chọn bài hát khác"
            >
              <ListMusic className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden md:inline">Đổi bài</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showPresetsPanel ? 'rotate-180' : ''}`} />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800">
              <button
                onClick={handleMuteToggle}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={localMute ? 'Bật âm lượng' : 'Tắt tiếng'}
              >
                {localMute || config.volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={localMute ? 0 : config.volume}
                onChange={(e) => {
                  if (localMute) setLocalMute(false);
                  handleVolumeChange(Number(e.target.value));
                }}
                className="w-14 accent-red-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                title={`Âm lượng: ${config.volume}%`}
              />
              <span className="text-[10px] font-mono font-bold text-slate-300 w-6 text-right hidden sm:inline">
                {localMute ? '0%' : `${config.volume}%`}
              </span>
            </div>

            {/* Optional Video Toggle (User requested pure audio, but can view if wanted) */}
            <button
              onClick={() => {
                setShowVideoPreview((prev) => !prev);
                if (showPresetsPanel) setShowPresetsPanel(false);
              }}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                showVideoPreview
                  ? 'bg-red-950 border-red-500 text-red-300'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
              title={showVideoPreview ? 'Ẩn video (chỉ nghe âm thanh)' : 'Xem video YouTube'}
            >
              {showVideoPreview ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Dropped Quick Song Presets Menu (compact dropdown that doesn't eat screen space) */}
        {showPresetsPanel && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/95 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-red-400">
                <Sparkles className="w-3.5 h-3.5" />
                Chọn bài hát vận động vui nhộn cho học sinh:
              </span>
              <a
                href={`https://www.youtube.com/watch?v=${validVideoId}`}
                target="_blank"
                rel="noreferrer"
                className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[11px]"
              >
                <span>Xem trên YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {YOUTUBE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-2.5 rounded-xl text-left border transition-all text-xs flex items-center gap-2.5 cursor-pointer ${
                    validVideoId === preset.videoId
                      ? 'bg-red-950/80 border-red-500 text-white ring-1 ring-red-400'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center flex-shrink-0">
                    <Music className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-slate-100">{preset.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{preset.category} • {preset.description}</p>
                  </div>
                  {validVideoId === preset.videoId && (
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Optional Video Visualizer (only if user explicitly clicks to view video) */}
        {showVideoPreview && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/95 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-slate-300">Khung hình video YouTube:</span>
              <button
                onClick={() => setShowVideoPreview(false)}
                className="text-[11px] text-red-400 hover:underline cursor-pointer"
              >
                Đóng video để tiết kiệm diện tích sàn đấu
              </button>
            </div>
            <div className="max-w-md mx-auto aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
              {/* Note: This is an extra visual-only clone if needed, but our primary player is always running uninterrupted in the persistent container */}
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${validVideoId}?autoplay=0&controls=1&rel=0`}
                title="YouTube Preview"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
