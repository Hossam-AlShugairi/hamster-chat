'use client';

import { formatTime } from '@/lib/utils';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

export default function MessageBubble({ message, isSent }: MessageBubbleProps) {
  const isVoice = message.message_type === 'voice' || Boolean(message.audio_url);

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-message-in`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-md border ${
          isSent
            ? 'bg-rose-900/80 border-rose-700/50 text-rose-50 rounded-br-md'
            : 'bg-stone-800/80 border-stone-700/50 text-stone-100 rounded-bl-md'
        }`}
      >
        {isVoice && message.audio_url ? (
          <VoiceMessagePlayer
            audioUrl={message.audio_url}
            duration={message.audio_duration || 0}
            createdAt={message.created_at}
            isSent={isSent}
          />
        ) : (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
            <p
              className={`text-[10px] mt-1 text-right ${
                isSent ? 'text-rose-200/60' : 'text-stone-400/60'
              }`}
            >
              {formatTime(message.created_at)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
