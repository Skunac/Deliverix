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
                tabBarActiveTintColor: '#5DD6FF',
                tabBarInactiveTintColor: '#9ca3af',
                tabBarStyle: {
                    backgroundColor: '#0F2026',
                    direction: isRTL ? 'rtl' : 'ltr',
                    borderTopWidth: 0,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                    fontFamily: 'Cabin'
                },
                headerShown: true,
                headerStyle: {
                    backgroundColor: '#0F2026',
                    borderBottomWidth: 0,
                },
                headerTitleStyle: {
                    color: '#fff',
                    fontSize: 20,
                    fontWeight: '600',
                    fontFamily: 'Cabin'
                },
                animation: 'none'
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Courses',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: "Dashboard",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings" size={size} color={color} />
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