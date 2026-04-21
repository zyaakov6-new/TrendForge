"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type Lang = "en" | "he";

interface LanguageContextValue {
  lang: Lang;
  toggleLang: () => void;
  isHebrew: boolean;
  /** Inline translation helper: t("English text", "טקסט בעברית") */
  t: (en: string, he: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  toggleLang: () => {},
  isHebrew: false,
  t: (en) => en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  const toggleLang = useCallback(() => {
    setLang((l) => (l === "en" ? "he" : "en"));
  }, []);

  const t = useCallback(
    (en: string, he: string) => (lang === "en" ? en : he),
    [lang]
  );

  return (
    <LanguageContext.Provider
      value={{ lang, toggleLang, isHebrew: lang === "he", t }}
    >
      <div dir={lang === "he" ? "rtl" : "ltr"}>{children}</div>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
