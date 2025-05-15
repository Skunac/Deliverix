import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Linking,
    Platform,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DeliveryService, DeliveryWithAgent } from "@/src/services/delivery.service";
import { Delivery } from "@/src/models/delivery.model";
import { GradientView } from "@/components/ui/GradientView";
import { Ionicons } from '@expo/vector-icons';
import { DeliveryAgentService } from '@/src/services/delivery-agent.service';
import { DeliveryAgent } from '@/src/models/delivery-agent.model';
import StyledButton from '@/components/ui/StyledButton';
import AgentCard from "@/components/ui/AgentCard";
import { Separator } from "@/components/ui/Separator";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { formatDate, formatTime } from "@/utils/formatters/date-formatters";
import { formatCurrency } from "@/utils/formatters/currency-formatter";
import { useTranslation } from "react-i18next";
import {NavigationButton} from "@/components/ui/NavigationButton";

export default function DeliveryDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    const deliveryService = new DeliveryService();
    const deliveryAgentService = new DeliveryAgentService();
    const mapRef = useRef<MapView>(null);
    const GOOGLE_MAPS_API_KEY = "AIzaSyBmDRLS39EJf9I54k9lDGfu1hdumFZ7v0c";

    const [delivery, setDelivery] = useState<DeliveryWithAgent | null>(null);
    const [agent, setAgent] = useState<DeliveryAgent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDeliveryDetails = async () => {
            try {
                setLoading(true);
                // Fetch the delivery details
                const deliveryData = await deliveryService.getDeliveryById(id as string);
                setDelivery(deliveryData);

                // If there's a delivery agent, fetch their details
                if (deliveryData?.deliveryAgentId) {
                    console.log("Fetching delivery agent details for ID:", deliveryData.deliveryAgentId);
                    const agentData = await deliveryAgentService.getAgentProfile(deliveryData.deliveryAgentId);
                    setAgent(agentData);
                }
            } catch (err) {
                console.error("Error fetching delivery details:", err);
                setError("Échec du chargement des détails de livraison");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDeliveryDetails();
        }
    }, [id]);

    // Helper component for displaying info rows with consistent styling
    const InfoRow = ({ label, value, icon }: { label: string, value: React.ReactNode, icon?: string }) => (
        <View className="flex-row items-center border-b py-3 border-gray-400">
            {icon && (
                <Ionicons name={icon as any} size={18} color="#5DD6FF" style={{ marginRight: 10 }} />
            )}
            <Text className="text-gray-300 font-cabin flex-1">{label}</Text>
            {typeof value === 'string' || typeof value === 'number' ? (
                <Text className="text-white font-cabin-medium">{value}</Text>
            ) : (
                value
            )}
        </View>
    );

    // Section title component
    const SectionTitle = ({ title, icon }: { title: string, icon?: string }) => (
        <View className="flex-row items-center mb-3 mt-4">
            {icon && (
                <Ionicons name={icon as any} size={20} color="#5DD6FF" style={{ marginRight: 8 }} />
            )}
            <Text className="text-white text-lg font-cabin-semibold">{title}</Text>
        </View>
    );

    if (loading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5DD6FF" />
                    <Text className="mt-4 text-white font-cabin">Chargement des détails de livraison...</Text>
                </View>
            </GradientView>
        );
    }

    if (error || !delivery) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text className="mt-4 text-lg text-red-500 font-cabin">{error || "Livraison non trouvée"}</Text>
                    <StyledButton
                        variant="primary"
                        className="mt-6"
                        onPress={() => router.back()}
                    >
                        <Text className="text-darker font-cabin-medium">Retour</Text>
                    </StyledButton>
                </View>
            </GradientView>
        );
    }

    // Define the pickup and delivery coordinates
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

    // Increase padding significantly (200%) to zoom out more
    const latDelta = Math.max(latDiff * 2.0, 0.05);
    const lngDelta = Math.max(lngDiff * 2.0, 0.05);

    return (
        <GradientView>
            <ScrollView className="flex-1 p-4">
                {/* Header with delivery ID and status */}
                <View className="bg-dark p-4 rounded-xl mb-4 border border-gray-700/50">
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-xl text-white font-cabin-bold">
                            Livraison #{delivery.id.substring(0, 6)}
                        </Text>
                        <View
                            className="py-1 px-3 rounded-full"
                            style={getStatusStyle(delivery.status)}
                        >
                            <Text className="text-white font-cabin-medium text-xs">
                                {getStatusText(delivery.status)}
                            </Text>
                        </View>
                    </View>

                    <InfoRow
                        label={"État"}
                        value={t(`delivery.state.${delivery.state}`) || delivery.state}
                        icon="albums-outline"
                    />

                    <InfoRow
                        label="Prix"
                        value={formatCurrency(delivery.price)}
                        icon="cash-outline"
                    />
                </View>

                {/* Delivery Schedule */}
                <SectionTitle title="Horaire" icon="calendar-outline" />
                <View className="bg-dark p-4 rounded-xl mb-4 border border-gray-700/50">
                    <InfoRow
                        label="Date Prévue"
                        value={formatDate(delivery.scheduledDate)}
                        icon="today-outline"
                    />
                    <InfoRow
                        label="Créneau Horaire"
                        value={`${formatTime(delivery.timeSlot.start)} - ${formatTime(delivery.timeSlot.end)}`}
                        icon="time-outline"
                    />
                </View>

                {/* Map Section */}
                <SectionTitle title="Itinéraire" icon="map-outline" />
                <View className="bg-dark p-4 rounded-xl mb-4 border border-gray-700/50">
                    {/* Interactive Map */}
                    <View style={styles.mapContainer}>
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={{
                                latitude: midLat,
                                longitude: midLng,
                                latitudeDelta: latDelta,
                                longitudeDelta: lngDelta
                            }}
                        >
                            {/* Directions between markers */}
                            <MapViewDirections
                                origin={pickupCoords}
                                destination={deliveryCoords}
                                apikey={GOOGLE_MAPS_API_KEY}
                                strokeWidth={3}
                                strokeColor="#5DD6FF"
                                mode="DRIVING"
                            />
                            <Marker
                                coordinate={pickupCoords}
                                title="Point de collecte"
                                pinColor="green"
                                tracksViewChanges={false}
                                description={delivery.pickupAddress.formattedAddress}
                            />
                            <Marker
                                coordinate={deliveryCoords}
                                pinColor="red"
                                tracksViewChanges={false}
                                title="Destination"
                                description={delivery.deliveryAddress.formattedAddress}
                            />
                        </MapView>
                    </View>

                    {/* Navigation App Shortcuts */}
                    <View className="flex-row justify-around my-3">
                        <NavigationButton
                            app="google"
                            origin={pickupCoords}
                            destination={deliveryCoords}
                        />
                        <NavigationButton
                            app="waze"
                            origin={pickupCoords}
                            destination={deliveryCoords}
                        />
                    </View>

                    <SectionTitle title="Adresses" icon="location-outline" />

                    <View className="mb-3">
                        <Text style={{ color: '#5DD6FF' }} className="font-cabin-medium mb-1">Point de collecte:</Text>
                        <Text className="text-white font-cabin">
                            {delivery.pickupAddress.formattedAddress}
                        </Text>
                        {delivery.pickupAddress.complementaryAddress && (
                            <Text className="text-gray-300 font-cabin mt-1">
                                {delivery.pickupAddress.complementaryAddress}
                            </Text>
                        )}
                    </View>

                    <Separator />

                    <View className="mt-3 mb-2">
                        <Text style={{ color: '#5DD6FF' }} className="font-cabin-medium mb-1">Destination:</Text>
                        <Text className="text-white font-cabin">
                            {delivery.deliveryAddress.formattedAddress}
                        </Text>
                        {delivery.deliveryAddress.complementaryAddress && (
                            <Text className="text-gray-300 font-cabin mt-1">
                                {delivery.deliveryAddress.complementaryAddress}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Delivery Agent Information */}
                <SectionTitle title="Livreur" icon="person-outline" />
                <View className="bg-dark p-1 rounded-xl mb-4 border border-gray-700/50">
                    <AgentCard agent={agent} />
                </View>

                {/* Package Details */}
                <SectionTitle title="Détails du Colis" icon="cube-outline" />
                <View className="bg-dark p-4 rounded-xl mb-4 border border-gray-700/50">
                    <InfoRow
                        label="Description"
                        value={delivery.packageDescription}
                    />
                    <InfoRow
                        label="Catégorie"
                        value={t(`delivery.packageCategory.${delivery.packageCategory}`) || getPackageCategoryText(delivery.packageCategory)}
                    />
                    <InfoRow
                        label="Poids"
                        value={`${delivery.packageWeight} kg`}
                    />
                    <InfoRow
                        label="Dimensions"
                        value={`${delivery.packageDimensions.length} × ${delivery.packageDimensions.width} × ${delivery.packageDimensions.height} cm`}
                    />
                    <InfoRow
                        label="Fragile"
                        value={delivery.isFragile ? 'Oui' : 'Non'}
                    />
                </View>

                {/* Contact Information */}
                <SectionTitle title="Contacts" icon="people-outline" />
                <View className="bg-dark p-4 rounded-xl mb-4 border border-gray-700/50">
                    <Text style={{ color: '#5DD6FF' }} className="font-cabin-medium mb-2">Expéditeur:</Text>
                    <InfoRow
                        label="Nom"
                        value={delivery.expeditor.firstName}
                    />
                    <InfoRow
                        label="Téléphone"
                        value={delivery.expeditor.phoneNumber}
                    />

                    <View className="h-4" />

                    <Text style={{ color: '#5DD6FF' }} className="font-cabin-medium mb-2">Destinataire:</Text>
                    <InfoRow
                        label="Nom"
                        value={delivery.receiver.firstName}
                    />
                    <InfoRow
                        label="Téléphone"
                        value={delivery.receiver.phoneNumber}
                    />
                </View>

                {/* Comments */}
                {delivery.comment && (
                    <>
                        <SectionTitle title="Commentaires" icon="chatbubble-outline" />
                        <View className="bg-dark p-4 rounded-xl mb-4 border border-gray-700/50">
                            <Text className="text-white font-cabin">{delivery.comment}</Text>
                        </View>
                    </>
                )}

                <View className="h-8" />
            </ScrollView>
        </GradientView>
    );
}

