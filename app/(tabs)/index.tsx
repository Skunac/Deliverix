import React, {useEffect, useState} from 'react';
import { View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import {useAuth} from "@/contexts/authContext";
import {DeliveryService} from "@/src/services/delivery.service";
import {Delivery} from "@/src/models/delivery.model";
import DeliveryCard from "@/components/ui/DeliveryCard";
import {GradientView} from "@/components/ui/GradientView";

// Example component that displays a list of deliveries
export default function DeliveriesScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const deliveryService = new DeliveryService();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);

    useEffect(() => {
        const fetchDeliveries = async () => {
            try {
                const userDeliveries = await deliveryService.getUserDeliveries(user.uid);
                setDeliveries(userDeliveries);
            } catch (error) {
                console.error("Error fetching deliveries:", error);
            }
        };

        fetchDeliveries();
    }, [user.uid]);

    const handleDeliveryPress = (delivery: Delivery) => {
        // Navigate to delivery details
        console.log(`Navigating to delivery with ID: ${delivery.id}`);
        //router.push(`/deliveries/${delivery.id}`);
    };

    // Separator component to add space between items
    const ItemSeparator = () => <View className="h-4" />;

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