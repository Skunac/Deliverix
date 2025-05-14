import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/authContext";
import { DeliveryService } from "@/src/services/delivery.service";
import { Delivery, DeliveryState } from "@/src/models/delivery.model";
import DeliveryCard from "@/components/ui/DeliveryCard";
import { GradientView } from "@/components/ui/GradientView";
import { Ionicons } from '@expo/vector-icons';

type FilterOption = {
    label: string;
    state: DeliveryState | 'all';
    icon: string;
};

export default function DeliveriesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const deliveryService = new DeliveryService();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<DeliveryState | 'all'>('all');

    // Define filter options
    const filterOptions: FilterOption[] = [
        { label: 'Toutes', state: 'all', icon: 'list-outline' },
        { label: 'En cours', state: 'processing', icon: 'time-outline' },
        { label: 'Terminées', state: 'completed', icon: 'checkmark-circle-outline' },
        { label: 'Annulées', state: 'cancelled', icon: 'close-circle-outline' }
    ];

    useEffect(() => {
        const fetchDeliveries = async () => {
            try {
                setLoading(true);
                if (user?.uid) {
                    if (user.isDeliveryAgent) {
                        const userDeliveries = await deliveryService.getAgentDeliveries(user.uid);
                        console.log("userDeliveries", userDeliveries);
                        setDeliveries(userDeliveries);
                        setFilteredDeliveries(userDeliveries);
                    } else {
                        const userDeliveries = await deliveryService.getUserDeliveries(user.uid);
                        console.log("userDeliveries", userDeliveries);
                        setDeliveries(userDeliveries);
                        setFilteredDeliveries(userDeliveries);
                    }
                } else {
                    setError("User ID not found");
                }
            } catch (err) {
                console.error("Error fetching deliveries:", err);
                setError("Failed to load deliveries");
            } finally {
                setLoading(false);
            }
        };

        fetchDeliveries();
    }, [user?.uid]);

    // Filter deliveries when active filter changes
    useEffect(() => {
        if (user?.isDeliveryAgent){
            if (activeFilter === 'all') {
                setFilteredDeliveries(deliveries);
            } else {
                const filtered = deliveries.filter(delivery => delivery.state === activeFilter);
                setFilteredDeliveries(filtered);
            }
        }
    }, [activeFilter, deliveries]);

    // Handle filter selection
    const handleFilterChange = (filter: DeliveryState | 'all') => {
        setActiveFilter(filter);
    };

    const handleDeliveryPress = (delivery: Delivery) => {
        // Navigate to delivery details
        router.push(`/delivery/${delivery.id}`);
    };

    // Separator component to add space between items
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
                </View>
            </GradientView>
        );
    }

    // Render filter tabs
    const renderFilterTabs = () => (
        <View className="flex-row bg-dark p-2 rounded-lgmb-2">
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
                                onPress={handleDeliveryPress}
                            />
                        )}
                        ItemSeparatorComponent={ItemSeparator}
                        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
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