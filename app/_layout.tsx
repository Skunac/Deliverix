import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import "@/global.css";
import "@/config/i18nConfig";
import { LanguageProvider } from "@/contexts/languageContext";
import {AuthProvider} from "@/contexts/authContext";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
            </AuthProvider>
        </LanguageProvider>
    );
}