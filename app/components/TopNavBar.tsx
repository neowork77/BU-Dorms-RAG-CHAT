"use client";

import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import { useState, useEffect } from "react";

interface TopNavBarProps {
  onNavClick?: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
  minimal?: boolean;
}

export function TopNavBar({ onNavClick, minimal }: TopNavBarProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    if (onNavClick) {
      onNavClick(e, targetId);
    }
  };

  const { theme, setTheme, resolved } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="shrink-0 sticky top-0 z-50 w-full h-[80px] bg-surface-container-lowest/80 backdrop-blur-md border-b border-primary-container/20 shadow-[0_20px_40px_rgba(184,228,213,0.12)]">
      <div className="flex justify-between items-center w-full h-full px-6 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl font-[800] text-on-surface tracking-tighter">
            BU Dorms
          </span>
        </Link>
        {!minimal && (
          <>
            <nav className="hidden md:flex items-center gap-8 font-medium text-sm tracking-tight">
              <a
                href="#features"
                onClick={(e) => handleClick(e, "#features")}
                className="text-on-surface-variant transition-colors hover:text-primary hover:scale-105 transition-transform"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => handleClick(e, "#how-it-works")}
                className="text-on-surface-variant transition-colors hover:text-primary hover:scale-105 transition-transform"
              >
                How It Works
              </a>
              <a
                href="#cta"
                onClick={(e) => handleClick(e, "#cta")}
                className="text-on-surface-variant transition-colors hover:text-primary hover:scale-105 transition-transform"
              >
                Get Started
              </a>
            </nav>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-primary font-medium text-sm tracking-tight px-6 py-2 rounded-full border-2 border-primary/30 hover:bg-primary-container/30 hover:scale-105 transition-all"
              >
                Login
              </Link>

              {/* Theme Toggle Button */}
              {mounted && (
                <button
                  onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
                  className="cursor-pointer p-2 rounded-full bg-surface-container hover:bg-surface-container-high active:scale-95 transition-all text-on-surface border border-outline-variant/30 flex items-center justify-center w-10 h-10 shadow-sm relative overflow-hidden"
                  aria-label="Toggle theme"
                >
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${resolved === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5" />
                      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                    </svg>
                  </div>
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${resolved !== "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  </div>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
