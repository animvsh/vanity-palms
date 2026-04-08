import { useState, useEffect, useRef } from "react";
import {
  fetchConsultationMessages,
  fetchPublicConsultationMessages,
  sendConsultationMessage,
  sendPublicConsultationMessage,
  markMessagesAsRead,
} from "@/lib/api";
import type { ConsultationMessage } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface ConsultationThreadProps {
  consultationId: string;
  consultationToken?: string;
  senderType: "patient" | "provider";
  senderName: string;
}

export default function ConsultationThread({
  consultationId,
  consultationToken,
  senderType,
  senderName,
}: ConsultationThreadProps) {
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load messages
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const msgs = senderType === "patient" && consultationToken
          ? await fetchPublicConsultationMessages(consultationToken)
          : await fetchConsultationMessages(consultationId);
        if (!cancelled) {
          setMessages(msgs);
          setLoading(false);
          if (senderType === "provider") {
            markMessagesAsRead(consultationId).catch(() => {});
          }
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [consultationId, consultationToken, senderType]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${consultationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "consultation_messages",
          filter: `consultation_id=eq.${consultationId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const msg: ConsultationMessage = {
            id: row.id as string,
            consultationId: row.consultation_id as string,
            senderType: row.sender_type as "patient" | "provider",
            senderName: row.sender_name as string,
            body: row.body as string,
            readAt: (row.read_at as string) ?? null,
            createdAt: row.created_at as string,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (senderType === "provider" && msg.senderType === "patient") {
            markMessagesAsRead(consultationId).catch(() => {});
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultationId, senderType]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      if (senderType === "patient" && consultationToken) {
        await sendPublicConsultationMessage({
          consultationToken,
          senderName,
          body: text,
        });
      } else {
        await sendConsultationMessage({
          consultationId,
          senderType,
          senderName,
          body: text,
        });
      }
      setNewMessage("");
    } catch {
      // silently fail - message will retry
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading conversation...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderType === senderType;
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <p className="text-xs font-medium opacity-70 mb-1">
                  {msg.senderName}
                </p>
                <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                <p className="text-[10px] opacity-50 mt-1 text-right">
                  {new Date(msg.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="border-t p-3 flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
