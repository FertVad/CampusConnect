import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import translationRU from './locales/ru.json';
import translationEN from './locales/en.json';

// Define the resources for each language
const resources = {
  ru: {
    translation: translationRU
  },
  en: {
    translation: translationEN
  }
};

i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'ru', // Default language if detection fails
    defaultNS: 'translation',
    lng: 'ru', // Set Russian as the default language
    keySeparator: '.', // Use dots for nested keys
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n;