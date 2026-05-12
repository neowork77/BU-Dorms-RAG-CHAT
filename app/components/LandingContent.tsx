"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { TopNavBar } from "./TopNavBar";

// ── Scroll-reveal hook ─────────────────────────────────────────
function useScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = container.querySelectorAll("[data-reveal]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          const delay = el.dataset.revealDelay || "0";
          if (entry.isIntersecting) {
            el.style.transitionDelay = `${delay}ms`;
            el.classList.add("revealed");
          } else {
            // Reset when scrolled out so it fades in again next time
            el.style.transitionDelay = "0ms";
            el.classList.remove("revealed");
          }
        });
      },
      { root: container, threshold: 0.15 }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return containerRef;
}

// ── Smooth scroll handler ──────────────────────────────────────
function useSmoothScroll(containerRef: React.RefObject<HTMLDivElement | null>) {
  return useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const target = container.querySelector(targetId);
      if (!target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + container.scrollTop - 80;

      container.scrollTo({ top: offset, behavior: "smooth" });
    },
    [containerRef]
  );
}

// ── Landing Content ────────────────────────────────────────────
export function LandingContent() {
  const containerRef = useScrollReveal();
  const handleSmoothScroll = useSmoothScroll(containerRef);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    setShowScrollTop(containerRef.current.scrollTop > 400);
  }, [containerRef]);

  const scrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [containerRef]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="w-full h-full overflow-y-auto overflow-x-hidden bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container scroll-smooth relative"
    >
      {/* ── Reveal styles (scoped via parent) ─────────────── */}
      <style>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-reveal].revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* ── TopNavBar ─────────────────────────────────────── */}
      <TopNavBar onNavClick={handleSmoothScroll} />

      <main className="w-full">
        {/* ── Hero Section ────────────────────────────────── */}
        <section className="relative max-w-[1200px] mx-auto px-6 pt-32 pb-24 flex flex-col items-center text-center">
          {/* Decorative ambient blur */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary-container/40 rounded-full blur-[100px] -z-10" />

          <div data-reveal="" className="w-32 h-32 mb-8 rounded-full bg-surface-container-lowest shadow-[0_20px_40px_rgba(184,228,213,0.3)] flex items-center justify-center p-2 border-[3px] border-surface">
            <img
              alt="BU Dorms Mascot"
              className="w-full h-full object-cover rounded-full"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmJvQr_APtG54fqavHn3DLw8z6CRhPEAr4TtIYa-P-Z1-D8nsFEX0VV7Jk1gCU9qFe3eK6BBm-8I7RVsrroEsqVnjQF-fBtxMqmLZqp4Fo6g7nmHXSNgShPh_1ADb5vbT7QU8Sh1H2fo5hFqouhHrseOQzWDCr955v7EQZxklgc4MVpJHxaCowKKfkd-gUB1eoKJsfC_xaTBOdnB03ZNecWh1GOA8bJiimdXSnAZrvd18tTCkOJBGeKke75J1L0DGEmyUZQHRTd_EO"
            />
          </div>

          <h1 data-reveal="" data-reveal-delay="100" className="text-[36px] leading-[1.2] tracking-[-0.02em] font-[800] text-on-surface max-w-3xl mb-6">
            Meet BU Dorms: Your <br />
            <span className="text-primary">Soft &amp; Smart Companion</span>
          </h1>

          <p data-reveal="" data-reveal-delay="200" className="text-[18px] leading-[1.6] font-medium text-on-surface-variant max-w-2xl mb-12">
            Experience a high-performance RAG chatbot wrapped in a squishy,
            friendly interface. Talk to your documents without the anxiety of
            complex tools.
          </p>

          <Link
            href="/signup"
            data-reveal=""
            data-reveal-delay="300"
            className="bg-primary-container text-on-primary-container font-bold text-[20px] px-10 py-5 rounded-full shadow-[0_12px_32px_rgba(184,228,213,0.4)] hover:scale-95 transition-transform duration-200 flex items-center gap-3 border border-white/50"
          >
            Start Chatting
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              arrow_forward
            </span>
          </Link>
        </section>

        {/* ── Features Section (Bento Grid) ───────────────── */}
        <section id="features" className="max-w-[1200px] mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <span data-reveal="" className="text-[12px] leading-none tracking-[0.05em] font-semibold uppercase text-secondary bg-secondary-container px-4 py-1.5 rounded-full inline-block mb-4 font-[family-name:var(--font-lexend)]">
              Why BU Dorms?
            </span>
            <h2 data-reveal="" data-reveal-delay="100" className="text-[24px] leading-[1.3] font-bold text-on-surface">
              Powerful features. Gentle design.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div data-reveal="" data-reveal-delay="0" className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_16px_40px_rgba(61,102,90,0.06)] border border-surface-container-highest/30 flex flex-col items-start group">
              <div className="w-16 h-16 rounded-full bg-tertiary-container flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform">
                <span
                  className="material-symbols-outlined text-on-tertiary-container text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  forum
                </span>
              </div>
              <h3 className="text-[18px] leading-[1.6] font-bold text-on-surface mb-3">
                Smart RAG Chat
              </h3>
              <p className="text-[16px] leading-[1.6] text-on-surface-variant">
                Grounded, accurate answers pulled directly from your own uploaded
                documents. No hallucinations, just reliable companionship.
              </p>
            </div>

            {/* Feature 2 */}
            <div data-reveal="" data-reveal-delay="120" className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_16px_40px_rgba(61,102,90,0.06)] border border-surface-container-highest/30 flex flex-col items-start group">
              <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform">
                <span
                  className="material-symbols-outlined text-on-primary-container text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  library_books
                </span>
              </div>
              <h3 className="text-[18px] leading-[1.6] font-bold text-on-surface mb-3">
                Personal Library
              </h3>
              <p className="text-[16px] leading-[1.6] text-on-surface-variant">
                Easily manage, tag, and organize your files. Your knowledge base
                stays neatly tucked away in soft, accessible folders.
              </p>
            </div>

            {/* Feature 3 */}
            <div data-reveal="" data-reveal-delay="240" className="bg-surface-container-lowest rounded-xl p-8 shadow-[0_16px_40px_rgba(61,102,90,0.06)] border border-surface-container-highest/30 flex flex-col items-start group">
              <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform">
                <span
                  className="material-symbols-outlined text-on-secondary-container text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  palette
                </span>
              </div>
              <h3 className="text-[18px] leading-[1.6] font-bold text-on-surface mb-3">
                Cute &amp; Customizable
              </h3>
              <p className="text-[16px] leading-[1.6] text-on-surface-variant">
                A UI that feels like home. Enjoy custom pastel themes, rounded
                bubbles, and a tactile experience that reduces digital fatigue.
              </p>
            </div>
          </div>
        </section>

        {/* ── How it Works Section ────────────────────────── */}
        <section
          id="how-it-works"
          className="max-w-[1200px] mx-auto px-6 py-24"
        >
          <div className="bg-surface-container-low rounded-xl p-10 md:p-16">
            <div className="text-center mb-16">
              <h2 data-reveal="" className="text-[24px] leading-[1.3] font-bold text-on-surface">
                As simple as 1-2-3
              </h2>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-12 relative">
              {/* Connecting Line (hidden on mobile) */}
              <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-px border-t-2 border-dashed border-outline-variant -translate-y-1/2 z-0" />

              {/* Step 1 */}
              <div data-reveal="" data-reveal-delay="0" className="relative z-10 flex flex-col items-center text-center w-full max-w-[250px]">
                <div className="w-20 h-20 bg-surface-container-lowest rounded-full shadow-[0_8px_24px_rgba(61,102,90,0.08)] flex items-center justify-center border-4 border-surface-container-low mb-6">
                  <span className="text-[24px] leading-[1.3] font-bold text-primary">
                    1
                  </span>
                </div>
                <h3 className="text-[18px] leading-[1.6] font-bold text-on-surface mb-2">
                  Upload
                </h3>
                <p className="text-[14px] leading-[1.6] text-on-surface-variant">
                  Drop your PDFs, notes, or essays into your library.
                </p>
              </div>

              {/* Step 2 */}
              <div data-reveal="" data-reveal-delay="150" className="relative z-10 flex flex-col items-center text-center w-full max-w-[250px]">
                <div className="w-20 h-20 bg-surface-container-lowest rounded-full shadow-[0_8px_24px_rgba(61,102,90,0.08)] flex items-center justify-center border-4 border-surface-container-low mb-6">
                  <span className="text-[24px] leading-[1.3] font-bold text-tertiary">
                    2
                  </span>
                </div>
                <h3 className="text-[18px] leading-[1.6] font-bold text-on-surface mb-2">
                  Ask
                </h3>
                <p className="text-[14px] leading-[1.6] text-on-surface-variant">
                  Chat naturally with BU Dorms about your documents.
                </p>
              </div>

              {/* Step 3 */}
              <div data-reveal="" data-reveal-delay="300" className="relative z-10 flex flex-col items-center text-center w-full max-w-[250px]">
                <div className="w-20 h-20 bg-surface-container-lowest rounded-full shadow-[0_8px_24px_rgba(61,102,90,0.08)] flex items-center justify-center border-4 border-surface-container-low mb-6">
                  <span className="text-[24px] leading-[1.3] font-bold text-secondary">
                    3
                  </span>
                </div>
                <h3 className="text-[18px] leading-[1.6] font-bold text-on-surface mb-2">
                  Get Answers
                </h3>
                <p className="text-[14px] leading-[1.6] text-on-surface-variant">
                  Receive accurate, grounded, and perfectly cited responses.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bottom CTA Section ──────────────────────────── */}
        <section id="cta" className="max-w-4xl mx-auto px-6 py-20 mb-10">
          <div data-reveal="" className="bg-primary-container rounded-xl p-12 text-center shadow-[0_24px_48px_rgba(184,228,213,0.3)] border border-white/40 flex flex-col items-center relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/30 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/30 rounded-full blur-2xl" />

            <h2 className="text-[36px] leading-[1.2] tracking-[-0.02em] font-[800] text-on-primary-container mb-6 relative z-10">
              Ready to start your squishy journey?
            </h2>
            <p className="text-[18px] leading-[1.6] font-medium text-on-primary-container/80 mb-10 relative z-10 max-w-lg">
              Join BU Dorms today and transform the way you interact with your
              knowledge base.
            </p>
            <Link
              href="/signup"
              className="relative z-10 bg-surface-container-lowest text-primary font-bold text-[18px] px-10 py-4 rounded-full shadow-[0_8px_24px_rgba(61,102,90,0.15)] hover:scale-95 transition-transform duration-200"
            >
              Join BU Dorms
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer data-reveal="" className="bg-primary-container/10 rounded-t-[40px] mt-20 border-t border-primary-container/30">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-10 py-12 gap-8 max-w-7xl mx-auto">
          <div className="text-lg font-bold text-on-surface-variant">
            © 2026 BU Dorms. Stay Squishy.
          </div>
          {/* <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold uppercase tracking-widest text-outline font-[family-name:var(--font-lexend)]">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Help Center
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Discord
            </a>
          </div> */}
        </div>
      </footer>

      {/* ── Scroll to Top Button ────────────────────────────── */}
      <button
        onClick={scrollToTop}
        className={`cursor-pointer fixed bottom-8 right-8 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-lg hover:bg-primary/90 hover:scale-110 active:scale-95 transition-all duration-300 ${showScrollTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-12 pointer-events-none"
          }`}
        aria-label="Scroll to top"
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          arrow_upward
        </span>
      </button>
    </div>
  );
}
