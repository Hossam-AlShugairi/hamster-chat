'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import MessageBubble from './MessageBubble';
import { groupMessagesByDate } from '@/lib/utils';
import type { Message } from '@/types';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  partnerName: string;
  currentUserName: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onReply: (message: Message) => void;
  onImageClick: (imageUrl: string) => void;
}

export default function MessageList({
  messages,
  currentUserId,
  partnerName,
  currentUserName,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onReply,
  onImageClick,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const prevMessageCount = useRef(messages.length);

  // Check if user is near bottom
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShouldAutoScroll(distanceFromBottom < 100);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > prevMessageCount.current && shouldAutoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, shouldAutoScroll]);

  // Initial scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);

  const grouped = groupMessagesByDate(messages);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-4 scrollbar-thin z-10 relative w-full h-full"
    >
      <div className="min-h-full flex flex-col justify-end space-y-4">
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center pt-2 pb-4">
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="px-4 py-2 rounded-full bg-stone-900/60 hover:bg-stone-900/90 border border-stone-800/50 text-stone-300 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </span>
              ) : (
                'Load older messages'
              )}
            </button>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && !isLoadingMore && (
          <div className="flex flex-col items-center justify-center my-auto text-center py-20">
            <div className="text-6xl mb-4">🐹</div>
            <h3 className="text-rose-200 font-medium text-lg mb-2">
              No messages yet
            </h3>
            <p className="text-stone-400 text-sm">
              Send a message to start the conversation!
            </p>
          </div>
        )}

        {/* Messages grouped by date */}
        {grouped.map((group) => (
          <div key={group.dateKey} className="space-y-3">
            {/* Date separator */}
            <div className="flex items-center justify-center py-2">
              <div className="px-3 py-1 rounded-full bg-stone-900/70 border border-rose-950/40 text-rose-200/70 text-xs font-medium backdrop-blur-sm">
                {group.dateLabel}
              </div>
            </div>

            {/* Messages */}
            {group.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message as unknown as Message}
                isSent={message.sender_id === currentUserId}
                currentUserId={currentUserId}
                partnerName={partnerName}
                currentUserName={currentUserName}
                onReply={onReply}
                onImageClick={onImageClick}
              />
            ))}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
