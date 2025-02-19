import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/authContext';
import { router } from 'expo-router';

export default function MessagesScreen() {
    const { user } = useAuth();

    console.log("MessagesScreen rendered, user:", user?.uid || "not logged in");

    if (!user) {
        return (
            <View className="flex-1 justify-center items-center p-4 bg-gray-50">
                <Text className="text-lg text-gray-600 text-center">
                    Please sign in to access your messages
                </Text>
                <TouchableOpacity
                    className="mt-6 px-6 py-2 bg-blue-500 rounded-full"
                    onPress={() => router.push('/(tabs)/firebase-test')}
                >
                    <Text className="text-white font-medium">Sign In</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white p-4">
            <Text className="text-xl font-bold mb-4">Messages</Text>
            <View className="bg-gray-100 p-4 rounded-lg">
                <Text className="text-gray-500">
                    This is a placeholder for the messages screen.
                    Your messages will appear here once implemented.
                </Text>
            </View>
        </View>
    );
}