// Helper functions for status styling
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

function getStatusText(status: string): string {
    switch (status) {
        case 'waiting_for_delivery_guy':
            return 'En attente de livreur';
        case 'delivery_guy_accepted':
            return 'Acceptée par le livreur';
        case 'picked_up':
            return 'Récupérée';
        case 'delivered':
            return 'Livrée';
        case 'failed':
            return 'Échouée';
        default:
            return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }
}

function getPackageCategoryText(category: string): string {
    switch (category) {
        case 'exceptional':
            return 'Exceptionnel';
        case 'urgent':
            return 'Urgent';
        case 'expensive':
            return 'Coûteux';
        case 'sensitive':
            return 'Sensible';
        case 'urgent_mechanical_parts':
            return 'Pièces mécaniques urgentes';
        case 'aeronotics':
            return 'Aéronautique';
        case 'rare':
            return 'Objet rare';
        case 'sentimental_value':
            return 'Valeur sentimentale';
        case 'products':
            return 'Produits généraux';
        case 'it_equipment':
            return 'Équipement informatique';
        case 'gift':
            return 'Cadeau';
        default:
            return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
    }
}

const styles = StyleSheet.create({
    mapContainer: {
        height: 180,
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 16,
    },
    map: {
        width: '100%',
        height: '100%',
    }
});