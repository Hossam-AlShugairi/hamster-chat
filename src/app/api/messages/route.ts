import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateMessage } from '@/lib/validation';

const MESSAGES_PER_PAGE = 50;

// Rate limiter for message sending
const messageLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_MESSAGES_PER_MINUTE = 30;
const MESSAGE_WINDOW_MS = 60 * 1000;

function checkMessageRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = messageLimits.get(userId);

  if (!record || now > record.resetAt) {
    messageLimits.set(userId, { count: 1, resetAt: now + MESSAGE_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_MESSAGES_PER_MINUTE) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(MESSAGES_PER_PAGE), 10),
      100
    );

    const supabase = createServerSupabaseClient();

    // Get the other user
    const { data: otherUser } = await supabase
      .from('users')
      .select('id')
      .neq('id', session.userId)
      .single();

    if (!otherUser) {
      return NextResponse.json({ messages: [], hasMore: false });
    }

    // Build query - get messages between these two users
    let query = supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${session.userId},receiver_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},receiver_id.eq.${session.userId})`
      )
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there are more

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Messages fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to load messages.' },
        { status: 500 }
      );
    }

    const hasMore = (messages?.length || 0) > limit;
    const resultMessages = (messages || []).slice(0, limit).reverse();

    return NextResponse.json({
      messages: resultMessages,
      hasMore,
      nextCursor: hasMore ? resultMessages[0]?.created_at : undefined,
    });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load messages.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    // Rate limiting
    if (!checkMessageRateLimit(session.userId)) {
      return NextResponse.json(
        { error: 'Too many messages. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 }
      );
    }

    // Validate message content
    const validation = validateMessage(body.content);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get the other user (receiver)
    const { data: receiver } = await supabase
      .from('users')
      .select('id')
      .neq('id', session.userId)
      .single();

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found.' },
        { status: 404 }
      );
    }

    // Insert message - sender_id comes from the session, NOT from the client
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: session.userId,
        receiver_id: receiver.id,
        content: validation.sanitized!,
      })
      .select()
      .single();

    if (error) {
      console.error('Message insert error:', error);
      return NextResponse.json(
        { error: 'Failed to send message.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json(
      { error: 'Failed to send message.' },
      { status: 500 }
    );
  }
}
