import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/authContext';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import LanguageSelector from "@/components/ui/languageSelector";

// Define types for the auth context
interface User {
    uid: string;
    // Add other user properties as needed
}

interface AuthContext {
    user: User | null;
    logout: () => void;
}

// Define type for SettingItem props
interface SettingItemProps {
    title: string;
    description?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}

export default function SettingsScreen() {
    const { user, logout } = useAuth() as AuthContext;
    const { t } = useTranslation();

    console.log("SettingsScreen rendered, user:", user?.uid || "not logged in");

    // Settings state
    const [darkMode, setDarkMode] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<boolean>(true);

    const SettingItem: React.FC<SettingItemProps> = ({ title, description, value, onValueChange }) => (
        <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
            <View className="flex-1">
                <Text className="font-medium text-base">{title}</Text>
                {description && <Text className="text-gray-500 text-sm">{description}</Text>}
            </View>

            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                thumbColor={value ? '#3b82f6' : '#f4f4f5'}
            />
        </View>
    );

    if (!user) {
        return (
            <View className="flex-1 justify-center items-center p-4 bg-gray-50">
                <Text className="text-lg text-gray-600 text-center">
                    {t('settings.signInRequired')}
                </Text>
                <TouchableOpacity
                    className="mt-6 px-6 py-2 bg-blue-500 rounded-full"
                    onPress={() => router.push('/(tabs)/firebase-test')}
                >
                    <Text className="text-white font-medium">{t('common.signIn')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-4 pt-6 bg-white">
                <Text className="text-2xl font-bold mb-2">{t('settings.title')}</Text>
                <Text className="text-gray-500">{t('settings.customize')}</Text>
            </View>

            {/* Language Section */}
            <View className="mt-6 mx-4 bg-white rounded-xl">
                <View className="p-4 border-b border-gray-100">
                    <Text className="text-lg font-semibold">{t('settings.language')}</Text>
                </View>
                <View className="px-4">
                    <LanguageSelector />
                </View>
            </View>

            {/* Appearance Section */}
            <View className="mt-6 mx-4 bg-white rounded-xl">
                <View className="p-4 border-b border-gray-100">
                    <Text className="text-lg font-semibold">{t('settings.appearance')}</Text>
                </View>

                <View className="px-4">
                    <SettingItem
                        title={t('settings.darkMode')}
                        description={t('settings.darkModeDesc')}
                        value={darkMode}
                        onValueChange={setDarkMode}
                    />
                </View>
            </View>

            {/* Notifications Section */}
            <View className="mt-6 mx-4 bg-white rounded-xl">
                <View className="p-4 border-b border-gray-100">
                    <Text className="text-lg font-semibold">{t('settings.notifications')}</Text>
                </View>

                <View className="px-4">
                    <SettingItem
                        title={t('settings.pushNotifications')}
                        description={t('settings.pushNotificationsDesc')}
                        value={notifications}
                        onValueChange={setNotifications}
                    />
                </View>
            </View>

            {/* Account Section */}
            <View className="mt-6 mx-4 bg-white rounded-xl mb-10">
                <View className="p-4 border-b border-gray-100">
                    <Text className="text-lg font-semibold">{t('settings.account')}</Text>
                </View>

                <View className="p-4">
                    <TouchableOpacity
                        className="py-4 mb-2"
                        onPress={() => {
                            console.log("Change password pressed");
                        }}
                    >
                        <Text className="text-blue-500 font-medium">{t('settings.changePassword')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="py-4 mb-2"
                        onPress={() => {
                            console.log("Sign out pressed");
                            logout();
                        }}
                    >
                        <Text className="text-blue-500 font-medium">{t('common.signOut')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="py-4"
                        onPress={() => {
                            console.log("Delete account pressed");
                        }}
                    >
                        <Text className="text-red-500 font-medium">{t('settings.deleteAccount')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}