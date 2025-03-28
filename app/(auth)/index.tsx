import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientView } from "@/components/ui/GradientView";
import StyledButton from "@/components/ui/StyledButton";

export default function AuthHomeScreen() {
    const router = useRouter();

    return (
        <GradientView>
            <View className="flex-1 justify-center p-5">
                <View className="items-center mb-8">
                    <Text className="text-3xl font-cabin-bold text-white">RapidRoyal</Text>
                </View>

                <StyledButton shadow={true} variant={"primary"} onPress={() => router.push("/(auth)/register-type")}>
                    <Text className={"font-cabin-medium text-xl text-darker"}>Je crée un compte</Text>
                </StyledButton>

                <TouchableOpacity
                    onPress={() => router.push('/(auth)/login')}
                >
                    <Text className={"text-white text-center mt-8 mb-3 font-cabin-medium"}>Déjà un compte ? Se connecter</Text>
                </TouchableOpacity>

                <StyledButton className={"border-white"} variant={"bordered"} onPress={() => router.push('/(auth)/register-delivery-agent')}>
                    <Text className="text-white font-cabin-medium">Je suis livreur, je souhaite créer mon compte</Text>
                </StyledButton>
            </View>
        </GradientView>
    );
}