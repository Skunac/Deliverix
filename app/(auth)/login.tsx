import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { GradientView } from "@/components/ui/GradientView";
import { useAuth } from "@/contexts/authContext";

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { signIn } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        try {
            setError('');
            await signIn(email, password);
            // Redirection will happen automatically via the RootLayoutNav
        } catch (error) {
            console.error('Login failed:', error);
            setError('Email ou mot de passe incorrect');
        }
    };

    return (
        <GradientView>
            <View className="flex-1 justify-center p-5">
                <Text className="text-2xl font-bold mb-5 text-center text-white">Connexion</Text>

                {error ? (
                    <Text className="text-red-500 bg-white/20 p-2 rounded-md mb-4 text-center">
                        {error}
                    </Text>
                ) : null}

                <TextInput
                    className="border border-gray-300 bg-white p-3 rounded-md mb-4"
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput
                    className="border border-gray-300 bg-white p-3 rounded-md mb-5"
                    placeholder="Mot de passe"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    className="bg-primary p-4 rounded-md items-center mb-4"
                    onPress={handleLogin}
                >
                    <Text className="text-white font-bold">Se connecter</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                    <Text className="text-white text-center mb-5">Mot de passe oublié ?</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/(auth)')}>
                    <Text className="text-white text-center">Retour</Text>
                </TouchableOpacity>
            </View>
        </GradientView>
    );
}