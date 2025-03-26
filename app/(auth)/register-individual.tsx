import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from "@/contexts/authContext";
import { GradientView } from "@/components/ui/GradientView";

export default function RegisterIndividualScreen() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const { signUpIndividual, error } = useAuth();
    const router = useRouter();

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
            return;
        }

        if (!firstName || !lastName || !email || !password) {
            Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
            return;
        }

        try {
            setIsRegistering(true);
            const success = await signUpIndividual(email, password, firstName, lastName, phone);

            if (success) {
                console.log('Registration successful, user should be redirected automatically');
                // The navigation is handled by the RootLayoutNav component
                // since it observes the auth state changes
            } else if (error) {
                Alert.alert('Erreur d\'inscription', error.message);
            }
        } catch (error) {
            console.error('Registration failed:', error);
            Alert.alert('Erreur d\'inscription', 'Une erreur est survenue lors de l\'inscription');
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <GradientView>
            <ScrollView contentContainerClassName="flex-grow">
                <View className="flex-1 justify-center p-5">
                    <Text className="text-2xl font-bold mb-5 text-center text-white">
                        Inscription Particulier
                    </Text>

                    <TextInput
                        className="border border-gray-300 bg-white p-3 rounded-md mb-4"
                        placeholder="Prénom"
                        value={firstName}
                        onChangeText={setFirstName}
                    />

                    <TextInput
                        className="border border-gray-300 bg-white p-3 rounded-md mb-4"
                        placeholder="Nom"
                        value={lastName}
                        onChangeText={setLastName}
                    />

                    <TextInput
                        className="border border-gray-300 bg-white p-3 rounded-md mb-4"
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <TextInput
                        className="border border-gray-300 bg-white p-3 rounded-md mb-4"
                        placeholder="Téléphone"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />

                    <TextInput
                        className="border border-gray-300 bg-white p-3 rounded-md mb-4"
                        placeholder="Mot de passe"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TextInput
                        className="border border-gray-300 bg-white p-3 rounded-md mb-6"
                        placeholder="Confirmer le mot de passe"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        className="bg-primary p-4 rounded-md items-center"
                        onPress={handleRegister}
                        disabled={isRegistering}
                    >
                        <Text className="text-white font-bold">
                            {isRegistering ? 'Inscription en cours...' : 'S\'inscrire'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mt-5"
                        disabled={isRegistering}
                    >
                        <Text className="text-white text-center">Retour</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </GradientView>
    );
}