"use client";

import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChatHistoryList } from "./ChatHistoryList";
import { useChatHistory } from "../contexts/ChatHistoryContext";
import { createClient } from "@/lib/supabase/client";
import { LoadingScreen } from "./LoadingScreen";

export function MobileTopBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);
  const { startNewChat } = useChatHistory();

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200); // Matches the animation duration
  };

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
  };

  // Close drawer on route change
  useEffect(() => {
    if (isOpen) {
      handleClose();
    }
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleNewChat = () => {
    handleClose();
    setTimeout(() => {
      startNewChat();
      router.push("/app");
    }, 250);
  };

  return (
    <>
      {signingOut && (
        <LoadingScreen 
          message="กำลังออกจากระบบ..." 
          onComplete={() => router.replace("/")}
        />
      )}
      <header className="lg:hidden flex items-center justify-between w-full px-4 py-3 bg-surface-container-lowest/80 backdrop-blur-md border-b border-surface-variant/30 z-40 sticky top-0 shadow-sm">
        {/* Hamburger */}
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-10 h-10 text-on-surface-variant hover:bg-primary-container/30 rounded-full transition-colors active:scale-90"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Title */}
        <span className="text-xl font-black text-primary tracking-tighter">BU Dorms</span>

        {/* Right spacer to keep title centered */}
        <div className="w-10 h-10 shrink-0" />
      </header>

      {/* Mobile Sidebar Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-on-surface/40 backdrop-blur-sm ${
              isClosing ? "animate-[fadeOut_200ms_ease-in_forwards]" : "animate-[fadeIn_200ms_ease-out]"
            }`}
            onClick={handleClose}
          />

          {/* Drawer */}
          <aside
            className={`absolute top-0 left-0 h-full w-72 bg-surface-container-lowest rounded-r-3xl py-6 soft-shadow flex flex-col ${
              isClosing ? "animate-[slideOutLeft_200ms_ease-in_forwards]" : "animate-[slideInLeft_250ms_ease-out]"
            }`}
          >
            {/* Header */}
            <div className="px-6 mb-4 flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center overflow-hidden">
                <img
                  alt="BU Dorms Logo"
                  className="w-full h-full object-contain"
                  src="/assets/BU_Dorms_LOGO.webp"
                />
              </div>
              <div className="flex-1">
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
                className="w-full flex items-center justify-center gap-3 rounded-full px-4 py-3 transition-all duration-200 bg-primary-container text-on-primary-container font-bold hover:bg-primary-container/80 active:scale-95"
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

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto px-0 scrollbar-hide">
              <div className="px-6 py-2">
                <p className="text-xs uppercase tracking-wider text-outline font-semibold font-[family-name:var(--font-lexend)]">
                  Recent Chats
                </p>
              </div>
              <ChatHistoryList onItemClick={handleClose} />
            </div>

            {/* Footer */}
            <div className="px-6 mt-auto space-y-4">
              <div className="space-y-1">
                <Link
                  href="/app/settings"
                  onClick={handleClose}
                  className="flex items-center gap-3 text-on-surface-variant hover:text-primary px-4 py-2 hover:bg-primary-container/20 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">settings</span>
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 text-on-surface-variant hover:text-error px-4 py-2 hover:bg-error-container/30 rounded-full transition-colors cursor-pointer text-left"
                >
                  <span className="material-symbols-outlined">logout</span>
                  Logout
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
