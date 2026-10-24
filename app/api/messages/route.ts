import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createNotification, getNotificationTitle, getNotificationMessage } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ messages: data || [] });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipientId, content, conversationId } = body;

    if (!recipientId || !content) {
      return NextResponse.json(
        { error: "recipientId and content are required" },
        { status: 400 }
      );
    }

    // Generate conversation ID if not provided
    const convId =
      conversationId ||
      `conv_${[user.id, recipientId].sort().join("_")}`;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: convId,
        sender_id: user.id,
        recipient_id: recipientId,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    // Get sender name for notification
    const { data: senderProfile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    const senderName = senderProfile?.name || 'Someone';

    // Send notification to recipient
    await createNotification(
      recipientId,
      'message_received',
      getNotificationTitle('message_received'),
      getNotificationMessage('message_received', { senderName }),
      `/messages?conversation=${convId}`
    );

    // Trigger Realtime broadcast
    const channel = supabase.channel(`conversation_${convId}`);
    await channel.send({
      type: "broadcast",
      event: "new_message",
      payload: data,
    });

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
