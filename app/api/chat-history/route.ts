import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── GET: Fetch all sessions (with messages) for the current user ──
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch sessions ordered by most recent
    const { data: sessions, error: sessError } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (sessError) {
      console.error('Failed to fetch sessions:', sessError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (err: any) {
    console.error('GET /api/chat-history error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST: Create / Update / Delete sessions & messages ──
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // ── Create a new session ──
    if (action === 'create_session') {
      const { id, title } = body;
      if (!id || !title) {
        return NextResponse.json({ error: 'id and title are required' }, { status: 400 });
      }

      const { error } = await supabase
        .from('chat_sessions')
        .insert({ id, user_id: user.id, title });

      if (error) {
        console.error('Create session error:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // ── Rename a session ──
    if (action === 'rename_session') {
      const { id, title } = body;
      if (!id || !title) {
        return NextResponse.json({ error: 'id and title are required' }, { status: 400 });
      }

      const { error } = await supabase
        .from('chat_sessions')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Rename session error:', error);
        return NextResponse.json({ error: 'Failed to rename session' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // ── Delete a session (cascade deletes messages) ──
    if (action === 'delete_session') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 });
      }

      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Delete session error:', error);
        return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // ── Add messages to a session ──
    if (action === 'add_messages') {
      const { session_id, messages } = body;
      if (!session_id || !Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json({ error: 'session_id and messages[] are required' }, { status: 400 });
      }

      const rows = messages.map((msg: any) => ({
        id: msg.id,
        session_id,
        role: msg.role,
        content: msg, // store entire ChatMessage object as JSONB
      }));

      const { error: msgError } = await supabase
        .from('chat_messages')
        .upsert(rows, { onConflict: 'id' });

      if (msgError) {
        console.error('Add messages error:', msgError);
        return NextResponse.json({ error: 'Failed to add messages' }, { status: 500 });
      }

      // Touch the session's updated_at
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session_id)
        .eq('user_id', user.id);

      return NextResponse.json({ success: true });
    }

    // ── Get messages for a session ──
    if (action === 'get_messages') {
      const { session_id } = body;
      if (!session_id) {
        return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
      }

      const { data: messages, error: msgError } = await supabase
        .from('chat_messages')
        .select('content')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('Get messages error:', msgError);
        return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
      }

      // Extract the full ChatMessage from the content JSONB column
      const chatMessages = (messages || []).map((row: any) => row.content);

      return NextResponse.json({ messages: chatMessages });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('POST /api/chat-history error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
