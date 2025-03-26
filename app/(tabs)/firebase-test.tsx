import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/contexts/authContext';
import { DeliveryService } from '@/src/services/delivery.service';
import { DeliveryAgentService } from '@/src/services/delivery-agent.service';
import { EmbeddedAddress } from '@/src/models/delivery.model';
import firestore from '@react-native-firebase/firestore';

// Initialize services
const deliveryService = new DeliveryService();
const deliveryAgentService = new DeliveryAgentService();

export default function DeliveryTestPage() {
    // Translation hook
    const { t } = useTranslation();

    // Auth state
    const { user, loading: authLoading } = useAuthContext();

    // State
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [agentProfile, setAgentProfile] = useState<any>(null);

    // Form states for delivery
    const [pickupAddress, setPickupAddress] = useState<string>('123 Pickup St, City');
    const [deliveryAddress, setDeliveryAddress] = useState<string>('456 Delivery Ave, City');
    const [packageDescription, setPackageDescription] = useState<string>('Test Package');
    const [packageWeight, setPackageWeight] = useState<string>('2.5');
    const [packageCategory, setPackageCategory] = useState<string>('electronics');

    // Form states for agent
    const [firstName, setFirstName] = useState<string>('John');
    const [lastName, setLastName] = useState<string>('Driver');
    const [vehicleType, setVehicleType] = useState<string>('car');

    // Clear results
    const clearResults = () => {
        setResult('');
        setError(null);
    };

    // Fetch user deliveries if logged in
    useEffect(() => {
        if (user && user.uid) {
            fetchUserDeliveries();
            checkAgentProfile();
        }
    }, [user]);

    // Fetch user deliveries
    const fetchUserDeliveries = async () => {
        if (!user || !user.uid) {
            setError("User ID is undefined");
            return;
        }

        clearResults();
        setLoading(true);

        try {
            const userDeliveries = await deliveryService.getUserDeliveries(user.uid);
            setDeliveries(userDeliveries);
            setResult(`Found ${userDeliveries.length} deliveries`);
        } catch (err) {
            console.error("Error fetching deliveries:", err);
            setError(`Error fetching deliveries: ${(err as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    // Check if user is a delivery agent
    const checkAgentProfile = async () => {
        if (!user || !user.uid) {
            setError("User ID is undefined");
            return;
        }

        try {
            const agent = await deliveryAgentService.getAgentProfile(user.uid);
            setAgentProfile(agent);
        } catch (err) {
            console.error("Error checking agent profile:", err);
        }
    };

    // Create a delivery
    const createDelivery = async () => {
        if (!user || !user.uid) {
            setError("You must be logged in to create a delivery");
            return;
        }

        clearResults();
        setLoading(true);

        try {
            // Create coordinates for addresses (example)
            const pickupCoordinates = new firestore.GeoPoint(40.7128, -74.0060);
            const deliveryCoordinates = new firestore.GeoPoint(40.7138, -74.0070);

            // Format addresses as EmbeddedAddress
            const pickupAddressData: EmbeddedAddress = {
                placeId: 'pickup-place-id',
                formattedAddress: pickupAddress,
                coordinates: pickupCoordinates,
                components: {}
            };

            const deliveryAddressData: EmbeddedAddress = {
                placeId: 'delivery-place-id',
                formattedAddress: deliveryAddress,
                coordinates: deliveryCoordinates,
                components: {}
            };

            // Schedule for tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Define time slot
            const start = new Date(tomorrow);
            start.setHours(9, 0, 0, 0);

            const end = new Date(tomorrow);
            end.setHours(12, 0, 0, 0);

            // Create delivery data with explicit type
            const deliveryData = {
                expeditorId: user.uid,
                pickupAddress: pickupAddressData,
                deliveryAddress: deliveryAddressData,
                scheduledDate: tomorrow,
                timeSlot: { start, end },
                packageDescription: packageDescription,
                packageWeight: parseFloat(packageWeight),
                packageDimensions: { length: 10, width: 10, height: 5 },
                packageCategory: packageCategory,
                expeditorComments: "Handle with care",
                price: 25.99
            };

            const deliveryId = await deliveryService.createDelivery(deliveryData);
            setResult(`Delivery created with ID: ${deliveryId}`);

            // Refresh deliveries list
            fetchUserDeliveries();
        } catch (err) {
            console.error("Error creating delivery:", err);
            setError(`Error creating delivery: ${(err as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    // Register as delivery agent
    const registerAsAgent = async () => {
        if (!user || !user.uid) {
            setError("You must be logged in to register as an agent");
            return;
        }

        clearResults();
        setLoading(true);

        try {
            // Check eligibility
            const isEligible = await deliveryAgentService.isEligibleForAgentRegistration(user.uid);

            if (!isEligible) {
                setError("You are not eligible to register as a delivery agent");
                setLoading(false);
                return;
            }

            // Example weekly availability
            const weeklyAvailability = [
                {
                    dayOfWeek: 1, // Monday
                    startTime: "09:00",
                    endTime: "17:00",
                    isRecurring: true
                },
                {
                    dayOfWeek: 2, // Tuesday
                    startTime: "09:00",
                    endTime: "17:00",
                    isRecurring: true
                }
            ];

            // Register as agent with proper type casting
            await deliveryAgentService.registerAsAgent(user.uid, {
                firstName,
                lastName,
                vehicleType: vehicleType as 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'van' | 'truck' | 'on_foot',
                biography: "Experienced delivery driver",
                serviceAreas: ["downtown", "midtown", "uptown"]
            });

            // Update availability
            await deliveryAgentService.updateWeeklyAvailability(user.uid, weeklyAvailability);

            setResult("Successfully registered as delivery agent");

            // Check agent profile
            checkAgentProfile();
        } catch (err) {
            console.error("Error registering as agent:", err);
            setError(`Error registering as agent: ${(err as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    // Toggle agent status
    const toggleAgentStatus = async () => {
        if (!user || !user.uid || !agentProfile) {
            setError("You must be logged in and be an agent");
            return;
        }

        clearResults();
        setLoading(true);

        try {
            const newStatus = agentProfile.activeStatus === 'available' ? 'offline' : 'available';
            await deliveryAgentService.updateAgentStatus(user.uid, newStatus);

            // Refresh agent profile
            const updatedProfile = await deliveryAgentService.getAgentProfile(user.uid);
            setAgentProfile(updatedProfile);

            setResult(`Agent status updated to: ${newStatus}`);
        } catch (err) {
            console.error("Error updating agent status:", err);
            setError(`Error updating agent status: ${(err as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    // Find nearby deliveries (test function)
    const findNearbyDeliveries = async () => {
        if (!user || !user.uid || !agentProfile) {
            setError("You must be logged in and be a delivery agent");
            return;
        }

        clearResults();
        setLoading(true);

        try {
            // Example location (New York City)
            const location = new firestore.GeoPoint(40.7128, -74.0060);

            // Find deliveries within 10km
            const nearbyDeliveries = await deliveryService.getNearbyDeliveries(location, 10);

            setResult(`Found ${nearbyDeliveries.length} nearby deliveries:\n${JSON.stringify(nearbyDeliveries, null, 2)}`);
        } catch (err) {
            console.error("Error finding nearby deliveries:", err);
            setError(`Error finding nearby deliveries: ${(err as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-gray-50 p-4">
            {/* Auth Status */}
            <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <Text className="text-lg font-bold mb-2">{t('auth.authStatus')}</Text>
                {user ? (
                    <View>
                        <Text className="text-green-600">{t('auth.authenticated')}</Text>
                        <Text>User ID: {user.uid || 'undefined'}</Text>
                        <Text>Email: {user.email}</Text>
                        <Text>Display Name: {user.displayName || t('profile.notSet')}</Text>

                        {agentProfile ? (
                            <View className="mt-2 p-2 bg-blue-50 rounded-md">
                                <Text className="font-semibold">Delivery Agent Profile:</Text>
                                <Text>Name: {agentProfile.firstName} {agentProfile.lastName}</Text>
                                <Text>Status: {agentProfile.activeStatus}</Text>
                                <Text>Vehicle: {agentProfile.vehicleType}</Text>
                                <Text>Rating: {agentProfile.rating || 'N/A'}</Text>
                            </View>
                        ) : (
                            <Text className="mt-2 italic">Not registered as delivery agent</Text>
                        )}
                    </View>
                ) : (
                    <Text className="text-yellow-600">{t('auth.notAuthenticated')}</Text>
                )}
            </View>

            {/* Create Delivery Form */}
            <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <Text className="text-lg font-bold mb-2">Create Delivery</Text>

                <TextInput
                    className="border border-gray-300 rounded-md p-2 mb-2"
                    placeholder="Pickup Address"
                    value={pickupAddress}
                    onChangeText={setPickupAddress}
                />

                <TextInput
                    className="border border-gray-300 rounded-md p-2 mb-2"
                    placeholder="Delivery Address"
                    value={deliveryAddress}
                    onChangeText={setDeliveryAddress}
                />

                <TextInput
                    className="border border-gray-300 rounded-md p-2 mb-2"
                    placeholder="Package Description"
                    value={packageDescription}
                    onChangeText={setPackageDescription}
                />

                <TextInput
                    className="border border-gray-300 rounded-md p-2 mb-2"
                    placeholder="Package Weight (kg)"
                    value={packageWeight}
                    onChangeText={setPackageWeight}
                    keyboardType="numeric"
                />

                <TextInput
                    className="border border-gray-300 rounded-md p-2 mb-4"
                    placeholder="Package Category"
                    value={packageCategory}
                    onChangeText={setPackageCategory}
                />

                <TouchableOpacity
                    className="bg-blue-500 px-4 py-2 rounded-md mb-2"
                    onPress={createDelivery}
                    disabled={loading || authLoading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-center">Create Delivery</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    className="bg-purple-500 px-4 py-2 rounded-md"
                    onPress={fetchUserDeliveries}
                    disabled={loading || authLoading}
                >
                    <Text className="text-white text-center">Fetch My Deliveries</Text>
                </TouchableOpacity>
            </View>

            {/* Delivery Agent Form */}
            <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <Text className="text-lg font-bold mb-2">Delivery Agent</Text>

                {!agentProfile ? (
                    <>
                        <TextInput
                            className="border border-gray-300 rounded-md p-2 mb-2"
                            placeholder="First Name"
                            value={firstName}
                            onChangeText={setFirstName}
                        />

                        <TextInput
                            className="border border-gray-300 rounded-md p-2 mb-2"
                            placeholder="Last Name"
                            value={lastName}
                            onChangeText={setLastName}
                        />

                        <TextInput
                            className="border border-gray-300 rounded-md p-2 mb-4"
                            placeholder="Vehicle Type (car, motorcycle, bicycle, etc.)"
                            value={vehicleType}
                            onChangeText={setVehicleType}
                        />

                        <TouchableOpacity
                            className="bg-green-500 px-4 py-2 rounded-md"
                            onPress={registerAsAgent}
                            disabled={loading || authLoading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white text-center">Register as Delivery Agent</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TouchableOpacity
                            className="bg-amber-500 px-4 py-2 rounded-md mb-2"
                            onPress={toggleAgentStatus}
                            disabled={loading || authLoading}
                        >
                            <Text className="text-white text-center">
                                Toggle Status ({agentProfile.activeStatus === 'available' ? 'Go Offline' : 'Go Available'})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-indigo-500 px-4 py-2 rounded-md"
                            onPress={findNearbyDeliveries}
                            disabled={loading || authLoading}
                        >
                            <Text className="text-white text-center">Find Nearby Deliveries</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* User Deliveries */}
            {deliveries.length > 0 && (
                <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                    <Text className="text-lg font-bold mb-2">My Deliveries</Text>

                    {deliveries.map((delivery, index) => (
                        <View key={delivery.id} className="mb-2 p-2 bg-gray-50 rounded-md">
                            <Text className="font-semibold">Delivery #{index + 1}</Text>
                            <Text>ID: {delivery.id}</Text>
                            <Text>Status: {delivery.status}</Text>
                            <Text>From: {delivery.pickupAddress.formattedAddress}</Text>
                            <Text>To: {delivery.deliveryAddress.formattedAddress}</Text>
                            <Text>Package: {delivery.packageDescription}</Text>
                            <Text>Price: ${delivery.price.toFixed(2)}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Results */}
            <View className="p-4 bg-white rounded-lg shadow-sm mb-6">
                <Text className="text-lg font-bold mb-2">Results</Text>

                {error && (
                    <View className="mb-4 p-3 bg-red-100 rounded-md">
                        <Text className="text-red-700">{error}</Text>
                    </View>
                )}

                {result && (
                    <View className="p-3 bg-blue-50 rounded-md">
                        <Text className="text-blue-800" selectable>{result}</Text>
                    </View>
                )}
            </View>

            {/* Navigation */}
            <View className="mt-2 items-center mb-8">
                <TouchableOpacity
                    className="bg-gray-200 px-6 py-3 rounded-md"
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text>Back to Home</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}