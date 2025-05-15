import { View, FlatList, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from "@/contexts/authContext";
import { DeliveryService } from "@/src/services/delivery.service";
import { Delivery, DeliveryState } from "@/src/models/delivery.model";
import DeliveryCard from "@/components/ui/DeliveryCard";
import { GradientView } from "@/components/ui/GradientView";
import { Ionicons } from '@expo/vector-icons';
import {useEffect, useState} from "react";

type FilterOption = {
    label: string;
    state: DeliveryState | 'all';
    icon: string;
};

export default function DeliveriesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams();
    const deliveryService = new DeliveryService();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<DeliveryState | 'all'>('all');

    // Track if we just navigated from accepting a delivery
    const [refreshTriggered, setRefreshTriggered] = useState(false);

    // Define filter options
    const filterOptions: FilterOption[] = [
        { label: 'Toutes', state: 'all', icon: 'list-outline' },
        { label: 'En cours', state: 'processing', icon: 'time-outline' },
        { label: 'Terminées', state: 'completed', icon: 'checkmark-circle-outline' },
        { label: 'Annulées', state: 'cancelled', icon: 'close-circle-outline' }
    ];

    const fetchDeliveries = async (showLoading = true) => {
        try {
            if (showLoading) {
                setLoading(true);
            }

            if (user?.uid) {
                let userDeliveries: Delivery[] = [];
                if (user.isDeliveryAgent) {
                    userDeliveries = await deliveryService.getAgentDeliveries(user.uid);
                } else {
                    userDeliveries = await deliveryService.getUserDeliveries(user.uid);
                }
                console.log("Agent deliveries:", userDeliveries);
                setDeliveries(userDeliveries);
                setFilteredDeliveries(userDeliveries);
            } else {
                setError("User ID not found");
            }
        } catch (err) {
            console.error("Error fetching deliveries:", err);
            setError("Failed to load deliveries");
        } finally {
            setLoading(false);
            setRefreshTriggered(false);
        }
    };

    useEffect(() => {
        if (user?.uid) {
            fetchDeliveries();
        }
    }, [user?.uid]);

    useEffect(() => {
        if (params.refresh === "true" && !refreshTriggered) {
            console.log("Refresh triggered from navigation params");
            setRefreshTriggered(true);
            fetchDeliveries(false);

            router.setParams({});
        }
    }, [params.refresh]);

    useEffect(() => {
        if (activeFilter === 'all') {
            setFilteredDeliveries(deliveries);
        } else {
            const filtered = deliveries.filter(delivery => delivery.state === activeFilter);
            setFilteredDeliveries(filtered);
        }
    }, [activeFilter, deliveries]);

    const handleFilterChange = (filter: DeliveryState | 'all') => {
        setActiveFilter(filter);
    };

    const handleDeliveryPress = (delivery: Delivery) => {
        router.push(`/delivery/${delivery.id}`);
    };

    const handleRefresh = () => {
        fetchDeliveries(false);
    };

    const ItemSeparator = () => <View className="h-4" />;

    if (loading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text className="mt-4 text-white">Chargement des livraisons...</Text>
                </View>
            </GradientView>
        );
    }

    if (error) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text className="mt-4 text-lg text-red-500">{error}</Text>
                    <TouchableOpacity
                        className="mt-6 p-3 bg-primary rounded-lg"
                        onPress={() => fetchDeliveries()}
                    >
                        <Text className="text-white font-cabin-medium">Réessayer</Text>
                    </TouchableOpacity>
                </View>
            </GradientView>
        );
    }

    // Render filter tabs
    const renderFilterTabs = () => (
        <View className="flex-row bg-dark p-2 rounded-lg mb-2">
            {filterOptions.map((option) => (
                <TouchableOpacity
                    key={option.state}
                    className={`flex-1 flex-row items-center justify-center p-2 rounded-lg ${
                        activeFilter === option.state ? 'bg-primary' : 'bg-transparent'
                    }`}
                    onPress={() => handleFilterChange(option.state)}
                >
                    <Ionicons
                        name={option.icon as any}
                        size={16}
                        color={activeFilter === option.state ? '#0F2026' : 'white'}
                        style={{ marginRight: 4 }}
                    />
                    <Text
                        className={`text-xs font-cabin-medium ${
                            activeFilter === option.state ? 'text-darker' : 'text-white'
                        }`}
                    >
                        {option.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    if (deliveries.length === 0) {
        return (
            <GradientView>
                {user?.isDeliveryAgent && renderFilterTabs()}
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="document-outline" size={48} color="#6b7280" />
                    <Text className="mt-4 text-lg text-white">Aucune livraison trouvée</Text>
                    <Text className="mt-2 text-gray-300 text-center">
                        Vous n'avez pas encore de livraisons. Elles apparaîtront ici une fois créées.
                    </Text>

                    {user?.isDeliveryAgent && (
                        <TouchableOpacity
                            className="mt-6 p-3 bg-primary rounded-lg"
                            onPress={() => router.push('/(tabs)/available-deliveries')}
                        >
                            <Text className="text-white font-cabin-medium">Voir les livraisons disponibles</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </GradientView>
        );
    }

    return (
        <GradientView>
            <View className="flex-1">
                {user?.isDeliveryAgent && renderFilterTabs()}

                {filteredDeliveries.length === 0 ? (
                    <View className="flex-1 justify-center items-center p-4">
                        <Ionicons name="document-outline" size={48} color="#6b7280" />
                        <Text className="mt-4 text-lg text-white">Aucune livraison {getFilterLabel(activeFilter)}</Text>
                        <Text className="mt-2 text-gray-300 text-center">
                            Essayez de changer de filtre pour voir d'autres livraisons.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredDeliveries}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <DeliveryCard
                                delivery={item}
                                onPress={() => handleDeliveryPress(item)}
                            />
                        )}
                        ItemSeparatorComponent={ItemSeparator}
                        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
                        onRefresh={handleRefresh}
                        refreshing={refreshTriggered}
                    />
                )}
            </View>
        </GradientView>
    );
}

// Helper function to get the label for the current filter in lowercase for messages
function getFilterLabel(filter: DeliveryState | 'all'): string {
    switch (filter) {
        case 'processing':
            return 'en cours';
        case 'completed':
            return 'terminée';
        case 'cancelled':
            return 'annulée';
        default:
            return '';
    }
}