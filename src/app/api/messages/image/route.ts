import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

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

    // Validate MIME type / format (supporting Android photo pickers)
    const mimeType = file.type.toLowerCase();
    const fileNameLower = file.name.toLowerCase();
    const isImageMime = mimeType.startsWith('image/') || mimeType === 'application/octet-stream' || mimeType === '';
    const hasImageExt = /\.(jpg|jpeg|png|webp|heic|heif|gif)$/i.test(fileNameLower);

    if (!isImageMime && !hasImageExt) {
      return NextResponse.json(
        { error: 'Selected file is not a supported image format.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get receiver user
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('id')
      .neq('id', session.userId)
      .single();

    if (receiverError || !receiver) {
      return NextResponse.json(
        { error: 'Receiver not found.' },
        { status: 404 }
      );
    }

    // Determine extension
    let fileExt = 'jpg';
    if (fileNameLower.includes('.')) {
      fileExt = fileNameLower.split('.').pop() || 'jpg';
    } else if (mimeType.includes('/')) {
      fileExt = mimeType.split('/')[1];
    }

    const storagePath = `${session.userId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase image storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload error: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('chat-images')
      .getPublicUrl(uploadData.path);

    const imageUrl = publicUrlData.publicUrl;

    // Insert image message record
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
      .select('*')
      .single();

    if (insertError) {
      console.error('Image message database insert error:', insertError);

      // Clean up orphaned uploaded storage file
      await supabase.storage.from('chat-images').remove([uploadData.path]).catch(() => {});

      return NextResponse.json(
        { error: `Database save error: ${insertError.message}` },
        { status: 500 }
      );
    }

    // If message is a reply, fetch joined reply message snippet
    if (replyToMessageId) {
      const { data: replyMsg } = await supabase
        .from('messages')
        .select('id, sender_id, message_type, content, audio_duration, image_url')
        .eq('id', replyToMessageId)
        .single();

      if (replyMsg) {
        (message as unknown as { reply_to_message?: unknown }).reply_to_message = replyMsg;
      }
    }

    return NextResponse.json({ message });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Image message POST error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send image message.' },
      { status: 500 }
    );
  }
}
