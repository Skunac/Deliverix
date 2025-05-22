import React from 'react';
import {View, FlatList, Text, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/authContext";
import { GradientView } from "@/components/ui/GradientView";
import { Ionicons } from '@expo/vector-icons';
import DeliveryCard from "@/components/ui/DeliveryCard";
import {
    useAvailableDeliveries,
    useAcceptDelivery
} from "@/hooks/useDeliveryQueries";

export default function AvailableDeliveriesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const {
        data: availableDeliveries = [],
        isLoading,
        error,
        refetch,
        isRefetching
    } = useAvailableDeliveries(user?.id!, true);

    const acceptDeliveryMutation = useAcceptDelivery();

    const handleAcceptDelivery = async (deliveryId: string) => {
        if (!user?.uid) {
            Alert.alert("Erreur", "Vous devez être connecté");
            return;
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
                    onPress: () => {
                        acceptDeliveryMutation.mutate(
                            { deliveryId, agentId: user.id },
                            {
                                onSuccess: () => {
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
                                },
                                onError: (error) => {
                                    console.error("Error accepting delivery:", error);
                                    Alert.alert("Erreur", "Impossible d'accepter la livraison. Veuillez réessayer.");
                                }
                            }
                        );
                    }
                }
            ]
        );
    };

    const handleRefresh = () => {
        refetch();
    };

    // Separator component to add space between items
    const ItemSeparator = () => <View className="h-4" />;

    // Loading State
    if (isLoading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5DD6FF" />
                    <Text className="mt-4 text-white font-cabin">
                        Chargement des livraisons disponibles...
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

    // Empty State
    if (availableDeliveries.length === 0) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="briefcase-outline" size={48} color="#6b7280" />
                    <Text className="mt-4 text-lg text-white font-cabin-medium">
                        Aucune livraison disponible
                    </Text>
                    <Text className="mt-2 text-gray-300 text-center font-cabin">
                        Il n'y a actuellement aucune livraison disponible que vous puissiez accepter.
                        Les nouvelles livraisons apparaîtront automatiquement ici.
                    </Text>
                    <TouchableOpacity
                        className="mt-6 p-3 bg-primary rounded-lg"
                        onPress={handleRefresh}
                        disabled={isRefetching}
                    >
                        <Text className="text-darker font-cabin-medium">
                            {isRefetching ? 'Rechargement...' : 'Actualiser'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </GradientView>
        );
    }

    // Success State - List of deliveries
    return (
        <GradientView>
            <View className="flex-1 p-4">
                {/* Header with real-time indicator */}
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white text-lg font-cabin-medium">
                        {availableDeliveries.length} livraison{availableDeliveries.length > 1 ? 's' : ''} disponible{availableDeliveries.length > 1 ? 's' : ''}
                    </Text>
                </View>

                <FlatList
                    data={availableDeliveries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <DeliveryCard
                            delivery={item}
                            variant="available"
                            onAccept={() => handleAcceptDelivery(item.id)}
                        />
                    )}
                    ItemSeparatorComponent={ItemSeparator}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    onRefresh={handleRefresh}
                    refreshing={isRefetching}
                    showsVerticalScrollIndicator={false}
                />

                {/* Loading indicator for accept mutation */}
                {acceptDeliveryMutation.isPending && (
                    <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center">
                        <View className="bg-dark p-6 rounded-lg items-center">
                            <ActivityIndicator size="large" color="#5DD6FF" />
                            <Text className="text-white mt-4 font-cabin-medium">
                                Acceptation en cours...
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </GradientView>
    );
}