'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import vi from '../locales/vi';
import en from '../locales/en';

const translations = { vi, en };

const TranslationContext = createContext();

export function TranslationProvider({ children }) {
  const [lang, setLang] = useState('vi');

  useEffect(() => {
    const savedLang = localStorage.getItem('lang');
    if (savedLang && translations[savedLang]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLang(savedLang);
    }
  }, []);

  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key) => {
    if (typeof key !== 'string') return '';
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
