"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { chatSocketUrl } from "@/src/api/chat-api";

/** Mirrors the server's CHAT_EVENTS — the backend is the source of truth. */
export const CHAT_EVENTS = {
  CONVERSATION_SUBSCRIBE: "conversation:subscribe",
  CONVERSATION_UNSUBSCRIBE: "conversation:unsubscribe",
  TYPING: "typing",
  MESSAGE_NEW: "message:new",
  MESSAGE_UPDATED: "message:updated",
  MESSAGE_DELETED: "message:deleted",
  TYPING_UPDATE: "typing:update",
  CONVERSATION_NEW: "conversation:new",
  CONVERSATION_UPDATED: "conversation:updated",
  PARTICIPANTS_CHANGED: "participants:changed",
} as const;

interface ChatSocketHandlers {
  onMessage?: (payload: unknown) => void;
  onMessageUpdated?: (payload: unknown) => void;
  onMessageDeleted?: (payload: unknown) => void;
  onTyping?: (payload: unknown) => void;
  onConversationChanged?: (payload: unknown) => void;
}

/**
 * One live connection to the chat gateway for as long as the page is open.
 *
 * Handlers are held in a ref and read at emit time, so a re-render never tears
 * the socket down and reconnects — that would drop messages mid-conversation.
 */
export function useChatSocket(handlers: ChatSocketHandlers) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  // Kept current in an effect (never during render) so the socket below can
  // read the latest callbacks without being torn down and reconnected.
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const { url, token } = chatSocketUrl();
    if (!token) return;

    const socket = io(url, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on(CHAT_EVENTS.MESSAGE_NEW, (p) => handlersRef.current.onMessage?.(p));
    socket.on(CHAT_EVENTS.MESSAGE_UPDATED, (p) => handlersRef.current.onMessageUpdated?.(p));
    socket.on(CHAT_EVENTS.MESSAGE_DELETED, (p) => handlersRef.current.onMessageDeleted?.(p));
    socket.on(CHAT_EVENTS.TYPING_UPDATE, (p) => handlersRef.current.onTyping?.(p));
    socket.on(CHAT_EVENTS.CONVERSATION_NEW, (p) =>
      handlersRef.current.onConversationChanged?.(p),
    );
    socket.on(CHAT_EVENTS.CONVERSATION_UPDATED, (p) =>
      handlersRef.current.onConversationChanged?.(p),
    );
    socket.on(CHAT_EVENTS.PARTICIPANTS_CHANGED, (p) =>
      handlersRef.current.onConversationChanged?.(p),
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /** Join a conversation room so its typing indicators reach this client. */
  const subscribe = (conversationId: string) => {
    socketRef.current?.emit(CHAT_EVENTS.CONVERSATION_SUBSCRIBE, { conversationId });
  };
  const unsubscribe = (conversationId: string) => {
    socketRef.current?.emit(CHAT_EVENTS.CONVERSATION_UNSUBSCRIBE, { conversationId });
  };
  const sendTyping = (conversationId: string, isTyping: boolean) => {
    socketRef.current?.emit(CHAT_EVENTS.TYPING, { conversationId, isTyping });
  };

  return { subscribe, unsubscribe, sendTyping };
}
