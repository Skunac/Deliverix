import { View, Text, TouchableOpacity, ScrollView, Alert, Image, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/authContext";
import { GradientView } from "@/components/ui/GradientView";
import StyledButton from "@/components/ui/StyledButton";
import StyledTextInput from "@/components/ui/StyledTextInput";
import { Dropdown } from 'react-native-element-dropdown';
import { DeliveryAgentService } from '@/src/services/delivery-agent.service';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {uploadFormImages} from "@/src/utils/image-helpers";
import { StyleSheet } from 'react-native';

type VehicleType = 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'van' | 'truck';
type CompanyType = 'micro' | 'sarl' | 'sas' | 'ei' | 'eirl' | 'other';

interface FormData {
    // Personal info
    firstName: string;
    lastName: string;
    birthDate: Date;
    birthPlace: string;
    nationality: string;

    // Address
    street: string;
    postalCode: string;
    city: string;

    // ID Document
    idType: 'identity_card' | 'passport' | 'residence_permit';
    idPhoto: string | null;

    // Profile photo
    profilePhoto: string | null;

    // Driver info
    licenseType: string;
    licensePhoto: string | null;

    // Vehicle info
    vehicleType: VehicleType;
    vehicleModel: string;
    vehicleYear: number;
    vehiclePlateNumber: string;
    vehicleRegistrationPhoto: string | null;

    // Insurance
    vehicleInsuranceProvider: string;
    vehicleInsurancePhoto: string | null;
    professionalInsuranceProvider: string;
    professionalInsurancePhoto: string | null;

    // Documents
    kbisPhoto: string | null;

    // Financial info
    vatApplicable: boolean;
    vatNumber: string;

    // Delivery range
    deliveryRange: number;

    // Optional certificates
    transportCertificatePhoto: string | null;
    trainingRegistrationPhoto: string | null;

    // Terms acceptance
    termsAccepted: boolean;
}

interface FormErrors {
    firstName: string;
    lastName: string;
    birthPlace: string;
    nationality: string;
    street: string;
    postalCode: string;
    city: string;
    idPhoto: string;
    licensePhoto: string;
    licenseType: string;
    vehiclePlateNumber: string;
    vehicleInsuranceProvider: string;
    professionalInsuranceProvider: string;
    kbisPhoto: string;
    terms: string;
    general: string;
}

export default function RegisterDeliveryStep2Screen(): JSX.Element {
    const deliveryAgentService = new DeliveryAgentService();
    const router = useRouter();
    const { user, error } = useAuth();

    // Form fields
    const [formData, setFormData] = useState<FormData>({
        // Personal info
        firstName: '',
        lastName: '',
        birthDate: new Date(1990, 0, 1),
        birthPlace: '',
        nationality: 'Française',

        // Address
        street: '',
        postalCode: '',
        city: '',

        // ID Document
        idType: 'identity_card',
        idPhoto: null,

        // Profile photo
        profilePhoto: null,

        // Driver info
        licenseType: 'B',
        licensePhoto: null,

        // Vehicle info
        vehicleType: 'car',
        vehicleModel: '',
        vehicleYear: new Date().getFullYear(),
        vehiclePlateNumber: '',
        vehicleRegistrationPhoto: null,

        // Insurance
        vehicleInsuranceProvider: '',
        vehicleInsurancePhoto: null,
        professionalInsuranceProvider: '',
        professionalInsurancePhoto: null,

        // Documents
        kbisPhoto: null,

        // Financial info
        vatApplicable: false,
        vatNumber: '',

        // Delivery range
        deliveryRange: 20, // Default delivery range of 20km

        // Optional certificates
        transportCertificatePhoto: null,
        trainingRegistrationPhoto: null,

        // Terms acceptance
        termsAccepted: false,
    });

    const [formErrors, setFormErrors] = useState<FormErrors>({
        firstName: '',
        lastName: '',
        birthPlace: '',
        nationality: '',
        street: '',
        postalCode: '',
        city: '',
        idPhoto: '',
        licensePhoto: '',
        licenseType: '',
        vehiclePlateNumber: '',
        vehicleInsuranceProvider: '',
        professionalInsuranceProvider: '',
        kbisPhoto: '',
        terms: '',
        general: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [activeDateField, setActiveDateField] = useState<keyof FormData | null>(null);

    // Check if the user is logged in
    useEffect(() => {
        if (!user) {
            // User not logged in, redirect to step 1
            Alert.alert(
                "Session expirée",
                "Votre session a expiré. Veuillez vous inscrire à nouveau.",
                [{ text: "OK", onPress: () => router.replace('/register-delivery-agent-step1') }]
            );
        }
    }, [user]);

    const handleChange = (field: keyof FormData, value: any): void => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error for this field if it exists
        if (field in formErrors) {
            setFormErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const openDatePicker = (field: keyof FormData) => {
        setActiveDateField(field);
        setShowDatePicker(true);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        // Hide the picker on iOS immediately, or after selection on Android
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (selectedDate && activeDateField) {
            handleChange(activeDateField, selectedDate);
        }

        if (Platform.OS === 'ios') {
            // For iOS, we'll keep the date picker open until they press the "Done" button
        } else {
            setActiveDateField(null);
        }
    };

    const handleDonePress = () => {
        setShowDatePicker(false);
        setActiveDateField(null);
    };

    const pickImage = async (field: keyof FormData) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                handleChange(field, result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
        }
    };

    const renderImageUpload = (field: keyof FormData, label: string, required: boolean = true) => (
        <View className="mb-4">
            <Text className="text-base font-cabin-medium mb-2 text-white">
                {label} {required && <Text className="text-red-500">*</Text>}
            </Text>
            <TouchableOpacity
                onPress={() => pickImage(field)}
                className="bg-blue-500 p-3 rounded-md mb-4"
            >
                <Text className="text-white text-center">
                    {formData[field] ? 'Changer la photo' : 'Ajouter une photo'}
                </Text>
            </TouchableOpacity>

            {formData[field] && (
                <View className="mb-2">
                    <Image
                        source={{ uri: formData[field] as string }}
                        style={{ width: '100%', height: 150, borderRadius: 8 }}
                        resizeMode="cover"
                    />
                    <Text className="text-green-700 mt-1 text-center">Photo ajoutée ✓</Text>
                </View>
            )}

            {required && formErrors[field as keyof FormErrors] && (
                <Text className="text-red-500 mb-2">{formErrors[field as keyof FormErrors]}</Text>
            )}
        </View>
    );

    const validateForm = (): boolean => {
        const newErrors: Partial<FormErrors> = {};
        let isValid = true;

        // Required personal info
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Le prénom est requis';
            isValid = false;
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Le nom est requis';
            isValid = false;
        }

        if (!formData.birthPlace.trim()) {
            newErrors.birthPlace = 'Le lieu de naissance est requis';
            isValid = false;
        }

        if (!formData.nationality.trim()) {
            newErrors.nationality = 'La nationalité est requise';
            isValid = false;
        }

        // Required address
        if (!formData.street.trim()) {
            newErrors.street = 'L\'adresse est requise';
            isValid = false;
        }

        if (!formData.postalCode.trim()) {
            newErrors.postalCode = 'Le code postal est requis';
            isValid = false;
        }

        if (!formData.city.trim()) {
            newErrors.city = 'La ville est requise';
            isValid = false;
        }

        // Required photos
        if (!formData.idPhoto) {
            newErrors.idPhoto = 'La photo de la pièce d\'identité est requise';
            isValid = false;
        }

        if (!formData.licensePhoto) {
            newErrors.licensePhoto = 'La photo du permis de conduire est requise';
            isValid = false;
        }

        if (!formData.licenseType.trim()) {
            newErrors.licenseType = 'Le type de permis est requis';
            isValid = false;
        }

        // Required vehicle info (if not bicycle)
        if (formData.vehicleType !== 'bicycle') {
            if (!formData.vehiclePlateNumber.trim()) {
                newErrors.vehiclePlateNumber = 'La plaque d\'immatriculation est requise';
                isValid = false;
            }

            if (!formData.vehicleRegistrationPhoto) {
                newErrors.general = (newErrors.general || '') + '\nLa photo de la carte grise est requise.';
                isValid = false;
            }

            if (!formData.vehicleInsuranceProvider.trim()) {
                newErrors.vehicleInsuranceProvider = 'L\'assureur du véhicule est requis';
                isValid = false;
            }

            if (!formData.vehicleInsurancePhoto) {
                newErrors.general = (newErrors.general || '') + '\nLa photo de l\'assurance véhicule est requise.';
                isValid = false;
            }
        }

        // Required professional insurance
        if (!formData.professionalInsuranceProvider.trim()) {
            newErrors.professionalInsuranceProvider = 'L\'assureur professionnel est requis';
            isValid = false;
        }

        if (!formData.professionalInsurancePhoto) {
            newErrors.general = (newErrors.general || '') + '\nLa photo de l\'assurance professionnelle est requise.';
            isValid = false;
        }

        // Required KBIS
        if (!formData.kbisPhoto) {
            newErrors.kbisPhoto = 'La photo du KBIS/relevé SIRENE est requise';
            isValid = false;
        }

        // Terms acceptance
        if (!formData.termsAccepted) {
            newErrors.terms = 'Vous devez accepter les conditions générales';
            isValid = false;
        }

        // Update form errors state
        setFormErrors(prev => ({ ...prev, ...newErrors }));
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            // Scroll to top to show errors
            return;
        }

        if (!user || !user.uid) {
            setFormErrors(prev => ({
                ...prev,
                general: 'Session expirée. Veuillez vous reconnecter.'
            }));
            return;
        }

        try {
            setIsSubmitting(true);

            // Get data from step 1
            const sirenNumber = '';
            const companyType = 'micro' as CompanyType;
            const companyName = user.userType === 'professional' ? user.companyName : '';

            // Télécharger toutes les images sur Firebase Storage
            // Cette étape remplacera les URIs locaux par des URLs Firebase
            const processedFormData = await uploadFormImages(formData, user.uid);

            // Register the delivery agent with simplified model
            await deliveryAgentService.registerAsAgent(user.uid, {
                // Personal info
                personalInfo: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: user.email,
                    phoneNumber: user.phoneNumber || ''
                },
                // Company info
                companyInfo: {
                    name: companyName || '', // Éviter les undefined
                    type: companyType,
                    sirenNumber: sirenNumber
                },
                // Vehicle info (minimal)
                vehicleInfo: {
                    type: formData.vehicleType,
                    plateNumber: formData.vehiclePlateNumber
                }
            });

            await deliveryAgentService.updatePersonalInfo(user.uid, {
                firstName: formData.firstName,
                lastName: formData.lastName,
                birthDate: formData.birthDate,
                birthPlace: formData.birthPlace,
                nationality: formData.nationality,
                address: {
                    street: formData.street,
                    postalCode: formData.postalCode,
                    city: formData.city,
                    country: 'France'
                },
                idType: formData.idType,
                idPhotoUrl: processedFormData.idPhoto,
                photoUrl: processedFormData.profilePhoto
            });

            await deliveryAgentService.updateVehicleInfo(user.uid, {
                type: formData.vehicleType,
                model: formData.vehicleModel,
                year: formData.vehicleYear,
                plateNumber: formData.vehiclePlateNumber,
                registrationPhotoUrl: processedFormData.vehicleRegistrationPhoto,
                insuranceProvider: formData.vehicleInsuranceProvider,
                insurancePhotoUrl: processedFormData.vehicleInsurancePhoto
            });

            await deliveryAgentService.updateDriverInfo(user.uid, {
                licenseType: processedFormData.licenseType,
                licensePhotoUrl: formData.licensePhoto,
                transportCertificatePhotoUrl: processedFormData.transportCertificatePhoto,
                trainingRegistrationPhotoUrl: processedFormData.trainingRegistrationPhoto
            });

            await deliveryAgentService.updateCompanyInfo(user.uid, {
                kbisPhotoUrl: processedFormData.kbisPhoto,
                professionalInsuranceProvider: formData.professionalInsuranceProvider,
                professionalInsurancePhotoUrl: processedFormData.professionalInsurancePhoto
            });

            // Update VAT and terms
            await deliveryAgentService.updateAgentProfile(user.uid, {
                deliveryRange: formData.deliveryRange,
                vatApplicable: formData.vatApplicable,
                vatNumber: formData.vatNumber,
                termsAccepted: true,
                termsAcceptanceDate: new Date()
            });

            // Success - redirect
            router.replace('/(tabs)')
        } catch (error) {
            console.error('Registration error:', error);
            setFormErrors(prev => ({
                ...prev,
                general: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'inscription'
            }));

            // Afficher un message d'erreur plus détaillé
            Alert.alert(
                "Erreur lors de l'inscription",
                `Une erreur est survenue: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <GradientView>
            <ScrollView contentContainerClassName="pb-10">
                <View className="p-5">
                    <Text className="text-2xl font-cabin-bold mb-5 text-center text-white">
                        Inscription Livreur Professionnel - Étape 2
                    </Text>

                    <Text className="text-sm font-cabin-medium mb-5 text-center text-white">
                        Veuillez compléter votre profil de livreur
                    </Text>

                    {/* General error message */}
                    {formErrors.general ? (
                        <View className="bg-red-500/20 p-3 rounded-md mb-4">
                            <Text className="text-white text-center font-cabin-medium">
                                {formErrors.general}
                            </Text>
                        </View>
                    ) : null}

                    {/* Informations personnelles */}
                    <View className="p-4 rounded-md mb-4">
                        <Text className="text-lg font-cabin-bold text-white mb-3">
                            Informations personnelles
                        </Text>

                        <StyledTextInput
                            placeholder="Prénom"
                            value={formData.firstName}
                            onChangeText={(text) => handleChange('firstName', text)}
                            error={formErrors.firstName}
                        />

                        <StyledTextInput
                            placeholder="Nom"
                            value={formData.lastName}
                            onChangeText={(text) => handleChange('lastName', text)}
                            error={formErrors.lastName}
                        />

                        <TouchableOpacity
                            onPress={() => openDatePicker('birthDate')}
                            className="border border-gray-300 bg-gray-50 rounded-md p-3 mb-4"
                        >
                            <Text>
                                Date de naissance: {format(formData.birthDate, 'dd/MM/yyyy', { locale: fr })}
                            </Text>
                        </TouchableOpacity>

                        <StyledTextInput
                            placeholder="Lieu de naissance"
                            value={formData.birthPlace}
                            onChangeText={(text) => handleChange('birthPlace', text)}
                            error={formErrors.birthPlace}
                        />

                        <StyledTextInput
                            placeholder="Nationalité"
                            value={formData.nationality}
                            onChangeText={(text) => handleChange('nationality', text)}
                            error={formErrors.nationality}
                        />

                        {renderImageUpload('profilePhoto', 'Photo de profil', false)}
                    </View>

                    {/* Adresse */}
                    <View className=" p-4 rounded-md mb-4">
                        <Text className="text-lg font-cabin-bold text-white mb-3">
                            Adresse
                        </Text>

                        <StyledTextInput
                            placeholder="Adresse"
                            value={formData.street}
                            onChangeText={(text) => handleChange('street', text)}
                            error={formErrors.street}
                        />

                        <StyledTextInput
                            placeholder="Code postal"
                            value={formData.postalCode}
                            onChangeText={(text) => handleChange('postalCode', text)}
                            error={formErrors.postalCode}
                            keyboardType="number-pad"
                        />

                        <StyledTextInput
                            placeholder="Ville"
                            value={formData.city}
                            onChangeText={(text) => handleChange('city', text)}
                            error={formErrors.city}
                        />
                    </View>

                    {/* Pièce d'identité */}
                    <View className=" p-4 rounded-md mb-4">
                        <Text className="text-lg font-cabin-bold text-white mb-3">
                            Pièce d'identité
                        </Text>

                        <View className="mb-4">
                            <Text className="text-base font-cabin-medium text-white mb-2">
                                Type de pièce d'identité <Text className="text-red-500">*</Text>
                            </Text>
                            <Dropdown
                                style={dropdownStyles.dropdown}
                                placeholderStyle={dropdownStyles.placeholderStyle}
                                selectedTextStyle={dropdownStyles.selectedTextStyle}
                                inputSearchStyle={dropdownStyles.inputSearchStyle}
                                iconStyle={dropdownStyles.iconStyle}
                                itemContainerStyle={dropdownStyles.itemContainerStyle}
                                itemTextStyle={dropdownStyles.itemTextStyle}
                                data={[
                                    { label: 'Carte d\'identité', value: 'identity_card' },
                                    { label: 'Passeport', value: 'passport' },
                                    { label: 'Titre de séjour', value: 'residence_permit' },
                                ]}
                                maxHeight={300}
                                labelField="label"
                                valueField="value"
                                placeholder="Sélectionnez une pièce d'identité"
                                value={formData.idType}
                                onChange={item => {
                                    handleChange('idType', item.value);
                                }}
                            />
                        </View>

                        {renderImageUpload('idPhoto', 'Photo de votre pièce d\'identité')}
                    </View>

                    {/* Permis de conduire */}
                    <View className=" p-4 rounded-md mb-4">
                        <Text className="text-lg font-cabin-bold text-white mb-3">
                            Permis de conduire
                        </Text>

                        <StyledTextInput
                            placeholder="Type de permis (A, B, C...)"
                            value={formData.licenseType}
                            onChangeText={(text) => handleChange('licenseType', text)}
                            error={formErrors.licenseType}
                        />

                        {renderImageUpload('licensePhoto', 'Photo de votre permis de conduire')}
                    </View>

                    {/* Véhicule */}
                    <View className=" p-4 rounded-md mb-4">
                        <Text className="text-lg font-cabin-bold text-white mb-3">
                            Véhicule
                        </Text>

                        <View className="mb-4">
                            <Text className="text-base font-cabin-medium mb-2 text-white">
                                Type de véhicule <Text className="text-red-500">*</Text>
                            </Text>
                            <Dropdown
                                style={dropdownStyles.dropdown}
                                placeholderStyle={dropdownStyles.placeholderStyle}
                                selectedTextStyle={dropdownStyles.selectedTextStyle}
                                inputSearchStyle={dropdownStyles.inputSearchStyle}
                                iconStyle={dropdownStyles.iconStyle}
                                itemContainerStyle={dropdownStyles.itemContainerStyle}
                                itemTextStyle={dropdownStyles.itemTextStyle}
                                data={[
                                    { label: 'Voiture', value: 'car' },
                                    { label: 'Moto', value: 'motorcycle' },
                                    { label: 'Vélo', value: 'bicycle' },
                                    { label: 'Scooter', value: 'scooter' },
                                    { label: 'Camionnette', value: 'van' },
                                    { label: 'Camion', value: 'truck' },
                                ]}
                                maxHeight={300}
                                labelField="label"
                                valueField="value"
                                placeholder="Sélectionnez un type de véhicule"
                                value={formData.vehicleType}
                                onChange={item => {
                                    handleChange('vehicleType', item.value);
                                }}
                            />
                        </View>

                        <StyledTextInput
                            placeholder="Modèle"
                            value={formData.vehicleModel}
                            onChangeText={(text) => handleChange('vehicleModel', text)}
                        />

                        <StyledTextInput
                            placeholder="Année"
                            value={formData.vehicleYear.toString()}
                            onChangeText={(text) => handleChange('vehicleYear', parseInt(text) || new Date().getFullYear())}
                            keyboardType="number-pad"
                        />

                        {formData.vehicleType !== 'bicycle' && (
                            <>
                                <StyledTextInput
                                    placeholder="Plaque d'immatriculation"
                                    value={formData.vehiclePlateNumber}
                                    onChangeText={(text) => handleChange('vehiclePlateNumber', text)}
                                    error={formErrors.vehiclePlateNumber}
                                />

                                {renderImageUpload('vehicleRegistrationPhoto', 'Photo de la carte grise')}

                                <Text className="text-base text-white font-cabin-medium mt-4 mb-2">
                                    Assurance véhicule
                                </Text>

                                <StyledTextInput
                                    placeholder="Assureur"
                                    value={formData.vehicleInsuranceProvider}
                                    onChangeText={(text) => handleChange('vehicleInsuranceProvider', text)}
                                    error={formErrors.vehicleInsuranceProvider}
                                />

                                {renderImageUpload('vehicleInsurancePhoto', 'Photo de l\'attestation d\'assurance véhicule')}
                            </>
                        )}

                        {formData.vehicleType === 'bicycle' && (
                            <Text className="text-gray-700 mb-4">
                                Pour un vélo, la plaque d'immatriculation et l'assurance ne sont pas requises
                            </Text>
                        )}
                    </View>

                    {/* Documents professionnels */}
                    <View className=" p-4 rounded-md mb-4">
                        <Text className="text-lg font-cabin-bold text-white mb-3">
                            Documents professionnels
                        </Text>

                        <Text className="text-base text-white font-cabin-medium mb-2">
                            Assurance professionnelle
                        </Text>

                        <StyledTextInput
                            placeholder="Assureur"
                            value={formData.professionalInsuranceProvider}
                            onChangeText={(text) => handleChange('professionalInsuranceProvider', text)}
                            error={formErrors.professionalInsuranceProvider}
                        />

                        {renderImageUpload('professionalInsurancePhoto', 'Photo de l\'attestation d\'assurance professionnelle')}

                        <Text className="text-base text-white font-cabin-medium mt-4 mb-2">
                            Extrait Kbis ou relevé SIRENE
                        </Text>

                        {renderImageUpload('kbisPhoto', 'Photo de l\'extrait Kbis ou relevé SIRENE')}
                    </View>

                    {/* TVA */}
                    <View className=" p-4 rounded-md mb-4">
                        <Text className="text-lg font-cabin-bold text-white mb-3">
                            Paramètres fiscaux
                        </Text>

                        <View className="flex-row items-center mb-4">
                            <TouchableOpacity
                                onPress={() => handleChange('vatApplicable', !formData.vatApplicable)}
                                className="mr-2"
                            >
                                <View className={`h-6 w-6 rounded border ${formData.vatApplicable ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-400'} flex items-center justify-center`}>
                                    {formData.vatApplicable && (
                                        <Text className="text-white">✓</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                            <Text className="font-cabin text-white">Assujetti à la TVA</Text>
                        </View>

                        {formData.vatApplicable && (
                            <StyledTextInput
                                placeholder="Numéro de TVA"
                                value={formData.vatNumber}
                                onChangeText={(text) => handleChange('vatNumber', text)}
                            />
                        )}
                    </View>

                    {/* Rayon de livraison */}
                    <View className=" p-4 rounded-md mb-4">
                        <Text className="text-lg font-cabin-bold text-white mb-3">
                            Rayon de livraison
                        </Text>

                        <StyledTextInput
                            placeholder="Rayon de livraison en km"
                            value={formData.deliveryRange.toString()}
                            onChangeText={(text) => handleChange('deliveryRange', parseInt(text) || 15)}
                            keyboardType="number-pad"
                        />

                        <Text className="text-sm text-gray-600 mb-4">
                            Distance maximale (en km) que vous êtes prêt à parcourir pour une livraison à partir de votre adresse
                        </Text>
                    </View>

                    {/* Documents optionnels */}
                    <View className="p-4 rounded-md mb-4">
                        <Text className="text-lg font-cabin-bold text-white mb-3">
                            Documents optionnels
                        </Text>

                        <Text className="text-base text-white font-cabin-medium mb-2">
                            Certificat de transport -3t5 (optionnel)
                        </Text>

                        {renderImageUpload('transportCertificatePhoto', 'Photo de votre certificat', false)}

                        <Text className="text-base text-white font-cabin-medium mt-4 mb-2">
                            Inscription à la formation (optionnel)
                        </Text>

                        {renderImageUpload('trainingRegistrationPhoto', 'Justificatif de formation', false)}
                    </View>

                    {/* Conditions générales */}
                    <View className="p-4 rounded-md mb-4">
                        <View className="flex-row items-center mb-4">
                            <TouchableOpacity
                                onPress={() => handleChange('termsAccepted', !formData.termsAccepted)}
                                className="mr-2"
                            >
                                <View className={`h-6 w-6 rounded border ${formData.termsAccepted ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-400'} flex items-center justify-center`}>
                                    {formData.termsAccepted && (
                                        <Text className="text-white">✓</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                            <Text className="text-white">J'accepte les conditions générales d'utilisation et la politique de confidentialité</Text>
                        </View>

                        {formErrors.terms && (
                            <Text className="text-red-500 mb-2">
                                {formErrors.terms}
                            </Text>
                        )}
                    </View>

                    <StyledButton
                        variant="primary"
                        shadow={true}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <Text className="text-darker font-cabin-medium">
                            {isSubmitting ? 'Inscription en cours...' : 'Terminer l\'inscription'}
                        </Text>
                    </StyledButton>

                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mt-5"
                        disabled={isSubmitting}
                    >
                        <Text className="text-white text-center font-cabin-medium">Retour</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {showDatePicker && activeDateField && (
                <>
                    {Platform.OS === 'ios' && (
                        <View className="w-full bg-white p-2 flex-row justify-end">
                            <TouchableOpacity onPress={handleDonePress}>
                                <Text className="text-blue-500 text-lg font-bold">Terminé</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <DateTimePicker
                        value={formData[activeDateField] as Date}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                    />
                </>
            )}
        </GradientView>
    );
}

const dropdownStyles = StyleSheet.create({
    dropdown: {
        height: 50,
        borderColor: '#e2e8f0', // gray-300
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
        backgroundColor: 'white',
    },
    placeholderStyle: {
        fontSize: 16,
        color: '#9ca3af', // gray-400
    },
    selectedTextStyle: {
        fontSize: 16,
        color: '#1f2937', // gray-800
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    inputSearchStyle: {
        height: 40,
        fontSize: 16,
    },
    itemContainerStyle: {
        padding: 10,
    },
    itemTextStyle: {
        fontSize: 16,
        color: '#1f2937', // gray-800
    },
});