import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientView } from "@/components/ui/GradientView";

export default function AuthHomeScreen() {
    const router = useRouter();

    return (
        <GradientView>
            <View className="flex-1 justify-center p-5">
                <View className="items-center mb-12">
                    <Text className="text-3xl font-bold text-white">RapidRoyal</Text>
                </View>

                <TouchableOpacity
                    className="bg-primary p-4 rounded-md items-center mb-4"
                    onPress={() => router.push('/register-type')}
                >
                    <Text className="text-darker text-lg">Je crée un compte</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/(auth)/login')}
                >
                    <Text className="text-white text-center mt-3 mb-8">Déjà un compte ? Se connecter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="border border-white p-4 rounded-md items-center"
                    onPress={() => router.push('/(auth)/register-delivery-agent')}
                >
                    <Text className="text-white font-bold">Je suis livreur, je souhaite créer mon compte</Text>
                </TouchableOpacity>
            </View>
        </GradientView>
    );
}