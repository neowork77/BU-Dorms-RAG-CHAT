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

// ── Floating Orb Component ─────────────────────────────────────
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />
      <div className="landing-orb landing-orb-3" />
    </div>
  );
}

// ── Feature Card ───────────────────────────────────────────────
function FeatureCard({
  icon, title, desc, accent, delay,
}: {
  icon: string; title: string; desc: string; accent: string; delay: string;
}) {
  return (
    <div
      data-reveal=""
      data-reveal-delay={delay}
      className="landing-feature-card group"
    >
      <div className={`landing-icon-wrap ${accent}`}>
        <span
          className="material-symbols-outlined text-2xl sm:text-3xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <h3 className="text-base sm:text-lg font-bold text-on-surface mb-2">
        {title}
      </h3>
      <p className="text-sm sm:text-[15px] leading-relaxed text-on-surface-variant">
        {desc}
      </p>
    </div>
  );
}

// ── Step Card ──────────────────────────────────────────────────
function StepCard({
  num, color, title, desc, delay,
}: {
  num: string; color: string; title: string; desc: string; delay: string;
}) {
  return (
    <div
      data-reveal=""
      data-reveal-delay={delay}
      className="landing-step-card"
    >
      <div className={`landing-step-num ${color}`}>{num}</div>
      <h3 className="text-base sm:text-lg font-bold text-on-surface mb-1">{title}</h3>
      <p className="text-sm leading-relaxed text-on-surface-variant">{desc}</p>
    </div>
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
      {/* ── Scoped Styles ──────────────────────────────────── */}
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

        /* ── Floating Orbs ── */
        .landing-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
        }
        .dark .landing-orb { opacity: 0.15; }
        .landing-orb-1 {
          width: clamp(200px, 40vw, 500px);
          height: clamp(200px, 40vw, 500px);
          background: var(--md-primary-container);
          top: -10%; left: -10%;
          animation: orbFloat1 18s ease-in-out infinite;
        }
        .landing-orb-2 {
          width: clamp(160px, 30vw, 400px);
          height: clamp(160px, 30vw, 400px);
          background: var(--md-tertiary-container);
          top: 30%; right: -8%;
          animation: orbFloat2 22s ease-in-out infinite;
        }
        .landing-orb-3 {
          width: clamp(140px, 25vw, 350px);
          height: clamp(140px, 25vw, 350px);
          background: var(--md-secondary-container);
          bottom: 10%; left: 20%;
          animation: orbFloat3 20s ease-in-out infinite;
        }
        @keyframes orbFloat1 {
          0%,100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 40px) scale(1.1); }
        }
        @keyframes orbFloat2 {
          0%,100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 50px) scale(1.05); }
        }
        @keyframes orbFloat3 {
          0%,100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -40px) scale(1.08); }
        }

        /* ── Feature Card ── */
        .landing-feature-card {
          position: relative;
          background: var(--md-surface-container-lowest);
          border: 1px solid color-mix(in srgb, var(--md-outline-variant) 30%, transparent);
          border-radius: 20px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.3s ease,
                      border-color 0.3s ease;
        }
        .landing-feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(107, 63, 160, 0.08);
          border-color: color-mix(in srgb, var(--md-primary) 25%, transparent);
        }
        .dark .landing-feature-card:hover {
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        /* ── Icon Wrap ── */
        .landing-icon-wrap {
          width: 52px; height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          transition: transform 0.3s ease;
        }
        .landing-feature-card:hover .landing-icon-wrap {
          transform: scale(1.1) rotate(-4deg);
        }
        .landing-icon-wrap.accent-primary {
          background: var(--md-primary-container);
          color: var(--md-on-primary-container);
        }
        .landing-icon-wrap.accent-tertiary {
          background: var(--md-tertiary-container);
          color: var(--md-on-tertiary-container);
        }
        .landing-icon-wrap.accent-secondary {
          background: var(--md-secondary-container);
          color: var(--md-on-secondary-container);
        }

        /* ── Step Card ── */
        .landing-step-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 100%;
          max-width: 260px;
          z-index: 1;
        }
        .landing-step-num {
          width: 56px; height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
          box-shadow: 0 8px 20px rgba(107, 63, 160, 0.1);
          transition: transform 0.3s ease;
        }
        .landing-step-card:hover .landing-step-num {
          transform: scale(1.12);
        }
        .landing-step-num.step-primary {
          background: var(--md-primary-container);
          color: var(--md-on-primary-container);
        }
        .landing-step-num.step-tertiary {
          background: var(--md-tertiary-container);
          color: var(--md-on-tertiary-container);
        }
        .landing-step-num.step-secondary {
          background: var(--md-secondary-container);
          color: var(--md-on-secondary-container);
        }

        /* ── Pill Badge ── */
        .landing-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 9999px;
          background: var(--md-secondary-container);
          color: var(--md-on-secondary-container);
        }

        /* ── CTA shimmer ── */
        @keyframes ctaShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .landing-cta-shimmer {
          background-size: 200% 100%;
          animation: ctaShimmer 4s ease-in-out infinite;
        }

        @media (max-width: 639px) {
          .landing-feature-card { padding: 1.25rem; }
          .landing-icon-wrap { width: 44px; height: 44px; border-radius: 12px; }
        }
      `}</style>

      {/* ── TopNavBar ─────────────────────────────────────── */}
      <TopNavBar onNavClick={handleSmoothScroll} />

      <main className="w-full">
        {/* ═══════════════ HERO ═══════════════ */}
        <section className="relative max-w-[1200px] mx-auto px-5 sm:px-8 pt-24 sm:pt-32 pb-16 sm:pb-24 flex flex-col items-center text-center">
          <FloatingOrbs />

          {/* Logo */}
          <div
            data-reveal=""
            className="w-24 h-24 sm:w-32 sm:h-32 mb-6 sm:mb-8 rounded-full bg-purple-100 dark:bg-surface-container-lowest shadow-[0_20px_40px_rgba(107,63,160,0.15)] flex items-center justify-center p-1.5 sm:p-2 border-[3px] border-surface ring-4 ring-primary-container/30"
          >
            <img
              alt="BU Dorms Mascot"
              className="w-full h-full object-cover rounded-full"
              src="/assets/BU_Dorms_LOGO.webp"
            />
          </div>

          {/* Badge */}
          <div data-reveal="" data-reveal-delay="50">
            <span className="landing-pill font-[family-name:var(--font-lexend)]">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
              Powered by 3 หน่อ AI
            </span>
          </div>

          {/* Headline */}
          <h1
            data-reveal=""
            data-reveal-delay="120"
            className="text-[28px] sm:text-[36px] md:text-[44px] leading-[1.15] tracking-[-0.02em] font-[800] text-on-surface max-w-3xl mt-5 mb-4 sm:mb-6"
          >
            ค้นหาหอพักรอบ ม.กรุงเทพ{" "}
            <br className="hidden sm:block" />
            <span className="text-primary">ให้ BU Dorms ช่วยคุณ</span>
          </h1>

          {/* Sub */}
          <p
            data-reveal=""
            data-reveal-delay="200"
            className="text-[15px] sm:text-[17px] md:text-[18px] leading-[1.7] font-medium text-on-surface-variant max-w-xl sm:max-w-2xl mb-8 sm:mb-12 px-2"
          >
            สัมผัสประสบการณ์ค้นหาหอพักที่ง่ายและฉลาดขึ้นผ่านระบบ AI แชทบอท
            สอบถามข้อมูลหอพักที่โดนใจคุณได้ทันทีโดยไม่ต้องเสียเวลาค้นหาเอง
          </p>

          {/* CTA Buttons */}
          <div
            data-reveal=""
            data-reveal-delay="300"
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0"
          >
            <Link
              href="/signup"
              className="landing-cta-shimmer bg-gradient-to-r from-primary via-primary/85 to-primary text-on-primary font-bold text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-[18px] rounded-full shadow-[0_12px_32px_rgba(107,63,160,0.3)] hover:scale-[0.97] active:scale-95 transition-transform duration-200 flex items-center justify-center gap-2.5"
            >
              เริ่มแชทเลย
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                arrow_forward
              </span>
            </Link>
            <a
              href="#features"
              onClick={(e) => handleSmoothScroll(e, "#features")}
              className="bg-surface-container-lowest text-on-surface font-semibold text-base px-8 py-4 sm:py-[18px] rounded-full border-2 border-outline-variant/30 hover:border-primary/30 hover:bg-surface-container transition-all duration-200 flex items-center justify-center gap-2"
            >
              ดูฟีเจอร์
              <span className="material-symbols-outlined text-xl">expand_more</span>
            </a>
          </div>
        </section>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section id="features" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="text-center mb-10 sm:mb-16">
            <span
              data-reveal=""
              className="landing-pill font-[family-name:var(--font-lexend)] mb-4 inline-block"
            >
              ทำไมต้อง BU Dorms?
            </span>
            <h2
              data-reveal=""
              data-reveal-delay="100"
              className="text-xl sm:text-2xl md:text-[28px] leading-[1.3] font-bold text-on-surface mt-3"
            >
              ฟีเจอร์ครบครัน ใช้งานง่าย ตอบโจทย์นักศึกษา
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard
              icon="forum"
              title="AI แชทอัจฉริยะ"
              desc="ค้นหาหอพักได้ตรงใจด้วยระบบ AI ที่ดึงข้อมูลจากฐานข้อมูลหอพักรอบมหาวิทยาลัยกรุงเทพโดยตรง ให้คำตอบที่แม่นยำและเชื่อถือได้"
              accent="accent-tertiary"
              delay="0"
            />
            <FeatureCard
              icon="library_books"
              title="ข้อมูลครบถ้วน"
              desc="รวบรวมข้อมูลหอพักที่สำคัญไว้ในที่เดียว ทั้งราคา ระยะทาง สิ่งอำนวยความสะดวก และรูปภาพประกอบ เพื่อให้คุณตัดสินใจได้ง่ายขึ้น"
              accent="accent-primary"
              delay="120"
            />
            <FeatureCard
              icon="palette"
              title="ดีไซน์น่ารัก ใช้งานง่าย"
              desc="ออกแบบหน้าตาให้ใช้งานง่าย เป็นมิตรกับผู้ใช้ พร้อมสีสันน่ารักสดใส ช่วยลดความเหนื่อยล้าในการค้นหาหอพัก"
              accent="accent-secondary"
              delay="240"
            />
          </div>
        </section>

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <section id="how-it-works" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="bg-surface-container-low/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-16 border border-outline-variant/15">
            <div className="text-center mb-10 sm:mb-16">
              <h2
                data-reveal=""
                className="text-xl sm:text-2xl md:text-[28px] leading-[1.3] font-bold text-on-surface"
              >
                ใช้งานง่ายใน 3 ขั้นตอน
              </h2>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 sm:gap-12 relative">
              {/* Connecting Line (desktop only) */}
              <div className="hidden md:block absolute top-7 left-[18%] right-[18%] h-px border-t-2 border-dashed border-outline-variant/50 z-0" />

              <StepCard
                num="1"
                color="step-primary"
                title="เริ่มต้น"
                desc="เข้าสู่ระบบและเตรียมคำถามเกี่ยวกับหอพักที่คุณต้องการหา"
                delay="0"
              />
              <StepCard
                num="2"
                color="step-tertiary"
                title="ถาม"
                desc='พูดคุยกับ BU Dorms เช่น "มีงบ 6,000 แนะนำหอหน่อย"'
                delay="150"
              />
              <StepCard
                num="3"
                color="step-secondary"
                title="ได้คำตอบ"
                desc="รับคำแนะนำหอพักที่ตรงใจ พร้อมรายละเอียดและรูปภาพประกอบ"
                delay="300"
              />
            </div>
          </div>
        </section>

        {/* ═══════════════ STATS ═══════════════ */}
        <section className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10 sm:py-16">
          <div
            data-reveal=""
            className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6"
          >
            {[
              { value: "900+", label: "หอพักในระบบ", icon: "apartment" },
              { value: "AI", label: "ระบบ RAG อัจฉริยะ", icon: "psychology" },
              { value: "24/7", label: "พร้อมให้บริการ", icon: "schedule" },
              { value: "Free", label: "ใช้งานฟรี", icon: "volunteer_activism" },
            ].map((stat, i) => (
              <div
                key={i}
                data-reveal=""
                data-reveal-delay={String(i * 80)}
                className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 text-center border border-outline-variant/15 hover:border-primary/20 transition-colors"
              >
                <span
                  className="material-symbols-outlined text-primary text-2xl sm:text-3xl mb-2 block"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {stat.icon}
                </span>
                <div className="text-2xl sm:text-3xl font-[800] text-on-surface mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-on-surface-variant font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════ CTA ═══════════════ */}
        <section id="cta" className="max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-20 mb-6 sm:mb-10">
          <div
            data-reveal=""
            className="relative bg-gradient-to-br from-primary-container via-primary-container to-tertiary-container/40 rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 text-center flex flex-col items-center overflow-hidden border border-white/30"
          >
            {/* Decorative blobs */}
            <div className="absolute -top-16 -left-16 w-48 h-48 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

            <h2 className="text-2xl sm:text-[32px] md:text-[36px] leading-[1.15] tracking-[-0.02em] font-[800] text-on-primary-container mb-4 sm:mb-6 relative z-10">
              พร้อมที่จะหาหอพักหรือยัง?
            </h2>
            <p className="text-[15px] sm:text-[17px] leading-[1.7] font-medium text-on-primary-container/75 mb-8 sm:mb-10 relative z-10 max-w-md sm:max-w-lg px-2">
              เริ่มต้นใช้งาน BU Dorms วันนี้ เพื่อเปิดประสบการณ์ใหม่ในการค้นหาหอพักที่ง่ายและสะดวกกว่าที่เคย
            </p>
            <Link
              href="/signup"
              className="relative z-10 bg-surface-container-lowest text-primary font-bold text-base sm:text-lg px-8 sm:px-10 py-3.5 sm:py-4 rounded-full shadow-[0_8px_24px_rgba(107,63,160,0.12)] hover:scale-[0.97] active:scale-95 transition-transform duration-200"
            >
              เริ่มใช้งาน BU Dorms
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer
        data-reveal=""
        className="bg-primary-container/8 border-t border-outline-variant/15"
      >
        <div className="flex flex-col sm:flex-row justify-between items-center w-full px-6 sm:px-10 py-8 sm:py-10 gap-4 max-w-7xl mx-auto">
          <div className="text-sm sm:text-base font-semibold text-on-surface-variant text-center sm:text-left">
            © 2026 BU Dorms. ระบบค้นหาหอพักมหาวิทยาลัยกรุงเทพ
          </div>
          <div className="text-xs text-outline">
            Powered by 3 หน่อ AI
          </div>
        </div>
      </footer>

      {/* ── Scroll to Top ────────────────────────────────── */}
      <button
        onClick={scrollToTop}
        className={`cursor-pointer fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-lg hover:bg-primary/90 hover:scale-110 active:scale-95 transition-all duration-300 ${
          showScrollTop
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
