'use client';

import { useState, useEffect } from 'react';
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
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
    }
  };

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

      {/* Header Controls: Notifications & Music */}
      <div className="flex items-center gap-2">
        <button
          onClick={requestNotification}
          title={
            notifPermission === 'granted'
              ? 'Notifications enabled'
              : 'Click to enable notifications'
          }
          aria-label="Toggle notifications"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border ${
            notifPermission === 'granted'
              ? 'bg-rose-950/60 border-rose-600/50 text-rose-300 shadow-sm shadow-rose-900/40'
              : 'bg-stone-900/60 border-stone-700/40 text-stone-400 hover:text-rose-300'
          }`}
        >
          {notifPermission === 'granted' ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-rose-300">
              <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 01-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 004.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-stone-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          )}
        </button>

        <BackgroundMusic />
      </div>
    </div>
  );
}
