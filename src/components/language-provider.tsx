"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type Lang = "ko" | "en";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "ko";
    const saved = localStorage.getItem("lang") as Lang | null;
    return saved === "ko" || saved === "en" ? saved : "ko";
  });

  const setLanguage = (next: Lang) => {
    setLang(next);
    localStorage.setItem("lang", next);
  };

  const value = useMemo(() => ({ lang, setLang: setLanguage }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
