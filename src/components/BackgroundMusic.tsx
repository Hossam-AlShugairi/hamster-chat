'use client';

import { useState, useEffect, useRef } from 'react';

const MUSIC_SRC = '/music.mp3';
const MUSIC_FALLBACK_SRC = 'https://files.catbox.moe/zjo13p.mp3';
const STORAGE_KEY = 'hamster-chat-music-muted';

export default function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Check localStorage preference
    const savedMuted = localStorage.getItem(STORAGE_KEY) === 'true';
    setIsMuted(savedMuted);

    const audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.volume = 0.35; // Comfortable background volume
    audioRef.current = audio;

    const tryPlay = async () => {
      if (savedMuted) return;
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        // Autoplay blocked by browser policy - listen for first user click
        setIsPlaying(false);
        const handleFirstInteraction = async () => {
          if (!localStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) !== 'true') {
            try {
              await audio.play();
              setIsPlaying(true);
            } catch {
              // Ignore
            }
          }
          window.removeEventListener('click', handleFirstInteraction);
          window.removeEventListener('keydown', handleFirstInteraction);
          window.removeEventListener('touchstart', handleFirstInteraction);
        };

        window.addEventListener('click', handleFirstInteraction);
        window.addEventListener('keydown', handleFirstInteraction);
        window.addEventListener('touchstart', handleFirstInteraction);
      }
    };

    const handleError = () => {
      // Try fallback URL if local fails
      if (audio.src.includes('/music.mp3')) {
        audio.src = MUSIC_FALLBACK_SRC;
        audio.load();
        tryPlay();
      } else {
        setHasError(true);
      }
    };

    audio.addEventListener('error', handleError);
    tryPlay();

    return () => {
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, []);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setIsMuted(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
        setIsMuted(false);
        localStorage.setItem(STORAGE_KEY, 'false');
      } catch (err) {
        console.error('Failed to play background music:', err);
      }
    }
  };

  if (hasError) return null;

  return (
    <button
      onClick={toggleMusic}
      aria-label={isPlaying ? 'Mute background music' : 'Play background music'}
      title={isPlaying ? 'Mute background music' : 'Play background music'}
      className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border ${
        isPlaying
          ? 'bg-rose-950/60 border-rose-600/50 text-rose-300 shadow-sm shadow-rose-900/40'
          : 'bg-stone-900/60 border-stone-700/40 text-stone-400 hover:text-rose-300'
      }`}
    >
      {isPlaying ? (
        <div className="flex items-center gap-0.5">
          <span className="w-0.5 h-3 bg-rose-400 animate-pulse" />
          <span className="w-0.5 h-4 bg-rose-300 animate-pulse delay-75" />
          <span className="w-0.5 h-2.5 bg-rose-400 animate-pulse delay-150" />
        </div>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      )}
    </button>
  );
}
