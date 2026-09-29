'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'de' | 'en';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('de');

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem('portfolio-language');
    if (storedLanguage === 'de' || storedLanguage === 'en') {
      setLanguageState(storedLanguage);
    }
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem('portfolio-language', nextLanguage);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

export function LanguageSwitch({ value, onChange }: { value: Language; onChange: (language: Language) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-black/10 bg-black/5 p-0.5 text-[10px] dark:border-white/10 dark:bg-white/10" role="group" aria-label="Sprache des Textfelds">
      {(['de', 'en'] as Language[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-full px-2 py-1 font-semibold uppercase transition-colors ${value === option ? 'bg-[#7700ff] text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
