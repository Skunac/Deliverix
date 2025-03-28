import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/authContext";
import { GradientView } from "@/components/ui/GradientView";
import StyledButton from "@/components/ui/StyledButton";
import StyledTextInput from "@/components/ui/StyledTextInput";
import { Picker } from '@react-native-picker/picker';

type VehicleType = 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'van' | 'truck' | 'on_foot';
type AvailabilityType = 'full-time' | 'part-time';

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    vehicleType: VehicleType;
    licensePlate: string;
    availability: AvailabilityType;
    serviceAreas: string;
    password: string;
    confirmPassword: string;
}

interface FormErrors {
    firstName: string;
    lastName: string;
    email: string;
    licensePlate: string;
    password: string;
    confirmPassword: string;
    auth: string;
}

export default function RegisterDeliveryScreen(): JSX.Element {
    // Form fields
    const [formData, setFormData] = useState<FormData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        vehicleType: 'car',
        licensePlate: '',
        availability: 'full-time',
        serviceAreas: '',
        password: '',
        confirmPassword: ''
    });

    // Single object for all form errors
    const [formErrors, setFormErrors] = useState<FormErrors>({
        firstName: '',
        lastName: '',
        email: '',
        licensePlate: '',
        password: '',
        confirmPassword: '',
        auth: '' // For auth-related errors
    });

    const [isRegistering, setIsRegistering] = useState(false);
    const { signUpDelivery, authError, error, resetErrors } = useAuth();
    const router = useRouter();

    // Effect to sync authError from context with formErrors.auth in the component
    useEffect(() => {
        if (authError) {
            setFormErrors(prev => ({ ...prev, auth: authError }));
        }
    }, [authError]);

    // Effect to sync error from context with formErrors.auth in the component
    useEffect(() => {
        if (error && error.message) {
            setFormErrors(prev => ({ ...prev, auth: error.message }));
        }
    }, [error]);

    // Single useEffect for component mount/unmount
    useEffect(() => {
        console.log('RegisterDeliveryScreen mounted - resetting errors');
        resetErrors();

        // Cleanup on unmount
        return () => {
            console.log('RegisterDeliveryScreen unmounted - resetting errors');
            resetErrors();
        };
    }, []);

    // Handle input changes with automatic error clearing
    const handleChange = (field: keyof FormData, value: string): void => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Check if this field has a corresponding error field before clearing it
        if (field in formErrors && formErrors[field as keyof FormErrors]) {
            setFormErrors(prev => ({ ...prev, [field]: '' }));
        }

        // Clear auth error when any field changes
        if (formErrors.auth) {
            setFormErrors(prev => ({ ...prev, auth: '' }));
        }
    };

    // Handle vehicle type changes with license plate validation
    const handleVehicleTypeChange = (value: VehicleType): void => {
        setFormData(prev => ({ ...prev, vehicleType: value }));

        // Clear license plate error if switched to on_foot
        if (value === 'on_foot' && formErrors.licensePlate) {
            setFormErrors(prev => ({ ...prev, licensePlate: '' }));
        }
        // Validate license plate if switched from on_foot
        else if (value !== 'on_foot' && !formData.licensePlate.trim()) {
            setFormErrors(prev => ({
                ...prev,
                licensePlate: 'La plaque d\'immatriculation est requise pour ce type de véhicule'
            }));
        }

        // Clear auth error as well
        if (formErrors.auth) {
            setFormErrors(prev => ({ ...prev, auth: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<FormErrors> = {};
        let isValid = true;

        // Validate first name
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Le prénom est requis';
            isValid = false;
        }

        // Validate last name
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Le nom est requis';
            isValid = false;
        }

        // Validate email
        if (!formData.email) {
            newErrors.email = 'L\'email est requis';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Format d\'email invalide';
            isValid = false;
        }

        // Validate license plate (not required for on_foot)
        if (formData.vehicleType !== 'on_foot' && !formData.licensePlate.trim()) {
            newErrors.licensePlate = 'La plaque d\'immatriculation est requise pour ce type de véhicule';
            isValid = false;
        }

        // Validate password
        if (!formData.password) {
            newErrors.password = 'Le mot de passe est requis';
            isValid = false;
        } else if (formData.password.length < 6) {
            newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
            isValid = false;
        }

        // Validate password confirmation
        if (formData.password.trim() !== formData.confirmPassword.trim()) {
            newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
            isValid = false;
        }

        // Update form errors state
        setFormErrors(prev => ({ ...prev, ...newErrors }));
        return isValid;
    };

    const handleRegister = async (): Promise<void> => {
        // Log values for debugging
        console.log('Password:', formData.password);
        console.log('Confirm Password:', formData.confirmPassword);
        console.log('Match?', formData.password === formData.confirmPassword);
        console.log(`Vehicle type: ${formData.vehicleType}`);

        if (!validateForm()) {
            return;
        }

        try {
            setIsRegistering(true);
            resetErrors();
            setFormErrors(prev => ({ ...prev, auth: '' })); // Clear auth error

            // Parse service areas as array
            const serviceAreasArray = formData.serviceAreas
                .split(',')
                .map(area => area.trim())
                .filter(area => area.length > 0);

            console.log("Starting delivery driver registration process");

            const success = await signUpDelivery(
                formData.email,
                formData.password,
                formData.firstName,
                formData.lastName,
                formData.phone,
                formData.vehicleType,
                formData.licensePlate,
                formData.availability,
                serviceAreasArray
            );

            if (success) {
                console.log('Registration successful, user should be redirected automatically');
                // The navigation is handled by the RootLayoutNav component
            } else {
                console.log('Registration failed, checking for errors...');
            }
        } catch (error) {
            console.error('Registration failed with exception:', error);
            setFormErrors(prev => ({
                ...prev,
                auth: error instanceof Error ? error.message : 'Une erreur d\'inscription est survenue'
            }));
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <GradientView>
            <ScrollView contentContainerClassName="flex-grow">
                <View className="flex-1 justify-center p-5">
                    <Text className="text-2xl font-cabin-bold mb-5 text-center text-white">
                        Inscription Livreur
                    </Text>

                    {/* Display auth error if present */}
                    {formErrors.auth ? (
                        <View className="bg-red-500/20 p-3 rounded-md mb-4">
                            <Text className="text-white text-center font-cabin-medium">
                                {formErrors.auth}
                            </Text>
                        </View>
                    ) : null}

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

                    <StyledTextInput
                        placeholder="Email"
                        value={formData.email}
                        onChangeText={(text) => handleChange('email', text)}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        error={formErrors.email}
                    />

                    <StyledTextInput
                        placeholder="Téléphone"
                        value={formData.phone}
                        onChangeText={(text) => handleChange('phone', text)}
                        keyboardType="phone-pad"
                    />

                    <View className="border border-gray-300 bg-white rounded-md mb-4">
                        <Picker
                            selectedValue={formData.vehicleType}
                            onValueChange={handleVehicleTypeChange}
                            style={{height: 50}}
                        >
                            <Picker.Item label="Voiture" value="car"/>
                            <Picker.Item label="Moto" value="motorcycle"/>
                            <Picker.Item label="Vélo" value="bicycle"/>
                            <Picker.Item label="Scooter" value="scooter"/>
                            <Picker.Item label="Camionnette" value="van"/>
                            <Picker.Item label="Camion" value="truck"/>
                            <Picker.Item label="À pied" value="on_foot"/>
                        </Picker>
                    </View>

                    <StyledTextInput
                        placeholder="Plaque d'immatriculation"
                        value={formData.licensePlate}
                        onChangeText={(text) => handleChange('licensePlate', text)}
                        error={formErrors.licensePlate}
                        editable={formData.vehicleType !== 'on_foot'}
                    />

                    <View className="border border-gray-300 bg-white rounded-md mb-4">
                        <Picker
                            selectedValue={formData.availability}
                            onValueChange={(value) => handleChange('availability', value)}
                            style={{height: 50}}
                        >
                            <Picker.Item label="Temps plein" value="full-time"/>
                            <Picker.Item label="Temps partiel" value="part-time"/>
                        </Picker>
                    </View>

                    <StyledTextInput
                        placeholder="Zones de livraison (séparées par des virgules)"
                        value={formData.serviceAreas}
                        onChangeText={(text) => handleChange('serviceAreas', text)}
                        multiline
                    />

                    <StyledTextInput
                        placeholder="Mot de passe"
                        value={formData.password}
                        onChangeText={(text) => handleChange('password', text)}
                        secureTextEntry
                        error={formErrors.password}
                    />

                    <StyledTextInput
                        placeholder="Confirmer le mot de passe"
                        value={formData.confirmPassword}
                        onChangeText={(text) => handleChange('confirmPassword', text)}
                        secureTextEntry
                        error={formErrors.confirmPassword}
                    />

                    <StyledButton
                        variant="primary"
                        shadow={true}
                        onPress={handleRegister}
                        disabled={isRegistering}
                    >
                        <Text className="text-darker font-cabin-medium">
                            {isRegistering ? 'Inscription en cours...' : 'S\'inscrire'}
                        </Text>
                    </StyledButton>

                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mt-5"
                        disabled={isRegistering}
                    >
                        <Text className="text-white text-center font-cabin-medium">Retour</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </GradientView>
    );
}