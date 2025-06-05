import { View, FlatList, Text, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from "@/contexts/authContext";
import { DeliveryState } from "@/src/models/delivery.model";
import DeliveryCard from "@/components/ui/DeliveryCard";
import { GradientView } from "@/components/ui/GradientView";
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useMemo } from "react";
import {
    useUserDeliveries,
    useAgentDeliveries,
    useAllDeliveries, // New hook for admin to fetch all deliveries
    useDeliveryQueryCleanup
} from "@/hooks/useDeliveryQueries";
import TestEmailButton from "@/components/test/emailTest";

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
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshTriggered, setRefreshTriggered] = useState(false);

    // Determine user type and ID
    const isDeliveryAgent = user?.isDeliveryAgent;
    const isAdmin = user?.isAdmin || false;
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

    // For admins: fetch all deliveries in the system
    const {
        data: allDeliveries = [],
        isLoading: isLoadingAllDeliveries,
        error: allDeliveriesError,
        refetch: refetchAllDeliveries,
        isRefetching: isRefetchingAllDeliveries
    } = useAllDeliveries(
        {
            enableRealtime: true
        },
        isAdmin // Only fetch if user is admin
    );

    // Determine which data to use based on user type
    const rawDeliveries = isAdmin ? allDeliveries : (isDeliveryAgent ? agentDeliveries : userDeliveries);
    const isLoading = isAdmin ? isLoadingAllDeliveries : (isDeliveryAgent ? isLoadingAgentDeliveries : isLoadingUserDeliveries);
    const error = isAdmin ? allDeliveriesError : (isDeliveryAgent ? agentDeliveriesError : userDeliveriesError);
    const refetch = isAdmin ? refetchAllDeliveries : (isDeliveryAgent ? refetchAgentDeliveries : refetchUserDeliveries);
    const isRefetching = isAdmin ? isRefetchingAllDeliveries : (isDeliveryAgent ? isRefetchingAgentDeliveries : isRefetchingUserDeliveries);

    // Filter and search deliveries
    const filteredDeliveries = useMemo(() => {
        let deliveries = rawDeliveries;

        // Apply state filter
        if (activeFilter !== 'all') {
            deliveries = deliveries.filter(delivery => delivery.state === activeFilter);
        }

        // Apply search filter (only for admin)
        if (isAdmin && searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            deliveries = deliveries.filter(delivery => {
                const searchableFields = [
                    delivery.id,
                    delivery.packageDescription,
                    delivery.expeditor?.firstName,
                    delivery.receiver?.firstName,
                    delivery.expeditor?.phoneNumber,
                    delivery.receiver?.phoneNumber,
                    delivery.pickupAddress?.formattedAddress,
                    delivery.deliveryAddress?.formattedAddress,
                    delivery.pickupAddress?.components?.locality,
                    delivery.deliveryAddress?.components?.locality,
                    delivery.agentFirstName,
                    delivery.agentLastName,
                    delivery.secretCode
                ].filter(Boolean).join(' ').toLowerCase();

                return searchableFields.includes(query);
            });
        }

        return deliveries;
    }, [rawDeliveries, activeFilter, searchQuery, isAdmin]);

    // Define filter options
    const filterOptions: FilterOption[] = [
        { label: 'Toutes', state: 'all', icon: 'list-outline' },
        { label: 'En cours', state: 'processing', icon: 'refresh-outline' },
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
                        size={14}
                        color={activeFilter === option.state ? '#0F2026' : 'white'}
                        style={{ marginRight: 4 }}
                    />
                    <Text
                        className={`text-xs font-cabin-medium ${
                            activeFilter === option.state ? 'text-darker' : 'text-white'
                        }`}
                        numberOfLines={1}
                    >
                        {option.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    // Render admin search bar
    const renderAdminSearchBar = () => {
        if (!isAdmin) return null;

        return (
            <View className="mx-4 mb-4">
                <View className="flex-row items-center bg-dark p-3 rounded-lg border border-gray-700">
                    <Ionicons name="search-outline" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <TextInput
                        className="flex-1 text-white font-cabin"
                        placeholder="Rechercher par ID, description, nom, téléphone, adresse..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            className="ml-2"
                        >
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    // Header with results count
    const renderHeader = () => (
        <View className="mx-4 mb-4">
            <Text className="text-white text-lg font-cabin-medium">
                {isAdmin && searchQuery.trim() ? (
                    `${filteredDeliveries.length} résultat${filteredDeliveries.length > 1 ? 's' : ''} trouvé${filteredDeliveries.length > 1 ? 's' : ''}`
                ) : (
                    `${filteredDeliveries.length} livraison${filteredDeliveries.length > 1 ? 's' : ''}`
                )}
            </Text>
            {isAdmin && searchQuery.trim() && (
                <Text className="text-gray-400 font-cabin text-sm mt-1">
                    Recherche: "{searchQuery}"
                </Text>
            )}
            {isAdmin && (
                <View className="flex-row items-center mt-2">
                    <Ionicons name="shield-checkmark" size={16} color="#5DD6FF" style={{ marginRight: 4 }} />
                    <Text className="text-primary font-cabin text-sm">
                        Mode administrateur - Toutes les livraisons
                    </Text>
                </View>
            )}
        </View>
    );

    // Empty State for no deliveries at all
    if (rawDeliveries.length === 0) {
        return (
            <GradientView>
                <View className="flex-1">
                    {renderFilterTabs()}
                    {renderAdminSearchBar()}
                    <View className="flex-1 justify-center items-center p-4">
                        <Ionicons name="document-outline" size={48} color="#6b7280" />
                        <Text className="mt-4 text-lg text-white font-cabin-medium">
                            {isAdmin ? 'Aucune livraison dans le système' : 'Aucune livraison trouvée'}
                        </Text>
                        <Text className="mt-2 text-gray-300 text-center font-cabin">
                            {isAdmin
                                ? 'Aucune livraison n\'a encore été créée dans le système.'
                                : 'Vous n\'avez pas encore de livraisons. Elles apparaîtront ici une fois créées.'
                            }
                        </Text>

                        {isDeliveryAgent && !isAdmin && (
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
                    {renderFilterTabs()}
                    {renderAdminSearchBar()}
                    <View className="flex-1 justify-center items-center p-4">
                        <Ionicons name="document-outline" size={48} color="#6b7280" />
                        <Text className="mt-4 text-lg text-white font-cabin-medium">
                            Aucune livraison {getFilterLabel(activeFilter)}
                        </Text>
                        <Text className="mt-2 text-gray-300 text-center font-cabin">
                            {searchQuery.trim()
                                ? 'Aucun résultat ne correspond à votre recherche.'
                                : 'Essayez de changer de filtre pour voir d\'autres livraisons.'
                            }
                        </Text>
                        {searchQuery.trim() && (
                            <TouchableOpacity
                                className="mt-4 p-2 bg-primary rounded-lg"
                                onPress={() => setSearchQuery('')}
                            >
                                <Text className="text-darker font-cabin-medium">
                                    Effacer la recherche
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

    // Success State - List of deliveries
    return (
        <GradientView>
            <View className="flex-1">
                <TestEmailButton />
                {renderFilterTabs()}
                {renderAdminSearchBar()}
                {renderHeader()}

                <FlatList
                    data={filteredDeliveries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <DeliveryCard
                            delivery={item}
                            variant={isAdmin ? 'admin' : (isDeliveryAgent ? 'deliveryGuy' : 'user')}
                            onPress={() => handleDeliveryPress(item)}
                        />
                    )}
                    ItemSeparatorComponent={ItemSeparator}
                    contentContainerStyle={{ padding: 16, paddingTop: 0 }}
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
        case 'waiting_for_prepayment':
            return 'en attente de prépaiement';
        case 'prepaid':
            return 'prépayée';
        case 'processing':
            return 'en cours';
        case 'completed':
            return 'terminée';
        case 'cancelled':
            return 'annulée';
        case 'waiting_for_payment':
            return 'en attente de paiement';
        case 'paid':
            return 'payée';
        default:
            return '';
    }
}