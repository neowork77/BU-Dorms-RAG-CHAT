"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatContent, type ChatMessage, type RagStage, type DormInfo } from "../../components/ChatContent";
import { ChatInputBar } from "../../components/ChatInputBar";
import { useChatHistory } from "../../contexts/ChatHistoryContext";

// ── Unique ID helper ───────────────────────────────────────────
let idCounter = 0;
function uid() {
  return `msg-${Date.now()}-${++idCounter}`;
}

// ── Page Component ─────────────────────────────────────────────
export default function Home() {

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [ragStage, setRagStage] = useState<RagStage>(null);
  const sessionIdRef = useRef<string | null>(null);
  
  const params = useParams();
  const router = useRouter();

  const {
    activeSessionId,
    sessions,
    createSession,
    updateSessionMessages,
    selectSession,
    startNewChat
  } = useChatHistory();

  const isProcessing = ragStage !== null && ragStage !== 'done';

  // Sync URL -> State
  const urlId = params?.chatId?.[0];
  useEffect(() => {
    if (urlId) {
      if (activeSessionId !== urlId) {
        selectSession(urlId);
      }
    } else {
      // If we are at /app with no ID, ensure state is new chat
      if (activeSessionId !== null) {
        startNewChat();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlId]); // Depend on string value instead of array to prevent infinite loop

  // When user selects a session from sidebar, load its messages
  useEffect(() => {
    if (activeSessionId) {
      // Only set messages if we are actually switching to a different chat
      if (sessionIdRef.current !== activeSessionId) {
        const session = sessions.find((s) => s.id === activeSessionId);
        if (session) {
          setMessages(session.messages);
          sessionIdRef.current = activeSessionId;
        }
      }
    } else {
      // New chat
      if (sessionIdRef.current !== null) {
        setMessages([]);
        sessionIdRef.current = null;
      }
    }
  }, [activeSessionId, sessions]);

  // Persist messages to the session whenever they change
  useEffect(() => {
    if (sessionIdRef.current && messages.length > 0) {
      updateSessionMessages(sessionIdRef.current, messages);
    }
  }, [messages, updateSessionMessages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    // Create a new session if this is the first message
    if (!sessionIdRef.current) {
      const newId = createSession(trimmed);
      sessionIdRef.current = newId;
      // Navigate using history API to prevent page remount which breaks the stream state
      window.history.replaceState(null, '', `/app/${newId}`);
    }

    // 1. Add user message
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      text: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // 2. Begin RAG pipeline — start with reasoning stage
    setRagStage('reasoning');

    // 3. Fetch from API using SSE streaming
    const fetchReply = async () => {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Server error');
        }

        const contentType = res.headers.get('content-type') || '';

        // Stage order for the pipeline animation
        const STAGE_ORDER: RagStage[] = ['reasoning', 'search', 'retrieval', 'generation'];
        const MIN_STAGE_DISPLAY_MS = 1200; // minimum time each stage is visible

        // ── SSE streaming path ──
        if (contentType.includes('text/event-stream') && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let lastStageSetAt = Date.now();
          let currentStageIdx = 0; // tracks where we are in the pipeline
          let pendingResult: { msg: ChatMessage } | null = null;

          // Helper: animate stages forward from current position to the target
          const animateToStage = async (target: RagStage) => {
            const targetIdx = STAGE_ORDER.indexOf(target);
            if (targetIdx < 0 || targetIdx <= currentStageIdx) return;

            for (let i = currentStageIdx + 1; i <= targetIdx; i++) {
              const elapsed = Date.now() - lastStageSetAt;
              const wait = Math.max(0, MIN_STAGE_DISPLAY_MS - elapsed);
              if (wait > 0) await new Promise((r) => setTimeout(r, wait));
              setRagStage(STAGE_ORDER[i]);
              lastStageSetAt = Date.now();
              currentStageIdx = i;
            }
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // keep incomplete line in buffer

            for (const line of lines) {
              const trimLine = line.trim();
              if (!trimLine || trimLine.startsWith(':')) continue;

              if (trimLine.startsWith('data: ')) {
                try {
                  const payload = JSON.parse(trimLine.slice(6));

                  if (payload.stage && payload.stage !== 'done') {
                    await animateToStage(payload.stage as RagStage);
                  }

                  if (payload.result) {
                    const assistantMsg: ChatMessage = {
                      id: uid(),
                      role: "assistant",
                      body: payload.error
                        ? `⚠️ ${payload.result}`
                        : payload.result,
                      sources: payload.sources || [],
                      dorms: payload.dorms || undefined,
                      timestamp: Date.now(),
                    };
                    pendingResult = { msg: assistantMsg };
                  }
                } catch {
                  // skip malformed SSE data
                }
              }
            }
          }

          // Stream finished — animate remaining stages then show result
          if (pendingResult) {
            await animateToStage('generation');
            // Hold generation stage briefly so user sees it
            await new Promise((r) => setTimeout(r, MIN_STAGE_DISPLAY_MS));
            // Set timestamp NOW so the typing animation triggers (isHistory check uses 5s window)
            pendingResult.msg.timestamp = Date.now();
            setMessages((prev) => [...prev, pendingResult!.msg]);
            setRagStage('done');
            setTimeout(() => setRagStage(null), 500);
          }
        } else {
          // ── Fallback: non-streaming JSON response ──
          // Simulate pipeline stages for visual feedback
          const stageTimings: { stage: RagStage; delay: number }[] = [
            { stage: 'reasoning', delay: 0 },
            { stage: 'search', delay: 800 },
            { stage: 'retrieval', delay: 1600 },
            { stage: 'generation', delay: 2400 },
          ];

          // Start JSON fetch in parallel with stage animations
          const dataPromise = res.json();

          // Animate stages while waiting
          for (const { stage, delay } of stageTimings) {
            await new Promise((r) => setTimeout(r, delay === 0 ? 0 : 600));
            setRagStage(stage);
          }

          const data = await dataPromise;

          const assistantMsg: ChatMessage = {
            id: uid(),
            role: "assistant",
            body: data.error
              ? `⚠️ ${data.error}`
              : (data.reply || data.message),
            sources: [],
            timestamp: Date.now(),
          };

          setMessages((prev) => [...prev, assistantMsg]);
          setRagStage('done');
          setTimeout(() => setRagStage(null), 500);
        }
      } catch (error: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            body: `⚠️ ${error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์'}`,
            sources: [],
            timestamp: Date.now(),
          },
        ]);
        setRagStage(null);
      }
    };

    fetchReply();
  }, [input, isProcessing, createSession]);

  return (
    <>
      <ChatContent messages={messages} ragStage={ragStage} sessionId={activeSessionId} />
      <ChatInputBar
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isProcessing}
      />
    </>
  );
}
