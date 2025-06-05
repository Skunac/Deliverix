// components/ui/DeliveryCard.tsx - Updated with admin variant
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Delivery } from "@/src/models/delivery.model";
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import MapView, { MapCircle, Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { calculateDistance } from "@/utils/geo-helper/distance-calculator";
import { formatCurrency } from "@/utils/formatters/currency-formatter";
import { formatDate, formatTimeSlot } from "@/utils/formatters/date-formatters";

interface DeliveryCardProps {
    delivery: Delivery;
    variant: 'available' | 'user' | 'deliveryGuy' | 'admin';
    onPress?: () => void;
    onAccept?: () => void;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({
                                                       delivery,
                                                       variant,
                                                       onPress,
                                                       onAccept
                                                   }) => {
    const { t } = useTranslation();
    const mapRef = useRef<MapView>(null);
    const GOOGLE_MAPS_API_KEY = "AIzaSyBmDRLS39EJf9I54k9lDGfu1hdumFZ7v0c";

    // Map calculation logic
    const midLat = (delivery.pickupAddress.coordinates.latitude + delivery.deliveryAddress.coordinates.latitude) / 2;
    const midLng = (delivery.pickupAddress.coordinates.longitude + delivery.deliveryAddress.coordinates.longitude) / 2;
    const latDiff = Math.abs(delivery.pickupAddress.coordinates.latitude - delivery.deliveryAddress.coordinates.latitude);
    const lngDiff = Math.abs(delivery.deliveryAddress.coordinates.longitude - delivery.deliveryAddress.coordinates.longitude);
    const latDelta = Math.max(latDiff * 1.25, 0.01);
    const lngDelta = Math.max(lngDiff * 1.25, 0.01);

    // Define the pickup and delivery coordinates for exact markers and directions
    const pickupCoords = {
        latitude: delivery.pickupAddress.coordinates.latitude,
        longitude: delivery.pickupAddress.coordinates.longitude,
    };

    const deliveryCoords = {
        latitude: delivery.deliveryAddress.coordinates.latitude,
        longitude: delivery.deliveryAddress.coordinates.longitude,
    };

    // For available deliveries, use obfuscated coordinates
    const useObfuscated = variant === 'available';

    // Calculate distance and circle radius for available deliveries
    let circleRadius = 500;
    if (useObfuscated && delivery.pickupAddress.obfuscatedCoordinates && delivery.deliveryAddress.obfuscatedCoordinates) {
        const distance = calculateDistance(
            delivery.pickupAddress.obfuscatedCoordinates.latitude,
            delivery.pickupAddress.obfuscatedCoordinates.longitude,
            delivery.deliveryAddress.obfuscatedCoordinates.latitude,
            delivery.deliveryAddress.obfuscatedCoordinates.longitude
        );
        circleRadius = Math.max(distance * 1000 * 0.1, 500);
    }

    // Render the card content
    const renderCardContent = () => (
        <View className="bg-white bg-opacity-10 rounded-lg overflow-hidden">
            {/* Map View */}
            {variant !== 'user' && (
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
                    {useObfuscated ? (
                        // For available deliveries - show circles with obfuscated locations
                        <>
                            <MapCircle
                                center={{
                                    latitude: delivery.pickupAddress.obfuscatedCoordinates.latitude,
                                    longitude: delivery.pickupAddress.obfuscatedCoordinates.longitude,
                                }}
                                radius={circleRadius}
                                fillColor="rgba(0, 255, 0, 0.2)"
                                strokeColor="rgba(255, 0, 0, 0.5)"
                                strokeWidth={2}
                            />
                        </>
                    ) : (
                        // For user, deliveryGuy, and admin variants - show exact markers and directions
                        <>
                            {/* Directions between markers */}
                            <MapViewDirections
                                origin={pickupCoords}
                                destination={deliveryCoords}
                                apikey={GOOGLE_MAPS_API_KEY}
                                strokeWidth={3}
                                strokeColor="#5DD6FF"
                                mode="DRIVING"
                            />

                            {/* Pickup marker */}
                            <Marker
                                coordinate={pickupCoords}
                                title="Point de collecte"
                                pinColor="green"
                                tracksViewChanges={false}
                            />

                            {/* Delivery marker */}
                            <Marker
                                coordinate={deliveryCoords}
                                pinColor="red"
                                tracksViewChanges={false}
                                title="Destination"
                            />
                        </>
                    )}
                </MapView>
            )}

            {/* Info Section */}
            <View className="p-3 border-t border-gray-700 bg-dark">
                <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                        <Text className="text-white font-cabin-medium">
                            {formatCurrency(delivery.price)}
                        </Text>

                        <Text className="text-gray-300 font-cabin">
                            {delivery.pickupAddress.components.locality || 'N/A'} → {delivery.deliveryAddress.components.locality || 'N/A'}
                        </Text>

                        {/* Different information based on variant */}
                        {variant === 'available' && (
                            <Text className="text-gray-300 font-cabin">
                                À livrer {formatTimeSlot(delivery.timeSlot.start, delivery.timeSlot.end, t).toLowerCase()}
                            </Text>
                        )}

                        {(variant === 'user' || variant === 'deliveryGuy') && (
                            <Text className="text-gray-300 font-cabin">
                                {formatTimeSlot(delivery.timeSlot.start, delivery.timeSlot.end, t)}
                            </Text>
                        )}

                        {/* Admin-specific information */}
                        {variant === 'admin' && (
                            <>
                                <Text className="text-gray-300 font-cabin">
                                    {formatTimeSlot(delivery.timeSlot.start, delivery.timeSlot.end, t)}
                                </Text>
                                <View className="flex-row items-center mt-1">
                                    <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                                    <Text className="text-gray-400 font-cabin text-sm ml-1">
                                        ID: {delivery.id.substring(0, 8)}...
                                    </Text>
                                </View>
                                {(delivery as any).agentFirstName && (delivery as any).agentLastName && (
                                    <View className="flex-row items-center mt-1">
                                        <Ionicons name="bicycle-outline" size={14} color="#9CA3AF" />
                                        <Text className="text-gray-400 font-cabin text-sm ml-1">
                                            Livreur: {(delivery as any).agentFirstName} {(delivery as any).agentLastName}
                                        </Text>
                                    </View>
                                )}
                                <View className="flex-row items-center mt-1">
                                    <Ionicons name="cube-outline" size={14} color="#9CA3AF" />
                                    <Text className="text-gray-400 font-cabin text-sm ml-1" numberOfLines={1}>
                                        {delivery.packageDescription}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Accept button for available deliveries */}
                    {variant === 'available' && onAccept && (
                        <TouchableOpacity
                            className="bg-primary px-4 py-2 rounded-lg"
                            onPress={onAccept}
                        >
                            <Text className="text-darker font-cabin-medium">Accepter</Text>
                        </TouchableOpacity>
                    )}

                    {/* Status badge for user, deliveryGuy, and admin variants */}
                    {(variant === 'user' || variant === 'deliveryGuy' || variant === 'admin') && (
                        <View className="items-end">
                            <View
                                className="px-3 py-1 rounded-full"
                                style={getStatusStyle(delivery.status)}
                            >
                                <Text className="text-white font-cabin-medium text-xs">
                                    {variant === 'deliveryGuy'
                                        ? t(`delivery.deliveryStatus.${delivery.status}`)
                                        : t(`delivery.status.${delivery.status}`)
                                    }
                                </Text>
                            </View>

                            {/* Admin-specific state badge */}
                            {variant === 'admin' && (
                                <View
                                    className="px-2 py-1 rounded-full mt-1"
                                    style={getStateStyle(delivery.state)}
                                >
                                    <Text className="text-white font-cabin-medium text-xs">
                                        {t(`delivery.state.${delivery.state}`)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    // Make the card clickable if onPress is provided
    if (onPress) {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
            >
                {renderCardContent()}
            </TouchableOpacity>
        );
    }

    // Otherwise, render as a static card
    return renderCardContent();
};

// Helper function for status styling
function getStatusStyle(status: string): object {
    switch (status) {
        case 'waiting_for_delivery_guy':
            return { backgroundColor: '#EAB308' }; // yellow
        case 'delivery_guy_accepted':
            return { backgroundColor: '#3B82F6' }; // blue
        case 'picked_up':
            return { backgroundColor: '#8B5CF6' }; // purple
        case 'delivered':
            return { backgroundColor: '#22C55E' }; // green
        case 'failed':
            return { backgroundColor: '#EF4444' }; // red
        default:
            return { backgroundColor: '#6B7280' }; // gray
    }
}

// Helper function for state styling (admin-specific)
function getStateStyle(state: string): object {
    switch (state) {
        case 'waiting_for_prepayment':
            return { backgroundColor: '#F59E0B' }; // amber
        case 'prepaid':
            return { backgroundColor: '#10B981' }; // emerald
        case 'processing':
            return { backgroundColor: '#3B82F6' }; // blue
        case 'waiting_for_payment':
            return { backgroundColor: '#F59E0B' }; // amber
        case 'paid':
            return { backgroundColor: '#10B981' }; // emerald
        case 'completed':
            return { backgroundColor: '#22C55E' }; // green
        case 'cancelled':
            return { backgroundColor: '#EF4444' }; // red
        default:
            return { backgroundColor: '#6B7280' }; // gray
    }
}

const styles = StyleSheet.create({
    mapPlaceholder: {
        height: 120,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
});

export default DeliveryCard;