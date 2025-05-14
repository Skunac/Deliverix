import { Stack, useRouter } from 'expo-router';
import {DeliveryAgentRegistrationProvider} from "@/contexts/deliveryAgentRegistrationContext";

export default function AuthLayout() {
    return(
        <DeliveryAgentRegistrationProvider>
            <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
        </DeliveryAgentRegistrationProvider>
    );
}