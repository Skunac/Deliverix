import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/authContext';
import { router } from 'expo-router';

// Define types for the auth context
interface User {
    uid: string;
    // Add other user properties as needed
}

interface AuthContext {
    user: User | null;
    logout: () => void;
}

// Define type for SettingItem props
interface SettingItemProps {
    title: string;
    description?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}

export default function SettingsScreen() {
    const { user, logout } = useAuth() as AuthContext;

    console.log("SettingsScreen rendered, user:", user?.uid || "not logged in");

    // Settings state
    const [darkMode, setDarkMode] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<boolean>(true);

    const SettingItem: React.FC<SettingItemProps> = ({ title, description, value, onValueChange }) => (
        <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
            <View className="flex-1">
                <Text className="font-medium text-base">{title}</Text>
                {description && <Text className="text-gray-500 text-sm">{description}</Text>}
            </View>

            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                thumbColor={value ? '#3b82f6' : '#f4f4f5'}
            />
        </View>
    );

    if (!user) {
        return (
            <View className="flex-1 justify-center items-center p-4 bg-gray-50">
                <Text className="text-lg text-gray-600 text-center">
                    Please sign in to access settings
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
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-4 pt-6 bg-white">
                <Text className="text-2xl font-bold mb-2">Settings</Text>
                <Text className="text-gray-500">Customize your app experience</Text>
            </View>

            {/* Appearance Section */}
            <View className="mt-6 mx-4 bg-white rounded-xl">
                <View className="p-4 border-b border-gray-100">
                    <Text className="text-lg font-semibold">Appearance</Text>
                </View>

                <View className="px-4">
                    <SettingItem
                        title="Dark Mode"
                        description="Use dark theme throughout the app"
                        value={darkMode}
                        onValueChange={setDarkMode}
                    />
                </View>
            </View>

            {/* Notifications Section */}
            <View className="mt-6 mx-4 bg-white rounded-xl">
                <View className="p-4 border-b border-gray-100">
                    <Text className="text-lg font-semibold">Notifications</Text>
                </View>

                <View className="px-4">
                    <SettingItem
                        title="Push Notifications"
                        description="Receive push notifications"
                        value={notifications}
                        onValueChange={setNotifications}
                    />
                </View>
            </View>

            {/* Account Section */}
            <View className="mt-6 mx-4 bg-white rounded-xl mb-10">
                <View className="p-4 border-b border-gray-100">
                    <Text className="text-lg font-semibold">Account</Text>
                </View>

                <View className="p-4">
                    <TouchableOpacity
                        className="py-4 mb-2"
                        onPress={() => {
                            console.log("Change password pressed");
                        }}
                    >
                        <Text className="text-blue-500 font-medium">Change Password</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="py-4 mb-2"
                        onPress={() => {
                            console.log("Sign out pressed");
                            logout();
                        }}
                    >
                        <Text className="text-blue-500 font-medium">Sign Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="py-4"
                        onPress={() => {
                            console.log("Delete account pressed");
                        }}
                    >
                        <Text className="text-red-500 font-medium">Delete Account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}