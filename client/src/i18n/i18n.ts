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

// Initialize i18n configuration
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
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false, // Disable suspense mode for better Safari compatibility
    },
    returnNull: false, // Return empty string instead of null (safer for Safari)
    returnEmptyString: false, // Return key instead of empty string (safer for Safari)
    saveMissing: true, // Report missing translation keys
    missingKeyHandler: (lng, ns, key) => {
      console.warn(`Missing translation key: ${key} for language: ${lng}`);
    }
  })
  .catch(error => {
    console.error('Failed to initialize i18n:', error);
    
    // No need to override the t function, i18next will return the key if translation is missing
    console.warn('Using fallback translation mechanism');
  });

// Log when i18n is initialized
i18n.on('initialized', () => {
  console.log('i18n initialized successfully');
});

// Log when language changes
i18n.on('languageChanged', (lng) => {
  console.log(`Language changed to: ${lng}`);
});

export default i18n;