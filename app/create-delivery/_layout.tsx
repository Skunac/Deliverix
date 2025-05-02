import React from 'react';
import {Stack, useRouter} from 'expo-router';
import {DeliveryFormProvider} from "@/contexts/DeliveryFormContext";
import {TouchableOpacity} from "react-native";
import {Ionicons} from "@expo/vector-icons";

export default function CreateDeliveryLayout() {
    const router = useRouter();
    return (
        <DeliveryFormProvider>
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#09121A',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontFamily: 'Cabin-Medium',
                    },
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ marginLeft: 10 }}
                        >
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                    ),
                    contentStyle: {
                        backgroundColor: '#09121A',
                    },
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{ title: 'Create Delivery' }}
                />
                <Stack.Screen
                    name="step1"
                    options={{ title: 'Package Details' }}
                />
                <Stack.Screen
                    name="step2"
                    options={{ title: 'Addresses' }}
                />
                <Stack.Screen
                    name="step3"
                    options={{ title: 'Schedule & Comments' }}
                />
                <Stack.Screen
                    name="step4"
                    options={{ title: 'Billing Information' }}
                />
                <Stack.Screen
                    name="step5"
                    options={{ title: 'Recapitulatif de la commande' }}
                />
                <Stack.Screen
                    name="step6"
                    options={{ title: 'Payment' }}
                />
                <Stack.Screen
                    name="confirmation"
                    options={{ title: 'Confirmation', headerBackVisible: false }}
                />
            </Stack>
        </DeliveryFormProvider>
    );
}