"use client";

import {
  useRef,
  useEffect,
  useState,
  createContext,
  useContext,
  useMemo,
  Children,
  isValidElement,
  cloneElement,
} from "react";

// ── Types ──────────────────────────────────────────────────────
export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      body: React.ReactNode;
      sources: { icon: string; label: string }[];
    };

// ── Typewriter Effect ──────────────────────────────────────────
const TypewriterContext = createContext<number>(Number.MAX_SAFE_INTEGER);

function WordSpan({ index, word }: { index: number; word: string }) {
  const visibleWords = useContext(TypewriterContext);
  if (index >= visibleWords) {
    return <span style={{ display: "none" }}>{word}</span>;
  }
  return <span>{word}</span>;
}

function TypewriterEffect({
  content,
  speedMs = 80, // Slower typing speed
  onStep,
  onComplete,
}: {
  content: React.ReactNode;
  speedMs?: number;
  onStep?: () => void;
  onComplete?: () => void;
}) {
  const [visibleWords, setVisibleWords] = useState(0);

  const { node, totalWords } = useMemo(() => {
    let globalWordIndex = 0;
    function traverse(node: React.ReactNode): React.ReactNode {
      if (typeof node === "string") {
        const words = node.split(/(\s+)/);
        return (
          <>
            {words.map((word, i) => {
              if (word.trim() === "") return word;
              const currentIdx = globalWordIndex++;
              return (
                <WordSpan
                  key={`${currentIdx}-${i}`}
                  index={currentIdx}
                  word={word}
                />
              );
            })}
          </>
        );
      }
      if (isValidElement(node)) {
        const props = node.props as Record<string, unknown>;
        const children = Children.toArray(
          props.children as React.ReactNode
        );
        if (children.length > 0) {
          const newChildren = children.map((child) => traverse(child));
          return cloneElement(
            node as React.ReactElement<Record<string, unknown>>,
            { ...props, key: node.key || Math.random() },
            ...newChildren
          );
        }
        return node;
      }
      if (Array.isArray(node)) {
        return node.map((n) => traverse(n));
      }
      return node;
    }
    return { node: traverse(content), totalWords: globalWordIndex };
  }, [content]);

  useEffect(() => {
    if (visibleWords < totalWords) {
      const timer = setTimeout(() => {
        const next = visibleWords + 1;
        setVisibleWords(next);
        if (onStep) onStep();
        if (next === totalWords && onComplete) {
          onComplete();
        }
      }, speedMs + Math.random() * 30);
      return () => clearTimeout(timer);
    } else if (visibleWords >= totalWords && onComplete && totalWords === 0) {
      onComplete();
    }
  }, [visibleWords, totalWords, speedMs, onStep, onComplete]);

  return (
    <TypewriterContext.Provider value={visibleWords}>
      {node}
    </TypewriterContext.Provider>
  );
}

// ── Sub-components ─────────────────────────────────────────────
function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end w-full animate-chat-message-in">
      <div className="max-w-[85%] bg-secondary-container text-on-secondary-container rounded-[2rem] rounded-tr-sm p-5 border-2 border-secondary-fixed-dim/50 soft-shadow overflow-hidden">
        <p className="whitespace-pre-wrap break-words break-all md:break-words">{text}</p>
      </div>
    </div>
  );
}

function AssistantMessage({
  body,
  sources,
  animate = false,
  onTypingStep,
}: {
  body: React.ReactNode;
  sources: { icon: string; label: string }[];
  animate?: boolean;
  onTypingStep?: () => void;
}) {
  const [typingComplete, setTypingComplete] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setTypingComplete(true);
    }
  }, [animate]);

  return (
    <div className="flex justify-start w-full animate-chat-message-in">
      <div className="max-w-[85%] flex gap-3">
        {/* AI Avatar */}
        <div className="w-8 h-8 shrink-0 rounded-full bg-primary-container flex items-center justify-center mt-1 border border-primary-fixed-dim shadow-sm">
          <span
            className="material-symbols-outlined text-sm text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
        </div>
        <div className="flex flex-col gap-3 w-full overflow-hidden">
          <div className="bg-surface-container-lowest text-on-surface rounded-[2rem] rounded-tl-sm p-6 border-2 border-primary-container soft-shadow whitespace-pre-wrap break-words">
            {animate && !typingComplete ? (
              <TypewriterEffect
                content={body}
                onStep={onTypingStep}
                onComplete={() => setTypingComplete(true)}
              />
            ) : (
              body
            )}
          </div>
          {/* Source Cards */}
          {typingComplete && sources.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-2 animate-fade-in">
              <span className="text-xs uppercase tracking-wider flex items-center mr-2 text-outline font-[family-name:var(--font-lexend)]">
                Sources:
              </span>
              {sources.map((source) => (
                <button
                  key={source.label}
                  className="flex items-center gap-1.5 bg-surface-container-lowest/60 backdrop-blur-sm border border-tertiary-container text-on-tertiary-container px-3 py-1.5 rounded-full text-sm font-medium hover:bg-tertiary-container transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {source.icon}
                  </span>
                  {source.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Typing Indicator ───────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start w-full animate-chat-message-in">
      <div className="flex gap-3">
        {/* AI Avatar */}
        <div className="w-8 h-8 shrink-0 rounded-full bg-primary-container flex items-center justify-center mt-1 border border-primary-fixed-dim shadow-sm">
          <span
            className="material-symbols-outlined text-sm text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
        </div>
        <div className="bg-surface-container-lowest text-on-surface rounded-[2rem] rounded-tl-sm px-6 py-5 border-2 border-primary-container soft-shadow flex items-center gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-primary/60" />
          <span className="typing-dot w-2 h-2 rounded-full bg-primary/60" />
          <span className="typing-dot w-2 h-2 rounded-full bg-primary/60" />
        </div>
      </div>
    </div>
  );
}

// ── Welcome Greeting ───────────────────────────────────────────
function WelcomeGreeting() {
  return (
    <div className="text-center mb-8 animate-chat-message-in">
      <div className="w-20 h-20 mx-auto mb-4 bg-tertiary-container rounded-full flex items-center justify-center shadow-sm">
        <span
          className="material-symbols-outlined text-4xl text-on-tertiary-container"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          eco
        </span>
      </div>
      <h2 className="text-[24px] leading-[1.3] font-bold text-primary mb-2">
        How can I help you today?
      </h2>
      <p className="text-outline">
        Search your library or ask me anything.
      </p>
    </div>
  );
}

// ── Main ChatContent ───────────────────────────────────────────
export function ChatContent({
  messages,
  isTyping,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center"
    >
      <div className="w-full max-w-5xl flex flex-col gap-6 pb-36">
        {messages.length === 0 && <WelcomeGreeting />}

        {messages.map((msg, index) => {
          if (msg.role === "user") {
            return <UserMessage key={msg.id} text={msg.text} />;
          }
          // Animate only the very last message in the list
          const isLastMessage = index === messages.length - 1;
          return (
            <AssistantMessage
              key={msg.id}
              body={msg.body}
              sources={msg.sources}
              animate={isLastMessage && !isTyping}
              onTypingStep={scrollToBottom}
            />
          );
        })}

        {isTyping && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
