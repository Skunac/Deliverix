import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/authContext";
import { GradientView } from "@/components/ui/GradientView";
import StyledButton from "@/components/ui/StyledButton";
import StyledTextInput from "@/components/ui/StyledTextInput";

interface FormData {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    siret: string;
    password: string;
    confirmPassword: string;
}

interface FormErrors {
    companyName: string;
    contactName: string;
    email: string;
    siret: string;
    password: string;
    confirmPassword: string;
    auth: string;
}

export default function RegisterProfessionalScreen(): JSX.Element {
    // Form fields
    const [formData, setFormData] = useState<FormData>({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        siret: '',
        password: '',
        confirmPassword: ''
    });

    // Single object for all form errors
    const [formErrors, setFormErrors] = useState<FormErrors>({
        companyName: '',
        contactName: '',
        email: '',
        siret: '',
        password: '',
        confirmPassword: '',
        auth: '' // For auth-related errors
    });

    const [isRegistering, setIsRegistering] = useState(false);
    const { signUpProfessional, authError, error, resetErrors } = useAuth();
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
        console.log('RegisterProfessionalScreen mounted - resetting errors');
        resetErrors();

        // Cleanup on unmount
        return () => {
            console.log('RegisterProfessionalScreen unmounted - resetting errors');
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

    const validateForm = (): boolean => {
        const newErrors: Partial<FormErrors> = {};
        let isValid = true;

        // Validate company name
        if (!formData.companyName.trim()) {
            newErrors.companyName = 'Le nom de l\'entreprise est requis';
            isValid = false;
        }

        // Validate contact name
        if (!formData.contactName.trim()) {
            newErrors.contactName = 'Le nom du contact est requis';
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

        // Validate SIRET number
        if (!formData.siret.trim()) {
            newErrors.siret = 'Le numéro SIRET est requis';
            isValid = false;
        } else if (!/^\d{14}$/.test(formData.siret.replace(/\s/g, ''))) {
            newErrors.siret = 'Le numéro SIRET doit contenir 14 chiffres';
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

        if (!validateForm()) {
            return;
        }

        try {
            setIsRegistering(true);
            resetErrors();
            setFormErrors(prev => ({ ...prev, auth: '' })); // Clear auth error

            const success = await signUpProfessional(
                formData.email,
                formData.password,
                formData.companyName,
                formData.contactName,
                formData.phone,
                formData.siret
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
                        Inscription Professionnel
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
                        placeholder="Nom de l'entreprise"
                        value={formData.companyName}
                        onChangeText={(text) => handleChange('companyName', text)}
                        error={formErrors.companyName}
                    />

                    <StyledTextInput
                        placeholder="Nom du contact"
                        value={formData.contactName}
                        onChangeText={(text) => handleChange('contactName', text)}
                        error={formErrors.contactName}
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

                    <StyledTextInput
                        placeholder="Numéro SIRET"
                        value={formData.siret}
                        onChangeText={(text) => handleChange('siret', text)}
                        keyboardType="number-pad"
                        error={formErrors.siret}
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