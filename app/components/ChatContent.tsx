"use client";

import { useRef, useEffect, useCallback, useState } from "react";

// ── Types ──────────────────────────────────────────────────────
export type RagStage = 'search' | 'retrieval' | 'reasoning' | 'generation' | 'done' | null;

export interface DormInfo {
  name: string;
  price: number;
  distance_km: number | null;
  details: string;
  url: string;
  img: string;
  images?: string[];
}

export type ChatMessage =
  | { id: string; role: "user"; text: string; timestamp?: number }
  | {
    id: string;
    role: "assistant";
    body: string;
    sources: { icon: string; label: string }[];
    dorms?: DormInfo[];
    timestamp?: number;
  };

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ── Sub-components ─────────────────────────────────────────────
function UserMessage({ text, timestamp }: { text: string; timestamp?: number }) {
  return (
    <div className="flex flex-col items-end w-full animate-chat-message-in">
      <div className="max-w-[85%] bg-secondary-container text-on-secondary-container rounded-[2rem] rounded-tr-sm p-4 md:p-5 border-2 border-secondary-fixed-dim/50 soft-shadow overflow-hidden">
        <p className="text-sm sm:text-base whitespace-pre-wrap break-words break-all md:break-words">{text}</p>
      </div>
      {timestamp && (
        <span className="text-[10px] sm:text-[11px] text-on-surface-variant/60 mt-1 sm:mt-1.5 px-2 font-[family-name:var(--font-lexend)]">
          {formatTime(timestamp)}
        </span>
      )}
    </div>
  );
}

