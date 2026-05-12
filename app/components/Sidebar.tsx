"use client";

import { useState, startTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingScreen } from "./LoadingScreen";
import { ChatHistoryList } from "./ChatHistoryList";
import { useChatHistory } from "../contexts/ChatHistoryContext";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);
  const { startNewChat } = useChatHistory();

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    // Router redirect will happen in the onComplete prop of LoadingScreen
  };

  const handleNewChat = () => {
    startNewChat();
    setTimeout(() => {
      router.push("/app");
    }, 10);
  };

  return (
    <>
      {signingOut && (
        <LoadingScreen 
          message="กำลังออกจากระบบ..." 
          onComplete={() => router.replace("/")}
          durationInMs={1000}
        />
      )}
      <aside className="hidden lg:flex flex-col h-screen w-80 bg-surface-container-lowest rounded-r-[40px] py-6 soft-shadow z-20">
        {/* Header */}
        <div className="px-6 mb-4 flex items-center gap-3">
        <div className="w-12 h-12 shrink-0 flex items-center justify-center overflow-hidden">
          <img
            alt="BU Dorms Logo"
            className="w-full h-full object-contain"
            src="/assets/BU_Dorms_LOGO.webp"
          />
        </div>
        <div>
          <h1 className="text-[20px] font-black text-primary tracking-tight leading-[1.2]">
            BU Dorms
          </h1>
          <p className="text-[12px] leading-none tracking-[0.05em] font-semibold uppercase text-on-surface-variant/70 font-[family-name:var(--font-lexend)]">
            Soft Utility Chat
          </p>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-4 mb-2">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-3 rounded-full px-4 py-3 transition-all duration-200 bg-primary-container text-on-primary-container font-bold hover:bg-primary-container/80 active:scale-95 cursor-pointer"
        >
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            add_comment
          </span>
          New Chat
        </button>
      </div>

      {/* Chat History Section */}
<div className="flex-1 overflow-y-auto px-2 [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:display-none"> 
  <div className="px-4 py-2">
    <p className="text-xs uppercase tracking-wider text-outline font-semibold font-[family-name:var(--font-lexend)]">
      Recent Chats
    </p>
  </div>
  <ChatHistoryList />
</div>

      {/* Footer */}
      <div className="px-6 mt-auto space-y-4">
        <div className="space-y-1">
          <Link
            href="/app/settings"
            className={`flex items-center gap-3 px-4 py-2 rounded-full transition-colors ${
              pathname === "/app/settings"
                ? "bg-primary-container text-on-primary-container font-bold"
                : "text-on-surface-variant hover:text-primary hover:bg-primary-container/20"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={pathname === "/app/settings" ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              settings
            </span>
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 text-on-surface-variant hover:text-error px-4 py-2 hover:bg-error-container/30 rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
