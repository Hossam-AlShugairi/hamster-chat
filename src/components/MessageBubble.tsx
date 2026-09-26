'use client';

import { formatTime } from '@/lib/utils';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  currentUserId: string;
  partnerName: string;
  currentUserName: string;
  onReply: (message: Message) => void;
  onImageClick: (imageUrl: string) => void;
  isHighlighted?: boolean;
}

export default function MessageBubble({
  message,
  isSent,
  currentUserId,
  partnerName,
  currentUserName,
  onReply,
  onImageClick,
  isHighlighted,
}: MessageBubbleProps) {
  const isVoice = message.message_type === 'voice' || Boolean(message.audio_url);
  const isImage = message.message_type === 'image' || Boolean(message.image_url);

  // Quoted reply snippet details
  const replyMsg = message.reply_to_message;
  const replySenderName = replyMsg
    ? replyMsg.sender_id === currentUserId
      ? currentUserName
      : partnerName
    : partnerName;

  const scrollToQuoted = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.reply_to_message_id) return;

    const el = document.getElementById(`message-${message.reply_to_message_id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-rose-400', 'ring-offset-2', 'ring-offset-stone-950');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-rose-400', 'ring-offset-2', 'ring-offset-stone-950');
      }, 1800);
    }
  };

  const getQuotedSnippet = () => {
    if (!replyMsg) return 'Message';
    if (replyMsg.message_type === 'voice') {
      const dur = replyMsg.audio_duration ? `${replyMsg.audio_duration}s` : '';
      return `🎤 Voice message ${dur}`;
    }
    if (replyMsg.message_type === 'image') {
      return '🖼 Image';
    }
    return replyMsg.content || 'Message';
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`group relative flex ${isSent ? 'justify-end' : 'justify-start'} animate-message-in transition-all duration-300 ${
        isHighlighted ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-stone-950 rounded-2xl' : ''
      }`}
    >
      {/* Quick Reply Button on Hover / Touch */}
      <button
        onClick={() => onReply(message)}
        title="Reply"
        aria-label="Reply to message"
        className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-stone-900/90 text-stone-300 hover:text-rose-300 border border-stone-800 shadow-sm ${
          isSent ? '-left-8' : '-right-8'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.085l-5.25-5a.75.75 0 010-1.085l5.25-5a.75.75 0 011.061.025z" clipRule="evenodd" />
        </svg>
      </button>

      <div
        className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-md border ${
          isSent
            ? 'bg-rose-900/80 border-rose-700/50 text-rose-50 rounded-br-md'
            : 'bg-stone-800/80 border-stone-700/50 text-stone-100 rounded-bl-md'
        }`}
      >
        {/* Quoted Reply Box */}
        {(message.reply_to_message_id || replyMsg) && (
          <div
            onClick={scrollToQuoted}
            className={`mb-2 p-2 rounded-xl text-xs cursor-pointer border-l-2 transition-colors ${
              isSent
                ? 'bg-rose-950/60 border-rose-400 text-rose-100 hover:bg-rose-950/80'
                : 'bg-stone-900/80 border-rose-400 text-stone-200 hover:bg-stone-900'
            }`}
          >
            <p className="font-semibold text-rose-300 text-[11px]">
              {replySenderName}
            </p>
            <p className="truncate text-stone-300/80 text-[11px] mt-0.5">
              {getQuotedSnippet()}
            </p>
          </div>
        )}

        {/* Message Content: Image, Voice, or Text */}
        {isImage && message.image_url ? (
          <div className="space-y-1">
            <div
              className="cursor-pointer overflow-hidden rounded-xl border border-stone-900/40 max-h-80"
              onClick={() => onImageClick(message.image_url!)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.image_url}
                alt="Chat attachment"
                className="w-full h-full object-cover rounded-xl hover:scale-[1.02] transition-transform duration-200"
              />
            </div>
            <p className={`text-[10px] text-right ${isSent ? 'text-rose-200/60' : 'text-stone-400/60'}`}>
              {formatTime(message.created_at)}
            </p>
          </div>
        ) : isVoice && message.audio_url ? (
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
