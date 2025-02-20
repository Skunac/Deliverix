// translations/i18n.ts
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Import language files
import en from '@/translations/en.json';
import fr from '@/translations/fr.json';

// Create the language detector properly as a class
class LanguageDetector {
    type: 'languageDetector';
    async: boolean;

    constructor() {
        this.type = 'languageDetector';
        this.async = true;
    }

    init() {
        // Required but not used
    }

    async detect(callback: (lng: string) => void) {
        try {
            // Try to get stored language from AsyncStorage
            const storedLanguage = await AsyncStorage.getItem('user-language');
            if (storedLanguage) {
                return callback(storedLanguage);
            }

            // If no stored language, use device locale
            const deviceLocale = Localization.locale.split('-')[0];
            // Only use supported languages
            if (['en', 'fr'].includes(deviceLocale)) {
                return callback(deviceLocale);
            }
            // Default to English
            return callback('en');
        } catch (error) {
            console.error('Error detecting language:', error);
            // Fallback to English
            callback('en');
        }
    }

    async cacheUserLanguage(language: string) {
        try {
            // Store user selected language
            await AsyncStorage.setItem('user-language', language);
        } catch (error) {
            console.error('Error caching language:', error);
        }
    }
}

// Configure i18next
i18next
    .use(new LanguageDetector())
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
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