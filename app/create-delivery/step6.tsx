import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GradientView } from '@/components/ui/GradientView';
import StyledButton from '@/components/ui/StyledButton';
import { Ionicons } from '@expo/vector-icons';
import { DeliveryService } from '@/src/services/delivery.service';
import { DeliveryWithAgent } from '@/src/services/delivery.service';
import { useAuth } from '@/contexts/authContext';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { db, serverTimestamp } from '@/src/firebase/config';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {formatCurrency} from "@/utils/formatters/currency-formatter";
import {formatDate} from "@/utils/formatters/date-formatters";

// Collections constants - match extension defaults
const COLLECTIONS = {
    CUSTOMERS: 'customers',
    CHECKOUT_SESSIONS: 'checkout_sessions'
};

export default function PaymentScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [delivery, setDelivery] = useState<DeliveryWithAgent | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const deliveryService = new DeliveryService();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    // Load delivery data and initialize Stripe
    useEffect(() => {
        const fetchDelivery = async () => {
            if (!id) return;

            try {
                const deliveryData = await deliveryService.getDeliveryById(id);
                setDelivery(deliveryData);
            } catch (error) {
                console.error('Error fetching delivery:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDelivery();

        // Initialize Stripe
        initStripe({
            publishableKey: 'pk_test_51R2aIOArSiMSA6GzD5di58E0KQPjhdqbXcvVhIh0ZemCTtkLqS6MGt15C5cqWCnjK8ON1CKf1oLGpUmzYo2bLohx00Lnonqp2N',
            merchantIdentifier: 'merchant.com.your.app',
        }).catch(error => {
            console.error('Failed to initialize Stripe:', error);
        });
    }, [id]);

    // Handle the payment process
    const handlePayment = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be signed in to make a payment');
            return;
        }

        if (!delivery) {
            Alert.alert('Error', 'Delivery information not found');
            return;
        }

        try {
            setIsProcessing(true);

            // 1. Create the checkout session in Firestore
            // This will trigger the extension to create a payment intent
            const amountInCents = Math.round(delivery.price * 100);

            const checkoutSessionRef = await db
                .collection(COLLECTIONS.CUSTOMERS)
                .doc(user.uid)
                .collection(COLLECTIONS.CHECKOUT_SESSIONS)
                .add({
                    client: 'mobile',
                    mode: 'payment',
                    amount: amountInCents,
                    currency: 'eur',
                    metadata: {
                        deliveryId: delivery.id,
                        productName: `Delivery from ${delivery.pickupAddress.components.locality || ''} to ${delivery.deliveryAddress.components.locality || ''}`,
                    }
                });

            // 2. Listen for the extension to populate the client secret
            const checkoutSessionData = await new Promise<any>((resolve, reject) => {
                const unsubscribe = checkoutSessionRef.onSnapshot(
                    (doc) => {
                        const data = doc.data();
                        if (data && data.paymentIntentClientSecret) {
                            unsubscribe();
                            resolve(data);
                        }
                    },
                    (error) => {
                        unsubscribe();
                        reject(error);
                    }
                );

                // Set a timeout in case the extension doesn't respond
                setTimeout(() => {
                    unsubscribe();
                    reject(new Error('Payment session creation timed out'));
                }, 15000);
            });

            // 3. Initialize the payment sheet
            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: checkoutSessionData.paymentIntentClientSecret,
                merchantDisplayName: 'Rapid Royal',
                customerId: checkoutSessionData.customer,
                customerEphemeralKeySecret: checkoutSessionData.ephemeralKeySecret,
                defaultBillingDetails: {
                    name: user?.userType === 'individual' ? `${user?.firstName} ${user?.lastName}` : user?.companyName || '',
                    email: user?.email || ''
                }
            });

            if (initError) {
                throw new Error(initError.message);
            }

            // 4. Present the payment sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                if (presentError.code === 'Canceled') {
                    // User cancelled the payment - not an error
                    setIsProcessing(false);
                    return;
                }
                throw new Error(presentError.message);
            }

            // 5. Payment successful - update delivery status
            await db.collection('deliveries').doc(delivery.id).update({
                state: 'prepaid',
                paymentDate: serverTimestamp(),
                paymentIntentId: checkoutSessionData.paymentIntentClientSecret.split('_secret_')[0],
                paymentStatus: 'succeeded'
            });

            // 6. Show success message and navigate
            Alert.alert(
                'Payment Successful',
                'Your payment has been processed successfully.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/dashboard')
                    }
                ]
            );

        } catch (error: any) {
            console.error('Payment error:', error);
            Alert.alert('Payment Error', error.message || 'An error occurred during payment processing');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#2EC3F5" />
                    <Text className="text-white mt-4">Chargement des informations de livraison...</Text>
                </View>
            </GradientView>
        );
    }

    if (!delivery) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="alert-circle-outline" size={60} color="#ff4d4d" />
                    <Text className="text-white text-lg text-center mt-4">
                        Nous n'avons pas pu trouver cette livraison. Elle a peut-être été supprimée ou une erreur est survenue.
                    </Text>
                    <StyledButton
                        variant="primary"
                        shadow
                        className="w-full mt-6"
                        onPress={() => router.replace('/dashboard')}
                    >
                        <Text className="text-white font-cabin-medium">Aller au tableau de bord</Text>
                    </StyledButton>
                </View>
            </GradientView>
        );
    }

    return (
        <GradientView>
            <ScrollView className="flex-1 p-4">
                <Text className="text-white text-xl font-cabin-medium mb-6">
                    Finaliser votre paiement
                </Text>

                {/* Order Summary */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-4">
                        <Ionicons name="receipt-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Récapitulatif de la commande
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400">ID de livraison</Text>
                        <Text className="text-white">{delivery.id}</Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400">De</Text>
                        <Text className="text-white">
                            {delivery.pickupAddress.components.locality || 'N/A'}
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400">À</Text>
                        <Text className="text-white">
                            {delivery.deliveryAddress.components.locality || 'N/A'}
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400">Date prévue</Text>
                        <Text className="text-white">
                            {formatDate(delivery.scheduledDate)}
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400">Colis</Text>
                        <Text className="text-white">
                            {delivery.packageDescription.substring(0, 50)}
                            {delivery.packageDescription.length > 50 ? '...' : ''}
                        </Text>
                    </View>

                    <View className="flex-row justify-between items-center">
                        <Text className="text-gray-400 font-cabin-medium">Montant total</Text>
                        <Text className="text-white text-xl font-cabin-bold">
                            {formatCurrency(delivery.price)}
                        </Text>
                    </View>
                </View>

                {/* Payment Information */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-4">
                        <Ionicons name="card-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Détails du paiement
                        </Text>
                    </View>

                    <Text className="text-white mb-4">
                        Votre paiement sera traité en toute sécurité via Stripe. Une fois votre paiement confirmé, votre livraison sera disponible pour être prise en charge par un livreur.
                    </Text>
                </View>

                {/* Payment Button */}
                <StyledButton
                    variant="primary"
                    shadow
                    className="mb-4"
                    onPress={handlePayment}
                    disabled={isProcessing}
                >
                    <Text className="text-white font-cabin-medium">
                        {isProcessing ? 'Traitement en cours...' : `Payer ${formatCurrency(delivery.price)}`}
                    </Text>
                </StyledButton>
            </ScrollView>
        </GradientView>
    );
}