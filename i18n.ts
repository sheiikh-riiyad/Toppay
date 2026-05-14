import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import bn from './locales/bn.json';
import en from './locales/en.json';

const resources = {
  en: {
    translation: en,
  },
  bn: {
    translation: bn,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;