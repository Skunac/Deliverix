import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientView } from '@/components/ui/GradientView';
import StyledButton from '@/components/ui/StyledButton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useDeliveryForm } from "@/contexts/DeliveryFormContext";
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/authContext';
import { DeliveryService } from '@/src/services/delivery.service';
import { Delivery } from '@/src/models/delivery.model';
import { Ionicons } from '@expo/vector-icons';

export default function DeliveryRecapScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { formState } = useDeliveryForm();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const deliveryService = new DeliveryService();

    // Format date for display
    const formatDate = (date: Date | null) => {
        if (!date) return 'Not specified';
        return format(date, 'dd MMMM yyyy', { locale: fr });
    };

    // Format time slot for display
    const formatTimeSlot = () => {
        if (!formState.timeSlotStart || !formState.timeSlotEnd) return 'Not specified';

        const start = format(formState.timeSlotStart, 'HH:mm');
        const end = format(formState.timeSlotEnd, 'HH:mm');

        return `${start} - ${end}`;
    };

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

            console.log(delivery)

            // Navigate to payment screen (you'll need to create this)
            router.push(`/create-delivery/step6?id=${delivery.id}`);
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
                <Text className="text-white text-xl font-cabin-medium mb-6">
                    Delivery Summary
                </Text>

                {/* Package Information */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="cube-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Package Details
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-2 mb-2">
                        <Text className="text-gray-400">Description</Text>
                        <Text className="text-white">{formState.packageDescription}</Text>
                    </View>

                    <View className="flex-row mb-2">
                        <View className="flex-1 mr-2">
                            <Text className="text-gray-400">Weight</Text>
                            <Text className="text-white">{formState.packageWeight} kg</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-400">Category</Text>
                            <Text className="text-white" style={{ textTransform: 'capitalize' }}>
                                {formState.packageCategory.replace('_', ' ')}
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row mb-2">
                        <View className="flex-1">
                            <Text className="text-gray-400">Dimensions (L×W×H)</Text>
                            <Text className="text-white">
                                {formState.packageDimensions.length} × {formState.packageDimensions.width} × {formState.packageDimensions.height} cm
                            </Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-gray-400">Fragile</Text>
                        <Text className="text-white">{formState.isFragile ? 'Yes' : 'No'}</Text>
                    </View>
                </View>

                {/* Addresses */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="location-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Pickup & Delivery
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-3 mb-3">
                        <Text className="text-gray-400">Pickup Address</Text>
                        <Text className="text-white mb-1">
                            {formState.pickupAddress?.components.street_number || ''} {formState.pickupAddress?.components.route || ''}
                        </Text>
                        <Text className="text-white">
                            {formState.pickupAddress?.components.postal_code || ''} {formState.pickupAddress?.components.locality || ''}
                        </Text>
                        {formState.pickupAddress?.complementaryAddress && (
                            <Text className="text-white mt-1">
                                {formState.pickupAddress.complementaryAddress}
                            </Text>
                        )}
                    </View>

                    <View>
                        <Text className="text-gray-400">Delivery Address</Text>
                        <Text className="text-white mb-1">
                            {formState.deliveryAddress?.components.street_number || ''} {formState.deliveryAddress?.components.route || ''}
                        </Text>
                        <Text className="text-white">
                            {formState.deliveryAddress?.components.postal_code || ''} {formState.deliveryAddress?.components.locality || ''}
                        </Text>
                        {formState.deliveryAddress?.complementaryAddress && (
                            <Text className="text-white mt-1">
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
                            Schedule
                        </Text>
                    </View>

                    <View className="flex-row mb-2">
                        <View className="flex-1 mr-2">
                            <Text className="text-gray-400">Date</Text>
                            <Text className="text-white">{formatDate(formState.scheduledDate)}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-400">Time Slot</Text>
                            <Text className="text-white">{formatTimeSlot()}</Text>
                        </View>
                    </View>

                    {(formState.comment ) && (
                        <View className="border-t border-gray-700 pt-2 mt-2">
                            {formState.comment && (
                                <View className="mb-2">
                                    <Text className="text-gray-400">Delivery comment</Text>
                                    <Text className="text-white">{formState.comment}</Text>
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
                            Contact Information
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-3 mb-3">
                        <Text className="text-gray-400">Expeditor</Text>
                        <Text className="text-white">{formState.expeditor?.firstName}</Text>
                        <Text className="text-white">{formState.expeditor?.phoneNumber}</Text>
                    </View>

                    <View>
                        <Text className="text-gray-400">Receiver</Text>
                        <Text className="text-white">{formState.receiver?.firstName}</Text>
                        <Text className="text-white">{formState.receiver?.phoneNumber}</Text>
                    </View>
                </View>

                {/* Facturation Information */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="document-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Facturation information
                        </Text>
                    </View>

                    <View className="border-b border-gray-700 pb-3 mb-3">
                        <Text className="text-gray-400">Billing information</Text>
                        <Text className="text-white">{formState.billingContact}</Text>
                        <Text className="text-white">{formState.expeditor?.phoneNumber}</Text>
                    </View>

                    <View>
                        <Text className="text-gray-400">Billing Address</Text>
                        <Text className="text-white">{formState.billingAddress?.formattedAddress}</Text>
                    </View>
                </View>

                {/* Price */}
                <View className="bg-dark p-4 rounded-lg mb-6">
                    <View className="flex-row items-center mb-2">
                        <Ionicons name="cash-outline" size={24} color="#2EC3F5" className="mr-2" />
                        <Text className="text-white font-cabin-medium text-lg">
                            Price
                        </Text>
                    </View>

                    <Text className="text-white text-3xl font-cabin-bold text-center">
                        €{calculatePrice()}
                    </Text>
                </View>

                {/* Navigation buttons */}
                <View className="flex-row justify-between mb-8">
                    <StyledButton
                        variant="primary"
                        shadow
                        className="flex-1 ml-2"
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <Text className="text-white font-cabin-medium">
                            {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
                        </Text>
                    </StyledButton>
                </View>
            </ScrollView>
        </GradientView>
    );
}