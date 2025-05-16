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
                    options={{ title: 'Créer une livraison' }}
                />
                <Stack.Screen
                    name="step1"
                    options={{ title: 'Détails du colis' }}
                />
                <Stack.Screen
                    name="step2"
                    options={{ title: 'Adresses' }}
                />
                <Stack.Screen
                    name="step3"
                    options={{ title: 'Horaire & Commentaires' }}
                />
                <Stack.Screen
                    name="step4"
                    options={{ title: 'Informations de facturation' }}
                />
                <Stack.Screen
                    name="step5"
                    options={{ title: 'Récapitulatif de la commande' }}
                />
                <Stack.Screen
                    name="confirmation"
                    options={{ title: 'Confirmation', headerBackVisible: false }}
                />
            </Stack>
        </DeliveryFormProvider>
    );
}