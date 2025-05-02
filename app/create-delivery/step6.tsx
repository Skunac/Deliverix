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

    // Format currency for display
    const formatCurrency = (amount: number, currency = 'eur') => {
        const formatter = new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 2
        });

        return formatter.format(amount);
    };

    // Format date for display
    const formatDate = (date: Date | any) => {
        try {
            // Check if the date is a Firestore Timestamp
            if (date && typeof date.toDate === 'function') {
                return format(date.toDate(), 'dd MMMM yyyy', { locale: fr });
            }

            // Check if it's a valid date object or convertible to one
            if (date) {
                const dateObj = new Date(date);
                if (!isNaN(dateObj.getTime())) {
                    return format(dateObj, 'dd MMMM yyyy', { locale: fr });
                }
            }

            // Fallback
            return 'Date not available';
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Date not available';
        }
    };

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
                    <Text className="text-white mt-4">Loading delivery information...</Text>
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
                        We couldn't find this delivery. It may have been removed or there was an error.
                    </Text>
                    <StyledButton
                        variant="primary"
                        shadow
                        className="w-full mt-6"
                        onPress={() => router.replace('/dashboard')}
                    >
                        <Text className="text-white font-cabin-medium">Go to Dashboard</Text>
                    </StyledButton>
                </View>
            </GradientView>
        );
    }

    return (
        <GradientView>
            <ScrollView className="flex-1 p-4">
                <Text className="text-white text-xl font-cabin-medium mb-6">
                    Complete Your Payment
                </Text>

                {/* Order Summary */}
                <View className="bg-gray-800 p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-4">
                        <Ionicons name="receipt-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Order Summary
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400">Delivery ID</Text>
                        <Text className="text-white">{delivery.id}</Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400">From</Text>
                        <Text className="text-white">
                            {delivery.pickupAddress.components.locality || 'N/A'}
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400">To</Text>
                        <Text className="text-white">
                            {delivery.deliveryAddress.components.locality || 'N/A'}
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400">Scheduled Date</Text>
                        <Text className="text-white">
                            {formatDate(delivery.scheduledDate)}
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400">Package</Text>
                        <Text className="text-white">
                            {delivery.packageDescription.substring(0, 50)}
                            {delivery.packageDescription.length > 50 ? '...' : ''}
                        </Text>
                    </View>

                    <View className="flex-row justify-between items-center">
                        <Text className="text-gray-400 font-cabin-medium">Total Amount</Text>
                        <Text className="text-white text-xl font-cabin-bold">
                            {formatCurrency(delivery.price)}
                        </Text>
                    </View>
                </View>

                {/* Payment Information */}
                <View className="bg-gray-800 p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-4">
                        <Ionicons name="card-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Payment Details
                        </Text>
                    </View>

                    <Text className="text-white mb-4">
                        Your payment will be processed securely through Stripe. Once your payment is confirmed, your delivery will be available for a delivery agent to pick up.
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
                        {isProcessing ? 'Processing...' : `Pay ${formatCurrency(delivery.price)}`}
                    </Text>
                </StyledButton>
            </ScrollView>
        </GradientView>
    );
}