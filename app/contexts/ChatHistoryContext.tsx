"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
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
  createSession: (firstMessage: string) => string;
  selectSession: (id: string) => void;
  updateSessionMessages: (id: string, messages: ChatMessage[]) => void;
  renameSession: (id: string, newTitle: string) => void;
  deleteSession: (id: string) => void;
  startNewChat: () => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextValue | null>(null);

// ── Storage helpers ────────────────────────────────────────────
const STORAGE_KEY = "bu-dorms-chat-history";

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage full or unavailable
  }
}

// ── Provider ───────────────────────────────────────────────────
export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadSessions();
    setSessions(saved);
    setLoaded(true);
  }, []);

  // Persist whenever sessions change (after initial load)
  useEffect(() => {
    if (loaded) {
      saveSessions(sessions);
    }
  }, [sessions, loaded]);

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
    return id;
  }, []);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const updateSessionMessages = useCallback((id: string, messages: ChatMessage[]) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, messages, updatedAt: Date.now() } : s
      )
    );
  }, []);

  const renameSession = useCallback((id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s
      )
    );
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActiveSessionId((prev) => (prev === id ? null : prev));
  }, []);

  const startNewChat = useCallback(() => {
    setActiveSessionId(null);
  }, []);

  return (
    <ChatHistoryContext.Provider
      value={{
        sessions,
        activeSessionId,
        createSession,
        selectSession,
        updateSessionMessages,
        renameSession,
        deleteSession,
        startNewChat,
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
