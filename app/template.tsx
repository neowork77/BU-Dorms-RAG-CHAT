"use client";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-page-fade-in flex-1 flex flex-col">
      {children}
    </div>
  );
}
