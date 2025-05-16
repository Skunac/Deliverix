import React, {useEffect, useState} from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientView } from '@/components/ui/GradientView';
import StyledButton from '@/components/ui/StyledButton';
import { useDeliveryForm } from "@/contexts/DeliveryFormContext";
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/authContext';
import { DeliveryService } from '@/src/services/delivery.service';
import { Delivery } from '@/src/models/delivery.model';
import { Ionicons } from '@expo/vector-icons';
import {formatDate, formatTimeSlot} from "@/utils/formatters/date-formatters";
import { db, serverTimestamp } from '@/src/firebase/config';
import {useTranslation} from "react-i18next";
import {initPaymentSheet, initStripe, presentPaymentSheet} from "@stripe/stripe-react-native";

export default function DeliveryRecapScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { formState } = useDeliveryForm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { t } = useTranslation();

    const deliveryService = new DeliveryService();

    // Simple price calculation function - matches the one in ContactInformationScreen
    const calculatePrice = () => {
        // Base price
        let price = 10;

        // Add based on weight
        price += formState.packageWeight * 2;

        // Add based on package category
        if (['urgent', 'expensive', 'exceptional'].includes(formState.packageCategory)) {
            price += 15;
        }

        // Add for fragile packages
        if (formState.isFragile) {
            price += 5;
        }

        return price.toFixed(2);
    };

    useEffect(() => {
        initStripe({
            publishableKey: 'pk_test_51R2aIOArSiMSA6GzD5di58E0KQPjhdqbXcvVhIh0ZemCTtkLqS6MGt15C5cqWCnjK8ON1CKf1oLGpUmzYo2bLohx00Lnonqp2N',
            merchantIdentifier: 'primex.com',
        }).catch(error => {
            console.error('Failed to initialize Stripe:', error);
        });
    }, [])

    const handleSubmit = async () => {
        if (!user?.uid) {
            Alert.alert('Error', 'You must be logged in to create a delivery');
            return;
        }

        try {
            setIsSubmitting(true);

            // Prepare delivery data
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
                price: parseFloat(calculatePrice()),
            };

            // Create delivery in the database
            const delivery = await deliveryService.createDelivery(deliveryData);

            const amountInCents = Math.round(delivery.price * 100);

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

            // 4. Present the payment sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                if (presentError.code === 'Canceled') {
                    // User cancelled the payment - not an error
                    setIsSubmitting(false);
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
        } catch (error) {
            console.error('Error creating delivery:', error);
            Alert.alert('Error', 'Failed to create delivery. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

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

                    {(formState.comment ) && (
                        <View className="border-t border-gray-700 pt-2 mt-2">
                            {formState.comment && (
                                <View className="mb-2">
                                    <Text className="text-gray-400 font-cabin-medium text-sm">Commentaire sur la livraison</Text>
                                    <Text className="text-white font-cabin">{formState.comment}</Text>
                                </View>
                            )}
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

                {/* Price */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="cash-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Prix
                        </Text>
                    </View>

                    <Text className="text-white text-3xl font-cabin-bold text-center">
                        €{calculatePrice()}
                    </Text>
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

                {/* Navigation buttons */}
                <StyledButton
                    variant="primary"
                    shadow
                    className="flex-1 ml-2 mb-4"
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text className="text-white font-cabin-medium">
                        {isSubmitting ? 'Traitement en cours...' : 'Procéder au paiement'}
                    </Text>
                </StyledButton>
            </ScrollView>
        </GradientView>
    );
}