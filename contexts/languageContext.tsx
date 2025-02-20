import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

type LanguageContextType = {
    language: string;
    changeLanguage: (lang: string) => void;
    isRTL: boolean;
    availableLanguages: { code: string; name: string }[];
};

const availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
];

// RTL languages - add if you support any RTL languages in the future
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    changeLanguage: () => {},
    isRTL: false,
    availableLanguages,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { i18n } = useTranslation();
    const [language, setLanguage] = useState<string>('en');
    const [isRTL, setIsRTL] = useState<boolean>(false);

    useEffect(() => {
        // Initialize language from storage or device locale
        const initLanguage = async () => {
            try {
                const storedLanguage = await AsyncStorage.getItem('user-language');
                if (storedLanguage) {
                    setLanguage(storedLanguage);
                    await i18n.changeLanguage(storedLanguage);
                    setIsRTL(RTL_LANGUAGES.includes(storedLanguage));
                } else {
                    const deviceLanguage = Localization.locale.split('-')[0];
                    const isSupportedLanguage = availableLanguages.some(lang => lang.code === deviceLanguage);
                    const languageToUse = isSupportedLanguage ? deviceLanguage : 'en';

                    setLanguage(languageToUse);
                    i18n.changeLanguage(languageToUse);
                    setIsRTL(RTL_LANGUAGES.includes(languageToUse));
                    await AsyncStorage.setItem('user-language', languageToUse);
                }
            } catch (error) {
                console.error('Error initializing language:', error);
                setLanguage('en');
                await i18n.changeLanguage('en');
                setIsRTL(false);
            }
        };

        initLanguage();
    }, [i18n]);

    const changeLanguage = async (lang: string) => {
        try {
            setLanguage(lang);
            await i18n.changeLanguage(lang);
            setIsRTL(RTL_LANGUAGES.includes(lang));
            await AsyncStorage.setItem('user-language', lang);
        } catch (error) {
            console.error('Error changing language:', error);
        }
    };

    return (
        <LanguageContext.Provider
            value={{
                language,
                changeLanguage,
                isRTL,
                availableLanguages,
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);