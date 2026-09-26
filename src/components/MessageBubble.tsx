'use client';

import { formatTime } from '@/lib/utils';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

export default function MessageBubble({ message, isSent }: MessageBubbleProps) {
  return (
    <div
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-message-in`}
    >
      <div
        className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl shadow-md ${
          isSent
            ? 'bg-amber-700/90 text-white rounded-br-md'
            : 'bg-stone-700/80 text-stone-100 rounded-bl-md'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <p
          className={`text-[10px] mt-1 text-right ${
            isSent ? 'text-amber-200/60' : 'text-stone-400/60'
          }`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
