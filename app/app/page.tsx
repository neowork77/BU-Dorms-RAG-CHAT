"use client";

import { useState, useCallback } from "react";
import { ChatContent, type ChatMessage } from "../components/ChatContent";
import { ChatInputBar } from "../components/ChatInputBar";

// ── Unique ID helper ───────────────────────────────────────────
let idCounter = 0;
function uid() {
  return `msg-${Date.now()}-${++idCounter}`;
}

// ── Mock reply engine ──────────────────────────────────────────
interface MockReply {
  body: React.ReactNode;
  sources: { icon: string; label: string }[];
}

function mockReply(text: string): MockReply {
  const lower = text.toLowerCase();

  if (lower.includes("onboarding") || lower.includes("user research")) {
    return {
      body: (
        <>
          <p className="mb-4">
            Based on the Q3 User Research, there are three primary findings
            concerning the onboarding flow:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-4 text-on-surface-variant">
            <li>
              <strong>Time to Value:</strong> Users feel it takes too long to
              reach the core dashboard. 42% dropped off at step 3.
            </li>
            <li>
              <strong>Clarity:</strong> The explanation of the &apos;Sync&apos;
              feature is confusing; users often skip it rather than reading the
              tooltip.
            </li>
            <li>
              <strong>Visual Overload:</strong> The final configuration screen
              presents too many options at once, causing decision paralysis.
            </li>
          </ul>
          <p>
            The overarching recommendation is to simplify the process into
            bite-sized steps and defer advanced configurations to a later
            post-signup state.
          </p>
        </>
      ),
      sources: [
        { icon: "description", label: "[1] Q3_Research_Report.pdf" },
        { icon: "database", label: "[2] UX_Knowledge_Base" },
      ],
    };
  }

  if (lower.includes("configuration") || lower.includes("progressive")) {
    return {
      body: (
        <p>
          The report suggests replacing the dense configuration screen with a
          &quot;Progressive Disclosure&quot; model. Instead of showing all 15
          settings upfront, ask for only the 3 essential settings needed to
          start. The remaining settings should be introduced gradually through
          contextual in-app prompts over the user&apos;s first week.
        </p>
      ),
      sources: [
        {
          icon: "description",
          label: "[1] Q3_Research_Report.pdf (Page 14)",
        },
      ],
    };
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("สวัสดี")) {
    return {
      body: (
        <p>
          สวัสดีครับ! 👋 ผมคือ Puffin AI ผู้ช่วยอัจฉริยะของคุณ พร้อมช่วยค้นหาข้อมูล สรุปเอกสาร
          และตอบคำถามต่าง ๆ ได้ทันที มีอะไรให้ช่วยไหมครับ?
        </p>
      ),
      sources: [],
    };
  }

  if (lower.includes("help") || lower.includes("ช่วย")) {
    return {
      body: (
        <>
          <p className="mb-4">
            ผมสามารถช่วยคุณได้หลายอย่าง เช่น:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-on-surface-variant">
            <li>🔍 ค้นหาข้อมูลจากไฟล์เอกสารในระบบ</li>
            <li>📄 สรุปเนื้อหาจากรายงาน PDF</li>
            <li>💡 ให้คำแนะนำและ insights จากข้อมูลที่มี</li>
            <li>📊 วิเคราะห์แนวโน้มจากฐานข้อมูล</li>
          </ul>
        </>
      ),
      sources: [
        { icon: "info", label: "[1] Puffin_User_Guide" },
      ],
    };
  }

  if (lower.includes("summary") || lower.includes("summarize") || lower.includes("สรุป")) {
    return {
      body: (
        <>
          <p className="mb-4">
            Here&apos;s a summary of the most recent documents in your library:
          </p>
          <ul className="list-disc pl-5 space-y-2 mb-4 text-on-surface-variant">
            <li>
              <strong>Project Roadmap Q4:</strong> 12 features planned, 3 are
              high-priority items related to user retention.
            </li>
            <li>
              <strong>Design System v2.1:</strong> Updated color tokens and
              component library with accessibility improvements.
            </li>
            <li>
              <strong>Sprint Retrospective:</strong> Team velocity increased
              by 15% after adopting the new task breakdown process.
            </li>
          </ul>
          <p>Would you like me to dig deeper into any of these?</p>
        </>
      ),
      sources: [
        { icon: "description", label: "[1] Project_Roadmap_Q4.pdf" },
        { icon: "description", label: "[2] Design_System_v2.1.pdf" },
        { icon: "description", label: "[3] Sprint_Retro_Notes.pdf" },
      ],
    };
  }

  // Fallback — generic smart-sounding response
  const fallbackResponses: MockReply[] = [
    {
      body: (
        <p>
          That&apos;s a great question! I searched through your knowledge base
          and found some related context, but I don&apos;t have an exact match
          for that query. Could you try rephrasing, or would you like me to
          search a specific document?
        </p>
      ),
      sources: [{ icon: "search", label: "[1] Knowledge_Base_Search" }],
    },
    {
      body: (
        <>
          <p className="mb-4">
            I analyzed your request and here&apos;s what I found:
          </p>
          <p>
            Based on the available documents, this topic appears in several
            files but hasn&apos;t been consolidated into a single report yet.
            I&apos;d recommend creating a dedicated summary document. Want me
            to draft an outline?
          </p>
        </>
      ),
      sources: [
        { icon: "database", label: "[1] Document_Index" },
        { icon: "analytics", label: "[2] Topic_Analysis" },
      ],
    },
    {
      body: (
        <p>
          ผมได้ค้นหาข้อมูลที่เกี่ยวข้องกับคำถามของคุณแล้ว พบว่ามีข้อมูลอ้างอิงบางส่วน
          แต่ยังไม่ครบถ้วนทั้งหมด ต้องการให้ผมค้นหาเพิ่มเติมในหมวดหมู่ใดเป็นพิเศษไหมครับ?
        </p>
      ),
      sources: [
        { icon: "folder", label: "[1] Document_Library" },
      ],
    },
  ];

  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

// ── Page Component ─────────────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    // 1. Add user message
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // 2. Show typing indicator
    setIsTyping(true);

    // 3. After a realistic delay, add assistant reply
    const delay = 800 + Math.random() * 700; // 800–1500ms
    setTimeout(() => {
      const reply = mockReply(trimmed);
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        body: reply.body,
        sources: reply.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, delay);
  }, [input, isTyping]);

  return (
    <>
      <ChatContent messages={messages} isTyping={isTyping} />
      <ChatInputBar
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isTyping}
      />
    </>
  );
}
