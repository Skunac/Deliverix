import { View, Text, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { GradientView } from "@/components/ui/GradientView";
import { useAuth } from "@/contexts/authContext";
import StyledButton from "@/components/ui/StyledButton";
import StyledTextInput from "@/components/ui/StyledTextInput";

interface FormData {
    email: string;
    password: string;
}

interface FormErrors {
    email: string;
    password: string;
    auth: string;
}

export default function LoginScreen(): JSX.Element {
    // Form fields
    const [formData, setFormData] = useState<FormData>({
        email: '',
        password: ''
    });

    // Form errors
    const [formErrors, setFormErrors] = useState<FormErrors>({
        email: '',
        password: '',
        auth: '' // For auth-related errors
    });

    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const { signIn, authError, error, resetErrors } = useAuth();
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
        console.log('LoginScreen mounted - resetting errors');
        resetErrors();

        // Cleanup on unmount
        return () => {
            console.log('LoginScreen unmounted - resetting errors');
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
        }

        // Update form errors state
        setFormErrors(prev => ({ ...prev, ...newErrors }));
        return isValid;
    };

    const handleLogin = async (): Promise<void> => {
        if (!validateForm()) {
            return;
        }

        try {
            setIsLoggingIn(true);
            resetErrors();
            setFormErrors(prev => ({ ...prev, auth: '' })); // Clear auth error

            const success = await signIn(formData.email, formData.password);

            if (!success) {
                console.log('Login failed, checking for errors...');
            }
        } catch (error) {
            console.error('Login failed with exception:', error);
            setFormErrors(prev => ({
                ...prev,
                auth: error instanceof Error ? error.message : 'Une erreur de connexion est survenue'
            }));
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <GradientView>
            <View className="flex-1 justify-center p-5">
                <Text className="text-2xl font-cabin-bold mb-5 text-center text-white">Connexion</Text>

                {/* Display auth error if present */}
                {formErrors.auth ? (
                    <View className="bg-red-500/20 p-3 rounded-md mb-4">
                        <Text className="text-white text-center font-cabin-medium">
                            {formErrors.auth}
                        </Text>
                    </View>
                ) : null}

                <StyledTextInput
                    placeholder="Email"
                    value={formData.email}
                    onChangeText={(text) => handleChange('email', text)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    error={formErrors.email}
                />

                <StyledTextInput
                    placeholder="Mot de passe"
                    value={formData.password}
                    onChangeText={(text) => handleChange('password', text)}
                    secureTextEntry
                    error={formErrors.password}
                />

                <StyledButton
                    variant="primary"
                    shadow={true}
                    onPress={handleLogin}
                    disabled={isLoggingIn}
                >
                    <Text className="text-darker font-cabin-medium">
                        {isLoggingIn ? 'Connexion...' : 'Se connecter'}
                    </Text>
                </StyledButton>

                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                    <Text className="text-white text-center mb-5 mt-4 font-cabin-medium">Mot de passe oublié ?</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-white text-center font-cabin-medium">Retour</Text>
                </TouchableOpacity>
            </View>
        </GradientView>
    );
}