import { GradientView } from "@/components/ui/GradientView";
import {View, Text, FlatList, ActivityIndicator, ScrollView} from "react-native";
import StyledButton from "@/components/ui/StyledButton";
import React, { useEffect, useState } from "react";
import { DeliveryService, DeliveryWithAgent } from "@/src/services/delivery.service";
import { useAuth } from "@/contexts/authContext";
import DeliveryDetailedCard from "@/components/ui/DeliveryDetailedCard";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [deliveries, setDeliveries] = useState<DeliveryWithAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const deliveryService = new DeliveryService();

    useEffect(() => {
        async function fetchDeliveries() {
            if (!user) return;

            try {
                setLoading(true);

                if (user && user.uid) {
                    // Fetch all the required delivery states in parallel
                    const [prepaidDeliveries, processingDeliveries, waitingDeliveries] = await Promise.all([
                        deliveryService.getUserDeliveries(user.uid, 'prepaid'),
                        deliveryService.getUserDeliveries(user.uid, 'processing'),
                        deliveryService.getUserDeliveries(user.uid, 'waiting_for_payment')
                    ]);

                    // Combine the results - already enriched with agent info
                    const allDeliveries = [
                        ...prepaidDeliveries,
                        ...processingDeliveries,
                        ...waitingDeliveries
                    ];

                    setDeliveries(allDeliveries);
                }
            } catch (error) {
                console.error("Error fetching deliveries:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchDeliveries();
    }, [user]);

    const handleDeliveryPress = (delivery: DeliveryWithAgent) => {
        router.push(`/delivery/${delivery.id}`);
    };

    return (
        <GradientView>
            <View style={{ flex: 1 }}>
                <StyledButton shadow={true} className="m-4" onPress={() => router.push(`/create-delivery`)}>
                    <Text className="font-cabin-medium text-xl">
                        {t("delivery.orderDelivery") || "Commander une course"}
                    </Text>
                </StyledButton>

                <View className="m-4" style={{ flex: 1 }}>
                    {deliveries.length > 1
                        ? <Text className="text-white text-lg font-cabin-medium mb-2">
                            {t("delivery.ongoingDeliveries") || "Courses en cours"}
                        </Text>
                        : <Text className="text-white text-lg font-cabin-medium mb-2">
                            {t("delivery.ongoingDelivery") || "Course en cours"}
                        </Text>
                    }

                    {loading ? (
                        <View className="p-8 flex items-center justify-center">
                            <ActivityIndicator size="large" color="#ffffff" />
                        </View>
                    ) : deliveries.length > 0 ? (
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
                        />
                    ) : (
                        <View className="p-4 bg-white bg-opacity-10 rounded-lg items-center justify-center">
                            <Text className="text-dark font-cabin-regular">
                                Aucune course en cours
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </GradientView>
    );
}