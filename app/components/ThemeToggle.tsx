"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export const THEME_STORAGE_KEY = "pgh-theme";

export default function ThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // Storage can be blocked in private mode; the theme still applies for this session.
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "สลับเป็นธีมสว่าง" : "สลับเป็นธีมมืด"}
      title={dark ? "ธีมสว่าง" : "ธีมมืด"}
      className={`flex items-center justify-center rounded-full p-2 transition active:scale-95 ${className}`}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
