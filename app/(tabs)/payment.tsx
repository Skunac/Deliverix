import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from "@/contexts/authContext";
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { db, serverTimestamp } from '@/src/firebase/config';

// Collections constants - match extension defaults
const COLLECTIONS = {
    CUSTOMERS: 'customers',
    CHECKOUT_SESSIONS: 'checkout_sessions',
    PAYMENT_INTENTS: 'payment_intents'
};

export default function ProductPaymentScreen({
                                                 // These props would be passed from your product detail screen
                                                 productId = 'dynamic_product',
                                                 productName = 'Premium Feature',
                                                 productDescription = 'Unlock this premium feature',
                                                 amount = 999, // in cents ($9.99)
                                                 currency = 'usd'
                                             }) {
    const { user } = useAuthContext();
    const { t } = useTranslation();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);
    const [paymentReady, setPaymentReady] = useState(false);
    const [clientSecret, setClientSecret] = useState(null);

    const formatCurrency = (amount, currency = 'usd') => {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
            minimumFractionDigits: 2
        });

        return formatter.format(amount / 100);
    };

    const createPaymentIntent = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be signed in to make a purchase');
            return null;
        }

        try {
            setLoading(true);

            console.log('Creating payment intent for user:', user.uid);

            const checkoutSessionRef = await db
                .collection(COLLECTIONS.CUSTOMERS)
                .doc(user.uid)
                .collection(COLLECTIONS.CHECKOUT_SESSIONS)
                .add({
                    client: 'mobile',
                    mode: 'payment',
                    amount: amount,
                    currency: currency,
                    metadata: {
                        productId: productId,
                        productName: productName
                    }
                });

            console.log('Checkout session created with ID:', checkoutSessionRef.id);

            return new Promise((resolve, reject) => {
                const unsubscribe = checkoutSessionRef.onSnapshot(
                    (doc) => {
                        const data = doc.data();
                        console.log('Checkout session data:', data);

                        if (data && data.paymentIntentClientSecret) {
                            setClientSecret(data.paymentIntentClientSecret);
                            unsubscribe();
                            resolve({
                                clientSecret: data.paymentIntentClientSecret,
                                ephemeralKeySecret: data.ephemeralKeySecret,
                                customer: data.customer,
                                checkoutSessionId: doc.id
                            });
                        }
                    },
                    (error) => {
                        console.error('Error listening to checkout session:', error);
                        unsubscribe();
                        reject(error);
                    }
                );

                setTimeout(() => {
                    unsubscribe();
                    reject(new Error('Checkout session creation timed out'));
                }, 15000);
            });
        } catch (error) {
            console.error('Error creating checkout session:', error);
            Alert.alert('Error', `Could not initialize payment: ${error.message}`);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Initialize and show the payment sheet
    const handlePayment = async () => {
        try {
            setLoading(true);

            // Create a payment intent if needed
            if (!clientSecret) {
                const paymentData = await createPaymentIntent();

                if (!paymentData) {
                    setLoading(false);
                    return;
                }

                // Initialize the payment sheet
                const { error: initError } = await initPaymentSheet({
                    paymentIntentClientSecret: paymentData.clientSecret,
                    merchantDisplayName: 'Your App Name',
                    customerId: paymentData.customer,
                    customerEphemeralKeySecret: paymentData.ephemeralKeySecret,
                    // Disable Link payment method
                    allowsDelayedPaymentMethods: false,
                    ppaymentMethodsConfiguration: {
                        link: {
                            enabled: false
                        }
                    },
                    defaultBillingDetails: {
                        name: user.displayName || '',
                        email: user.email || ''
                    }
                });

                if (initError) {
                    console.error('Error initializing payment sheet:', initError);
                    Alert.alert('Error', initError.message);
                    setLoading(false);
                    return;
                }

                setPaymentReady(true);
            }

            // Present the payment sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                if (presentError.code === 'Canceled') {
                    console.log('Payment canceled');
                } else {
                    console.error('Payment error:', presentError);
                    Alert.alert('Payment Error', presentError.message);
                }
                setLoading(false);
                return;
            }

            // Payment succeeded
            Alert.alert('Success', 'Your payment was successful!');

            // Record the purchase in your database
            await recordPurchase();

            // Here you would unlock the feature or provide the purchased product

        } catch (error) {
            console.error('Error in payment process:', error);
            Alert.alert('Error', `Payment failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Record the purchase in your database
    const recordPurchase = async () => {
        try {
            await db.collection('purchases').add({
                userId: user.uid,
                productId: productId,
                productName: productName,
                amount: amount,
                currency: currency,
                purchaseDate: serverTimestamp(),
                status: 'completed'
            });

            console.log('Purchase recorded');
        } catch (error) {
            console.error('Error recording purchase:', error);
        }
    };

    // Initialize Stripe when the component mounts
    useEffect(() => {
        initStripe({
            publishableKey: 'pk_test_51R2aIOArSiMSA6GzD5di58E0KQPjhdqbXcvVhIh0ZemCTtkLqS6MGt15C5cqWCnjK8ON1CKf1oLGpUmzYo2bLohx00Lnonqp2N',
            merchantIdentifier: 'merchant.com.your.app',
        }).then(() => {
            console.log('Stripe initialized successfully');
        }).catch(error => {
            console.error('Failed to initialize Stripe:', error);
        });
    }, []);

    if (!user) {
        return (
            <View className="flex-1 justify-center items-center p-4 bg-gray-50">
                <Text className="text-lg text-gray-600 text-center">
                    {t('messages.signInRequired')}
                </Text>
                <TouchableOpacity
                    className="mt-6 px-6 py-2 bg-blue-500 rounded-full"
                    onPress={() => router.push('/(tabs)/firebase-test')}
                >
                    <Text className="text-white font-medium">{t('common.signIn')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white p-4">
            <Text className="text-xl font-bold mb-6">{productName}</Text>

            <View className="bg-gray-100 p-4 rounded-lg mb-6">
                <Text className="text-gray-700 mb-4">
                    {productDescription}
                </Text>

                <View className="flex-row justify-between items-center">
                    <Text className="text-lg font-bold">
                        {formatCurrency(amount, currency)}
                    </Text>
                    <TouchableOpacity
                        className="px-6 py-3 bg-blue-500 rounded-full"
                        onPress={handlePayment}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text className="text-white font-medium">
                                Buy Now
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View className="bg-gray-50 p-4 rounded-lg">
                <Text className="text-sm text-gray-500">
                    Your payment is processed securely with Stripe.
                    After purchase, this feature will be immediately available.
                </Text>
            </View>
        </View>
    );
}