// app/create-delivery/step5.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientView } from '@/components/ui/GradientView';
import StyledButton from '@/components/ui/StyledButton';
import { useDeliveryForm } from "@/contexts/DeliveryFormContext";
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/authContext';
import { Delivery } from '@/src/models/delivery.model';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, formatTimeSlot } from "@/utils/formatters/date-formatters";
import { db, serverTimestamp } from '@/src/firebase/config';
import { useTranslation } from "react-i18next";
import { initPaymentSheet, initStripe, presentPaymentSheet } from "@stripe/stripe-react-native";
import { useCreateDelivery } from "@/hooks/useDeliveryQueries";
import { distancePricingService, PriceCalculationResult } from '@/src/services/distance-pricing.service';
import { DeliveryAgentService } from '@/src/services/delivery-agent.service';
import { createGeoPoint } from '@/utils/formatters/address-formatter';

export default function DeliveryRecapScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { formState, resetForm } = useDeliveryForm();
    const { t } = useTranslation();
    const [priceCalculation, setPriceCalculation] = useState<PriceCalculationResult | null>(null);
    const [isCalculatingPrice, setIsCalculatingPrice] = useState(true);
    const [priceError, setPriceError] = useState<string | null>(null);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

    const createDeliveryMutation = useCreateDelivery();
    const deliveryAgentService = new DeliveryAgentService();

    // Calculate price when component mounts
    useEffect(() => {
        calculateDeliveryPrice();
    }, []);

    const calculateDeliveryPrice = async () => {
        if (!formState.pickupAddress || !formState.deliveryAddress) {
            setPriceError('Addresses are required for price calculation');
            setIsCalculatingPrice(false);
            return;
        }

        try {
            setIsCalculatingPrice(true);
            setPriceError(null);

            let agentLocation = createGeoPoint(48.8566, 2.3522);

            console.log('Calculating price with agent location:', agentLocation);

            const pickupLocation = formState.pickupAddress.coordinates;
            const deliveryLocation = formState.deliveryAddress.coordinates;

            /*const result = await distancePricingService.calculateDeliveryPrice(
                agentLocation,
                pickupLocation,
                deliveryLocation
            );*/

            setPriceCalculation({
                basePrice: 5.00,
                distancePrice: 10.00,
                finalPrice: 15.00,
                breakdown: {
                    trip1Distance: 0,
                    trip2Distance: 0,
                    totalBillableDistance: 0,
                    pricePerKm: 2.00
                }
            });

            /*console.log('Price calculation result:', result);
            setPriceCalculation(result);*/

        } catch (error) {
            console.error('Error calculating delivery price:', error);
            setPriceError('Unable to calculate price. Please try again.');

            // Fallback to basic pricing
            setPriceCalculation({
                basePrice: 5.00,
                distancePrice: 10.00,
                finalPrice: 15.00,
                breakdown: {
                    trip1Distance: 0,
                    trip2Distance: 0,
                    totalBillableDistance: 0,
                    pricePerKm: 2.00
                }
            });
        } finally {
            setIsCalculatingPrice(false);
        }
    };

    const handleRetryPriceCalculation = () => {
        calculateDeliveryPrice();
    };

    useEffect(() => {
        initStripe({
            publishableKey: 'pk_test_51R2aIOArSiMSA6GzD5di58E0KQPjhdqbXcvVhIh0ZemCTtkLqS6MGt15C5cqWCnjK8ON1CKf1oLGpUmzYo2bLohx00Lnonqp2N',
            merchantIdentifier: 'primex.com',
        }).catch(error => {
            console.error('Failed to initialize Stripe:', error);
        });
    }, []);

    const handleSubmit = async () => {
        if (!user?.uid) {
            Alert.alert('Error', 'You must be logged in to create a delivery');
            return;
        }

        if (!priceCalculation) {
            Alert.alert('Error', 'Price calculation is required');
            return;
        }

        try {
            const deliveryData: Omit<Delivery, "id"> = {
                creator: user.uid,
                status: 'waiting_for_delivery_guy',
                state: 'waiting_for_prepayment',
                expeditor: formState.expeditor!,
                receiver: formState.receiver!,
                billingAddress: formState.billingAddress!,
                pickupAddress: formState.pickupAddress!,
                deliveryAddress: formState.deliveryAddress!,
                scheduledDate: formState.scheduledDate!,
                timeSlot: {
                    start: formState.timeSlotStart!,
                    end: formState.timeSlotEnd!
                },
                packageDescription: formState.packageDescription,
                packageWeight: formState.packageWeight,
                packageDimensions: formState.packageDimensions,
                packageCategory: formState.packageCategory,
                isFragile: formState.isFragile,
                comment: formState.comment,
                price: priceCalculation.finalPrice,
                secretCode: '',
                deleted: false,
            };

            // Create delivery using React Query mutation
            const delivery = await createDeliveryMutation.mutateAsync(deliveryData);

            const amountInCents = Math.round(delivery.price * 100);

            // Create Stripe checkout session
            const checkoutSessionRef = await db
                .collection('customers')
                .doc(user.uid)
                .collection('checkout_sessions')
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

            // Listen for the extension to populate the client secret
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

            // Initialize the payment sheet
            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: checkoutSessionData.paymentIntentClientSecret,
                merchantDisplayName: 'Primex',
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

            // Present the payment sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                if (presentError.code === 'Canceled') {
                    // User cancelled the payment - not an error
                    return;
                }
                throw new Error(presentError.message);
            }

            // Payment successful - update delivery status
            await db.collection('deliveries').doc(delivery.id).update({
                state: 'prepaid',
                paymentDate: serverTimestamp(),
                paymentIntentId: checkoutSessionData.paymentIntentClientSecret.split('_secret_')[0],
                paymentStatus: 'succeeded'
            });

            // Reset the form after successful creation
            resetForm();

            // Show success message and navigate
            Alert.alert(
                'Paiment réussi',
                'Votre paiment à été effectué avec succès.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/dashboard')
                    }
                ]
            );
        } catch (error) {
            console.error('Error creating delivery:', error);
            Alert.alert('Error', 'Failed to create delivery. Please try again.');
        }
    };

    // Show loading state during mutation
    const isSubmitting = createDeliveryMutation.isPending;

    return (
        <GradientView>
            <ScrollView className="flex-1 p-4">
                {/* Package Information */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="cube-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Détails du colis
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400 font-cabin-medium text-sm">Description</Text>
                        <Text className="text-white font-cabin">{formState.packageDescription}</Text>
                    </View>

                    <View className="flex-row mb-2">
                        <View className="flex-1 mr-2">
                            <Text className="text-gray-400 font-cabin-medium text-sm">Poids</Text>
                            <Text className="text-white font-cabin">{formState.packageWeight} kg</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-400 font-cabin-medium text-sm">Categorie</Text>
                            <Text className="text-white font-cabin" style={{ textTransform: 'capitalize' }}>
                                {formState.packageCategory.replace('_', ' ')}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row mb-2">
                        <View className="flex-1">
                            <Text className="text-gray-400 font-cabin-medium text-sm">Dimensions (L×l×H)</Text>
                            <Text className="text-white font-cabin">
                                {formState.packageDimensions.length} × {formState.packageDimensions.width} × {formState.packageDimensions.height} cm
                            </Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-gray-400 font-cabin-medium text-sm">Fragile</Text>
                        <Text className="text-white font-cabin">{formState.isFragile ? 'Oui' : 'Non'}</Text>
                    </View>
                </View>

                {/* Addresses */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="location-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Ramassage et Livraison
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-3 mb-3">
                        <Text className="text-gray-400 font-cabin-medium text-sm">Adresse de ramassage</Text>
                        <Text className="text-white mb-1 font-cabin">
                            {formState.pickupAddress?.components.street_number || ''} {formState.pickupAddress?.components.route || ''}
                        </Text>
                        <Text className="text-white font-cabin">
                            {formState.pickupAddress?.components.postal_code || ''} {formState.pickupAddress?.components.locality || ''}
                        </Text>
                        {formState.pickupAddress?.complementaryAddress && (
                            <Text className="text-white mt-1 font-cabin">
                                {formState.pickupAddress.complementaryAddress}
                            </Text>
                        )}
                    </View>

                    <View>
                        <Text className="text-gray-400 font-cabin-medium text-sm">Adresse de livraison</Text>
                        <Text className="text-white mb-1 font-cabin">
                            {formState.deliveryAddress?.components.street_number || ''} {formState.deliveryAddress?.components.route || ''}
                        </Text>
                        <Text className="text-white font-cabin">
                            {formState.deliveryAddress?.components.postal_code || ''} {formState.deliveryAddress?.components.locality || ''}
                        </Text>
                        {formState.deliveryAddress?.complementaryAddress && (
                            <Text className="text-white mt-1 font-cabin">
                                {formState.deliveryAddress.complementaryAddress}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Schedule */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="calendar-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Horaire
                        </Text>
                    </View>

                    <View className="flex-row mb-2">
                        <View className="flex-1 mr-2">
                            <Text className="text-gray-400 font-cabin-medium text-sm">Date</Text>
                            <Text className="text-white font-cabin">{formatDate(formState.scheduledDate)}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-400 font-cabin-medium text-sm">Créneau horaire</Text>
                            <Text className="text-white font-cabin">{formatTimeSlot(formState.timeSlotStart, formState.timeSlotEnd, t)}</Text>
                        </View>
                    </View>

                    {formState.comment && (
                        <View className="border-t border-gray-700 pt-2 mt-2">
                            <Text className="text-gray-400 font-cabin-medium text-sm">Commentaire sur la livraison</Text>
                            <Text className="text-white font-cabin">{formState.comment}</Text>
                        </View>
                    )}
                </View>

                {/* Contact Information */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="people-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Informations de contact
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-3 mb-3">
                        <Text className="text-gray-400 font-cabin-medium text-sm">Expéditeur</Text>
                        <Text className="text-white font-cabin">{formState.expeditor?.firstName}</Text>
                        <Text className="text-white font-cabin">{formState.expeditor?.phoneNumber}</Text>
                    </View>

                    <View>
                        <Text className="text-gray-400 font-cabin-medium text-sm">Destinataire</Text>
                        <Text className="text-white font-cabin">{formState.receiver?.firstName}</Text>
                        <Text className="text-white font-cabin">{formState.receiver?.phoneNumber}</Text>
                    </View>
                </View>

                {/* Facturation Information */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="document-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Informations de facturation
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-3 mb-3">
                        <Text className="text-gray-400 font-cabin-medium text-sm">Informations de facturation</Text>
                        <Text className="text-white font-cabin">{formState.billingContact}</Text>
                        <Text className="text-white font-cabin">{formState.expeditor?.phoneNumber}</Text>
                    </View>

                    <View>
                        <Text className="text-gray-400 font-cabin-medium text-sm">Adresse de facturation</Text>
                        <Text className="text-white font-cabin">{formState.billingAddress?.formattedAddress}</Text>
                    </View>
                </View>

                {/* Price Calculation */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="cash-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Calcul du prix
                        </Text>
                    </View>

                    {isCalculatingPrice ? (
                        <View className="items-center py-4">
                            <ActivityIndicator size="large" color="#5DD6FF" />
                            <Text className="text-white mt-2 font-cabin">
                                Calcul du prix en cours...
                            </Text>
                        </View>
                    ) : priceError ? (
                        <View className="items-center py-4">
                            <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
                            <Text className="text-red-400 mt-2 font-cabin text-center">
                                {priceError}
                            </Text>
                            <StyledButton
                                variant="bordered"
                                onPress={handleRetryPriceCalculation}
                                className="mt-3 border-primary"
                            >
                                <Text className="text-primary font-cabin-medium">Réessayer</Text>
                            </StyledButton>
                        </View>
                    ) : priceCalculation ? (
                        <View>
                            {/* Price Breakdown */}
                            <View className="mb-4">
                                <View className="border-t border-gray-700 pt-2">
                                    <View className="flex-row justify-between">
                                        <Text className="text-white font-cabin-medium text-lg">Total</Text>
                                        <Text className="text-white font-cabin-bold text-xl">
                                            €{priceCalculation.finalPrice.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ) : null}
                </View>

                {/* Payment Information */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-4">
                        <Ionicons name="card-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Détails du paiement
                        </Text>
                    </View>

                    <Text className="text-white font-cabin mb-4">
                        Votre paiement sera traité en toute sécurité via Stripe. Une fois votre paiement confirmé, votre livraison sera disponible pour être prise en charge par un livreur.
                    </Text>
                </View>

                {/* Show mutation error if any */}
                {createDeliveryMutation.error && (
                    <View className="bg-red-500/20 p-4 rounded-lg mb-4">
                        <Text className="text-red-400 font-cabin text-center">
                            {createDeliveryMutation.error.message || 'Erreur lors de la création de la livraison'}
                        </Text>
                    </View>
                )}

                {/* Navigation buttons */}
                <StyledButton
                    variant="primary"
                    shadow
                    className="flex-1 ml-2 mb-4"
                    onPress={handleSubmit}
                    disabled={isSubmitting || isCalculatingPrice || !priceCalculation}
                >
                    <Text className="text-white font-cabin-medium">
                        {isSubmitting ? 'Traitement en cours...' :
                            isCalculatingPrice ? 'Calcul en cours...' :
                                'Procéder au paiement'}
                    </Text>
                </StyledButton>
            </ScrollView>
        </GradientView>
    );
}