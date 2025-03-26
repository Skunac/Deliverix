import { useFonts } from 'expo-font';
import { Stack, Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import "@/global.css";
import "@/config/i18nConfig";
import { AuthProvider, useAuth } from "@/contexts/authContext";
import { LanguageProvider } from "@/contexts/languageContext";
import { View, ActivityIndicator } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// This layout wraps all routes that require authentication checking
function RootLayoutNav() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // Using Slot to render either auth or tabs stack based on authentication status
    return (
        <Slot
            initialRouteName={user ? "(tabs)" : "(auth)"}
            screenOptions={{ headerShown: false }}
        />
    );
}

export default function RootLayout() {
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
        Cabin: require('../assets/fonts/Cabin-2/static/Cabin/Cabin-Regular.ttf'),
    });

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return (
        <LanguageProvider>
            <AuthProvider>
                <RootLayoutNav />
            </AuthProvider>
        </LanguageProvider>
    );
}