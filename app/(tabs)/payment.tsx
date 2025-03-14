import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from "@/contexts/authContext";
import { initStripe, useStripe } from '@stripe/stripe-react-native';

export default function MessagesScreen() {
    const { user } = useAuthContext();
    const { t } = useTranslation();
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const [loading, setLoading] = useState(false);
    const [paymentReady, setPaymentReady] = useState(false);

    // Simulated function to get a payment intent client secret
    // This would be replaced with a Firebase extension call later
    const createPaymentIntent = async () => {
        try {
            setLoading(true);

            // For testing: hardcoded client secret
            // In production, this would come from your backend or Firebase extension
            // This will NOT work for actual payments but allows for UI testing
            const testClientSecret = 'pi_3OQGKCNvhQVapHRO0CvIBSSY_secret_2wUoRRmCfQAK6pYf3YzYEpuAu';

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('Client secret retrieved (demo mode)');
            return testClientSecret;
        } catch (error) {
            console.error('Error creating payment intent:', error);
            Alert.alert('Error', 'Failed to initialize payment (demo mode)');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Initialize the payment sheet
    const initializePayment = async () => {
        try {
            setLoading(true);

            // In a real app, this would call your backend or Firebase
            // For now, we'll use our simulated function
            const clientSecret = await createPaymentIntent();

            // Initialize the payment sheet
            const { error } = await initPaymentSheet({
                paymentIntentClientSecret: clientSecret,
                merchantDisplayName: 'Your App Name',
                allowsDelayedPaymentMethods: true,
                defaultBillingDetails: {
                    name: user?.displayName || 'Customer',
                    email: user?.email || ''
                }
            });

            if (error) {
                console.error('Error initializing payment sheet:', error);
                //Alert.alert('Demo Mode', 'This is a demo implementation. In a real app, you would connect to the Stripe API via a backend service or Firebase extension.');
            } else {
                setPaymentReady(true);
                //Alert.alert('Demo Ready', 'Payment sheet initialized in demo mode. No actual charges will be made.');
            }
        } catch (error) {
            console.error('Failed to initialize payment:', error);
            //Alert.alert('Demo Mode', 'This is a demo implementation. For actual payments, you would need a properly configured backend or Firebase extension.');
        } finally {
            setLoading(false);
        }
    };

    // Open the payment sheet when the user presses the pay button
    const handlePayment = async () => {
        if (!paymentReady) {
            await initializePayment();
            return;
        }

        try {
            const { error } = await presentPaymentSheet();

            if (error) {
                console.log('Payment error:', error);
                if (error.code === 'Canceled') {
                    Alert.alert('Cancelled', 'Payment was cancelled');
                } else {
                    //Alert.alert('Demo Mode', 'This is a demo implementation. For actual payments, you would need a properly configured backend or Firebase extension.');
                }
            } else {
                Alert.alert('Demo Success', 'Your payment would be successful in a real implementation!');
                // Here you would update the user's subscription status in your database
            }
        } catch (error) {
            console.error('Payment presentation error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        }
    };

    // Initialize Stripe when the component mounts
    useEffect(() => {
        if (user) {
            // Initialize with a test publishable key
            initStripe({
                publishableKey: 'pk_test_51OQGJoNvhQVapHROTvxHi8vNfZYzjTj9NfB2MtQyGLcAVp0ZdoZg84iRlK6uUYVnFcmj9oAEbG3XSKdibB1VmQjM00U0U2AYdl',
                // This is a test key from Stripe docs, replace with your own before production
                merchantIdentifier: 'merchant.com.your.app',
            }).then(() => {
                console.log('Stripe initialized successfully');
            }).catch(error => {
                console.error('Failed to initialize Stripe:', error);
            });
        }
    }, [user]);

    console.log("StripePaymentScreen rendered, user:", user?.uid || "not logged in");

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
            <Text className="text-xl font-bold mb-4">Stripe Payment Test</Text>

            <View className="bg-gray-100 p-4 rounded-lg mb-6">
                <Text className="text-gray-700 font-medium mb-2">
                    Premium Subscription
                </Text>
                <Text className="text-gray-500 mb-4">
                    Unlock all premium features for just $19.99 per month
                </Text>
                <View className="flex-row justify-between items-center">
                    <Text className="text-lg font-bold">$19.99</Text>
                    <TouchableOpacity
                        className="px-6 py-3 bg-blue-500 rounded-full"
                        onPress={handlePayment}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text className="text-white font-medium">
                                {paymentReady ? 'Pay Now (Demo)' : 'Initialize Payment'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <View className="bg-gray-50 p-4 rounded-lg">
                <Text className="text-sm text-gray-500">
                    This is a demonstration of Stripe payments integration. Without a backend or
                    Firebase extension, this is only showing the UI flow. No actual charges
                    will be processed.
                </Text>

                <Text className="text-sm text-gray-500 mt-2">
                    When you add the Firebase Stripe extension, this code will be updated to
                    create real payment intents through Firebase.
                </Text>
            </View>
        </View>
    );
}