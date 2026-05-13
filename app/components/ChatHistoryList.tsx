"use client";

import { useState, useRef, useEffect, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useChatHistory } from "../contexts/ChatHistoryContext";

export function ChatHistoryList({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sessions,
    activeSessionId,
    selectSession,
    renameSession,
    deleteSession,
    startNewChat,
  } = useChatHistory();

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if ((e.target as Element).closest('.menu-toggle-btn')) {
          return;
        }
        setMenuOpenId(null);
      }
    }
    if (menuOpenId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpenId]);

  // Auto-focus rename input
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleRenameSubmit = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      renameSession(id, trimmed);
    }
    setRenamingId(null);
  };

  const handleSelect = (id: string) => {
    if (onItemClick) {
      onItemClick();
      if (pathname !== `/app/${id}`) {
        setTimeout(() => {
          router.push(`/app/${id}`);
        }, 250);
      }
    } else {
      if (pathname !== `/app/${id}`) {
        setTimeout(() => {
          router.push(`/app/${id}`);
        }, 10);
      }
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <span className="material-symbols-outlined text-3xl text-outline/40 mb-2 block">
          chat_bubble_outline
        </span>
        <p className="text-sm text-on-surface-variant/60">
          ยังไม่มีประวัติแชท
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {sessions.map((session, index) => {
        const isLast = index === sessions.length - 1;
        const isActive = session.id === activeSessionId && (pathname === "/app" || pathname === `/app/${session.id}`);
        const isRenaming = session.id === renamingId;

        return (
          <li key={session.id} className="relative group mx-2">
            <div
              className={`flex items-center justify-between px-3 py-2 text-sm rounded-full transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-variant"
              }`}
              onClick={() => !isRenaming && handleSelect(session.id)}
            >
              {/* Title or rename input */}
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameSubmit(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit(session.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-transparent border-b-2 border-primary text-sm outline-none text-on-surface py-0.5"
                />
              ) : (
                <span className="truncate flex-1 min-w-0">
                  {session.title}
                </span>
              )}

              {/* 3-dot menu button */}
              {!isRenaming && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === session.id ? null : session.id);
                  }}
                  className={`menu-toggle-btn shrink-0 rounded-full p-1 transition-all flex items-center justify-center ${
                    menuOpenId === session.id
                      ? "opacity-100 bg-surface-container-high text-on-surface"
                      : "opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] cursor-pointer">
                    more_horiz
                  </span>
                </button>
              )}
            </div>

            {/* Dropdown menu */}
            {menuOpenId === session.id && (
              <div
                ref={menuRef}
                className={`absolute right-0 ${isLast ? 'bottom-full mb-1' : 'top-full mt-1'} bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/20 py-1.5 z-50 min-w-[140px] animate-fade-in`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameValue(session.title);
                    setRenamingId(session.id);
                    setMenuOpenId(null);
                  }}
                  className="cursor-pointer w-full flex items-center gap-2.5 px-4 py-2 text-sm text-on-surface hover:bg-surface-container-high/60 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                    if (pathname === `/app/${session.id}`) {
                      setTimeout(() => {
                        router.push("/app");
                      }, 10);
                    }
                    setMenuOpenId(null);
                  }}
                  className="cursor-pointer w-full flex items-center gap-2.5 px-4 py-2 text-sm text-error hover:bg-error-container/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Delete
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
