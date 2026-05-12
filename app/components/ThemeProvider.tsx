"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  resolved: "light",
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem("bu-dorms-theme") as Theme | null;
    if (saved) setTheme(saved);
  }, []);

  // Apply theme class
  useEffect(() => {
    localStorage.setItem("bu-dorms-theme", theme);
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      const updateDom = () => {
        root.classList.toggle("dark", isDark);
        setResolved(isDark ? "dark" : "light");
      };

      if (!document.startViewTransition) {
        updateDom();
        return;
      }

      const transition = document.startViewTransition(() => {
        flushSync(() => {
          updateDom();
        });
      });

      transition.finished.catch(() => {});
    };

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}
