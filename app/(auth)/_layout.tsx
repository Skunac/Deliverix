import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import {useAuth} from "@/contexts/authContext";
import {DeliveryAgentRegistrationProvider} from "@/contexts/deliveryAgentRegistrationContext";

export default function AuthLayout() {
    const { user, loading, registrationStatus } = useAuth();
    const router = useRouter();

    // Redirect if already authenticated and registration is complete
    useEffect(() => {
        if (loading) return;

        if (user) {
            if (registrationStatus.isCompleted) {
                // Fully registered user - redirect to tabs
                router.replace('/(tabs)');
            } else if (registrationStatus.userType === 'delivery') {
                // Redirect to the appropriate registration step
                if (registrationStatus.currentStep === 1) {
                    router.replace('/(auth)/register-delivery-agent-step1');
                } else if (registrationStatus.currentStep === 2) {
                    router.replace('/(auth)/register-delivery-agent-step2');
                }
            }
        }
    }, [user, loading, registrationStatus, router]);

    return(
        <DeliveryAgentRegistrationProvider>
            <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
        </DeliveryAgentRegistrationProvider>
    );
}