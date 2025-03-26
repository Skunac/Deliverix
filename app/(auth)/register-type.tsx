import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientView } from "@/components/ui/GradientView";

export default function RegisterTypeScreen() {
    const router = useRouter();

    return (
        <GradientView>
            <View className="flex-1 justify-center p-5">
                <Text className="text-2xl font-bold mb-8 text-center text-white">
                    Êtes-vous un particulier ou un professionnel ?
                </Text>

                <TouchableOpacity
                    className="bg-primary p-4 rounded-md items-center mb-4"
                    onPress={() => router.push('/(auth)/register-individual')}
                >
                    <Text className="text-darker font-bold text-lg">Particulier</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="bg-primary p-4 rounded-md items-center"
                    onPress={() => router.push('/(auth)/register-professional')}
                >
                    <Text className="text-darker font-bold text-lg">Professionnel</Text>
                </TouchableOpacity>
            </View>
        </GradientView>
    );
}