// ── Dorm Card ──────────────────────────────────────────────────
function DormCard({ dorm, index }: { dorm: DormInfo; index: number }) {
  const distText = dorm.distance_km !== null
    ? `${dorm.distance_km.toFixed(1)} กม. จาก ม.กรุงเทพ`
    : "ไม่ระบุพิกัด";

  // Collect all valid images
  const allImages = (dorm.images && dorm.images.length > 0)
    ? dorm.images.filter(url => url && url.startsWith('http'))
    : (dorm.img && dorm.img !== 'ไม่มีรูปภาพ' && dorm.img.startsWith('http'))
      ? [dorm.img]
      : [];

  return (
    <div
      className="rounded-xl sm:rounded-2xl bg-surface-container-low/60 border border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container/80 transition-all duration-200 group shadow-sm overflow-hidden"
    >
      {/* Info header */}
      <a
        href={dorm.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-3 sm:p-4"
      >
        <div className="flex items-start gap-2.5">
          {/* Number badge */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-[#E5B535] text-white flex items-center justify-center text-xs sm:text-sm font-bold font-[family-name:var(--font-lexend)] shadow-md border-[2px] border-white/90 mt-0.5">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm sm:text-base font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                {dorm.name}
              </h4>
              <span className="material-symbols-outlined text-[16px] text-outline/40 group-hover:text-primary shrink-0 mt-0.5 transition-colors">
                open_in_new
              </span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-primary mt-0.5">
              💸 {dorm.price.toLocaleString()} บาท/เดือน
            </p>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
              📍 {distText}
            </p>
            <p className="text-[11px] sm:text-xs text-outline line-clamp-2 mt-1 leading-relaxed">
              ✨ {dorm.details}
            </p>
          </div>
        </div>
      </a>

      {/* Images row — horizontal scroll showing all img1–img4 */}
      {allImages.length > 0 && (
        <div className="flex gap-1.5 sm:gap-2 px-3 sm:px-4 pb-3 sm:pb-4 overflow-x-auto scrollbar-hide">
          {allImages.map((imgUrl, i) => (
            <div
              key={i}
              className="shrink-0 w-[calc(50%-4px)] sm:w-[calc(25%-6px)] aspect-[4/3] rounded-lg sm:rounded-xl overflow-hidden bg-surface-container-high"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl}
                alt={`${dorm.name} - ภาพที่ ${i + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}

      {/* No images fallback */}
      {allImages.length === 0 && (
        <div className="flex items-center justify-center h-16 sm:h-20 mx-3 sm:mx-4 mb-3 sm:mb-4 rounded-lg bg-surface-container-high">
          <span className="material-symbols-outlined text-outline/30 text-2xl sm:text-3xl">
            apartment
          </span>
        </div>
      )}
    </div>
  );
}

function AssistantMessage({
  body,
  sources,
  dorms,
  timestamp,
}: {
  body: string;
  sources: { icon: string; label: string }[];
  dorms?: DormInfo[];
  timestamp?: number;
}) {
  const [displayedBody, setDisplayedBody] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Consider messages older than 5 seconds as history so we don't animate them
  const isHistory = timestamp ? Date.now() - timestamp > 5000 : false;

  useEffect(() => {
    if (isHistory) {
      setDisplayedBody(body);
      setIsTyping(false);
      return;
    }

    if (displayedBody.length < body.length) {
      setIsTyping(true);
      const timeoutId = setTimeout(() => {
        // Type out gradually — 1 char at a time for a natural feel
        setDisplayedBody(body.slice(0, displayedBody.length + 1));
      }, 25);
      return () => clearTimeout(timeoutId);
    } else {
      // Finished catching up to the current body
      setIsTyping(false);
    }
  }, [body, displayedBody, isHistory]);

  const renderBody = () => {
    let cleanBody = displayedBody
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/🔗?\s*\[.*?\]\(.*?\)/g, '')
      .replace(/https?:\/\/[^\s)>\]]+/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    if (isTyping) {
      cleanBody = cleanBody.replace(/\[CARD_\d*\]?$/, '');
      cleanBody = cleanBody.replace(/https?:?\/?\/?\S*$/, '');
    }

    if (!cleanBody && isTyping) {
      return (
        <div className="typing-indicator flex items-center gap-1 h-6">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
      );
    }

    if (!cleanBody) return null;

    // ── ไม่มี dorm → render text ปกติ ──
    if (!dorms || dorms.length === 0) {
      return <p className="mb-2 last:mb-0 whitespace-pre-wrap">{cleanBody}</p>;
    }

    // 🧠 NEW LOGIC: ถ้ามี CARD marker → ใช้ระบบสลับ text + card
    const hasCardMarker = /\[CARD_\d+\]/.test(cleanBody);

    if (hasCardMarker && !isTyping) {
      const parts = cleanBody.split(/(\[CARD_\d+\])/g);

      return (
        <>
          {parts.map((part, idx) => {
            const match = part.match(/\[CARD_(\d+)\]/);

            if (match) {
              const cardIndex = parseInt(match[1], 10) - 1;
              const dorm = dorms?.[cardIndex];
              if (!dorm) return null;

              return (
                <div key={`card-${idx}`} className="my-2">
                  <DormCard dorm={dorm} index={cardIndex} />
                </div>
              );
            }

            if (part.trim().length === 0) return null;

            return (
              <p key={`text-${idx}`} className="whitespace-pre-wrap mb-2">
                {part.trim()}
              </p>
            );
          })}
        </>
      );
    }

    // ── FALLBACK: ใช้ logic เดิมของคุณ (ไม่ลบ) ──
    const textOnly = cleanBody
      .replace(/\[CARD_\d+\]/g, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    const allLines = textOnly
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const introLine = allLines.find(l =>
      !/^\d+[\.)\-]\s/.test(l) &&
      !/^[-•●]\s/.test(l) &&
      !/^(💸|📍|✨|🔗)/.test(l) &&
      l.length > 5
    ) || `เจอหอพักมาให้ ${dorms.length} แห่งเลย! 🏠✨`;

    const closingCandidates = allLines.filter(l =>
      /สนใจ|ถาม|บอก|ช่วย|เพิ่มเติม|ลอง|ดูเพิ่ม|ไหม|นะ|ครับ|ค่ะ|~|😊|💬/.test(l) &&
      !/^\d+[\.)\-]\s/.test(l) &&
      !/^[-•●]\s/.test(l) &&
      l !== introLine
    );

    const closingLine = closingCandidates.length > 0
      ? closingCandidates[closingCandidates.length - 1]
      : null;

    if (isTyping) {
      return (
        <>
          <p className="mb-2 whitespace-pre-wrap">{introLine}</p>
          <div className="typing-indicator flex items-center gap-1 h-5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </>
      );
    }

    return (
      <>
        <p className="mb-3 whitespace-pre-wrap">{introLine}</p>

        <div className="w-full flex flex-col gap-2 animate-fade-in">
          {dorms.map((dorm, i) => (
            <DormCard key={`dorm-${dorm.name}-${i}`} dorm={dorm} index={i} />
          ))}
        </div>

        {closingLine && (
          <p className="mt-3 text-on-surface-variant/80 whitespace-pre-wrap text-sm">
            {closingLine}
          </p>
        )}
      </>
    );
  };

  return (
    <div className="flex justify-start w-full animate-chat-message-in">
      <div className="w-full flex gap-2.5 sm:gap-3">
        {/* AI Avatar */}
        <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 shrink-0 rounded-full flex items-center justify-center mt-0.5 overflow-hidden bg-primary-container ring-2 ring-primary/20 shadow-md">
          <img
            src="/assets/BU_Dorms_LOGO.webp"
            alt="AI Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-2.5 sm:gap-3 flex-1 overflow-hidden items-start min-w-0">
          {/* Text content — no box, full-width with accent bar */}
          <div className="w-full text-on-surface break-words prose-chat text-sm sm:text-base leading-relaxed border-l-[3px] border-primary/25 pl-3 sm:pl-4">
            {renderBody()}
          </div>
          {/* Source badges */}
          {sources.length > 0 && !isTyping && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 animate-fade-in">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest flex items-center gap-1 mr-1 text-outline/70 font-[family-name:var(--font-lexend)]">
                <span className="material-symbols-outlined text-[12px] sm:text-[14px]">link</span>
                Sources
              </span>
              {sources.map((source) => (
                <button
                  key={source.label}
                  className="flex items-center gap-1 sm:gap-1.5 bg-surface-container/60 backdrop-blur-sm border border-outline-variant/30 text-on-surface-variant px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium hover:bg-primary-container hover:text-on-primary-container hover:border-primary/30 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <span className="material-symbols-outlined text-[13px] sm:text-[15px]">
                    {source.icon}
                  </span>
                  {source.label}
                </button>
              ))}
            </div>
          )}
          {timestamp && !isTyping && (
            <span className="flex items-center gap-1 text-[10px] sm:text-[11px] text-on-surface-variant/50 font-[family-name:var(--font-lexend)] animate-fade-in">
              <span className="material-symbols-outlined text-[12px]">schedule</span>
              {formatTime(timestamp)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RAG Pipeline Stages ────────────────────────────────────────
const RAG_STAGES: {
  key: string;
  icon: string;
  label: string;
  subtitle: string;
}[] = [
    { key: "reasoning", icon: "psychology", label: "Reasoning", subtitle: "วิเคราะห์และเรียบเรียง..." },
    { key: "search", icon: "search", label: "Search", subtitle: "กำลังค้นหาข้อมูล..." },
    { key: "retrieval", icon: "database", label: "Retrieval", subtitle: "ดึงข้อมูลที่เกี่ยวข้อง..." },
    { key: "generation", icon: "auto_awesome", label: "Generation", subtitle: "กำลังสร้างคำตอบ..." },
  ];

function RAGPipelineIndicator({ currentStage }: { currentStage: RagStage }) {
  const targetIndex = RAG_STAGES.findIndex((s) => s.key === currentStage);
  const [activeIndex, setActiveIndex] = useState(targetIndex >= 0 ? targetIndex : 0);

  useEffect(() => {
    if (targetIndex >= 0 && targetIndex !== activeIndex) {
      // Small visual transition delay — pacing is handled by the page-level code
      const timer = setTimeout(() => {
        setActiveIndex(targetIndex);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [targetIndex, activeIndex]);

  return (
    <div className="flex justify-start w-full animate-chat-message-in">
      <div className="flex gap-2 sm:gap-3 max-w-[95%] sm:max-w-none">
        {/* AI Avatar */}
        <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 shrink-0 rounded-full flex items-center justify-center mt-1 shadow-sm overflow-hidden bg-primary-container">
          <img
            src="/assets/BU_Dorms_LOGO.webp"
            alt="AI Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="bg-surface-container-lowest text-on-surface rounded-2xl sm:rounded-[2rem] rounded-tl-none sm:rounded-tl-none px-3 sm:px-4 md:px-5 py-3 sm:py-4 border-2 border-primary-container soft-shadow min-w-0 w-full sm:min-w-[280px] md:min-w-[360px]">
          {/* Stage pipeline */}
          <div className="flex items-center justify-between gap-0.5 sm:gap-1 mb-2 sm:mb-3">
            {RAG_STAGES.map((stage, i) => {
              const isActive = i === activeIndex;
              const isCompleted = i < activeIndex;
              const isPending = i > activeIndex;

              return (
                <div key={stage.key} className="flex items-center flex-1 last:flex-initial">
                  {/* Stage node */}
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                    <div
                      className={`
                        rag-stage-node
                        w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center
                        transition-all duration-500 ease-out
                        ${isCompleted
                          ? "bg-primary text-on-primary scale-90"
                          : isActive
                            ? "bg-primary-container text-primary rag-stage-active border-2 border-primary"
                            : "bg-surface-container-high text-outline scale-90 opacity-50"
                        }
                      `}
                    >
                      <span
                        className={`material-symbols-outlined text-[14px] sm:text-[18px] md:text-[20px] ${isActive ? "rag-icon-pulse" : ""
                          }`}
                        style={{ fontVariationSettings: isCompleted ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {isCompleted ? "check_circle" : stage.icon}
                      </span>
                    </div>
                    <span
                      className={`text-[8px] sm:text-[10px] md:text-[11px] font-semibold font-[family-name:var(--font-lexend)] tracking-wide transition-colors duration-300 ${isActive
                          ? "text-primary"
                          : isCompleted
                            ? "text-primary/70"
                            : "text-outline/50"
                        }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {/* Connector line */}
                  {i < RAG_STAGES.length - 1 && (
                    <div className="flex-1 h-[2px] mx-0.5 sm:mx-1 md:mx-2 rounded-full overflow-hidden bg-surface-container-high self-start mt-[14px] sm:mt-[18px] md:mt-5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${isCompleted
                            ? "w-full bg-primary"
                            : isActive
                              ? "w-1/2 bg-primary/50 rag-connector-pulse"
                              : "w-0 bg-transparent"
                          }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Current stage subtitle */}
          {activeIndex >= 0 && activeIndex < RAG_STAGES.length && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-1 animate-fade-in" key={RAG_STAGES[activeIndex].key}>
              <div className="rag-spinner w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-primary/30 border-t-primary" />
              <span className="text-[11px] sm:text-xs text-on-surface-variant font-medium">
                {RAG_STAGES[activeIndex].subtitle}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chat ID Badge ──────────────────────────────────────────────
function ChatIdBadge({ sessionId }: { sessionId: string }) {
  return null;
}

// ── Welcome Greeting ───────────────────────────────────────────
function WelcomeGreeting() {
  return (
    <div className="text-center mb-6 sm:mb-8 animate-chat-message-in px-2">
      <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto mb-3 sm:mb-4 bg-primary-container rounded-full flex items-center justify-center shadow-sm overflow-hidden">
        <img
          src="/assets/BU_Dorms_LOGO.webp"
          alt="BU Dorms Logo"
          className="w-full h-full object-cover"
        />
      </div>
      <h2 className="text-lg sm:text-xl md:text-[24px] leading-[1.3] font-bold text-primary mb-1 sm:mb-2">
        สวัสดีครับ! ยินดีต้อนรับสู่ Bu Dorms
      </h2>
      <p className="text-sm sm:text-base text-outline">
        เพื่อนคู่คิดสำหรับชาว มหาวิทยาลัยกรุงเทพ (รังสิต)
      </p>
    </div>
  );
}

// ── Main ChatContent ───────────────────────────────────────────
export function ChatContent({
  messages,
  ragStage,
  sessionId,
}: {
  messages: ChatMessage[];
  ragStage: RagStage;
  sessionId?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const ragIndicatorRef = useRef<HTMLDivElement>(null);

  // Track previous state for transition detection
  const prevRagStageRef = useRef<RagStage>(null);
  const prevMessagesLenRef = useRef<number>(0);
  const scrolledSessionIdRef = useRef<string | null | undefined>(undefined);
  // Track user message refs by index
  const userMsgRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const isProcessing = ragStage !== null && ragStage !== 'done';

  // Helper: find the last user message id
  const getLastUserMsgId = useCallback((msgs: ChatMessage[]) => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") return msgs[i].id;
    }
    return null;
  }, []);

  // Scroll to a specific element, showing it near the top of the viewport
  const scrollToElement = useCallback((el: HTMLElement | null | undefined, behavior: ScrollBehavior = "smooth") => {
    if (!el || !scrollRef.current) return;
    const container = scrollRef.current;
    const offsetTop = el.offsetTop - container.offsetTop;
    container.scrollTo({ top: offsetTop - 24, behavior });
  }, []);

  // Reset on session switch
  const prevSessionIdRef = useRef<string | null | undefined>(sessionId);
  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      userMsgRefsMap.current.clear();
      prevSessionIdRef.current = sessionId;
    }
  }, [sessionId]);

  // 1) On initial load or session switch: scroll to last user message
  useEffect(() => {
    if (messages.length === 0) {
      prevMessagesLenRef.current = 0;
      return;
    }

    if (sessionId !== scrolledSessionIdRef.current) {
      scrolledSessionIdRef.current = sessionId;

      const doScroll = () => {
        const lastUserId = getLastUserMsgId(messages);
        if (lastUserId) {
          const el = userMsgRefsMap.current.get(lastUserId);
          scrollToElement(el, "auto");
        }
      };

      // Delay to handle image loading and DOM layout updates
      requestAnimationFrame(() => {
        doScroll();
        setTimeout(doScroll, 100);
        setTimeout(doScroll, 300);
        setTimeout(doScroll, 600);
      });

      prevMessagesLenRef.current = messages.length;
      return;
    }

    // 2) New user message added: scroll to show it
    const wasAdded = messages.length > prevMessagesLenRef.current;
    if (wasAdded) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "user") {
        requestAnimationFrame(() => {
          const el = userMsgRefsMap.current.get(lastMsg.id);
          scrollToElement(el, "smooth");
        });
      }
    }

    prevMessagesLenRef.current = messages.length;
  }, [messages, sessionId, getLastUserMsgId, scrollToElement]);

  // 3) When RAG starts processing: scroll to the RAG indicator (top of bot response)
  //    But don't keep following as it streams.
  useEffect(() => {
    const prevStage = prevRagStageRef.current;
    const wasIdle = prevStage === null || prevStage === 'done';
    const nowProcessing = ragStage !== null && ragStage !== 'done';

    if (wasIdle && nowProcessing) {
      // Bot just started responding — scroll to show the RAG indicator
      requestAnimationFrame(() => {
        scrollToElement(ragIndicatorRef.current);
      });
    }

    prevRagStageRef.current = ragStage;
  }, [ragStage, scrollToElement]);

  // Ref callback for user messages
  const setUserMsgRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      userMsgRefsMap.current.set(id, el);
    }
  }, []);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8 flex flex-col items-center"
    >
      <div className="w-full max-w-5xl flex flex-col gap-3 sm:gap-4 md:gap-6 pb-28 sm:pb-32 md:pb-36">
        {sessionId && <ChatIdBadge sessionId={sessionId} />}
        {messages.length === 0 && <WelcomeGreeting />}

        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} ref={setUserMsgRef(msg.id)}>
                <UserMessage text={msg.text} timestamp={msg.timestamp} />
              </div>
            );
          }
          return (
            <AssistantMessage
              key={msg.id}
              body={msg.body}
              sources={msg.sources}
              dorms={msg.dorms}
              timestamp={msg.timestamp}
            />
          );
        })}

        {isProcessing && (
          <div ref={ragIndicatorRef}>
            <RAGPipelineIndicator currentStage={ragStage} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
