import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import uz from "./locales/uz.json";

i18next.use(initReactI18next).init({
  compatibilityJSON: "v3",
  lng: "uz",
  fallbackLng: "uz",
  resources: {
    uz: {
      translation: uz, // must be 'translation' as the key
    },
  },
  interpolation: { escapeValue: false },
});

export default i18next;
