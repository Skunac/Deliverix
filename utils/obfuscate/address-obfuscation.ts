import {FirebaseFirestoreTypes} from "@react-native-firebase/firestore";

/**
 * Generate an obfucastion for geopoints
 */
export const getObfuscatedPoint = (actualLat: number, actualLng: number, areaRadiusInMeters: number): FirebaseFirestoreTypes.GeoPoint => {
    // Convert radius from meters to degrees (approximate)
    const radiusInDegrees = areaRadiusInMeters / 111000; // 111km is roughly 1 degree

    // Random angle
    const angle = Math.random() * 2 * Math.PI;

    // Use a minimum offset to ensure the point is not too close to the actual location
    // Range between 30% and 100% of the max radius
    const minOffsetPercent = 0.3;
    const randomRadiusPercent = minOffsetPercent + (1 - minOffsetPercent) * Math.random();
    const randomRadius = randomRadiusPercent * radiusInDegrees;

    // Calculate offset
    const latOffset = randomRadius * Math.sin(angle);
    const lngOffset = randomRadius * Math.cos(angle) / Math.cos(actualLat * Math.PI / 180);

    return {
        latitude: actualLat + latOffset,
        longitude: actualLng + lngOffset,
        isEqual: function (other: FirebaseFirestoreTypes.GeoPoint): boolean {
            throw new Error("Function not implemented.");
        },
        toJSON: function (): { latitude: number; longitude: number; } {
            throw new Error("Function not implemented.");
        }
    };
};