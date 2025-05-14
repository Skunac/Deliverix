import React, {useEffect, useRef, useState} from 'react';
import {View, FlatList, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/authContext";
import { DeliveryService } from "@/src/services/delivery.service";
import { Delivery } from "@/src/models/delivery.model";
import DeliveryCard from "@/components/ui/DeliveryCard";
import { GradientView } from "@/components/ui/GradientView";
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import MapView, {Marker} from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";

export default function AvailableDeliveriesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const mapRef = useRef<MapView>(null);
    const deliveryService = new DeliveryService();
    const [availableDeliveries, setAvailableDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAvailableDeliveries = async (showLoader = true) => {
        if (showLoader) {
            setLoading(true);
        }
        try {
            const deliveries = await deliveryService.getAvailableDeliveries();
            console.log("Available deliveries:", deliveries.length);
            setAvailableDeliveries(deliveries);
            setError(null);
        } catch (err) {
            console.error("Error fetching available deliveries:", err);
            setError("Failed to load available deliveries");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAvailableDeliveries();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAvailableDeliveries(false);
    };

    const handleDeliveryPress = (delivery: Delivery) => {
        router.push(`/delivery/${delivery.id}`);
    };

    const handleAcceptDelivery = async (deliveryId: string) => {
        try {
            if (!user?.uid) {
                throw new Error("Not logged in");
            }

            Alert.alert(
                "Accepter cette livraison ?",
                "Voulez-vous vraiment accepter cette livraison ? Vous serez responsable de sa prise en charge et de sa livraison.",
                [
                    {
                        text: "Annuler",
                        style: "cancel"
                    },
                    {
                        text: "Accepter",
                        onPress: async () => {
                            try {
                                setLoading(true);
                                await deliveryService.acceptDelivery(deliveryId, user.uid);
                                fetchAvailableDeliveries()
                                setLoading(false);

                                Alert.alert(
                                    "Livraison acceptée",
                                    "La livraison a été ajoutée à votre liste de livraisons.",
                                    [
                                        {
                                            text: "OK",
                                            onPress: () => {
                                                router.replace({
                                                    pathname: "/(tabs)",
                                                    params: { refresh: "true" }
                                                });
                                            }
                                        }
                                    ]
                                );
                            } catch (error) {
                                console.error("Error accepting delivery:", error);
                                setLoading(false);
                                Alert.alert("Erreur", "Impossible d'accepter la livraison. Veuillez réessayer.");
                            }
                        }
                    }
                ]
            );
        } catch (err) {
            console.error("Error accepting delivery:", err);
            setError("Failed to accept delivery");
            setLoading(false);
        }
    };

    // Separator component to add space between items
    const ItemSeparator = () => <View className="h-4" />;

    if (loading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5DD6FF" />
                    <Text className="mt-4 text-white font-cabin">Loading available deliveries...</Text>
                </View>
            </GradientView>
        );
    }

    if (error) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text className="mt-4 text-lg text-red-500 font-cabin">{error}</Text>
                    <TouchableOpacity
                        className="mt-6 p-3 bg-primary rounded-lg"
                        onPress={() => fetchAvailableDeliveries()}
                    >
                        <Text className="text-white font-cabin-medium">Try Again</Text>
                    </TouchableOpacity>
                </View>
            </GradientView>
        );
    }

    if (availableDeliveries.length === 0) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="briefcase-outline" size={48} color="#6b7280" />
                    <Text className="mt-4 text-lg text-white font-cabin-medium">No available deliveries</Text>
                    <Text className="mt-2 text-gray-300 text-center font-cabin">
                        There are currently no deliveries available for you to accept.
                    </Text>
                    <TouchableOpacity
                        className="mt-6 p-3 bg-primary rounded-lg"
                        onPress={handleRefresh}
                    >
                        <Text className="text-white font-cabin-medium">Refresh</Text>
                    </TouchableOpacity>
                </View>
            </GradientView>
        );
    }

    const renderDeliveryItem = ({ item }: { item: Delivery }) => {
        const midLat = (item.pickupAddress.coordinates.latitude + item.deliveryAddress.coordinates.latitude) / 2;
        const midLng = (item.deliveryAddress.coordinates.longitude + item.deliveryAddress.coordinates.longitude) / 2;
        const latDiff = Math.abs(item.pickupAddress.coordinates.latitude - item.deliveryAddress.coordinates.latitude);
        const lngDiff = Math.abs(item.deliveryAddress.coordinates.longitude - item.deliveryAddress.coordinates.longitude);
        const latDelta = Math.max(latDiff * 1.25, 0.01);
        const lngDelta = Math.max(lngDiff * 1.25, 0.01);
        return (
            <TouchableOpacity
                onPress={() => handleDeliveryPress(item)}
                className="bg-white bg-opacity-10 rounded-lg overflow-hidden"
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
                        origin={{latitude: item.pickupAddress.coordinates.latitude, longitude: item.pickupAddress.coordinates.longitude}}
                        destination={{latitude: item.deliveryAddress.coordinates.latitude, longitude: item.deliveryAddress.coordinates.longitude}}
                        apikey={'AIzaSyBmDRLS39EJf9I54k9lDGfu1hdumFZ7v0c'}
                        strokeWidth={3}
                        strokeColor="#4285F4"
                        mode="DRIVING"
                    />
                    {/* Pickup marker */}
                    <Marker
                        coordinate={{latitude: item.pickupAddress.coordinates.latitude, longitude: item.pickupAddress.coordinates.longitude}}
                        title={"Point de collecte"}
                        description={item.pickupAddress.formattedAddress}
                        pinColor="green"
                    />

                    {/* Delivery marker */}
                    <Marker
                        coordinate={{latitude: item.deliveryAddress.coordinates.latitude, longitude: item.deliveryAddress.coordinates.longitude}}
                        title={"Destination"}
                        description={item.deliveryAddress.formattedAddress}
                        pinColor="red"
                    />
                </MapView>
                <View className="p-3 border-t border-gray-700 bg-dark">
                    <View className="flex-row justify-between items-center">
                        <View>
                            <Text className="text-white font-cabin-medium">
                                Prix: {item.price.toFixed(2)} €
                            </Text>
                            <Text className="text-gray-300 font-cabin">
                                {item.pickupAddress.components.locality || 'N/A'} → {item.deliveryAddress.components.locality || 'N/A'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            className="bg-primary px-4 py-2 rounded-lg"
                            onPress={() => handleAcceptDelivery(item.id)}
                        >
                            <Text className="text-darker font-cabin-medium">Accept</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <GradientView>
            <View className="flex-1 p-4">
                <FlatList
                    data={availableDeliveries}
                    keyExtractor={(item) => item.id}
                    renderItem={renderDeliveryItem}
                    ItemSeparatorComponent={ItemSeparator}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                />
            </View>
        </GradientView>
    );
}

const styles = StyleSheet.create({
    mapPlaceholder: {
        height: 120,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
});