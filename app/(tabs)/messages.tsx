import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {useAuthContext} from "@/contexts/authContext";

export default function MessagesScreen() {
    const { user } = useAuthContext();
    const { t } = useTranslation();

    console.log("MessagesScreen rendered, user:", user?.id || "not logged in");

    if (!user) {
        return (
            <View className="flex-1 justify-center items-center p-4 bg-gray-50">
                <Text className="text-lg text-gray-600 text-center">
                    {t('messages.signInRequired')}
                </Text>
                <TouchableOpacity
                    className="mt-6 px-6 py-2 bg-blue-500 rounded-full"
                    onPress={() => router.push('/(tabs)/firebase-test')}
                >
                    <Text className="text-white font-medium">{t('common.signIn')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white p-4">
            <Text className="text-xl font-bold mb-4">{t('messages.title')}</Text>
            <View className="bg-gray-100 p-4 rounded-lg">
                <Text className="text-gray-500">
                    {t('messages.placeholder')}
                </Text>
            </View>
        </View>
    );
}