"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const getConversations = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured() || !userId) {
      setLoading(false);
      return [];
    }

    try {
      const supabase = createClient();
      
      // Get all messages for this user
      const { data: allMessages, error } = await supabase
        .from("messages")
        .select("*, sender:users!messages_sender_id_fkey(name, email), recipient:users!messages_recipient_id_fkey(name, email)")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by conversation and get last message + unread count
      const convMap = new Map<string, Conversation>();
      
      allMessages?.forEach((msg: any) => {
        const conversationId = msg.conversation_id;
        const otherUserId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        const otherUserName = msg.sender_id === userId ? msg.recipient?.name : msg.sender?.name;
        
        if (!convMap.has(conversationId)) {
          convMap.set(conversationId, {
            id: conversationId,
            participantId: otherUserId,
            participantName: otherUserName || "Unknown",
            participantAvatar: "",
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
            unreadCount: msg.recipient_id === userId && !msg.read_at ? 1 : 0,
          });
        } else {
          const conv = convMap.get(conversationId)!;
          if (msg.recipient_id === userId && !msg.read_at) {
            conv.unreadCount += 1;
          }
        }
      });

      const conversationsList = Array.from(convMap.values());
      setConversations(conversationsList);
      return conversationsList;
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setLoading(false);
      return [];
    }
  }, []);

  const getMessages = useCallback(async (conversationId: string) => {
    if (!isSupabaseConfigured() || !conversationId) {
      setLoading(false);
      return [];
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const transformedMessages: Message[] =
        data?.map((msg: any) => ({
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          recipientId: msg.recipient_id,
          content: msg.content,
          readAt: msg.read_at,
          createdAt: msg.created_at,
        })) || [];

      setMessages(transformedMessages);
      setLoading(false);
      return transformedMessages;
    } catch (err) {
      console.error("Error fetching messages:", err);
      setLoading(false);
      return [];
    }
  }, []);

  const sendMessage = useCallback(
    async (recipientId: string, content: string, conversationId?: string) => {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase not configured");
      }

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

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

        // Broadcast to Realtime channel
        const channel = supabase.channel(`conversation_${convId}`);
        await channel.send({
          type: "broadcast",
          event: "new_message",
          payload: data,
        });

        return data;
      } catch (err) {
        console.error("Error sending message:", err);
        throw err;
      }
    },
    []
  );

  const markAsRead = useCallback(async (messageId: string) => {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("id", messageId);

      if (error) throw error;
    } catch (err) {
      console.error("Error marking message as read:", err);
    }
  }, []);

  const getUnreadCount = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured() || !userId) {
      return 0;
    }

    try {
      const supabase = createClient();
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .is("read_at", null);

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error("Error getting unread count:", err);
      return 0;
    }
  }, []);

  // Subscribe to real-time messages with polling fallback
  const subscribeToMessages = useCallback(
    (conversationId: string, callback: (message: Message) => void) => {
      if (!isSupabaseConfigured()) return;

      const supabase = createClient();
      
      // Try Realtime subscription first
      const channel = supabase
        .channel(`conversation_${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: any) => {
            callback(payload.new as Message);
          }
        )
        .subscribe((status: any) => {
          if (status === "SUBSCRIPTION_ERROR" || status === "CHANNEL_ERROR") {
            console.warn("Realtime failed, falling back to polling");
            // Fallback to 10-second polling
            const interval = setInterval(async () => {
              const msgs = await getMessages(conversationId);
              if (msgs.length > messages.length) {
                callback(msgs[msgs.length - 1]);
              }
            }, 10000);
            setPollingInterval(interval);
          }
        });

      return () => {
        channel.unsubscribe();
        if (pollingInterval) clearInterval(pollingInterval);
      };
    },
    [getMessages, messages.length, pollingInterval]
  );

  return {
    messages,
    conversations,
    loading,
    getConversations,
    getMessages,
    sendMessage,
    markAsRead,
    getUnreadCount,
    subscribeToMessages,
  };
}
