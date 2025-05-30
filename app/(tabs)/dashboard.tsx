import { GradientView } from "@/components/ui/GradientView";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import StyledButton from "@/components/ui/StyledButton";
import React, { useEffect } from "react";
import { useAuth } from "@/contexts/authContext";
import DeliveryDetailedCard from "@/components/ui/DeliveryDetailedCard";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from '@expo/vector-icons';
import {
    useUserDeliveries,
    useAgentDeliveries,
    useDeliveryQueryCleanup
} from "@/hooks/useDeliveryQueries";

export default function Dashboard() {
    const { t } = useTranslation();
    const { user } = useAuth();

    // For regular users: fetch deliveries in active states
    const {
        data: userDeliveries = [],
        isLoading: isLoadingUserDeliveries,
        error: userDeliveriesError,
        refetch: refetchUserDeliveries,
        isRefetching: isRefetchingUserDeliveries
    } = useUserDeliveries(
        user?.id || '',
        {
            enableRealtime: true
        }
    );

    // For delivery agents: fetch processing deliveries
    const {
        data: agentDeliveries = [],
        isLoading: isLoadingAgentDeliveries,
        error: agentDeliveriesError,
        refetch: refetchAgentDeliveries,
        isRefetching: isRefetchingAgentDeliveries
    } = useAgentDeliveries(
        user?.id || '',
        {
            state: 'processing',
            enableRealtime: true
        }
    );

    // Filter user deliveries to only show active ones
    const activeUserDeliveries = userDeliveries.filter(delivery =>
        ['prepaid', 'processing', 'waiting_for_payment'].includes(delivery.state)
    );

    // Determine which data to use
    const deliveries = user?.isDeliveryAgent ? agentDeliveries : activeUserDeliveries;
    const isLoading = user?.isDeliveryAgent ? isLoadingAgentDeliveries : isLoadingUserDeliveries;
    const error = user?.isDeliveryAgent ? agentDeliveriesError : userDeliveriesError;
    const refetch = user?.isDeliveryAgent ? refetchAgentDeliveries : refetchUserDeliveries;
    const isRefetching = user?.isDeliveryAgent ? isRefetchingAgentDeliveries : isRefetchingUserDeliveries;

    const handleDeliveryPress = (delivery: any) => {
        router.push(`/delivery/${delivery.id}`);
    };

    const handleRefresh = () => {
        refetch();
    };

    // Loading state
    if (isLoading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5DD6FF" />
                    <Text className="text-white mt-4 font-cabin">
                        {user?.isDeliveryAgent ? "Chargement de vos livraisons..." : "Chargement de vos courses..."}
                    </Text>
                </View>
            </GradientView>
        );
    }

    // Error state
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

    return (
        <GradientView>
            <View style={{ flex: 1 }}>
                {!user?.isDeliveryAgent && (
                    <StyledButton
                        shadow={true}
                        className="m-4"
                        onPress={() => router.push(`/create-delivery`)}
                    >
                        <Text className="font-cabin-medium text-xl">
                            {t("delivery.orderDelivery") || "Commander une course"}
                        </Text>
                    </StyledButton>
                )}

                <View className="m-4" style={{ flex: 1 }}>
                    {/* Dynamic header text */}
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-white text-lg font-cabin-medium">
                            {deliveries.length === 0
                                ? user?.isDeliveryAgent
                                    ? "Aucune livraison en cours"
                                    : "Aucune course en cours"
                                : deliveries.length === 1
                                    ? (t("delivery.ongoingDelivery") || "Course en cours")
                                    : (t("delivery.ongoingDeliveries") || "Courses en cours")
                            }
                        </Text>
                    </View>

                    {deliveries.length > 0 ? (
                        <FlatList
                            data={deliveries}
                            renderItem={({ item }) => (
                                <DeliveryDetailedCard
                                    delivery={item}
                                    onPress={() => handleDeliveryPress(item)}
                                />
                            )}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={true}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            onRefresh={handleRefresh}
                            refreshing={isRefetching}
                        />
                    ) : (
                        <View className="flex-1 justify-center items-center">
                            <Ionicons name="document-outline" size={48} color="#6b7280" />
                            <Text className="text-white font-cabin-regular text-center mt-4">
                                {user?.isDeliveryAgent
                                    ? "Aucune livraison en cours"
                                    : "Aucune course en cours"
                                }
                            </Text>
                            <Text className="text-gray-300 font-cabin text-center mt-2 px-6">
                                {user?.isDeliveryAgent
                                    ? "Vos livraisons acceptées apparaîtront ici"
                                    : "Vos courses apparaîtront ici une fois créées"
                                }
                            </Text>

                            {/* Action button based on user type */}
                            {user?.isDeliveryAgent && (
                                <TouchableOpacity
                                    className="mt-6 p-3 bg-primary rounded-lg"
                                    onPress={() => {
                                        if (user?.isDeliveryAgent) {
                                            router.push('/(tabs)/available-deliveries');
                                        } else {
                                            router.push('/create-delivery');
                                        }
                                    }}
                                >
                                    <Text className="text-darker font-cabin-medium">
                                        {user?.isDeliveryAgent
                                            ? "Voir les livraisons disponibles"
                                            : "Créer une nouvelle course"
                                        }
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Refresh button for empty state */}
                            <TouchableOpacity
                                className="mt-4 p-2 bg-primary rounded-lg"
                                onPress={handleRefresh}
                                disabled={isRefetching}
                            >
                                <Text className="text-darker font-cabin">
                                    {isRefetching ? 'Actualisation...' : 'Actualiser'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </GradientView>
    );
}