'use client';

import BackgroundMusic from './BackgroundMusic';

interface ChatHeaderProps {
  partnerName: string;
  isOnline: boolean;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function ChatHeader({
  partnerName,
  isOnline,
  onMenuClick,
  showMenuButton,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-rose-950/50 bg-stone-950/90 backdrop-blur-md z-10 relative">
      <div className="flex items-center gap-3 min-w-0">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-900 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-rose-200/80"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        )}

        <div className="w-10 h-10 rounded-full bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
          🐹
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-rose-100 font-semibold text-sm truncate">
            {partnerName}
          </h2>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'
              }`}
            />
            <span className="text-xs text-rose-300/60">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Music Control Button */}
      <BackgroundMusic />
    </div>
  );
}
