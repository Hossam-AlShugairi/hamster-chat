import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_AUDIO_DURATION_SEC = 120; // 2 minutes

const ALLOWED_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/aac',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp3',
];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const rawDuration = formData.get('duration') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 });
    }

    const duration = rawDuration ? parseInt(rawDuration, 10) : 0;

    // Validate size
    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Audio file exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    // Validate duration
    if (duration > MAX_AUDIO_DURATION_SEC) {
      return NextResponse.json(
        { error: 'Voice message cannot exceed 2 minutes.' },
        { status: 400 }
      );
    }

    // Validate MIME type
    const baseMimeType = file.type.split(';')[0].trim().toLowerCase();
    if (baseMimeType && !ALLOWED_MIME_TYPES.includes(baseMimeType)) {
      return NextResponse.json(
        { error: `Unsupported audio format (${baseMimeType}).` },
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

    // Upload audio file to Supabase Storage
    const fileExt = baseMimeType.split('/')[1] || 'webm';
    const fileName = `${session.userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-messages')
      .upload(fileName, fileBuffer, {
        contentType: file.type || 'audio/webm',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload voice message file.' },
        { status: 500 }
      );
    }

    // Get public URL for the uploaded audio
    const { data: publicUrlData } = supabase.storage
      .from('voice-messages')
      .getPublicUrl(uploadData.path);

    const audioUrl = publicUrlData.publicUrl;

    // Insert voice message into database
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: session.userId,
        receiver_id: receiver.id,
        message_type: 'voice',
        content: null,
        audio_url: audioUrl,
        audio_duration: Math.max(0, duration),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Voice message database insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save voice message.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Audio message POST error:', error);
    return NextResponse.json(
      { error: 'Failed to send voice message.' },
      { status: 500 }
    );
  }
}
