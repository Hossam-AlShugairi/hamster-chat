import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ChatWindow from '@/components/ChatWindow';
import type { Message, User } from '@/types';

export const revalidate = 0;

export default async function ChatPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();

  // Get current user details
  const { data: currentUser } = await supabase
    .from('users')
    .select('id, username, display_name, created_at')
    .eq('id', session.userId)
    .single();

  if (!currentUser) {
    redirect('/login');
  }

  // Get the partner user (the other user in the system)
  const { data: partner } = await supabase
    .from('users')
    .select('id, username, display_name, created_at')
    .neq('id', session.userId)
    .single();

  if (!partner) {
    return (
      <div className="flex items-center justify-center h-dvh bg-stone-900 text-stone-300">
        <p>Waiting for second user account setup...</p>
      </div>
    );
  }

  // Fetch initial message history
  const { data: initialMessagesData } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${currentUser.id})`
    )
    .order('created_at', { ascending: false })
    .limit(51);

  const rawMessages = initialMessagesData || [];
  const hasMore = rawMessages.length > 50;
  const slicedMessages = hasMore ? rawMessages.slice(0, 50) : rawMessages;
  const initialMessages: Message[] = slicedMessages.reverse();
  const nextCursor = hasMore ? initialMessages[0]?.created_at : undefined;

  return (
    <ChatWindow
      currentUser={currentUser as User}
      partner={partner as User}
      initialMessages={initialMessages}
      initialHasMore={hasMore}
      initialNextCursor={nextCursor}
    />
  );
}
