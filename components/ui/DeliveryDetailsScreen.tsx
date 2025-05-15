import React, { useEffect, useState, useRef } from 'react';
import {View, Text, ScrollView, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DeliveryService } from "@/src/services/delivery.service";
import { Delivery } from "@/src/models/delivery.model";
import { GradientView } from "@/components/ui/GradientView";
import { Ionicons } from '@expo/vector-icons';
import { DeliveryAgentService } from '@/src/services/delivery-agent.service';
import { DeliveryAgent } from '@/src/models/delivery-agent.model';
import StyledButton from '@/components/ui/StyledButton';
import { format } from 'date-fns';
import AgentCard from "@/components/ui/AgentCard";
import {Separator} from "@/components/ui/Separator";
import MapView, { Marker, Polyline } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import {formatDate, formatTime} from "@/utils/formatters/date-formatters";

export default function DeliveryDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const deliveryService = new DeliveryService();
    const deliveryAgentService = new DeliveryAgentService();
    const mapRef = useRef<MapView>(null);
    const GOOGLE_MAPS_API_KEY = "AIzaSyBmDRLS39EJf9I54k9lDGfu1hdumFZ7v0c";

    const [delivery, setDelivery] = useState<Delivery | null>(null);
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
                    console.log('agent',agent);
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

    const InfoRow = ({ label, value }: { label: string, value: string | number | React.ReactNode }) => (
        <View className="flex-row justify-between items-center py-2">
            <Text className="text-gray-300 font-cabin">{label}</Text>
            {typeof value === 'string' || typeof value === 'number' ? (
                <Text className="text-white font-cabin-medium">{value}</Text>
            ) : (
                value
            )}
        </View>
    );

    const SectionTitle = ({ title }: { title: string }) => (
        <Text className="text-white text-lg font-cabin-semibold mb-3">{title}</Text>
    );

    const handleModifyDelivery = () => {
        // Implement modify delivery functionality
        console.log("Modify delivery");
    };

    const handleCancelDelivery = () => {
        // Implement cancel delivery functionality
        console.log("Cancel delivery");
    };

    if (loading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#2EC3F5" />
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
                        <Text className="text-white font-cabin-medium">Retour</Text>
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
            <SafeAreaView className="flex-1 relative">
                <ScrollView className="flex-1 p-4 pb-48">
                    {/* Key Information */}
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-xl text-white font-cabin-bold">Livraison #{delivery.id.substring(0, 6)}</Text>
                        <View className="py-1 px-3 rounded-full" style={getStatusStyle(delivery.status)}>
                            <Text className="text-white font-cabin-medium">{getStatusText(delivery.status)}</Text>
                        </View>
                    </View>

                    <InfoRow
                        label="Date Prévue"
                        value={formatDate(delivery.scheduledDate)}
                    />
                    <InfoRow
                        label="Créneau Horaire"
                        value={`${formatTime(delivery.timeSlot.start)} - ${formatTime(delivery.timeSlot.end)}`}
                    />

                    <Separator />

                    {/* Price Information */}
                    <SectionTitle title="Prix" />
                    <InfoRow
                        label="Prix Total"
                        value={`${delivery.price.toFixed(2)} €`}
                    />

                    <Separator />

                    {/* Delivery Route */}
                    <SectionTitle title="Itinéraire de Livraison" />

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
                                strokeColor="#4285F4"
                                mode="DRIVING"
                            />
                            <Marker
                                coordinate={pickupCoords}
                                title={"Point de collecte"}
                                pinColor="green"
                                tracksViewChanges={false}
                                description={delivery.pickupAddress.formattedAddress}
                            />
                            <Marker
                                coordinate={deliveryCoords}
                                pinColor="red"
                                tracksViewChanges={false}
                                title={"Destination"}
                                description={delivery.deliveryAddress.formattedAddress}
                            />
                        </MapView>
                    </View>

                    <Separator />

                    {/* Delivery Agent Information - Using the new AgentCard component */}
                    <SectionTitle title="Livreur" />
                    <AgentCard agent={agent} />

                    <Separator />

                    {/* Package Details */}
                    <SectionTitle title="Détails du Colis" />
                    <InfoRow
                        label="Description"
                        value={delivery.packageDescription}
                    />
                    <InfoRow
                        label="Catégorie"
                        value={getPackageCategoryText(delivery.packageCategory)}
                    />
                    <InfoRow
                        label="Poids"
                        value={`${delivery.packageWeight} kg`}
                    />
                    <InfoRow
                        label="Dimensions"
                        value={`${delivery.packageDimensions.length} x ${delivery.packageDimensions.width} x ${delivery.packageDimensions.height} cm`}
                    />

                    <Separator />

                    {/* Comments */}
                    <SectionTitle title="Commentaires" />
                    <Text className="text-white font-cabin-medium mb-1">Commentaire:</Text>
                    {delivery.comment ? (
                        <Text className="text-white opacity-80 mb-3 font-cabin">{delivery.comment}</Text>
                    ) : (
                        <Text className="text-white opacity-60 italic mb-3 font-cabin">Aucun commentaire</Text>
                    )}

                    <View className="h-8" />
                </ScrollView>

                {/* Bottom Action Bar - Stacked Vertically */}
                {/*<View className="absolute bottom-0 left-0 right-0 flex-col bg-slate-900/95 px-2 py-1.5 border-t border-white/10">
                    <TouchableOpacity
                        onPress={handleModifyDelivery}
                        style={styles.actionButton}
                        className="flex-row justify-center bg-primary rounded-xl"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                        <Text className="text-white text-xs font-cabin-medium ml-1">Modifier</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleCancelDelivery}
                        style={[styles.actionButton, {backgroundColor: '#EAB308'}]}
                        className="flex-row justify-center rounded-xl"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close-outline" size={14} color="#FFFFFF" />
                        <Text className="text-white text-xs font-cabin-medium ml-1">Annuler</Text>
                    </TouchableOpacity>
                </View>*/}
            </SafeAreaView>
        </GradientView>
    );
}

// Helper functions for status styling
function getStatusStyle(status: string): object {
    let backgroundColor;
    let padding = 4;

    switch (status) {
        case 'waiting_for_delivery_guy':
            backgroundColor = '#EAB308'; // yellow-500
            break;
        case 'delivery_guy_accepted':
            backgroundColor = '#3B82F6'; // blue-500
            break;
        case 'picked_up':
            backgroundColor = '#8B5CF6'; // purple/indigo
            break;
        case 'delivered':
            backgroundColor = '#22C55E'; // green-500
            break;
        case 'failed':
            backgroundColor = '#EF4444'; // red-500
            break;
        default:
            backgroundColor = '#6B7280'; // gray-500
    }

    return { backgroundColor, padding };
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
        height: 160,
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 4,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    actionButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 2,
        marginHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center'
    }
});