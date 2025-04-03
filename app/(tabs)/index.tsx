import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/authContext";
import { DeliveryService } from "@/src/services/delivery.service";
import { Delivery } from "@/src/models/delivery.model";
import DeliveryCard from "@/components/ui/DeliveryCard";
import { GradientView } from "@/components/ui/GradientView";
import { Ionicons } from '@expo/vector-icons';

export default function DeliveriesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const deliveryService = new DeliveryService();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDeliveries = async () => {
            try {
                setLoading(true);
                if (user?.uid) {
                    const userDeliveries = await deliveryService.getUserDeliveries(user.uid);
                    setDeliveries(userDeliveries);
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

    if (!user) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text className="mt-4 text-lg text-red-500">User not authenticated</Text>
                </View>
            </GradientView>
        );
    }

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
                    <Text className="mt-4 text-gray-600">Loading deliveries...</Text>
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

    if (deliveries.length === 0) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="document-outline" size={48} color="#6b7280" />
                    <Text className="mt-4 text-lg text-gray-700">No deliveries found</Text>
                    <Text className="mt-2 text-gray-500 text-center">
                        You don't have any deliveries yet. They will appear here once created.
                    </Text>
                </View>
            </GradientView>
        );
    }

    return (
        <GradientView>
            <View className="flex-1">
                <FlatList
                    data={deliveries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <DeliveryCard
                            delivery={item}
                            onPress={handleDeliveryPress}
                        />
                    )}
                    ItemSeparatorComponent={ItemSeparator}
                    contentContainerStyle={{ padding: 16 }}
                />
            </View>
        </GradientView>
    );
}