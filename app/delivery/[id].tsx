import DeliveryDetailsScreen from "@/components/ui/DeliveryDetailsScreen";
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function DeliveryDetailsRoute() {
    const router = useRouter();

    return (
        <>
            <Stack.Screen
                options={{
                    title: "Détails de la course",
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{ marginLeft: 10 }}
                        >
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                    ),
                    presentation: 'modal',
                    animation: 'slide_from_right',
                }}
            />
            <DeliveryDetailsScreen />
        </>
    );
}