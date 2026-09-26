'use client';

import { useState, useRef, KeyboardEvent, useEffect, ChangeEvent } from 'react';
import type { Message } from '@/types';

interface MessageInputProps {
  onSendText: (content: string, replyToId?: string | null) => Promise<void>;
  onSendAudio: (file: Blob, duration: number, replyToId?: string | null) => Promise<void>;
  onSendImage: (file: File, replyToId?: string | null) => Promise<void>;
  replyingTo: Message | null;
  onCancelReply: () => void;
  disabled?: boolean;
}

export default function MessageInput({
  onSendText,
  onSendAudio,
  onSendImage,
  replyingTo,
  onCancelReply,
  disabled,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const trimmed = content.trim();
  const canSendText = trimmed.length > 0 && !isSending && !disabled && !isRecording;

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function handleSendText() {
    if (!canSendText) return;

    setIsSending(true);
    try {
      await onSendText(trimmed, replyingTo?.id || null);
      setContent('');
      onCancelReply();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch {
      // Error handled upstream
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }

  function handleInput() {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  // Image Selection Handler
  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMsg('Only JPG, PNG, and WEBP images are supported.');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 10MB.');
      e.target.value = '';
      return;
    }

    setIsSending(true);
    setErrorMsg(null);
    try {
      await onSendImage(file, replyingTo?.id || null);
      onCancelReply();
    } catch {
      // Error handled upstream
    } finally {
      setIsSending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  }

  async function startRecording() {
    setErrorMsg(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Voice recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);

      setIsRecording(true);
      setRecordingSeconds(0);
      recordingStartTimeRef.current = Date.now();

      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingSeconds(elapsed);

        if (elapsed >= 120) {
          stopAndSendRecording();
        }
      }, 500);
    } catch (err: unknown) {
      console.error('Microphone access error:', err);
      const errorObj = err as { name?: string; message?: string };
      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        setErrorMsg('Microphone permission denied. Please allow mic access.');
      } else {
        setErrorMsg('Could not access microphone.');
      }
    }
  }

  function cancelRecording() {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
  }

  function stopAndSendRecording() {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const duration = recordingSeconds;
    const mediaRecorder = mediaRecorderRef.current;

    mediaRecorder.onstop = async () => {
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());

      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      setIsRecording(false);
      setRecordingSeconds(0);

      if (audioBlob.size > 0 && duration >= 1) {
        setIsSending(true);
        try {
          await onSendAudio(audioBlob, duration, replyingTo?.id || null);
          onCancelReply();
        } catch {
          // Error handled upstream
        } finally {
          setIsSending(false);
        }
      }
    };

    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }

  function formatDuration(sec: number): string {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  const getReplySnippet = (msg: Message) => {
    if (msg.message_type === 'voice') return '🎤 Voice message';
    if (msg.message_type === 'image') return '🖼 Image';
    return msg.content || 'Message';
  };

  return (
    <div className="border-t border-rose-900/40 bg-stone-950/90 backdrop-blur-md p-3 sm:p-4 z-10 relative">
      {/* Hidden File Input for Images */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* Reply Preview Banner */}
      {replyingTo && (
        <div className="max-w-4xl mx-auto mb-2 px-3 py-2 rounded-xl bg-rose-950/60 border border-rose-800/40 text-rose-100 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <div className="w-1 h-8 rounded-full bg-rose-500 flex-shrink-0" />
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-rose-300">
                Replying to {replyingTo.reply_to_message?.sender_name || 'Message'}
              </p>
              <p className="text-stone-300/80 truncate">
                {getReplySnippet(replyingTo)}
              </p>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="flex-shrink-0 p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-stone-200 transition-colors"
            aria-label="Cancel reply"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="max-w-4xl mx-auto mb-2 text-xs text-red-400 bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-lg flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="underline hover:text-red-300 ml-2">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 sm:gap-3 max-w-4xl mx-auto">
        {isRecording ? (
          /* Active Recording UX */
          <div className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-rose-950/50 border border-rose-800/40 text-rose-100 text-sm animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="font-semibold text-rose-300">Recording...</span>
              <span className="text-xs font-mono text-rose-200/80">{formatDuration(recordingSeconds)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="px-3 py-1.5 text-xs font-medium text-stone-400 hover:text-stone-200 bg-stone-800/60 hover:bg-stone-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={stopAndSendRecording}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-600 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <span>Stop & Send</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Input UX */
          <>
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || disabled}
              aria-label="Send image"
              title="Send image"
              className="flex-shrink-0 w-10 h-10 rounded-full bg-stone-900/80 hover:bg-stone-800 text-rose-300 border border-stone-800/50 flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="Type a message..."
              disabled={isSending || disabled}
              rows={1}
              maxLength={5000}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-stone-900/80 border border-stone-800/50 text-stone-100 placeholder-stone-500 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/40 transition-all duration-200 disabled:opacity-50 text-sm leading-relaxed"
            />

            {/* Microphone Button (when input is empty) */}
            {trimmed.length === 0 ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={isSending || disabled}
                aria-label="Record voice message"
                title="Record voice message"
                className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40 flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                  <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                </svg>
              </button>
            ) : (
              /* Send Text Button */
              <button
                type="button"
                onClick={handleSendText}
                disabled={!canSendText}
                aria-label="Send text message"
                className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-700 hover:bg-rose-600 text-white flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404Z" />
                  </svg>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
