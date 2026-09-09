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
  RefreshCw,
  Sparkles,
  Radio,
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
  const [isExpanded, setIsExpanded] = useState(!compactMode);
  const [localMute, setLocalMute] = useState(false);
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused' | 'buffering' | 'idle'>('idle');

  const validVideoId = extractYouTubeVideoId(config.url) || config.videoId || '7zp1TbLFPp8';

  // Load YouTube IFrame API once
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
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = `https://www.youtube-nocookie.com/embed/${validVideoId}?enablejsapi=1&origin=${encodeURIComponent(
    origin
  )}&controls=1&rel=0&playsinline=1&modestbranding=1&loop=1&playlist=${validVideoId}&start=${config.startOffset || 0}`;

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden ${
        playbackState === 'playing'
          ? 'bg-slate-950/95 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
          : 'bg-slate-950/90 border-slate-800'
      }`}
    >
      {/* Header bar / Mini player bar */}
      <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-red-950/40 via-slate-900/60 to-slate-950/90">
        <div className="flex items-center gap-3 min-w-0">
          {/* YouTube Logo Badge & Equalizer */}
          <div className="relative w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white flex-shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
            <Music className="w-5 h-5 fill-white" />
            {playbackState === 'playing' && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                <Radio className="w-3 h-3" />
                NHẠC NỀN YOUTUBE
              </span>
              {playbackState === 'playing' ? (
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                  ● Đang phát
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400">
                  ○ Tạm dừng
                </span>
              )}
            </div>

            <h4 className="text-xs sm:text-sm font-black text-slate-100 truncate max-w-[200px] sm:max-w-xs md:max-w-md mt-0.5" title={config.title}>
              {config.title || 'Nhạc Nền YouTube Cho Học Sinh Vận Động'}
            </h4>
          </div>
        </div>

        {/* Live Controls: Play/Pause, Volume, Presets */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={handleManualToggle}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              playbackState === 'playing'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                : 'bg-red-600 hover:bg-red-500 text-white font-black'
            }`}
            title={playbackState === 'playing' ? 'Tạm dừng nhạc' : 'Phát nhạc ngay'}
          >
            {playbackState === 'playing' ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Tạm dừng</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Phát nhạc</span>
              </>
            )}
          </button>

          {/* Volume Control */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
            <button
              onClick={handleMuteToggle}
              className="text-slate-400 hover:text-white transition-colors"
              title={localMute ? 'Bật âm lượng' : 'Tắt tiếng'}
            >
              {localMute || config.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
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
              className="w-16 accent-red-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              title={`Âm lượng: ${config.volume}%`}
            />
            <span className="text-[10px] font-mono font-bold text-slate-300 w-7">
              {localMute ? '0%' : `${config.volume}%`}
            </span>
          </div>

          {/* Expand/Collapse preview */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
            title={isExpanded ? 'Thu gọn video' : 'Xem video YouTube'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Section: YouTube iframe + Quick Presets */}
      {isExpanded && (
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/70 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Embedded YouTube Iframe Preview */}
            <div className="md:col-span-5 relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner">
              <iframe
                ref={iframeRef}
                id="cpmg-yt-embed-player"
                src={embedUrl}
                title="YouTube Background Music"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* Quick Song Selector Presets */}
            <div className="md:col-span-7 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1 text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  Gợi ý bài hát vận động sôi động:
                </span>
                <a
                  href={`https://www.youtube.com/watch?v=${validVideoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[11px]"
                >
                  <span>Mở trên YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {YOUTUBE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex items-center gap-2 cursor-pointer ${
                      validVideoId === preset.videoId
                        ? 'bg-red-950/60 border-red-500 text-white shadow-sm ring-1 ring-red-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate">{preset.title}</p>
                      <span className="text-[10px] text-slate-400">{preset.category}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Notice that synthetic ticks/ting ting are disabled */}
              {config.muteSynthAudio && (
                <p className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1 pt-1">
                  ✓ Đã tắt tiếng "ting ting" và tiếng "bass" điện tử để bạn thưởng thức trọn vẹn nhạc nền YouTube!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
