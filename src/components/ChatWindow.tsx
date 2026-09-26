'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ImageLightbox from './ImageLightbox';
import GalaxyCanvas from './GalaxyCanvas';
import type { Message, User } from '@/types';

interface ChatWindowProps {
  currentUser: User;
  partner: User;
  initialMessages: Message[];
  initialHasMore: boolean;
  initialNextCursor?: string;
}

export default function ChatWindow({
  currentUser,
  partner,
  initialMessages,
  initialHasMore,
  initialNextCursor,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Sound chime synthesizer using Web Audio API (lightweight, zero external downloads)
  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio context ignored if blocked
    }
  }, []);

  // Show browser notification
  const triggerNotification = useCallback(
    (message: Message) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const senderName = partner.display_name;
      let title = `🐹 New message from ${senderName}`;
      let body = message.content || 'Sent you a message';

      if (message.message_type === 'voice') {
        title = `🐹 New voice message`;
        body = `${senderName} sent you a voice message`;
      } else if (message.message_type === 'image') {
        title = `🐹 New image`;
        body = `${senderName} sent you an image`;
      }

      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: message.id,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch {
        // Notification failed
      }
    },
    [partner.display_name]
  );

  // Request notification permission once on mount if supported
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          // Only add if it's part of our conversation
          if (
            (newMessage.sender_id === currentUser.id &&
              newMessage.receiver_id === partner.id) ||
            (newMessage.sender_id === partner.id &&
              newMessage.receiver_id === currentUser.id)
          ) {
            // Fetch joined reply info if reply_to_message_id is present
            if (newMessage.reply_to_message_id) {
              const { data: replyData } = await supabase
                .from('messages')
                .select('id, sender_id, message_type, content, audio_duration, image_url')
                .eq('id', newMessage.reply_to_message_id)
                .single();

              if (replyData) {
                newMessage.reply_to_message = replyData;
              }
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });

            // Trigger notification & sound for messages sent by partner when window is unfocused
            if (newMessage.sender_id === partner.id) {
              playNotificationSound();
              if (document.hidden) {
                triggerNotification(newMessage);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, partner.id, playNotificationSound, triggerNotification]);

  // Track presence (online/offline)
  useEffect(() => {
    const presenceChannel = supabase.channel('online-users', {
      config: { presence: { key: currentUser.id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const partnerPresent = Object.values(state).some((presences) =>
          (presences as unknown as Array<{ userId?: string }>).some(
            (p) => p.userId === partner.id
          )
        );
        setIsPartnerOnline(partnerPresent);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: currentUser.id,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser.id, partner.id]);

  // Load older messages
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;

    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/messages?cursor=${encodeURIComponent(nextCursor)}&limit=50`
      );
      if (!res.ok) throw new Error('Failed to load messages');

      const data = await res.json();
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch {
      setError('Failed to load older messages.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, nextCursor]);

  // Send text message
  const handleSendText = useCallback(
    async (content: string, replyToId?: string | null) => {
      setError(null);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, reply_to_message_id: replyToId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send message.');
        throw new Error(data.error);
      }
    },
    []
  );

  // Send voice audio message
  const handleSendAudio = useCallback(
    async (file: Blob, duration: number, replyToId?: string | null) => {
      setError(null);
      const formData = new FormData();
      formData.append('file', file, 'voice-message.webm');
      formData.append('duration', duration.toString());
      if (replyToId) {
        formData.append('reply_to_message_id', replyToId);
      }

      const res = await fetch('/api/messages/audio', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send voice message.');
        throw new Error(data.error);
      }
    },
    []
  );

  // Send image message
  const handleSendImage = useCallback(
    async (file: File, replyToId?: string | null) => {
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      if (replyToId) {
        formData.append('reply_to_message_id', replyToId);
      }

      const res = await fetch('/api/messages/image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send image message.');
        throw new Error(data.error);
      }
    },
    []
  );

  const handleReplySelect = (message: Message) => {
    // Add sender name for preview UI
    const senderName = message.sender_id === currentUser.id ? currentUser.display_name : partner.display_name;
    setReplyingTo({
      ...message,
      reply_to_message: {
        id: message.id,
        sender_id: message.sender_id,
        message_type: message.message_type,
        content: message.content,
        audio_duration: message.audio_duration,
        image_url: message.image_url,
        sender_name: senderName,
      },
    });
  };

  return (
    <div className="flex h-dvh bg-stone-950 overflow-hidden">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        currentUserName={currentUser.display_name}
        partnerName={partner.display_name}
        isPartnerOnline={isPartnerOnline}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <ChatHeader
          partnerName={partner.display_name}
          isOnline={isPartnerOnline}
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={true}
        />

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-red-400 text-sm text-center z-20">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Chat background: Google Drive image + Animated Galaxy Stars */}
        <div className="flex-1 flex flex-col min-h-0 relative bg-stone-950 overflow-hidden">
          {/* Primary Background Image from public/background.jpg */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 pointer-events-none z-0"
            style={{ backgroundImage: 'url("/background.jpg")' }}
          />

          {/* Animated Transparent Galaxy & Stars Canvas Layer */}
          <GalaxyCanvas />

          {/* Soft Dark Overlay for Maximum Readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/60 via-stone-950/30 to-stone-950/70 pointer-events-none z-0" />

          {/* Messages */}
          <div className="relative flex-1 flex flex-col min-h-0 z-10">
            <MessageList
              messages={messages}
              currentUserId={currentUser.id}
              partnerName={partner.display_name}
              currentUserName={currentUser.display_name}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMore}
              onReply={handleReplySelect}
              onImageClick={(url) => setLightboxImage(url)}
            />
          </div>
        </div>

        <MessageInput
          onSendText={handleSendText}
          onSendAudio={handleSendAudio}
          onSendImage={handleSendImage}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>
    </div>
  );
}
