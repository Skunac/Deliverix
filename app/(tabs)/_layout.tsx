import {Tabs, useRouter} from 'expo-router';
import { useColorScheme } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/languageContext';
import {useAuth} from "@/contexts/authContext";
import {useEffect} from "react";
import { ProfessionalUser } from '@/src/models/user.model';
import PendingValidationScreen from '@/components/ui/PendingValidationScreen';

export default function TabsLayout() {
    const colorScheme = useColorScheme();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const router = useRouter();
    const { user, loading, registrationStatus } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            // Not logged in - redirect to auth
            console.log('User not authenticated, redirecting to auth');
            router.replace('/(auth)');
            return;
        }
    }, [user, loading, registrationStatus, router]);

    // Check if user is a delivery agent and not allowed
    const isDeliveryAgentNotAllowed = user?.isDeliveryAgent && user?.isAllowed === false;

    // If delivery agent is not allowed, show validation screen
    if (isDeliveryAgentNotAllowed) {
        return <PendingValidationScreen />;
    }

    const isAdmin = user?.isAdmin || false;

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
                name="available-deliveries"
                options={{
                    title: "Courses disponibles",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="briefcase" size={size} color={color} />
                    ),
                    href: user?.isDeliveryAgent ? '/(tabs)/available-deliveries' : null,
                }}
            />
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: "Dashboard",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="apps" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="admin"
                options={{
                    title: "Utilisateurs",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="shield" size={size} color={color} />
                    ),
                    href: isAdmin ? '/(tabs)/admin' : null,
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
        </Tabs>
    );
}