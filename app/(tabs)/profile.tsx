import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/authContext';
import { router } from 'expo-router';

export default function ProfileScreen() {
    const { user, logout } = useAuth();

    console.log("ProfileScreen rendered, user:", user?.uid || "not logged in");

    return (
        <View className="flex-1 bg-gray-50">
            <View className="items-center pt-6 pb-4 bg-white">
                <Text className="text-2xl font-bold">
                    {user?.displayName || 'User Profile'}
                </Text>
                <Text className="text-gray-500 mb-2">{user?.email || 'Not signed in'}</Text>

                {user ? (
                    <TouchableOpacity
                        className="mt-2 px-4 py-2 bg-red-500 rounded-full"
                        onPress={logout}
                    >
                        <Text className="text-white font-medium">Sign Out</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        className="mt-2 px-4 py-2 bg-blue-500 rounded-full"
                        onPress={() => router.push('/(tabs)/firebase-test')}
                    >
                        <Text className="text-white font-medium">Sign In</Text>
                    </TouchableOpacity>
                )}
            </View>

            {user && (
                <View className="mt-6 mx-4 bg-white rounded-xl">
                    <View className="p-4 border-b border-gray-100">
                        <Text className="text-lg font-semibold">Profile Information</Text>
                    </View>

                    <View className="p-4">
                        <View className="py-3">
                            <Text className="text-sm text-gray-500">Display Name</Text>
                            <Text className="text-base">{user?.displayName || 'Not set'}</Text>
                        </View>

                        <View className="py-3">
                            <Text className="text-sm text-gray-500">Email Address</Text>
                            <Text className="text-base">{user?.email || 'Not available'}</Text>
                        </View>

                        <View className="py-3">
                            <Text className="text-sm text-gray-500">Account Status</Text>
                            <Text className="text-base">{user?.emailVerified ? 'Verified' : 'Unverified'}</Text>
                        </View>

                        <View className="py-3">
                            <Text className="text-sm text-gray-500">User ID</Text>
                            <Text className="text-base">{user?.uid || 'Not available'}</Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}