'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SidebarProps {
  currentUserName: string;
  partnerName: string;
  isPartnerOnline: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  currentUserName,
  partnerName,
  isPartnerOnline,
  isOpen,
  onClose,
}: SidebarProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-stone-900/95 backdrop-blur-md border-r border-stone-700/50 flex flex-col transform transition-transform duration-300 ease-in-out lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b border-stone-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐹</span>
              <h1 className="text-lg font-bold text-amber-200">
                Hamster Chat
              </h1>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-700/50 transition-colors"
              aria-label="Close sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-stone-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-xs text-stone-500 mt-1">Logged in as {currentUserName}</p>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={onClose}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-amber-800/20 hover:bg-amber-800/30 transition-colors text-left"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-amber-800/40 flex items-center justify-center text-xl">
                🐹
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-stone-900 ${
                  isPartnerOnline ? 'bg-emerald-400' : 'bg-stone-500'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-stone-100 font-medium text-sm truncate">
                {partnerName}
              </p>
              <p className="text-xs text-stone-500 truncate">
                {isPartnerOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </button>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-stone-700/50">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-stone-800/60 hover:bg-stone-700/60 text-stone-400 hover:text-stone-200 transition-all duration-200 text-sm disabled:opacity-50"
          >
            {isLoggingOut ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Logging out...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
                Log Out
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
