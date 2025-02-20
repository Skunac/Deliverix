import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/languageContext';
import * as Haptics from 'expo-haptics';

type LanguageSelectorProps = {
    compact?: boolean;
};

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false }) => {
    const { t } = useTranslation();
    const { language, changeLanguage, availableLanguages } = useLanguage();

    const handleLanguageChange = (langCode: string) => {
        Haptics.selectionAsync();
        changeLanguage(langCode);
    };

    if (compact) {
        return (
            <View className="flex-row items-center space-x-2">
                {availableLanguages.map((lang) => (
                    <TouchableOpacity
                        key={lang.code}
                        onPress={() => handleLanguageChange(lang.code)}
                        className={`px-2 py-1 rounded ${
                            language === lang.code ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                    >
                        <Text
                            className={`text-sm font-medium ${
                                language === lang.code ? 'text-white' : 'text-gray-800'
                            }`}
                        >
                            {lang.code.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    }

    return (
        <View className="mt-2">
            <Text className="text-lg font-semibold mb-3">{t('settings.language')}</Text>
            <View className="space-y-2">
                {availableLanguages.map((lang) => (
                    <TouchableOpacity
                        key={lang.code}
                        onPress={() => handleLanguageChange(lang.code)}
                        className={`flex-row items-center justify-between p-3 rounded-lg ${
                            language === lang.code ? 'bg-blue-100 border border-blue-500' : 'bg-gray-100'
                        }`}
                    >
                        <Text className="text-base">{lang.name}</Text>
                        {language === lang.code && (
                            <View className="h-4 w-4 rounded-full bg-blue-500" />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

export default LanguageSelector;