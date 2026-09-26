'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
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
        (payload) => {
          const newMessage = payload.new as Message;
          // Only add if it's part of our conversation
          if (
            (newMessage.sender_id === currentUser.id &&
              newMessage.receiver_id === partner.id) ||
            (newMessage.sender_id === partner.id &&
              newMessage.receiver_id === currentUser.id)
          ) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, partner.id]);

  // Track presence (online/offline)
  useEffect(() => {
    const presenceChannel = supabase.channel('online-users', {
      config: { presence: { key: currentUser.id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        // Check if partner is in the presence state
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
    async (content: string) => {
      setError(null);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
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
    async (file: Blob, duration: number) => {
      setError(null);
      const formData = new FormData();
      formData.append('file', file, 'voice-message.webm');
      formData.append('duration', duration.toString());

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

  return (
    <div className="flex h-dvh bg-stone-950">
      {/* Sidebar */}
      <Sidebar
        currentUserName={currentUser.display_name}
        partnerName={partner.display_name}
        isPartnerOnline={isPartnerOnline}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          partnerName={partner.display_name}
          isOnline={isPartnerOnline}
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={true}
        />

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-red-400 text-sm text-center">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Chat background with romantic flowers & hearts pattern */}
        <div className="flex-1 flex flex-col min-h-0 relative bg-stone-950">
          {/* Subtle Romantic Floral/Heart Vector Background */}
          <div className="absolute inset-0 romantic-bg opacity-10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-rose-950/20 via-transparent to-stone-950/40 pointer-events-none" />

          {/* Messages */}
          <div className="relative flex-1 flex flex-col min-h-0">
            <MessageList
              messages={messages}
              currentUserId={currentUser.id}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMore}
            />
          </div>
        </div>

        <MessageInput onSendText={handleSendText} onSendAudio={handleSendAudio} />
      </div>
    </div>
  );
}
