import { EmbeddedAddress } from '@/src/models/delivery.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

/**
 * Format an address from its components
 */
export const formatAddress = (address: EmbeddedAddress): string => {
    const components = address.components;

    // Build the formatted address from components
    const streetAddress = [
        components.street_number,
        components.route
    ].filter(Boolean).join(' ');

    const cityInfo = [
        components.postal_code,
        components.locality
    ].filter(Boolean).join(' ');

    const regionCountry = [
        components.administrative_area_level_1,
        components.country
    ].filter(Boolean).join(', ');

    const formattedParts = [
        streetAddress,
        cityInfo,
        regionCountry
    ].filter(part => part.trim().length > 0);

    // Add complementary address if available
    if (address.complementaryAddress) {
        formattedParts.splice(1, 0, address.complementaryAddress);
    }

    return formattedParts.join(', ');
};

/**
 * Generate a formatted address string from address components
 */
export const generateFormattedAddress = (components: {
    street_number?: string;
    route?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
}): string => {
    return [
        components.street_number || '',
        components.route || '',
        components.locality || '',
        components.postal_code || '',
        components.country || ''
    ].filter(Boolean).join(', ');
};

/**
 * Creates a GeoPoint for Firebase
 */
export const createGeoPoint = (lat: number, lng: number): FirebaseFirestoreTypes.GeoPoint => {
    return {
        latitude: lat,
        longitude: lng
    } as FirebaseFirestoreTypes.GeoPoint;
};
