import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from "@/hooks/useAuth";
import { GradientView } from "@/components/ui/GradientView";

export default function RegisterProfessionalScreen() {
    const [companyName, setCompanyName] = useState('');
    const [contactName, setContactName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [siret, setSiret] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const { signUpProfessional } = useAuth();
    const router = useRouter();

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            console.error('Passwords do not match');
            return;
        }

        try {
            await signUpProfessional(email, password, companyName, contactName, phone, siret);
        } catch (error) {
            console.error('Registration failed:', error);
        }
    };

    return (
        <GradientView>
            <ScrollView contentContainerClassName="flex-grow">
                <View className="flex-1 justify-center p-5">
                    <Text className="text-2xl font-bold mb-5 text-center text-white">
                        Inscription Professionnel
                    </Text>

                    <TextInput
                        className="border border-gray-300 bg-white p-3 rounded-md mb-4"
                        placeholder="Nom de l'entreprise"
                        value={companyName}
                        onChangeText={setCompanyName}
                    />

                    <TextInput
                        className="border border-gray-300 bg-white p-3 rounded-md mb-4"
                        placeholder="Nom du contact"
                        value={contactName}
                        onChangeText={setContactName}
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
                        placeholder="Numéro SIRET"
                        value={siret}
                        onChangeText={setSiret}
                        keyboardType="number-pad"
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
                    >
                        <Text className="text-white font-bold">S'inscrire</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mt-5"
                    >
                        <Text className="text-white text-center">Retour</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </GradientView>
    );
}