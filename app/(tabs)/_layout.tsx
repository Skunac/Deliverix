import { Tabs } from 'expo-router';
import { useColorScheme } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/languageContext';

export default function TabsLayout() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#3b82f6',
                tabBarInactiveTintColor: '#64748b',
                tabBarStyle: {
                    backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
                    direction: isRTL ? 'rtl' : 'ltr'
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
                headerShown: true,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t('common.home'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: t('common.profile'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="payment"
                options={{
                    title: t('common.payment'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubbles" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: t('common.settings'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="firebase-test"
                options={{
                    title: t('common.firebaseTest'),
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="flame" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}