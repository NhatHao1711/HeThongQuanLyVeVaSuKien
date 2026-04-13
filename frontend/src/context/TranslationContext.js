'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import vi from '../locales/vi.json';
import en from '../locales/en.json';

const translations = { vi, en };

const TranslationContext = createContext();

export function TranslationProvider({ children }) {
  const [lang, setLang] = useState('vi');

  useEffect(() => {
    const savedLang = localStorage.getItem('lang');
    if (savedLang && translations[savedLang]) {
      setLang(savedLang);
    }
  }, []);

  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[lang];
    for (const k of keys) {
      if (value === undefined) break;
      value = value[k];
    }
    return value || key;
  };

  return (
    <TranslationContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export const useTranslation = () => useContext(TranslationContext);
