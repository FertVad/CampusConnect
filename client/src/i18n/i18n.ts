import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import translationRU from './locales/ru.json';
import translationEN from './locales/en.json';

// Define the resources for each language
const resources = {
  ru: {
    translation: translationRU,
  },
  en: {
    translation: translationEN,
  },
};

// Initialize i18n configuration SYNCHRONOUSLY
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    defaultNS: 'translation',
    lng: 'ru',
    keySeparator: '.',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
    returnNull: false,
    returnEmptyString: false,
    saveMissing: true,
    missingKeyHandler: (lng, ns, key) => {
      console.warn(`Missing translation: ${key} for language: ${lng}`);
    },
  });

export default i18n;
