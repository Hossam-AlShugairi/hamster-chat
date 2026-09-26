'use client';

import { useState, useRef, useEffect } from 'react';
import { formatTime } from '@/lib/utils';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number;
  createdAt: string;
  isSent: boolean;
}

export default function VoiceMessagePlayer({
  audioUrl,
  duration,
  createdAt,
  isSent,
}: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setAudioDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setHasError(true);
      setIsPlaying(false);
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [audioUrl]);

  const togglePlayPause = async () => {
    if (!audioRef.current || hasError) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Audio play error:', err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatSeconds = (sec: number): string => {
    if (isNaN(sec) || !isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="w-full min-w-[210px] sm:min-w-[260px]">
      <div className="flex items-center gap-3 py-1">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          disabled={hasError}
          aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            isSent
              ? 'bg-rose-950/40 text-rose-100 hover:bg-rose-950/60'
              : 'bg-stone-800/80 text-rose-300 hover:bg-stone-800'
          } ${hasError ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Waveform / Scrubber & Duration */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="relative flex items-center h-4">
            <input
              type="range"
              min={0}
              max={audioDuration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleScrub}
              disabled={hasError}
              aria-label="Audio progress scrubber"
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-stone-900/30 accent-rose-400 focus:outline-none"
              style={{
                background: `linear-gradient(to right, ${
                  isSent ? '#f43f5e' : '#fb7185'
                } ${progressPercent}%, rgba(0, 0, 0, 0.25) ${progressPercent}%)`,
              }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px]">
            <span className={isSent ? 'text-rose-200/80' : 'text-stone-400'}>
              {isPlaying ? formatSeconds(currentTime) : formatSeconds(audioDuration)}
            </span>
            {hasError && (
              <span className="text-red-400">Audio error</span>
            )}
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <p className={`text-[10px] mt-0.5 text-right ${isSent ? 'text-rose-200/60' : 'text-stone-400/60'}`}>
        {formatTime(createdAt)}
      </p>
    </div>
  );
}
