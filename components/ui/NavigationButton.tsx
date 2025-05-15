import {Alert, Linking, Platform, TouchableOpacity, Text} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import React, {useState} from "react";

interface NavigationButtonProps {
    app: 'google' | 'waze';
    origin: { latitude: number, longitude: number };
    destination: { latitude: number, longitude: number };
}

export const NavigationButton: React.FC<NavigationButtonProps> = ({ app, origin, destination }) => {
    const [isLoading, setIsLoading] = useState(false);

    const openNavigationApp = async () => {
        try {
            setIsLoading(true);

            // Different URL schemes for native apps vs web fallbacks
            let nativeUrl = '';
            let webUrl = '';
            let googleWebUrl = '';

            if (app === 'google') {
                // Native Google Maps app URL scheme
                if (Platform.OS === 'ios') {
                    // iOS native Google Maps URL schema
                    nativeUrl = `comgooglemaps://?saddr=${origin.latitude},${origin.longitude}&daddr=${destination.latitude},${destination.longitude}&directionsmode=driving`;
                } else {
                    // Android native Google Maps URL schema
                    nativeUrl = `google.navigation:q=${destination.latitude},${destination.longitude}&mode=d`;
                }

                // Web fallback URL for Google Maps
                webUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
                googleWebUrl = webUrl; // Same for Google
            } else if (app === 'waze') {
                // Native URL format for Waze (same on iOS and Android)
                nativeUrl = `waze://?ll=${destination.latitude},${destination.longitude}&navigate=yes`;

                // Web fallback for Waze
                webUrl = `https://waze.com/ul?ll=${destination.latitude},${destination.longitude}&navigate=yes`;

                // Google Maps fallback for when Waze isn't installed
                googleWebUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
            }

            console.log(`Trying to open ${app} with native URL: ${nativeUrl}`);

            try {
                // Try to open the native app first
                const canOpenNative = await Linking.canOpenURL(nativeUrl);

                if (canOpenNative) {
                    // Native app is installed, open it
                    await Linking.openURL(nativeUrl);
                    console.log(`Successfully opened ${app} app`);
                    return;
                } else {
                    console.log(`Cannot open native ${app} app, trying alternatives`);
                }
            } catch (err) {
                console.log(`Error checking if can open URL: ${err}. Trying fallback.`);
                try {
                    await Linking.openURL(nativeUrl);
                    console.log(`Successfully forced open ${app} app`);
                    return;
                } catch (innerErr) {
                    console.log(`Failed to force open ${app} app, using web fallback`);
                }
            }

            // If we're here, native app opening failed
            if (app === 'google') {
                // For Google Maps, just open web version
                console.log('Opening Google Maps in browser');
                await Linking.openURL(webUrl);
            } else if (app === 'waze') {
                // For Waze, offer Google Maps as alternative
                Alert.alert(
                    'Waze non installé',
                    'Voulez-vous ouvrir Google Maps à la place?',
                    [
                        {
                            text: 'Non',
                            style: 'cancel'
                        },
                        {
                            text: 'Oui',
                            onPress: async () => {
                                try {
                                    // Try native Google Maps first
                                    let googleNativeUrl = Platform.OS === 'ios'
                                        ? `comgooglemaps://?saddr=${origin.latitude},${origin.longitude}&daddr=${destination.latitude},${destination.longitude}&directionsmode=driving`
                                        : `google.navigation:q=${destination.latitude},${destination.longitude}&mode=d`;

                                    const canOpenGoogle = await Linking.canOpenURL(googleNativeUrl);

                                    if (canOpenGoogle) {
                                        await Linking.openURL(googleNativeUrl);
                                    } else {
                                        // Fallback to web Google Maps
                                        await Linking.openURL(googleWebUrl);
                                    }
                                } catch (err) {
                                    // Last resort: web Google Maps
                                    await Linking.openURL(googleWebUrl);
                                }
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error(`Error opening ${app}:`, error);

            // Always try to open the web URL as a last resort
            try {
                if (app === 'google') {
                    const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
                    await Linking.openURL(webUrl);
                } else {
                    // For Waze, open Google Maps web instead as it's more reliable
                    const googleMapUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
                    await Linking.openURL(googleMapUrl);
                }
            } catch (err) {
                console.error('Failed to open map URL as last resort:', err);
                Alert.alert(
                    'Erreur',
                    `Impossible d'ouvrir les applications de navigation.`
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TouchableOpacity
            onPress={openNavigationApp}
            disabled={isLoading}
            className={`flex-row items-center bg-dark py-2 px-4 rounded-lg border ${isLoading ? 'border-gray-600 opacity-70' : 'border-gray-700'}`}
            style={{ minWidth: 120 }}
        >
            <Ionicons
                name={app === 'google' ? 'navigate-circle-outline' : 'location-outline'}
                size={20}
                color="#5DD6FF"
                style={{ marginRight: 6 }}
            />
            <Text className="text-white font-cabin">
                {isLoading ? 'Ouverture...' : app === 'google' ? 'Google Maps' : 'Waze'}
            </Text>
        </TouchableOpacity>
    );
};