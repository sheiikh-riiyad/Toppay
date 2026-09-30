import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import bn from './locales/bn.json';

const resources = {
  bn: {
    translation: bn,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'bn',
    fallbackLng: 'bn',
    supportedLngs: ['bn'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
