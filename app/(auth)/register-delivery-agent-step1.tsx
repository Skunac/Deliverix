import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { GradientView } from "@/components/ui/GradientView";
import StyledButton from "@/components/ui/StyledButton";
import StyledTextInput from "@/components/ui/StyledTextInput";
import { useDeliveryAgentRegistration } from '@/contexts/deliveryAgentRegistrationContext';
import AuthErrorMessages from '@/components/ui/AuthErrorMessages';

interface FormData {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
}

interface FormErrors {
    companyName: string;
    contactName: string;
    email: string;
    password: string;
    confirmPassword: string;
    auth: string;
}

export default function RegisterDeliveryStep1Screen(): JSX.Element {
    const router = useRouter();
    const { step1Data, saveStep1Data, registrationError, clearRegistrationError } = useDeliveryAgentRegistration();

    // Form fields - initialize with data from context if available
    const [formData, setFormData] = useState<FormData>({
        companyName: step1Data?.companyName || '',
        contactName: step1Data?.contactName || '',
        email: step1Data?.email || '',
        phone: step1Data?.phone || '',
        password: '',
        confirmPassword: ''
    });

    // Single object for all form errors
    const [formErrors, setFormErrors] = useState<FormErrors>({
        companyName: '',
        contactName: '',
        email: '',
        password: '',
        confirmPassword: '',
        auth: ''
    });

    // Set form error from context if available
    useEffect(() => {
        if (registrationError) {
            setFormErrors(prev => ({ ...prev, auth: registrationError }));
        }
    }, [registrationError]);

    // Clear errors on mount
    useEffect(() => {
        clearRegistrationError();

        return () => {
            clearRegistrationError();
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

    const handleContinue = async (): Promise<void> => {
        if (!validateForm()) {
            return;
        }

        try {
            // Clear previous errors
            setFormErrors(prev => ({ ...prev, auth: '' }));
            clearRegistrationError();

            // Save step 1 data to context (excluding confirmPassword)
            saveStep1Data({
                companyName: formData.companyName,
                contactName: formData.contactName,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
            });

            // Navigate to step 2
            router.push('/(auth)/register-delivery-agent-step2');

        } catch (error) {
            console.error('Error saving step 1 data:', error);
            setFormErrors(prev => ({
                ...prev,
                auth: error instanceof Error ? error.message : 'Une erreur est survenue'
            }));
        }
    };

    return (
        <GradientView>
            <ScrollView contentContainerClassName="flex-grow">
                <View className="flex-1 justify-center p-5">
                    <Text className="text-2xl font-cabin-bold mb-5 text-center text-white">
                        Inscription Livreur Professionnel - Étape 1
                    </Text>

                    <Text className="text-sm font-cabin-medium mb-5 text-center text-white">
                        Veuillez d'abord créer votre compte professionnel
                    </Text>

                    {/* Display auth error if present */}
                    {formErrors.auth ? (
                        <AuthErrorMessages error={formErrors.auth} />
                    ) : null}

                    <StyledTextInput
                        placeholder="Nom de l'entreprise"
                        value={formData.companyName}
                        onChangeText={(text) => handleChange('companyName', text)}
                        error={formErrors.companyName}
                    />

                    <StyledTextInput
                        placeholder="Nom et prénom du contact"
                        value={formData.contactName}
                        onChangeText={(text) => handleChange('contactName', text)}
                        error={formErrors.contactName}
                    />

                    <StyledTextInput
                        placeholder="Email professionnel"
                        value={formData.email}
                        onChangeText={(text) => handleChange('email', text)}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        error={formErrors.email}
                    />

                    <StyledTextInput
                        placeholder="Téléphone professionnel"
                        value={formData.phone}
                        onChangeText={(text) => handleChange('phone', text)}
                        keyboardType="phone-pad"
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
                        onPress={handleContinue}
                    >
                        <Text className="text-darker font-cabin-medium">
                            Continuer
                        </Text>
                    </StyledButton>

                    <TouchableOpacity
                        onPress={() => router.replace('/(auth)')}
                        className="mt-5"
                    >
                        <Text className="text-white text-center font-cabin-medium">Retour</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </GradientView>
    );
}