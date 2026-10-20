import React, { createContext, useContext, useState, useEffect } from "react";
import { TRANSLATIONS } from "./translations";
import { Storage } from "../services/storage";

const LanguageContext = createContext({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState("en");

  useEffect(() => {
    Storage.getItem("app_language").then((saved) => {
      if (saved && TRANSLATIONS[saved]) {
        setLanguageState(saved);
      }
    });
  }, []);

  const setLanguage = (code) => {
    setLanguageState(code);
    Storage.setItem("app_language", code);
  };

  const t = (key) => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
