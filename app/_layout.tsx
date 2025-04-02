import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
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
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const router = useRouter();
    const segments = useSegments();
    const [prevAuthState, setPrevAuthState] = useState<boolean | null>(null);

    // Handle initial loading state
    useEffect(() => {
        if (!loading && isInitialLoad) {
            setIsInitialLoad(false);
        }
    }, [loading]);

    // Navigation logic based on auth state changes
    useEffect(() => {
        if (loading) return; // Skip navigation during loading

        // Just logged in (user exists and previously didn't)
        if (user && prevAuthState === false) {
            console.log('User logged in, redirecting to tabs');
            router.replace('/(tabs)');
        }
        // Just logged out (user doesn't exist and previously did)
        else if (!user && prevAuthState === true) {
            console.log('User logged out, redirecting to auth');
            router.replace('/(auth)');
        }
        // Initial auth state determination
        else if (prevAuthState === null) {
            console.log('Initial auth state:', user ? 'logged in' : 'logged out');
            router.replace(user ? '/(tabs)' : '/(auth)');
        }

        // Save current auth state for next comparison
        setPrevAuthState(!!user);
    }, [user, loading, prevAuthState, segments, router]);

    if (loading && isInitialLoad) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    console.log('RootLayoutNav - user:', user);

    return (
        <Stack
            initialRouteName={user ? '(tabs)' : '(auth)'}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'none' }} />

            <Stack.Screen
                name="delivery/[id]"
                options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                    animationDuration: 300,
                    animationTypeForReplace: 'push',
                    gestureEnabled: true,
                    gestureDirection: 'horizontal'
                }}
            />
        </Stack>
    );
}

export default function RootLayout() {
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),

        // Cabin fonts - all weights
        Cabin: require('../assets/fonts/Cabin-2/static/Cabin/Cabin-Regular.ttf'),
        'Cabin-Medium': require('../assets/fonts/Cabin-2/static/Cabin/Cabin-Medium.ttf'),
        'Cabin-SemiBold': require('../assets/fonts/Cabin-2/static/Cabin/Cabin-SemiBold.ttf'),
        'Cabin-Bold': require('../assets/fonts/Cabin-2/static/Cabin/Cabin-Bold.ttf'),
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