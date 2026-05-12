"use client";

import { useEffect, useState, useRef } from "react";

interface LoadingScreenProps {
  message?: string;
  onComplete?: () => void;
  durationInMs?: number;
}

export function LoadingScreen({ 
  message = "Loading...", 
  onComplete,
  durationInMs = 1500 
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const hasCompleted = useRef(false);

  useEffect(() => {
    const updateInterval = 20;
    const steps = durationInMs / updateInterval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const nextProgress = prev + increment;
        if (nextProgress >= 100) {
          clearInterval(timer);
          return 100;
        }
        return nextProgress;
      });
    }, updateInterval);

    return () => clearInterval(timer);
  }, [durationInMs]);

  useEffect(() => {
    if (progress >= 100 && onComplete && !hasCompleted.current) {
      hasCompleted.current = true;
      // Wrap in setTimeout to ensure it runs independently of React's current transition
      setTimeout(() => {
        onComplete();
      }, 0);
    }
  }, [progress, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface/80 backdrop-blur-sm">
      {/* Decorative pulse background */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 bg-primary-container rounded-full animate-ping opacity-60"></div>
        {/* Mascot Container */}
        <div className="relative rounded-full bg-surface-container-lowest shadow-[0_8px_32px_rgba(184,228,213,0.5)] flex items-center justify-center p-1 border-[3px] border-surface z-10 w-full h-full animate-bounce">
          <img
            alt="BU Dorms Loading"
            className="w-full h-full object-cover rounded-full"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmJvQr_APtG54fqavHn3DLw8z6CRhPEAr4TtIYa-P-Z1-D8nsFEX0VV7Jk1gCU9qFe3eK6BBm-8I7RVsrroEsqVnjQF-fBtxMqmLZqp4Fo6g7nmHXSNgShPh_1ADb5vbT7QU8Sh1H2fo5hFqouhHrseOQzWDCr955v7EQZxklgc4MVpJHxaCowKKfkd-gUB1eoKJsfC_xaTBOdnB03ZNecWh1GOA8bJiimdXSnAZrvd18tTCkOJBGeKke75J1L0DGEmyUZQHRTd_EO"
          />
        </div>
      </div>
      
      <h2 className="text-xl font-bold text-on-surface animate-pulse font-[family-name:var(--font-lexend)] mb-6">
        {message}
      </h2>

      {/* Energy Bar */}
      <div className="w-64 h-3 bg-surface-container-highest rounded-full overflow-hidden shadow-inner relative">
        <div 
          className="h-full bg-gradient-to-r from-primary to-tertiary transition-all duration-75 ease-linear rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-3 text-sm font-bold text-on-surface-variant font-[family-name:var(--font-lexend)]">
        {Math.floor(progress)}%
      </div>
    </div>
  );
}
