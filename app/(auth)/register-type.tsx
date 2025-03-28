import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientView } from "@/components/ui/GradientView";
import StyledButton from "@/components/ui/StyledButton";

export default function RegisterTypeScreen() {
    const router = useRouter();

    return (
        <GradientView>
            <View className="flex-1 justify-center p-5">
                <Text className="text-2xl font-cabin-bold mb-8 text-center text-white">
                    Êtes-vous un particulier ou un professionnel ?
                </Text>

                <StyledButton
                    variant="primary"
                    shadow={false}
                    onPress={() => router.push('/(auth)/register-individual')}
                    className="mb-4"
                >
                    <Text className="text-darker font-cabin-medium text-lg">Particulier</Text>
                </StyledButton>

                <StyledButton
                    variant="primary"
                    shadow={false}
                    onPress={() => router.push('/(auth)/register-professional')}
                >
                    <Text className="text-darker font-cabin-medium text-lg">Professionnel</Text>
                </StyledButton>

                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-5"
                >
                    <Text className="text-white text-center font-cabin-medium">Retour</Text>
                </TouchableOpacity>
            </View>
        </GradientView>
    );
}