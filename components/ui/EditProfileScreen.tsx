import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Image } from 'react-native';
import { GradientView } from '@/components/ui/GradientView';
import StyledTextInput from '@/components/ui/StyledTextInput';
import StyledButton from '@/components/ui/StyledButton';
import ModernAddressInput from '@/components/ui/AddressInput';
import { useAuth } from '@/contexts/authContext';
import { UserService } from '@/src/services/user.service';
import { User, IndividualUser, ProfessionalUser } from '@/src/models/user.model';
import { EmbeddedAddress } from '@/src/models/delivery.model';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { StorageService } from '@/src/services/storage.service';

interface FormData {
    // Common fields
    email: string;
    phoneNumber: string;
    billingAddress: EmbeddedAddress | null;
    profilePhoto: string | null;

    // Individual user fields
    firstName: string;
    lastName: string;

    // Professional user fields
    companyName: string;
    contactName: string;
}

interface FormErrors {
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    companyName: string;
    contactName: string;
    general: string;
}

interface EditProfileScreenProps {
    onClose: () => void;
}

export default function EditProfileScreen({ onClose }: EditProfileScreenProps): JSX.Element {
    const { user, updateProfile, refreshUserProfile } = useAuth();
    const userService = new UserService();
    const storageService = new StorageService();

    // Loading states
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Form state
    const [formData, setFormData] = useState<FormData>({
        email: '',
        phoneNumber: '',
        billingAddress: null,
        profilePhoto: null,
        firstName: '',
        lastName: '',
        companyName: '',
        contactName: ''
    });

    // Error state
    const [formErrors, setFormErrors] = useState<FormErrors>({
        email: '',
        phoneNumber: '',
        firstName: '',
        lastName: '',
        companyName: '',
        contactName: '',
        general: ''
    });

    // Determine user type
    const isIndividual = user?.userType === 'individual';
    const isProfessional = user?.userType === 'professional';

    // Load user data on component mount
    useEffect(() => {
        const loadUserData = async () => {
            if (!user?.uid) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // Use the current user data from context
                const userData = user;

                if (userData) {
                    setFormData({
                        email: userData.email || '',
                        phoneNumber: userData.phoneNumber || '',
                        billingAddress: userData.billingAddress || null,
                        profilePhoto: null, // Will be loaded separately if needed
                        firstName: isIndividual ? (userData as IndividualUser).firstName || '' : '',
                        lastName: isIndividual ? (userData as IndividualUser).lastName || '' : '',
                        companyName: isProfessional ? (userData as ProfessionalUser).companyName || '' : '',
                        contactName: isProfessional ? (userData as ProfessionalUser).contactName || '' : ''
                    });
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                setFormErrors(prev => ({
                    ...prev,
                    general: 'Erreur lors du chargement des données utilisateur'
                }));
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, [user, isIndividual, isProfessional]);

    // Handle input changes with automatic error clearing
    const handleChange = (field: keyof FormData, value: any): void => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error for this field if it exists
        if (field in formErrors && formErrors[field as keyof FormErrors]) {
            setFormErrors(prev => ({ ...prev, [field]: '' }));
        }

        // Clear general error when any field changes
        if (formErrors.general) {
            setFormErrors(prev => ({ ...prev, general: '' }));
        }
    };

    // Handle address selection
    const handleAddressSelected = (address: EmbeddedAddress): void => {
        handleChange('billingAddress', address);
    };

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Partial<FormErrors> = {};
        let isValid = true;

        // Validate email
        if (!formData.email.trim()) {
            newErrors.email = 'L\'email est requis';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Format d\'email invalide';
            isValid = false;
        }

        // Validate individual user fields
        if (isIndividual) {
            if (!formData.firstName.trim()) {
                newErrors.firstName = 'Le prénom est requis';
                isValid = false;
            }

            if (!formData.lastName.trim()) {
                newErrors.lastName = 'Le nom est requis';
                isValid = false;
            }
        }

        // Validate professional user fields
        if (isProfessional) {
            if (!formData.companyName.trim()) {
                newErrors.companyName = 'Le nom de l\'entreprise est requis';
                isValid = false;
            }

            if (!formData.contactName.trim()) {
                newErrors.contactName = 'Le nom du contact est requis';
                isValid = false;
            }
        }

        // Update form errors state
        setFormErrors(prev => ({ ...prev, ...newErrors }));
        return isValid;
    };

    // Handle photo selection
    const pickProfilePhoto = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setUploadingPhoto(true);

                // Upload photo to Firebase Storage
                if (user?.uid) {
                    const photoPath = `users/${user.uid}/profile/`;
                    const photoUrl = await storageService.uploadImage(result.assets[0].uri, photoPath);
                    handleChange('profilePhoto', photoUrl);
                }
            }
        } catch (error) {
            console.error('Error picking/uploading profile photo:', error);
            Alert.alert('Erreur', 'Impossible de télécharger la photo de profil');
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Handle form submission
    const handleSave = async (): Promise<void> => {
        if (!validateForm()) {
            return;
        }

        if (!user?.uid) {
            setFormErrors(prev => ({
                ...prev,
                general: 'Utilisateur non authentifié'
            }));
            return;
        }

        try {
            setSaving(true);
            setFormErrors(prev => ({ ...prev, general: '' }));

            // Prepare update data based on user type
            let updateData: any = {
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                billingAddress: formData.billingAddress
            };

            if (isIndividual) {
                updateData = {
                    ...updateData,
                    firstName: formData.firstName,
                    lastName: formData.lastName
                };
            }

            if (isProfessional) {
                updateData = {
                    ...updateData,
                    companyName: formData.companyName,
                    contactName: formData.contactName
                };
            }

            // Update user profile in Firestore
            await userService.updateUserProfile(user.uid, updateData);

            // Update profile photo if changed
            if (formData.profilePhoto) {
                await updateProfile({ photoURL: formData.profilePhoto });
            }

            // Refresh the user profile in auth context
            await refreshUserProfile();

            Alert.alert(
                'Succès',
                'Votre profil a été mis à jour avec succès.',
                [
                    {
                        text: 'OK',
                        onPress: () => onClose()
                    }
                ]
            );

        } catch (error) {
            console.error('Error updating profile:', error);
            setFormErrors(prev => ({
                ...prev,
                general: error instanceof Error ? error.message : 'Une erreur est survenue lors de la mise à jour'
            }));
        } finally {
            setSaving(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5DD6FF" />
                    <Text className="text-white mt-4 font-cabin">
                        Chargement de votre profil...
                    </Text>
                </View>
            </GradientView>
        );
    }

    return (
        <GradientView>
            <ScrollView className="flex-1 p-4">
                {/* Header */}
                <View className="flex-row items-center mb-6">
                    <TouchableOpacity
                        onPress={onClose}
                        className="mr-4"
                    >
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-cabin-medium">
                        Modifier mon profil
                    </Text>
                </View>

                {/* Display general error if present */}
                {formErrors.general ? (
                    <View className="bg-red-500/20 p-3 rounded-md mb-4">
                        <Text className="text-white text-center font-cabin-medium">
                            {formErrors.general}
                        </Text>
                    </View>
                ) : null}

                {/* Profile Photo Section */}
                {user?.isDeliveryAgent && (
                    <View className="bg-dark p-5 rounded-xl mb-6 border border-gray-800">
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                                <Ionicons name="camera" size={16} color="#0F2026" />
                            </View>
                            <Text className="text-white text-lg font-cabin-medium">
                                Photo de profil
                            </Text>
                        </View>

                        <View className="items-center">
                            <TouchableOpacity
                                onPress={pickProfilePhoto}
                                disabled={uploadingPhoto}
                                className="relative"
                            >
                                <View className="w-24 h-24 rounded-full bg-gray-700 items-center justify-center border-2 border-primary">
                                    {formData.profilePhoto ? (
                                        <Image
                                            source={{ uri: formData.profilePhoto }}
                                            className="w-full h-full rounded-full"
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <Ionicons name="person" size={40} color="#5DD6FF" />
                                    )}
                                </View>

                                {uploadingPhoto ? (
                                    <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                                        <ActivityIndicator size="small" color="#5DD6FF" />
                                    </View>
                                ) : (
                                    <View className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full items-center justify-center">
                                        <Ionicons name="camera" size={16} color="#0F2026" />
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Text className="text-gray-300 text-center mt-2 font-cabin">
                                Appuyez pour {formData.profilePhoto ? 'changer' : 'ajouter'} votre photo
                            </Text>
                        </View>
                    </View>
                )}

                {/* Personal Information Section */}
                <View className="bg-dark p-5 rounded-xl mb-6 border border-gray-800">
                    <View className="flex-row items-center mb-4">
                        <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                            <Ionicons name="person-outline" size={16} color="#0F2026" />
                        </View>
                        <Text className="text-white text-lg font-cabin-medium">
                            {isIndividual ? 'Informations personnelles' : 'Informations de l\'entreprise'}
                        </Text>
                    </View>

                    {/* Individual user fields */}
                    {isIndividual && (
                        <>
                            <StyledTextInput
                                label="Prénom"
                                placeholder="Entrez votre prénom"
                                value={formData.firstName}
                                onChangeText={(text) => handleChange('firstName', text)}
                                error={formErrors.firstName}
                            />

                            <StyledTextInput
                                label="Nom"
                                placeholder="Entrez votre nom"
                                value={formData.lastName}
                                onChangeText={(text) => handleChange('lastName', text)}
                                error={formErrors.lastName}
                            />
                        </>
                    )}

                    {/* Professional user fields */}
                    {isProfessional && (
                        <>
                            <StyledTextInput
                                label="Nom de l'entreprise"
                                placeholder="Entrez le nom de l'entreprise"
                                value={formData.companyName}
                                onChangeText={(text) => handleChange('companyName', text)}
                                error={formErrors.companyName}
                            />

                            <StyledTextInput
                                label="Nom du contact"
                                placeholder="Entrez le nom du contact"
                                value={formData.contactName}
                                onChangeText={(text) => handleChange('contactName', text)}
                                error={formErrors.contactName}
                            />
                        </>
                    )}

                    <StyledTextInput
                        label="Email"
                        placeholder="Entrez votre adresse email"
                        value={formData.email}
                        onChangeText={(text) => handleChange('email', text)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={formErrors.email}
                    />

                    <StyledTextInput
                        label="Numéro de téléphone"
                        placeholder="Entrez votre numéro de téléphone"
                        value={formData.phoneNumber}
                        onChangeText={(text) => handleChange('phoneNumber', text)}
                        keyboardType="phone-pad"
                        error={formErrors.phoneNumber}
                    />
                </View>

                {/* Billing Address Section */}
                <View className="bg-dark p-5 rounded-xl mb-6 border border-gray-800">
                    <View className="flex-row items-center mb-4">
                        <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                            <Ionicons name="location-outline" size={16} color="#0F2026" />
                        </View>
                        <Text className="text-white text-lg font-cabin-medium">
                            Adresse de facturation
                        </Text>
                    </View>

                    <ModernAddressInput
                        address={formData.billingAddress}
                        onAddressSelected={handleAddressSelected}
                        isDeliveryAddress={false}
                    />

                    <Text className="text-gray-400 text-sm mt-2 font-cabin">
                        Cette adresse sera utilisée par défaut pour vos factures
                    </Text>
                </View>

                {/* Action Buttons */}
                <View className="mb-8">
                    <StyledButton
                        variant="bordered"
                        onPress={onClose}
                        disabled={saving}
                        className="mb-4"
                    >
                        <Text className="text-white font-cabin-medium">Annuler</Text>
                    </StyledButton>

                    <StyledButton
                        variant="primary"
                        shadow
                        onPress={handleSave}
                        disabled={saving || uploadingPhoto}
                    >
                        <Text className="text-darker font-cabin-medium">
                            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                        </Text>
                    </StyledButton>
                </View>

            </ScrollView>
        </GradientView>
    );
}