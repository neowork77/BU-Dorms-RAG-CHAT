"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import { createClient } from "@/lib/supabase/client";
import { TopNavBar } from "../components/TopNavBar";
import { LoadingScreen } from "../components/LoadingScreen";

const STATE_MACHINE_NAME = "State Machine 1";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessLoading, setShowSuccessLoading] = useState(false);
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const supabase = createClient();
  const router = useRouter();

  const { rive, RiveComponent } = useRive({
    src: "/animations/login-animation.riv",
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
  });

  // State machine inputs
  const isFocusInput = useStateMachineInput(rive, STATE_MACHINE_NAME, "isFocus");
  const isPasswordInput = useStateMachineInput(rive, STATE_MACHINE_NAME, "IsPassword");
  const loginSuccessInput = useStateMachineInput(rive, STATE_MACHINE_NAME, "login_success");
  const loginFailInput = useStateMachineInput(rive, STATE_MACHINE_NAME, "login_fail");

  // Focus handlers for non-password fields
  const handleFieldFocus = useCallback(() => {
    if (isPasswordInput) isPasswordInput.value = false;
    if (isFocusInput) isFocusInput.value = true;
  }, [isFocusInput, isPasswordInput]);

  const handleFieldBlur = useCallback(() => {
    if (isFocusInput) isFocusInput.value = false;
  }, [isFocusInput]);

  // Focus handlers for password field
  const handlePasswordFocus = useCallback(() => {
    if (isFocusInput) isFocusInput.value = true;
    if (isPasswordInput) isPasswordInput.value = true;
  }, [isFocusInput, isPasswordInput]);

  const handlePasswordBlur = useCallback(() => {
    if (isFocusInput) isFocusInput.value = false;
    if (isPasswordInput) isPasswordInput.value = false;
  }, [isFocusInput, isPasswordInput]);

  // Submit handler - login with Supabase
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg("");
      setAuthLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        if (loginFailInput) loginFailInput.fire();
        setAuthLoading(false);
        return;
      }

      if (loginSuccessInput) loginSuccessInput.fire();
      
      // Switch from normal form loading to full-screen success energy bar loading
      setAuthLoading(false);
      setShowSuccessLoading(true);
    },
    [email, password, supabase, loginSuccessInput, loginFailInput, router]
  );

  // ── Google Sign In ──────────────────────────────────────────
  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("Google sign-in error:", error.message);
      setLoading(false);
    }
    // On success, the browser will redirect to Google — no need to setLoading(false)
  }, [supabase]);

  return (
    <div className="flex flex-col min-h-screen">
      {showSuccessLoading && (
        <LoadingScreen 
          message="กำลังเตรียมเข้าสู่ระบบ..." 
          onComplete={() => router.push("/app")} 
        />
      )}
      <TopNavBar minimal />
      <div className="flex-1 w-full bg-background flex flex-col lg:flex-row p-3 sm:p-5 font-sans animate-page-fade-in">
      {/* Top/Left Panel - Animation */}
      <div className="flex flex-col justify-between w-full h-[220px] sm:h-[260px] lg:h-auto lg:w-1/2 lg:max-w-[680px] rounded-[24px] lg:rounded-[32px] relative overflow-hidden shrink-0">
        {/* Rive Animation Background */}
        <div className="absolute inset-0 z-0 flex items-end lg:items-center justify-center pointer-events-none">
          <RiveComponent className="w-full h-full scale-[1.4] origin-bottom lg:origin-center translate-y-4 lg:-translate-y-30 translate-x-0 lg:translate-x-10" />
        </div>
      </div>

      {/* Right/Bottom Panel - Form */}
      <div className="flex-1 flex flex-col justify-center items-center py-8 lg:py-10 px-4 sm:px-10">
        <div className="w-full max-w-[460px]">

          <h1 className="text-on-surface text-[40px] font-[800] mb-3 tracking-tight leading-[1.15]">
            Welcome back
          </h1>
          <p className="text-on-surface-variant mb-6 text-[16px]">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="text-primary font-semibold hover:underline underline-offset-4 transition-colors"
            >
              Sign up
            </Link>
          </p>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="bg-error-container/50 text-on-error-container text-[14px] p-3 rounded-xl border border-error-container">
                {errorMsg}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[12px] leading-none tracking-[0.05em] font-semibold uppercase text-on-surface-variant ml-2 font-[family-name:var(--font-lexend)]">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={handleFieldFocus}
                onBlur={handleFieldBlur}
                required
                className="w-full bg-surface-container-low border-2 border-transparent text-on-surface rounded-full px-5 py-3.5 text-[15px] focus:outline-none focus:border-primary-container transition-all placeholder:text-outline-variant"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-2 mr-2">
                <label className="text-[12px] leading-none tracking-[0.05em] font-semibold uppercase text-on-surface-variant font-[family-name:var(--font-lexend)]">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  required
                  className="w-full bg-surface-container-low border-2 border-transparent text-on-surface rounded-full px-5 py-3.5 pr-14 text-[15px] focus:outline-none focus:border-primary-container transition-all placeholder:text-outline-variant"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors flex items-center justify-center rounded-full p-1.5 hover:bg-primary-container/20"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-primary hover:bg-primary/90 text-on-primary rounded-full py-4 mt-4 font-bold text-[16px] transition-all soft-shadow active:scale-[0.98] cursor-pointer flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {authLoading && (
                <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              )}
              {authLoading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="mt-10 flex items-center gap-4">
            <div className="flex-1 h-px bg-surface-variant/50"></div>
            <span className="text-[12px] font-medium text-outline uppercase tracking-wider font-[family-name:var(--font-lexend)]">
              Or log in with
            </span>
            <div className="flex-1 h-px bg-surface-variant/50"></div>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-surface-container-lowest border-2 border-surface-container-low hover:border-primary-container hover:bg-surface-container-low text-on-surface rounded-full py-3.5 text-[15px] font-semibold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-[18px] h-[18px] border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <img
                    src="https://www.google.com/favicon.ico"
                    alt="Google"
                    className="w-[18px] h-[18px]"
                  />
                  Continue with Google
                </>
              )}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
