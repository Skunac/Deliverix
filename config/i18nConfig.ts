import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Import language files
import en from '@/translations/en.json';
import fr from '@/translations/fr.json';

// Configure i18next
i18next
    .use(initReactI18next)
    .init({
        fallbackLng: 'fr',
        resources: {
            en: {
                translation: en,
            },
            fr: {
                translation: fr,
            },
        },
        interpolation: {
            escapeValue: false,
        },
        compatibilityJSON: 'v4',
        react: {
            useSuspense: false,
        },
    });

export default i18next;