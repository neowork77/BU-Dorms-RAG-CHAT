"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { ChatMessage } from "../components/ChatContent";

// ── Types ──────────────────────────────────────────────────────
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatHistoryContextValue {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  createSession: (firstMessage: string) => string;
  selectSession: (id: string) => void;
  updateSessionMessages: (id: string, messages: ChatMessage[]) => void;
  renameSession: (id: string, newTitle: string) => void;
  deleteSession: (id: string) => void;
  startNewChat: () => void;
  loadSessionMessages: (id: string) => Promise<ChatMessage[]>;
}

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(null);

// ── API helpers ────────────────────────────────────────────────
async function apiFetch(action: string, data: Record<string, unknown> = {}) {
  try {
    const res = await fetch('/api/chat-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[ChatHistory] API error (${action}):`, err);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[ChatHistory] Network error (${action}):`, err);
    return null;
  }
}

async function fetchSessions(): Promise<ChatSession[]> {
  try {
    const res = await fetch('/api/chat-history', { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.sessions || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      messages: [], // Messages are loaded on-demand
      createdAt: new Date(s.created_at).getTime(),
      updatedAt: new Date(s.updated_at).getTime(),
    }));
  } catch {
    return [];
  }
}

// ── Provider ───────────────────────────────────────────────────
export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track which messages have been saved to avoid duplicate API calls
  const savedMsgCountRef = useRef<Map<string, number>>(new Map());

  // Track pending session creation promises to prevent race conditions
  const pendingSessionRef = useRef<Map<string, Promise<unknown>>>(new Map());

  // Load sessions from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await fetchSessions();
      if (!cancelled) {
        setSessions(loaded);
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Create session ──
  const createSession = useCallback((firstMessage: string): string => {
    const id = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = firstMessage.length > 40 ? firstMessage.slice(0, 40) + "…" : firstMessage;
    const now = Date.now();

    const newSession: ChatSession = {
      id,
      title,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(id);

    // Create session on server — wrap in a proper Promise that only resolves on success
    const createPromise = new Promise<void>(async (resolve, reject) => {
      try {
        const result = await apiFetch('create_session', { id, title });
        if (result?.success) {
          resolve();
        } else {
          console.error(`[ChatHistory] create_session failed for ${id}, retrying...`);
          // Retry once
          const retry = await apiFetch('create_session', { id, title });
          if (retry?.success) {
            resolve();
          } else {
            reject(new Error(`Failed to create session ${id} after retry`));
          }
        }
      } catch (err) {
        reject(err);
      }
    });

    pendingSessionRef.current.set(id, createPromise);
    // Only remove from pending map on success; keep it on failure so callers know it failed
    createPromise
      .then(() => pendingSessionRef.current.delete(id))
      .catch(() => pendingSessionRef.current.delete(id));

    return id;
  }, []);

  // ── Select session ──
  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  // ── Load messages for a session (on-demand) ──
  const loadSessionMessages = useCallback(async (id: string): Promise<ChatMessage[]> => {
    const result = await apiFetch('get_messages', { session_id: id });
    if (result?.messages) {
      const msgs = result.messages as ChatMessage[];
      // Update the session in local state with the loaded messages
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, messages: msgs } : s
        )
      );
      savedMsgCountRef.current.set(id, msgs.length);
      return msgs;
    }
    return [];
  }, []);

  // ── Update session messages ──
  const updateSessionMessages = useCallback((id: string, messages: ChatMessage[]) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, messages, updatedAt: Date.now() } : s
      )
    );

    // Only send NEW messages to the server (incremental sync)
    const prevCount = savedMsgCountRef.current.get(id) || 0;
    if (messages.length > prevCount) {
      const newMessages = messages.slice(prevCount);
      savedMsgCountRef.current.set(id, messages.length);

      // Wait for pending session creation before adding messages
      const pending = pendingSessionRef.current.get(id);
      if (pending) {
        pending
          .then(() => apiFetch('add_messages', { session_id: id, messages: newMessages }))
          .catch((err) => console.error(`[ChatHistory] Skipping add_messages — session creation failed:`, err));
      } else {
        apiFetch('add_messages', { session_id: id, messages: newMessages });
      }
    }
  }, []);

  // ── Rename session ──
  const renameSession = useCallback((id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s
      )
    );
    apiFetch('rename_session', { id, title: newTitle });
  }, []);

  // ── Delete session ──
  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActiveSessionId((prev) => (prev === id ? null : prev));
    savedMsgCountRef.current.delete(id);
    apiFetch('delete_session', { id });
  }, []);

  // ── Start new chat ──
  const startNewChat = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  return (
    <ChatHistoryContext.Provider
      value={{
        sessions,
        activeSessionId,
        isLoading,
        createSession,
        selectSession,
        updateSessionMessages,
        renameSession,
        deleteSession,
        startNewChat,
        loadSessionMessages,
      }}
    >
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) throw new Error("useChatHistory must be used within ChatHistoryProvider");
  return ctx;
}
