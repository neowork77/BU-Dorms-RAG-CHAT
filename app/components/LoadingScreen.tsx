"use client";

import { useEffect, useState, useRef } from "react";

interface LoadingScreenProps {
  message?: string;
  onComplete?: () => void;
  durationInMs?: number;
}

/* ── Floating particle used for the orbital animation ─────────── */
function FloatingParticle({ delay, size, orbitRadius, duration }: {
  delay: number; size: number; orbitRadius: number; duration: number;
}) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, var(--md-primary) 0%, transparent 70%)`,
        opacity: 0.5,
        animation: `orbit ${duration}s linear ${delay}s infinite`,
        top: `calc(50% - ${size / 2}px)`,
        left: `calc(50% - ${size / 2}px)`,
        transformOrigin: `0px ${orbitRadius}px`,
      }}
    />
  );
}

export function LoadingScreen({
  message = "Loading...",
  onComplete,
  durationInMs = 2500,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const hasCompleted = useRef(false);

  /* ── Particle config – deterministic to avoid SSR hydration mismatch ── */
  const particles = [
    { id: 0, delay: 0,    size: 5,   orbitRadius: 60,  duration: 3.8 },
    { id: 1, delay: 0.35, size: 7,   orbitRadius: 72,  duration: 4.5 },
    { id: 2, delay: 0.7,  size: 4.5, orbitRadius: 66,  duration: 3.6 },
    { id: 3, delay: 1.05, size: 6,   orbitRadius: 58,  duration: 5.0 },
    { id: 4, delay: 1.4,  size: 5.5, orbitRadius: 78,  duration: 4.2 },
    { id: 5, delay: 1.75, size: 7.5, orbitRadius: 62,  duration: 3.9 },
    { id: 6, delay: 2.1,  size: 4,   orbitRadius: 74,  duration: 4.8 },
    { id: 7, delay: 2.45, size: 6.5, orbitRadius: 68,  duration: 5.2 },
  ];

  /* ── Progress timer ──────────────────────────────────────────── */
  useEffect(() => {
    const updateInterval = 20;
    const steps = durationInMs / updateInterval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, updateInterval);

    return () => clearInterval(timer);
  }, [durationInMs]);

  /* ── Fire onComplete once ───────────────────────────────────── */
  useEffect(() => {
    if (progress >= 100 && onComplete && !hasCompleted.current) {
      hasCompleted.current = true;
      // Wrap in setTimeout to ensure it runs independently of React's current transition
      setTimeout(() => {
        onComplete();
      }, 0);
    }
  }, [progress, onComplete]);

  const displayPercent = Math.floor(progress);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
      {/* ── Full-screen gradient backdrop ──────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 45%, var(--md-primary-container) 0%, transparent 70%),
            var(--md-surface)
          `,
        }}
      />

      {/* ── Content (no card wrapper) ─────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center px-6 py-10 mx-4 max-w-[340px] w-full">
        {/* ── Logo ring ─────────────────────────────────────── */}
        <div className="relative w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] mb-7 sm:mb-9">
          {/* Orbital particles */}
          <div className="absolute inset-0">
            {particles.map((p) => (
              <FloatingParticle key={p.id} {...p} />
            ))}
          </div>

          {/* Spinning glow ring */}
          <div
            className="absolute inset-[-6px] sm:inset-[-8px] rounded-full"
            style={{
              background: `conic-gradient(
                from 0deg,
                var(--md-primary) 0%,
                var(--md-tertiary) 30%,
                transparent 50%,
                transparent 80%,
                var(--md-primary) 100%
              )`,
              animation: "spinRing 2s linear infinite",
              opacity: 0.65,
            }}
          />
          {/* Ring mask (inner cutout) */}
          <div
            className="absolute inset-[-2px] sm:inset-[-3px] rounded-full"
            style={{ background: "var(--md-surface)" }}
          />

          {/* Soft glow behind logo */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: `0 0 40px 8px color-mix(in srgb, var(--md-primary) 25%, transparent)`,
              animation: "glowPulse 2.5s ease-in-out infinite",
            }}
          />

          {/* Logo image */}
          <div className="relative w-full h-full rounded-full overflow-hidden ring-2 ring-surface-container-lowest shadow-lg">
            <img
              alt="BU Dorms Loading"
              className="w-full h-full object-cover"
              src="/assets/BU_Dorms_LOGO.webp"
            />
          </div>
        </div>

        {/* ── Message ───────────────────────────────────────── */}
        <p
          className="text-base sm:text-lg font-semibold text-on-surface mb-6 sm:mb-8 tracking-wide font-[family-name:var(--font-lexend)]"
          style={{ animation: "textFadeInOut 2.4s ease-in-out infinite" }}
        >
          {message}
        </p>

        {/* ── Progress bar ──────────────────────────────────── */}
        <div className="w-full max-w-[240px] sm:max-w-[260px]">
          <div
            className="relative w-full h-[6px] rounded-full overflow-hidden"
            style={{ background: "var(--md-surface-container-highest)" }}
          >
            {/* Bar fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75 ease-linear"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, var(--md-primary), var(--md-tertiary))`,
              }}
            />
            {/* Shimmer sweep */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.8s ease-in-out infinite",
              }}
            />
          </div>

          {/* Percentage label */}
          <p className="mt-3 text-center text-xs sm:text-sm font-bold text-on-surface-variant/70 tabular-nums font-[family-name:var(--font-lexend)]">
            {displayPercent}%
          </p>
        </div>
      </div>

      {/* ── Inline keyframes (component-scoped) ────────────────── */}
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateY(-1px); }
          to   { transform: rotate(360deg) translateY(-1px); }
        }
        @keyframes spinRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50%      { opacity: 0.85; transform: scale(1.06); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes textFadeInOut {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
