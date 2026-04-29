"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/app", icon: "add_comment", label: "New Chat", filled: true },
  { href: "/app/history", icon: "history", label: "History", filled: false },
  { href: "#", icon: "folder_open", label: "Library", filled: false },
  { href: "/app/settings", icon: "settings", label: "Settings", filled: false },
];

export function MobileTopBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const pathname = usePathname();

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
        <span className="text-xl font-black text-primary tracking-tighter">Puffin AI</span>

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
            <div className="px-6 mb-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border-2 border-surface-container-lowest soft-shadow">
                <img
                  alt="Cute mascot avatar"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrHFgf-9sIi5CgDWic4VMSAKnmGwZH9BBFLSDPgRngudW_pT8UnEKpFmhBan7GYu2TctOAHYOO98fyUof-DMuZGlXD9z-UJ6ahVFvqAxOY2pc6MhX93c6WP3UnwHt4jHJ_6oUYVDXsd4Ceq2VAdRWIe2LXay0zPxQsRbP0ZK6HluYyLjbQ85yiWzHGnibtzyMd52wwoG7sxtavfu63C9JuIOSdiXlIIW8lGFp6uXk9BQy8l0cPsYKVgKYOQZi_ZUnRy6bYbbs3pmzR"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-[20px] font-black text-primary tracking-tight leading-[1.2]">
                  Puffin AI
                </h1>
                <p className="text-[12px] leading-none tracking-[0.05em] font-semibold uppercase text-on-surface-variant/70 font-[family-name:var(--font-lexend)]">
                  Soft Utility Chat
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = item.href !== "#" && pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={handleClose}
                    className={`flex items-center gap-3 rounded-full mx-2 px-4 py-3 transition-all duration-200 ${
                      isActive
                        ? "bg-primary-container text-on-primary-container font-bold scale-95 active:scale-90"
                        : "text-on-surface-variant hover:text-primary hover:bg-primary-container/20 active:scale-95"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="px-6 mt-auto space-y-4">
              <div className="space-y-1">
                <a
                  className="flex items-center gap-3 text-on-surface-variant hover:text-primary px-4 py-2 hover:bg-primary-container/20 rounded-full transition-colors"
                  href="#"
                >
                  <span className="material-symbols-outlined">help_outline</span>
                  Help
                </a>
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
