import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientView } from '@/components/ui/GradientView';
import StyledTextInput from '@/components/ui/StyledTextInput';
import StyledButton from '@/components/ui/StyledButton';
import { EmbeddedAddress } from '@/src/models/delivery.model';
import { useDeliveryForm } from "@/contexts/DeliveryFormContext";
import { useAuth } from '@/contexts/authContext';
import { UserService } from '@/src/services/user.service';
import { Ionicons } from '@expo/vector-icons';
import ModernAddressInput from "@/components/ui/AddressInput";
import { User, IndividualUser, ProfessionalUser } from '@/src/models/user.model';

export default function FacturationScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { formState, updateFormState, validateStep } = useDeliveryForm();
    const [errors, setErrors] = useState<string[]>([]);
    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [billingAddress, setBillingAddress] = useState<EmbeddedAddress | null>(null);
    const [updateDefaultBillingAddress, setUpdateDefaultBillingAddress] = useState(false);
    const [useExistingBillingAddress, setUseExistingBillingAddress] = useState(false);

    // User editable fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [contactName, setContactName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    const userService = new UserService();

    // Fetch user profile once at component mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (user?.uid) {
                setLoading(true);
                try {
                    const profile = user;
                    if (!profile) return;
                    setUserProfile(profile);

                    // Initialize form with user data
                    if (profile.userType === 'individual') {
                        const fName = (profile as IndividualUser).firstName || '';
                        const lName = (profile as IndividualUser).lastName || '';
                        setFirstName(fName);
                        setLastName(lName);

                        // Set the contact name immediately
                        const fullName = `${fName} ${lName}`.trim();
                        setContactName(fullName);

                        // Update the form state
                        updateFormState({
                            billingContact: fullName
                        });
                    } else if (profile.userType === 'professional') {
                        const company = (profile as ProfessionalUser).companyName || '';
                        const contact = (profile as ProfessionalUser).contactName || '';
                        setCompanyName(company);
                        setContactName(contact);

                        // Update the form state
                        updateFormState({
                            billingContact: contact
                        });
                    }

                    setEmail(profile.email || '');
                    setPhoneNumber(profile.phoneNumber || '');

                    // Check if the user has a billing address
                    if (profile.billingAddress &&
                        Object.keys(profile.billingAddress).length > 0 &&
                        profile.billingAddress.formattedAddress) {
                        setBillingAddress(profile.billingAddress);
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchUserProfile();
    }, [user?.uid]);

    // Update billing address when selected
    const handleBillingAddressSelected = (address: EmbeddedAddress) => {
        setBillingAddress(address);
        updateFormState({ billingAddress: address });
    };

    // Toggle use existing billing address
    const toggleUseExistingBillingAddress = (value: boolean) => {
        setUseExistingBillingAddress(value);
        if (value && userProfile?.billingAddress) {
            setBillingAddress(userProfile.billingAddress);
            updateFormState({ billingAddress: userProfile.billingAddress });
        }
    };

    // Save billing information and continue
    const handleContinue = async () => {
        if (!billingAddress || !billingAddress.formattedAddress) {
            setErrors(['Please provide a valid billing address']);
            return;
        }

        // Update form state with billing address and contact name
        updateFormState({
            billingAddress: billingAddress,
            billingContact: contactName
        });

        // Update user profile if requested
        if (updateDefaultBillingAddress && user?.uid) {
            try {
                setLoading(true);

                // Create update object based on user type
                let updateData: any = {
                    email,
                    phoneNumber,
                    billingAddress: billingAddress
                };

                if (userProfile?.userType === 'individual') {
                    updateData.firstName = firstName;
                    updateData.lastName = lastName;
                } else if (userProfile?.userType === 'professional') {
                    updateData.companyName = companyName;
                    updateData.contactName = contactName;
                }

                await userService.updateUserProfile(user.uid, updateData);

            } catch (error) {
                console.error('Error updating user profile:', error);
                setErrors(['Failed to update your profile. Please try again.']);
                return;
            } finally {
                setLoading(false);
            }
        }

        console.log('Form state before continuing:', formState);

        // Navigate to next step (summary screen)
        router.push('/create-delivery/step5');
    };

    const handleContactNameChange = (text: string) => {
        setContactName(text);

        // Update the form state with the new contact name
        updateFormState({
            billingContact: text
        });

        if (userProfile?.userType === 'individual') {
            // Split the contact name into first and last name
            const nameParts = text.trim().split(' ');
            if (nameParts.length >= 1) {
                setFirstName(nameParts[0]);
            }
            if (nameParts.length >= 2) {
                setLastName(nameParts.slice(1).join(' '));
            } else {
                setLastName('');
            }
        }
    };

    // Determine if user is individual or professional
    const isIndividual = userProfile?.userType === 'individual';
    const isProfessional = userProfile?.userType === 'professional';

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

                    {/* User Profile Information */}
                    <View className="bg-dark p-5 rounded-xl mb-6 border border-gray-800">
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                                <Text className="text-dark font-cabin-bold">
                                    {isIndividual ? 'P' : 'E'}
                                </Text>
                            </View>
                            <Text className="text-white text-lg font-cabin-medium">
                                {isIndividual ? 'Informations personnelles' : 'Informations de l\'entreprise'}
                            </Text>
                        </View>

                        {/* Display editable user information */}
                        <View className="mb-4">
                            {isIndividual && (
                                <StyledTextInput
                                    label="Nom du contact"
                                    placeholder="Entrez votre nom complet"
                                    value={contactName}
                                    onChangeText={handleContactNameChange}
                                />
                            )}

                            {isProfessional && (
                                <>
                                    <StyledTextInput
                                        label="Nom de l'entreprise"
                                        placeholder="Entrez le nom de l'entreprise"
                                        value={companyName}
                                        onChangeText={setCompanyName}
                                    />
                                    <StyledTextInput
                                        label="Nom du contact"
                                        placeholder="Entrez votre nom complet"
                                        value={contactName}
                                        onChangeText={handleContactNameChange}
                                    />
                                </>
                            )}

                            <StyledTextInput
                                label="Email"
                                placeholder="Entrez l'adresse email"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                            />

                            <StyledTextInput
                                label="Numéro de téléphone"
                                placeholder="Entrez le numéro de téléphone"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* Billing Address Section */}
                    <View className="bg-dark p-5 rounded-xl mb-6 border border-gray-800">
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                                <Text className="text-dark font-cabin-bold">B</Text>
                            </View>
                            <Text className="text-white text-lg font-cabin-medium">
                                Adresse de facturation
                            </Text>
                        </View>

                        {/* Use existing billing address toggle (if available) */}
                        {userProfile?.billingAddress &&
                            userProfile.billingAddress.formattedAddress && (
                                <View className="mb-5">
                                    <View className="flex-row items-center justify-between mb-4 bg-darker p-3 rounded-lg">
                                        <View className="flex-row items-start flex-1 mr-3">
                                            <Ionicons name="bookmark-outline" size={20} color="#5DD6FF" style={{ marginTop: 2 }} className="mr-2" />
                                            <Text className="text-white font-cabin flex-shrink">
                                                Utiliser mon adresse de facturation enregistrée
                                            </Text>
                                        </View>
                                        <Switch
                                            value={useExistingBillingAddress}
                                            onValueChange={toggleUseExistingBillingAddress}
                                            trackColor={{ false: '#576D75', true: '#5DD6FF' }}
                                            thumbColor={useExistingBillingAddress ? '#fff' : '#f4f3f4'}
                                            ios_backgroundColor="#576D75"
                                        />
                                    </View>

                                    {useExistingBillingAddress && (
                                        <View className="bg-gray-800 p-4 rounded-lg mb-4">
                                            <Text className="text-white font-cabin">
                                                {userProfile.billingAddress.formattedAddress}
                                            </Text>
                                            {userProfile.billingAddress.components.postal_code && userProfile.billingAddress.components.locality && (
                                                <Text className="text-gray-300 font-cabin mt-1">
                                                    {userProfile.billingAddress.components.postal_code} {userProfile.billingAddress.components.locality}
                                                </Text>
                                            )}
                                            {userProfile.billingAddress.components.country && (
                                                <Text className="text-gray-300 font-cabin mt-1">
                                                    {userProfile.billingAddress.components.country}
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </View>
                            )}

                        {/* Show address input if not using existing address */}
                        {!useExistingBillingAddress && (
                            <>
                                <ModernAddressInput
                                    address={billingAddress}
                                    onAddressSelected={handleBillingAddressSelected}
                                />

                                {/* Update default billing address toggle */}
                                {user?.uid && (
                                    <View className="flex-row items-center justify-between mt-4 bg-darker p-3 rounded-lg">
                                        <View className="flex-row items-center flex-1 mr-2">
                                            <Ionicons name="save-outline" size={20} color="#5DD6FF" className="mr-2" />
                                            <Text className="text-white font-cabin">
                                                Enregistrer comme adresse de facturation par défaut
                                            </Text>
                                        </View>
                                        <Switch
                                            value={updateDefaultBillingAddress}
                                            onValueChange={setUpdateDefaultBillingAddress}
                                            trackColor={{ false: '#576D75', true: '#5DD6FF' }}
                                            thumbColor={updateDefaultBillingAddress ? '#fff' : '#f4f3f4'}
                                            ios_backgroundColor="#576D75"
                                        />
                                    </View>
                                )}
                            </>
                        )}
                    </View>

                    {/* Payment Notice */}
                    <View className="bg-blue-500/20 p-4 rounded-lg mb-6">
                        <View className="flex-row items-start">
                            <Ionicons name="information-circle" size={24} color="#5DD6FF" style={{ marginRight: 8, marginTop: 1 }} />
                            <Text className="text-white font-cabin flex-1">
                                Vous recevrez une facture à cette adresse après la livraison. Le paiement sera traité en toute sécurité via Stripe.
                            </Text>
                        </View>
                    </View>

                    {/* Continue Button */}
                    <StyledButton
                        variant="primary"
                        shadow
                        className="my-4"
                        onPress={handleContinue}
                    >
                        <Text className="text-white font-cabin-medium">Continuer vers le récapitulatif</Text>
                    </StyledButton>
                </ScrollView>
            )}
        </GradientView>
    );
}