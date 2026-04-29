"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "../components/Sidebar";
import { MobileTopBar } from "../components/MobileTopBar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setIsAuthed(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [supabase, router]);

  // Show a minimal loading state while checking auth
  if (isChecking || !isAuthed) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-page-fade-in">
          <div className="w-12 h-12 border-4 border-primary-container border-t-primary rounded-full animate-spin" />
          <p className="text-on-surface-variant text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-background text-on-background flex">
      <Sidebar />
      <main className="flex-1 flex flex-col relative min-w-0 bg-background">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(var(--md-primary) 2px, transparent 2px)",
            backgroundSize: "32px 32px",
          }}
        />
        <MobileTopBar />
        {children}
      </main>
    </div>
  );
}
