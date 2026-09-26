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

  // Send message
  const handleSend = useCallback(
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

      // Message will appear via realtime subscription
    },
    []
  );

  return (
    <div className="flex h-dvh bg-stone-900">
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

        {/* Chat background with hamster pattern */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Background pattern */}
          <div className="absolute inset-0 hamster-bg opacity-[0.03]" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/50 via-transparent to-stone-900/50" />

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

        <MessageInput onSend={handleSend} />
      </div>
    </div>
  );
}
