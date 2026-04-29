"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingScreen } from "./LoadingScreen";

const navItems = [
  { href: "/app", icon: "add_comment", label: "New Chat", filled: true },
  { href: "/app/history", icon: "history", label: "History", filled: false },
  { href: "#", icon: "folder_open", label: "Library", filled: false },
  { href: "/app/settings", icon: "settings", label: "Settings", filled: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    // Router redirect will happen in the onComplete prop of LoadingScreen
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
      <aside className="hidden md:flex flex-col h-screen w-72 bg-surface-container-lowest rounded-r-[40px] py-6 soft-shadow z-20">
        {/* Header */}
        <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border-2 border-surface-container-lowest soft-shadow">
          <img
            alt="Cute mascot avatar"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrHFgf-9sIi5CgDWic4VMSAKnmGwZH9BBFLSDPgRngudW_pT8UnEKpFmhBan7GYu2TctOAHYOO98fyUof-DMuZGlXD9z-UJ6ahVFvqAxOY2pc6MhX93c6WP3UnwHt4jHJ_6oUYVDXsd4Ceq2VAdRWIe2LXay0zPxQsRbP0ZK6HluYyLjbQ85yiWzHGnibtzyMd52wwoG7sxtavfu63C9JuIOSdiXlIIW8lGFp6uXk9BQy8l0cPsYKVgKYOQZi_ZUnRy6bYbbs3pmzR"
          />
        </div>
        <div>
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
