import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from "@/hooks/useAuth";
import { GradientView } from "@/components/ui/GradientView";

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [isSent, setIsSent] = useState(false);
    const { resetPassword } = useAuth();
    const router = useRouter();

    const handleResetPassword = async () => {
        try {
            await resetPassword(email);
            setIsSent(true);
            Alert.alert(
                "Email envoyé",
                "Si un compte existe avec cet email, vous recevrez un lien pour réinitialiser votre mot de passe."
            );
        } catch (error) {
            console.error('Password reset failed:', error);
            // Even if it fails, we don't want to inform the user for security reasons
            setIsSent(true);
            Alert.alert(
                "Email envoyé",
                "Si un compte existe avec cet email, vous recevrez un lien pour réinitialiser votre mot de passe."
            );
        }
    };

    return (
        <GradientView>
            <View className="flex-1 justify-center p-5">
                <Text className="text-2xl font-bold mb-5 text-center text-white">
                    Mot de passe oublié
                </Text>

                <Text className="text-white text-center mb-6">
                    Entrez votre adresse email pour recevoir un lien de réinitialisation de mot de passe.
                </Text>

                <TextInput
                    className="border border-gray-300 bg-white p-3 rounded-md mb-5"
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isSent}
                />

                {!isSent ? (
                    <TouchableOpacity
                        className="bg-primary p-4 rounded-md items-center mb-4"
                        onPress={handleResetPassword}
                    >
                        <Text className="text-white font-bold">Envoyer le lien</Text>
                    </TouchableOpacity>
                ) : (
                    <View className="items-center mb-4">
                        <Text className="text-white text-center">
                            Vérifiez votre boîte mail pour le lien de réinitialisation.
                        </Text>
                    </View>
                )}

                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                    <Text className="text-white text-center">Retour à la connexion</Text>
                </TouchableOpacity>
            </View>
        </GradientView>
    );
}