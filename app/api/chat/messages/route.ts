import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const userId = searchParams.get('userId');

    if (!conversationId) {
      return NextResponse.json({ success: false, error: 'Conversation ID required' }, { status: 400 });
    }

    // 1. Fetch messages
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 2. Mark unread messages as read for this user
    if (userId) {
      await supabaseAdmin
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', userId)
        .is('read_at', null);
    }

    return NextResponse.json({ success: true, messages: messages || [] });
  } catch (err: any) {
    console.error('[MessagesAPI] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { conversationId, senderId, recipientId, content, messageType = 'text' } = body;

    if (!conversationId || !senderId || !recipientId || !content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'Missing required message parameters' }, { status: 400 });
    }

    const cleanContent = content.trim();

    // 1. Verify not blocked
    const { data: block } = await supabaseAdmin
      .from('user_blocks')
      .select('*')
      .or(`and(blocker_id.eq.${senderId},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${senderId})`)
      .limit(1)
      .maybeSingle();

    if (block) {
      return NextResponse.json({ success: false, error: 'Cannot send message: this user is blocked' }, { status: 403 });
    }

    // 2. Insert message
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        content: cleanContent,
        message_type: messageType,
      })
      .select('*')
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ success: false, error: insertError?.message || 'Failed to insert message' }, { status: 500 });
    }

    // 3. Update conversation last_message preview & timestamp
    await supabaseAdmin
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: cleanContent.length > 90 ? `${cleanContent.substring(0, 87)}...` : cleanContent,
      })
      .eq('id', conversationId);

    return NextResponse.json({ success: true, message: inserted });
  } catch (err: any) {
    console.error('[MessagesAPI] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
