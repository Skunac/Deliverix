import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientView } from '@/components/ui/GradientView';
import StyledTextInput from '@/components/ui/StyledTextInput';
import StyledButton from '@/components/ui/StyledButton';
import { EmbeddedAddress, Person } from '@/src/models/delivery.model';
import { useDeliveryForm } from "@/contexts/DeliveryFormContext";
import { useAuth } from '@/contexts/authContext';
import { UserService } from '@/src/services/user.service';
import { Ionicons } from '@expo/vector-icons';
import ModernAddressInput from "@/components/ui/AddressInput";

export default function CombinedAddressesContactsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { formState, updateFormState, validateStep } = useDeliveryForm();
    const [errors, setErrors] = useState<string[]>([]);
    const [savePickupContact, setSavePickupContact] = useState(false);
    const [saveDeliveryContact, setSaveDeliveryContact] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const userService = new UserService();

    // Fetch user profile once at component mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (user?.uid) {
                setLoading(true);
                try {
                    const profile = await userService.getUserById(user.uid);
                    setUserProfile(profile);
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchUserProfile();
    }, [user?.uid]);

    // Helper functions for address updates
    const handlePickupAddressSelected = (address: EmbeddedAddress) => {
        updateFormState({ pickupAddress: address });

        // If user is expeditor, update expeditor address
        if (formState.isUserExpeditor && formState.expeditor) {
            updateFormState({
                expeditor: {
                    ...formState.expeditor,
                    address: address
                }
            });
        }
    };

    const handleDeliveryAddressSelected = (address: EmbeddedAddress) => {
        updateFormState({ deliveryAddress: address });

        // If user is receiver, update receiver address
        if (formState.isUserReceiver && formState.receiver) {
            updateFormState({
                receiver: {
                    ...formState.receiver,
                    address: address
                }
            });
        }
    };

    // Helper function for contact information updates
    const updateExpeditor = (field: string, value: string) => {
        updateFormState({
            expeditor: {
                ...formState.expeditor || {
                    firstName: '',
                    phoneNumber: '',
                    address: formState.pickupAddress || {} as EmbeddedAddress
                },
                [field]: value
            }
        });
    };

    const updateReceiver = (field: string, value: string) => {
        updateFormState({
            receiver: {
                ...formState.receiver || {
                    firstName: '',
                    phoneNumber: '',
                    address: formState.deliveryAddress || {} as EmbeddedAddress
                },
                [field]: value
            }
        });
    };

    // Toggle user as expeditor
    const toggleUserAsExpeditor = (value: boolean) => {
        if (value && userProfile) {
            // Get name based on user type
            let name = '';
            if (userProfile.userType === 'individual' && 'firstName' in userProfile) {
                name = userProfile.firstName;
            } else if (userProfile.userType === 'professional' && 'contactName' in userProfile) {
                name = userProfile.contactName;
            }

            // Create expeditor with user info
            const expeditor: Person = {
                firstName: name,
                phoneNumber: userProfile.phoneNumber || '',
                address: formState.pickupAddress as EmbeddedAddress
            };

            updateFormState({
                isUserExpeditor: true,
                expeditor: expeditor
            });
        } else {
            // Clear expeditor data
            updateFormState({
                isUserExpeditor: false,
                expeditor: null
            });
        }
    };

    // Toggle user as receiver
    const toggleUserAsReceiver = (value: boolean) => {
        if (value && userProfile) {
            // Get name based on user type
            let name = '';
            if (userProfile.userType === 'individual' && 'firstName' in userProfile) {
                name = userProfile.firstName;
            } else if (userProfile.userType === 'professional' && 'contactName' in userProfile) {
                name = userProfile.contactName;
            }

            // Create receiver with user info
            const receiver: Person = {
                firstName: name,
                phoneNumber: userProfile.phoneNumber || '',
                address: formState.deliveryAddress as EmbeddedAddress
            };

            updateFormState({
                isUserReceiver: true,
                receiver: receiver
            });
        } else {
            // Clear receiver data
            updateFormState({
                isUserReceiver: false,
                receiver: null
            });
        }
    };

    // Save contact to addresses (placeholder)
    const saveContactToAddress = (type: 'pickup' | 'delivery') => {
        // Implement this later
        console.log(`Saving ${type} contact to address`);
    };

    const handleContinue = () => {
        // Validate both address and contact steps
        const addressErrors = validateStep(2);
        const contactErrors = validateStep(4);
        const allErrors = [...addressErrors, ...contactErrors];

        if (allErrors.length > 0) {
            setErrors(allErrors);
            return;
        }

        // Save contacts to addresses if toggle is on
        if (savePickupContact) {
            saveContactToAddress('pickup');
        }

        if (saveDeliveryContact) {
            saveContactToAddress('delivery');
        }

        // Navigate to next step
        router.push('/create-delivery/step3');
    };

    return (
        <GradientView>
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5DD6FF" />
                    <Text className="text-white mt-4 font-cabin">Chargement de vos informations...</Text>
                </View>
            ) : (
                <ScrollView className="flex-1 p-4">
                    {/* Display validation errors if any */}
                    {errors.length > 0 && (
                        <View className="bg-red-500/20 p-4 rounded-lg mb-4">
                            {errors.map((error, index) => (
                                <Text key={index} className="text-red-400 font-cabin">
                                    • {error}
                                </Text>
                            ))}
                        </View>
                    )}

                    {/* Pickup Information Section */}
                    <View className="bg-dark p-5 rounded-xl mb-6 border border-gray-800">
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                                <Text className="text-dark font-cabin-bold">P</Text>
                            </View>
                            <Text className="text-white text-lg font-cabin-medium">
                                Informations de ramassage
                            </Text>
                        </View>

                        {/* Address Input */}
                        <ModernAddressInput
                            address={formState.pickupAddress}
                            onAddressSelected={handlePickupAddressSelected}
                        />

                        {/* Contact Information */}
                        <View className="mt-5 pt-5 border-t border-gray-800">
                            <Text className="text-white font-cabin-medium mb-3">Détails de l'expéditeur</Text>

                            {/* "I am the expeditor" toggle */}
                            <View className="flex-row items-center justify-between mb-4 bg-darker p-3 rounded-lg">
                                <View className="flex-row items-center">
                                    <Ionicons name="person-outline" size={20} color="#5DD6FF" className="mr-2" />
                                    <Text className="text-white font-cabin">Je suis l'expéditeur</Text>
                                </View>
                                <Switch
                                    value={formState.isUserExpeditor}
                                    onValueChange={toggleUserAsExpeditor}
                                    trackColor={{ false: '#576D75', true: '#5DD6FF' }}
                                    thumbColor={formState.isUserExpeditor ? '#fff' : '#f4f3f4'}
                                    ios_backgroundColor="#576D75"
                                />
                            </View>

                            <View>
                                <StyledTextInput
                                    label="Nom complet"
                                    placeholder="Entrez le nom complet"
                                    value={formState.expeditor?.firstName || ''}
                                    onChangeText={(text) => updateExpeditor('firstName', text)}
                                />

                                <StyledTextInput
                                    label="Numéro de téléphone"
                                    placeholder="Enter phone number"
                                    keyboardType="phone-pad"
                                    value={formState.expeditor?.phoneNumber || ''}
                                    onChangeText={(text) => updateExpeditor('phoneNumber', text)}
                                />
                            </View>

                            {/* Save contact toggle
                            {user?.uid && (
                                <View className="flex-row items-center justify-between mt-2 bg-darker p-3 rounded-lg">
                                    <View className="flex-row items-center">
                                        <Ionicons name="bookmark-outline" size={20} color="#5DD6FF" className="mr-2" />
                                        <Text className="text-white font-cabin">Enregistrer dans mon carnet d'adresses</Text>
                                    </View>
                                    <Switch
                                        value={savePickupContact}
                                        onValueChange={setSavePickupContact}
                                        trackColor={{ false: '#576D75', true: '#5DD6FF' }}
                                        thumbColor={savePickupContact ? '#fff' : '#f4f3f4'}
                                        ios_backgroundColor="#576D75"
                                    />
                                </View>
                            )}*/}
                        </View>
                    </View>

                    {/* Delivery Information Section */}
                    <View className="bg-dark p-5 rounded-xl mb-6 border border-gray-800">
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                                <Text className="text-dark font-cabin-bold">D</Text>
                            </View>
                            <Text className="text-white text-lg font-cabin-medium">
                                Informations de livraison
                            </Text>
                        </View>

                        {/* Address Input */}
                        <ModernAddressInput
                            address={formState.deliveryAddress}
                            onAddressSelected={handleDeliveryAddressSelected}
                        />

                        {/* Contact Information */}
                        <View className="mt-5 pt-5 border-t border-gray-800">
                            <Text className="text-white font-cabin-medium mb-3">Détails du destinataire</Text>

                            {/* "I am the receiver" toggle */}
                            <View className="flex-row items-center justify-between mb-4 bg-darker p-3 rounded-lg">
                                <View className="flex-row items-center">
                                    <Ionicons name="person-outline" size={20} color="#5DD6FF" className="mr-2" />
                                    <Text className="text-white font-cabin">Je suis le destinataire</Text>
                                </View>
                                <Switch
                                    value={formState.isUserReceiver}
                                    onValueChange={toggleUserAsReceiver}
                                    trackColor={{ false: '#576D75', true: '#5DD6FF' }}
                                    thumbColor={formState.isUserReceiver ? '#fff' : '#f4f3f4'}
                                    ios_backgroundColor="#576D75"
                                />
                            </View>

                            <View>
                                <StyledTextInput
                                    label="Nom complet"
                                    placeholder="Entrez le nom complet"
                                    value={formState.receiver?.firstName || ''}
                                    onChangeText={(text) => updateReceiver('firstName', text)}
                                />

                                <StyledTextInput
                                    label="Numéro de téléphone"
                                    placeholder="Entrez le numéro de téléphone"
                                    keyboardType="phone-pad"
                                    value={formState.receiver?.phoneNumber || ''}
                                    onChangeText={(text) => updateReceiver('phoneNumber', text)}
                                />
                            </View>

                            {/* Save contact toggle
                            {user?.uid && (
                                <View className="flex-row items-center justify-between mt-2 bg-darker p-3 rounded-lg">
                                    <View className="flex-row items-center">
                                        <Ionicons name="bookmark-outline" size={20} color="#5DD6FF" className="mr-2" />
                                        <Text className="text-white font-cabin">Enregistrer dans mon carnet d'adresses</Text>
                                    </View>
                                    <Switch
                                        value={saveDeliveryContact}
                                        onValueChange={setSaveDeliveryContact}
                                        trackColor={{ false: '#576D75', true: '#5DD6FF' }}
                                        thumbColor={saveDeliveryContact ? '#fff' : '#f4f3f4'}
                                        ios_backgroundColor="#576D75"
                                    />
                                </View>
                            )}*/}
                        </View>
                    </View>

                    {/* Continue Button */}
                    <StyledButton
                        variant="primary"
                        shadow
                        className="my-4"
                        onPress={handleContinue}
                    >
                        <Text className="text-white font-cabin-medium">Continuer</Text>
                    </StyledButton>
                </ScrollView>
            )}
        </GradientView>
    );
}