"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChatHistoryList } from "./ChatHistoryList";
import { useChatHistory } from "../contexts/ChatHistoryContext";

export function MobileTopBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { startNewChat } = useChatHistory();

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200); // Matches the animation duration
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
    startNewChat();
    router.push("/app");
    handleClose();
  };

  return (
    <>
      <header className="md:hidden flex items-center justify-between w-full px-4 py-3 bg-surface-container-lowest/80 backdrop-blur-md border-b border-surface-variant/30 z-40 sticky top-0 shadow-sm">
        {/* Hamburger */}
        <button
          onClick={() => setIsOpen(true)}
          className="text-on-surface-variant hover:bg-primary-container/30 rounded-full p-2 transition-colors active:scale-90"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        {/* Title */}
        <span className="text-xl font-black text-primary tracking-tighter">BU Dorms</span>

        {/* Right actions */}
        <button className="text-on-surface-variant hover:bg-primary-container/30 rounded-full p-2 transition-colors active:scale-90">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </header>

      {/* Mobile Sidebar Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
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
            <div className="flex-1 overflow-y-auto px-0">
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
                <a
                  className="flex items-center gap-3 text-on-surface-variant hover:text-primary px-4 py-2 hover:bg-primary-container/20 rounded-full transition-colors"
                  href="#"
                >
                  <span className="material-symbols-outlined">logout</span>
                  Logout
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
