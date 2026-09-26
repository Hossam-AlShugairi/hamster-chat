import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
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
    const replyToMessageId = (formData.get('reply_to_message_id') as string | null) || null;

    if (!file) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Image file exceeds 10MB limit.' },
        { status: 400 }
      );
    }

    // Validate MIME type
    const mimeType = file.type.toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, and WEBP image formats are supported.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get receiver
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

    // Upload image file to Supabase Storage
    const fileExt = mimeType.split('/')[1] || 'jpg';
    const fileName = `${session.userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase image storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image file.' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(uploadData.path);

    const imageUrl = publicUrlData.publicUrl;

    // Insert image message
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: session.userId,
        receiver_id: receiver.id,
        message_type: 'image',
        content: null,
        image_url: imageUrl,
        reply_to_message_id: replyToMessageId,
      })
      .select(`
        *,
        reply_to_message:messages!reply_to_message_id (
          id,
          sender_id,
          message_type,
          content,
          audio_duration,
          image_url
        )
      `)
      .single();

    if (insertError) {
      console.error('Image message database insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save image message.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Image message POST error:', error);
    return NextResponse.json(
      { error: 'Failed to send image message.' },
      { status: 500 }
    );
  }
}
