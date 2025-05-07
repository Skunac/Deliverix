import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Separator } from "@/components/ui/Separator";
import { DeliveryWithAgent } from "@/src/services/delivery.service";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";

type DeliveryDetailedCardProps = {
    delivery: DeliveryWithAgent;
    onPress?: () => void;
};

const DeliveryDetailedCard = ({ delivery, onPress }: DeliveryDetailedCardProps) => {
    const { t } = useTranslation();
    const mapRef = useRef<MapView>(null);

    const agentName = delivery.agentFirstName && delivery.agentLastName
        ? `${delivery.agentFirstName} ${delivery.agentLastName}`
        : t("delivery.agent.unassigned") || "Non assigné";

    /**
     * Safely parses a timestamp of various possible formats into a Date object
     */
    const parseTimestamp = (timestamp: any): Date | null => {
        try {
            // Case 1: timestamp is null or undefined
            if (!timestamp) {
                return null;
            }

            // Case 2: timestamp is already a Date object
            if (timestamp instanceof Date) {
                return timestamp;
            }
            // Case 3: timestamp is a Firestore timestamp object with seconds and nanoseconds
            else if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
                return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
            }
            // Case 4: timestamp is a number (Unix timestamp)
            else if (typeof timestamp === 'number') {
                // Check if it's seconds (10 digits) or milliseconds (13 digits)
                return new Date(timestamp.toString().length < 13 ? timestamp * 1000 : timestamp);
            }
            // Case 5: timestamp is a string (ISO date or other format)
            else if (typeof timestamp === 'string') {
                return new Date(timestamp);
            }

            return null;
        } catch (error) {
            console.error("Error parsing date:", error, "Raw value:", timestamp);
            return null;
        }
    };

    /**
     * Format just the time portion (HH'h')
     */
    const formatTime = (date: Date | null): string => {
        if (!date || isNaN(date.getTime())) return "N/A";
        return format(date, "HH'h'", { locale: fr });
    };

    /**
     * Format just the date portion (d MMMM)
     */
    const formatDate = (date: Date | null): string => {
        if (!date || isNaN(date.getTime())) return t("delivery.date.undefined") || "Date non définie";
        return format(date, "d MMMM", { locale: fr });
    };

    // Parse delivery timeSlot
    const startDate = parseTimestamp(delivery.timeSlot?.start);
    const endDate = parseTimestamp(delivery.timeSlot?.end);

    // Generate formatted time string
    let deliveryTimeText = t("delivery.time.undefined") || "Horaire non défini";

    if (startDate && endDate) {
        if (isSameDay(startDate, endDate)) {
            // Same day delivery
            const dateStr = formatDate(startDate);
            const startTimeStr = formatTime(startDate);
            const endTimeStr = formatTime(endDate);
            deliveryTimeText = `${t("delivery.time.onDay")} ${dateStr} ${t("delivery.time.between")} ${startTimeStr} ${t("delivery.time.and")} ${endTimeStr}`;
        } else {
            // Multi-day delivery
            const startDateStr = formatDate(startDate);
            const startTimeStr = formatTime(startDate);
            const endDateStr = formatDate(endDate);
            const endTimeStr = formatTime(endDate);
            deliveryTimeText = `${t("delivery.time.from")} ${startDateStr} ${t("delivery.time.at")} ${startTimeStr} ${t("delivery.time.to")} ${endDateStr} ${t("delivery.time.at")} ${endTimeStr}`;
        }
    }

    // Define the coordinates for both markers
    const pickupCoords = {
        latitude: delivery.pickupAddress.coordinates.latitude,
        longitude: delivery.pickupAddress.coordinates.longitude,
    };

    const deliveryCoords = {
        latitude: delivery.deliveryAddress.coordinates.latitude,
        longitude: delivery.deliveryAddress.coordinates.longitude,
    };

    // Calculate the midpoint between pickup and delivery
    const midLat = (pickupCoords.latitude + deliveryCoords.latitude) / 2;
    const midLng = (pickupCoords.longitude + deliveryCoords.longitude) / 2;

    // Calculate the distance between points (approximately)
    const latDiff = Math.abs(pickupCoords.latitude - deliveryCoords.latitude);
    const lngDiff = Math.abs(pickupCoords.longitude - deliveryCoords.longitude);

    // Add more padding (25%) to ensure both markers are visible with some context
    const latDelta = Math.max(latDiff * 1.25, 0.01);
    const lngDelta = Math.max(lngDiff * 1.25, 0.01);

    // Adjust the map to show both markers after the component mounts
    useEffect(() => {
        // Make sure we have valid coordinates for both
        if (!pickupCoords || !deliveryCoords) return;

        // Use a small timeout to ensure the map is fully loaded
        const timer = setTimeout(() => {
            if (mapRef.current) {
                // Get the current markers
                const markers = [pickupCoords, deliveryCoords];

                try {
                    // Fit map to show all markers with medium padding
                    mapRef.current.fitToCoordinates(markers, {
                        edgePadding: { top: 30, right: 30, bottom: 30, left: 30 },
                        animated: true
                    });
                } catch (error) {
                    console.error("Error fitting to coordinates:", error);
                }
            }
        }, 300);

        return () => clearTimeout(timer);
    }, []);

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.8}
            onPress={onPress}
        >
            {/* Map with both markers */}
            <MapView
                ref={mapRef}
                style={styles.mapPlaceholder}
                initialRegion={{
                    latitude: midLat,
                    longitude: midLng,
                    latitudeDelta: latDelta,
                    longitudeDelta: lngDelta
                }}
                mapType={"mutedStandard"}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                toolbarEnabled={false}
                moveOnMarkerPress={false}
            >
                {/* Directions between markers */}
                <MapViewDirections
                    origin={pickupCoords}
                    destination={deliveryCoords}
                    apikey={'AIzaSyBmDRLS39EJf9I54k9lDGfu1hdumFZ7v0c'}
                    strokeWidth={3}
                    strokeColor="#4285F4"
                    mode="DRIVING"
                />
                {/* Pickup marker */}
                <Marker
                    coordinate={pickupCoords}
                    title={"Point de collecte"}
                    description={delivery.pickupAddress.formattedAddress}
                    pinColor="green"
                />

                {/* Delivery marker */}
                <Marker
                    coordinate={deliveryCoords}
                    title={"Destination"}
                    description={delivery.deliveryAddress.formattedAddress}
                    pinColor="red"
                />
            </MapView>

            {/* Separator */}
            <Separator />

            {/* Delivery details */}
            <View className="flex-col">
                <View className="flex-row justify-between items-center px-2 py-2">
                    <Text className="text-white font-cabin">{t("delivery.step") || "Etape"}</Text>
                    <Text className="text-white font-cabin-medium">
                        {t(`delivery.status.${delivery.status}`) || delivery.status}
                    </Text>
                </View>
                <View className="flex-row justify-between items-center px-2 py-2">
                    <Text className="text-white font-cabin">{t("delivery.type") || "Type"}</Text>
                    <Text className="text-white font-cabin-medium">
                        {t(`delivery.packageCategory.${delivery.packageCategory}`) || delivery.packageCategory}
                    </Text>
                </View>
                <View className="flex-row justify-between items-center px-2 py-2">
                    <Text className="text-white font-cabin">{t("delivery.by") || "Par"}</Text>
                    <Text className="text-white font-cabin-medium">{agentName}</Text>
                </View>

                <View className="flex-row justify-between items-center px-2 py-2">
                    <Text className="text-white font-cabin">{t("delivery.estimatedDelivery") || "Livraison prévue :"}</Text>
                    <Text className="text-white font-cabin-medium">{deliveryTimeText}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 8,
        marginBottom: 16,
        overflow: "hidden",
    },
    mapPlaceholder: {
        height: 120,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
});

export default DeliveryDetailedCard;