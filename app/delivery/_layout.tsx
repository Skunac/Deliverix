import { Stack } from 'expo-router';

export default function DeliveryLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#0F2026',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: '600',
                    fontFamily: 'Cabin',
                },
            }}
        />
    );
}