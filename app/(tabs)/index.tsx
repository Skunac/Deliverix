import { View, FlatList, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from "@/contexts/authContext";
import { DeliveryState } from "@/src/models/delivery.model";
import DeliveryCard from "@/components/ui/DeliveryCard";
import { GradientView } from "@/components/ui/GradientView";
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from "react";
import {
    useUserDeliveries,
    useAgentDeliveries,
    useDeliveryQueryCleanup
} from "@/hooks/useDeliveryQueries";

type FilterOption = {
    label: string;
    state: DeliveryState | 'all';
    icon: string;
};

export default function DeliveriesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams();
    const [activeFilter, setActiveFilter] = useState<DeliveryState | 'all'>('all');

    // Track if we just navigated from accepting a delivery
    const [refreshTriggered, setRefreshTriggered] = useState(false);

    // Determine user type and ID
    const isDeliveryAgent = user?.isDeliveryAgent;
    const userId = user?.uid || user?.id;

    // For regular users: fetch all their deliveries
    const {
        data: userDeliveries = [],
        isLoading: isLoadingUserDeliveries,
        error: userDeliveriesError,
        refetch: refetchUserDeliveries,
        isRefetching: isRefetchingUserDeliveries
    } = useUserDeliveries(
        userId || '',
        {
            enableRealtime: true
        }
    );

    // For delivery agents: fetch all their deliveries
    const {
        data: agentDeliveries = [],
        isLoading: isLoadingAgentDeliveries,
        error: agentDeliveriesError,
        refetch: refetchAgentDeliveries,
        isRefetching: isRefetchingAgentDeliveries
    } = useAgentDeliveries(
        userId || '',
        {
            enableRealtime: true
        }
    );

    // Determine which data to use
    const allDeliveries = isDeliveryAgent ? agentDeliveries : userDeliveries;
    const isLoading = isDeliveryAgent ? isLoadingAgentDeliveries : isLoadingUserDeliveries;
    const error = isDeliveryAgent ? agentDeliveriesError : userDeliveriesError;
    const refetch = isDeliveryAgent ? refetchAgentDeliveries : refetchUserDeliveries;
    const isRefetching = isDeliveryAgent ? isRefetchingAgentDeliveries : isRefetchingUserDeliveries;

    // Filter deliveries based on active filter
    const filteredDeliveries = activeFilter === 'all'
        ? allDeliveries
        : allDeliveries.filter(delivery => delivery.state === activeFilter);

    // Define filter options
    const filterOptions: FilterOption[] = [
        { label: 'Toutes', state: 'all', icon: 'list-outline' },
        { label: 'En cours', state: 'processing', icon: 'time-outline' },
        { label: 'Terminées', state: 'completed', icon: 'checkmark-circle-outline' },
        { label: 'Annulées', state: 'cancelled', icon: 'close-circle-outline' }
    ];

    // Handle refresh from navigation params
    useEffect(() => {
        if (params.refresh === "true" && !refreshTriggered) {
            console.log("Refresh triggered from navigation params");
            setRefreshTriggered(true);
            refetch();
            router.setParams({});
        }
    }, [params.refresh, refreshTriggered, refetch, router]);

    // Reset refresh trigger when refetching completes
    useEffect(() => {
        if (refreshTriggered && !isRefetching) {
            setRefreshTriggered(false);
        }
    }, [refreshTriggered, isRefetching]);

    const handleFilterChange = (filter: DeliveryState | 'all') => {
        setActiveFilter(filter);
    };

    const handleDeliveryPress = (delivery: any) => {
        router.push(`/delivery/${delivery.id}`);
    };

    const handleRefresh = () => {
        refetch();
    };

    const ItemSeparator = () => <View className="h-4" />;

    // Loading State
    if (isLoading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5DD6FF" />
                    <Text className="mt-4 text-white font-cabin">
                        Chargement des livraisons...
                    </Text>
                </View>
            </GradientView>
        );
    }

    // Error State
    if (error) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text className="mt-4 text-lg text-red-500 font-cabin">
                        Erreur lors du chargement
                    </Text>
                    <Text className="mt-2 text-gray-300 text-center font-cabin">
                        {error.message || "Une erreur est survenue"}
                    </Text>
                    <TouchableOpacity
                        className="mt-6 p-3 bg-primary rounded-lg"
                        onPress={handleRefresh}
                        disabled={isRefetching}
                    >
                        <Text className="text-white font-cabin-medium">
                            {isRefetching ? 'Rechargement...' : 'Réessayer'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </GradientView>
        );
    }

    // Render filter tabs
    const renderFilterTabs = () => (
        <View className="flex-row bg-dark p-2 mb-2">
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

    // Empty State for no deliveries at all
    if (allDeliveries.length === 0) {
        return (
            <GradientView>
                <View className="flex-1">
                    {isDeliveryAgent && renderFilterTabs()}
                    <View className="flex-1 justify-center items-center p-4">
                        <Ionicons name="document-outline" size={48} color="#6b7280" />
                        <Text className="mt-4 text-lg text-white font-cabin-medium">
                            Aucune livraison trouvée
                        </Text>
                        <Text className="mt-2 text-gray-300 text-center font-cabin">
                            Vous n'avez pas encore de livraisons. Elles apparaîtront ici une fois créées.
                        </Text>

                        {isDeliveryAgent && (
                            <TouchableOpacity
                                className="mt-6 p-3 bg-primary rounded-lg"
                                onPress={() => router.push('/(tabs)/available-deliveries')}
                            >
                                <Text className="text-darker font-cabin-medium">
                                    Voir les livraisons disponibles
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            className="mt-4 p-2"
                            onPress={handleRefresh}
                            disabled={isRefetching}
                        >
                            <Text className="text-secondary font-cabin">
                                {isRefetching ? 'Actualisation...' : 'Actualiser'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </GradientView>
        );
    }

    // Empty State for filtered results
    if (filteredDeliveries.length === 0) {
        return (
            <GradientView>
                <View className="flex-1">
                    {isDeliveryAgent && renderFilterTabs()}
                    <View className="flex-1 justify-center items-center p-4">
                        <Ionicons name="document-outline" size={48} color="#6b7280" />
                        <Text className="mt-4 text-lg text-white font-cabin-medium">
                            Aucune livraison {getFilterLabel(activeFilter)}
                        </Text>
                        <Text className="mt-2 text-gray-300 text-center font-cabin">
                            Essayez de changer de filtre pour voir d'autres livraisons.
                        </Text>
                        <TouchableOpacity
                            className="mt-4 p-2"
                            onPress={handleRefresh}
                            disabled={isRefetching}
                        >
                            <Text className="text-secondary font-cabin">
                                {isRefetching ? 'Actualisation...' : 'Actualiser'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </GradientView>
        );
    }

    // Success State - List of deliveries
    return (
        <GradientView>
            <View className="flex-1">
                {isDeliveryAgent && renderFilterTabs()}

                <FlatList
                    data={filteredDeliveries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <DeliveryCard
                            delivery={item}
                            variant={isDeliveryAgent ? 'deliveryGuy' : 'user'}
                            onPress={() => handleDeliveryPress(item)}
                        />
                    )}
                    ItemSeparatorComponent={ItemSeparator}
                    contentContainerStyle={{ padding: 16, paddingTop: 8 }}
                    onRefresh={handleRefresh}
                    refreshing={isRefetching || refreshTriggered}
                    showsVerticalScrollIndicator={false}
                />
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