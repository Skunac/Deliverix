import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import { useState } from "react";
import { testCollection } from "@/services/firebase/firestore";
import { useAuth } from "@/contexts/authContext";
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
    const { user } = useAuth();
    const [testData, setTestData] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const addTestDocument = async () => {
        try {
            const docId = await testCollection.add("Hello from React Native!");
            setTestData('Document written with ID: ' + docId);
            setError(null);
        } catch (e) {
            setError('Error adding document: ' + (e as Error).message);
        }
    };

    const fetchTestData = async () => {
        try {
            const doc = await testCollection.getLatest();

            if (doc) {
                setTestData(`Latest message: ${doc.message}`);
            } else {
                setTestData('No documents found');
            }
            setError(null);
        } catch (e) {
            setError('Error fetching data: ' + (e as Error).message);
        }
    };

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white p-6 shadow-sm">
                <Text className="text-3xl font-bold">Welcome!</Text>
                <Text className="text-gray-500 mt-1">Firebase Demo App</Text>
            </View>

            {/* Auth Status Card */}
            <View className="m-4 p-4 bg-white rounded-xl shadow-sm">
                <View className="flex-row items-center mb-4">
                    <Ionicons name="person-circle" size={24} color="#3b82f6" />
                    <Text className="text-lg font-bold ml-2">Account Status</Text>
                </View>

                {user ? (
                    <View className="bg-green-50 p-3 rounded-lg">
                        <Text className="text-green-700 font-medium">
                            Logged in as: {user.email}
                        </Text>
                        <Text className="text-green-600 text-sm mt-1">
                            User ID: {user.uid.substring(0, 8)}...
                        </Text>
                    </View>
                ) : (
                    <View className="bg-yellow-50 p-3 rounded-lg">
                        <Text className="text-yellow-700 font-medium">
                            Not logged in
                        </Text>
                        <Text className="text-yellow-600 text-sm mt-1">
                            Use the Firebase Test tab to sign in
                        </Text>
                    </View>
                )}
            </View>

            {/* Firestore Test Card */}
            <View className="m-4 p-4 bg-white rounded-xl shadow-sm">
                <View className="flex-row items-center mb-4">
                    <Ionicons name="cloud" size={24} color="#3b82f6" />
                    <Text className="text-lg font-bold ml-2">Firestore Test</Text>
                </View>

                <View className="flex-row justify-between mb-4">
                    <TouchableOpacity
                        className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
                        onPress={addTestDocument}
                    >
                        <Ionicons name="add-circle-outline" size={18} color="white" />
                        <Text className="text-white font-medium ml-1">Add Document</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-purple-500 px-4 py-2 rounded-lg flex-row items-center"
                        onPress={fetchTestData}
                    >
                        <Ionicons name="download-outline" size={18} color="white" />
                        <Text className="text-white font-medium ml-1">Fetch Latest</Text>
                    </TouchableOpacity>
                </View>

                {testData && (
                    <View className="bg-blue-50 p-3 rounded-lg">
                        <Text className="text-blue-700">{testData}</Text>
                    </View>
                )}

                {error && (
                    <View className="bg-red-50 p-3 rounded-lg mt-2">
                        <Text className="text-red-700">{error}</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}