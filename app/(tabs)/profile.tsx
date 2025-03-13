import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {useAuthContext} from "@/contexts/authContext";

export default function ProfileScreen() {
    const { user, logout } = useAuthContext();
    const { t } = useTranslation();

    console.log("ProfileScreen rendered, user:", user?.id || "not logged in");

    return (
        <View className="flex-1 bg-gray-50">
            <View className="items-center pt-6 pb-4 bg-white">
                <Text className="text-2xl font-bold">
                    {user?.displayName || t('profile.title')}
                </Text>
                <Text className="text-gray-500 mb-2">{user?.email || t('profile.notSignedIn')}</Text>

                {user ? (
                    <TouchableOpacity
                        className="mt-2 px-4 py-2 bg-red-500 rounded-full"
                        onPress={logout}
                    >
                        <Text className="text-white font-medium">{t('common.signOut')}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        className="mt-2 px-4 py-2 bg-blue-500 rounded-full"
                        onPress={() => router.push('/(tabs)/firebase-test')}
                    >
                        <Text className="text-white font-medium">{t('common.signIn')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {user && (
                <View className="mt-6 mx-4 bg-white rounded-xl">
                    <View className="p-4 border-b border-gray-100">
                        <Text className="text-lg font-semibold">{t('profile.profileInformation')}</Text>
                    </View>

                    <View className="p-4">
                        <View className="py-3">
                            <Text className="text-sm text-gray-500">{t('profile.displayName')}</Text>
                            <Text className="text-base">{user?.displayName || t('profile.notSet')}</Text>
                        </View>

                        <View className="py-3">
                            <Text className="text-sm text-gray-500">{t('profile.emailAddress')}</Text>
                            <Text className="text-base">{user?.email || t('profile.notAvailable')}</Text>
                        </View>

                        <View className="py-3">
                            <Text className="text-sm text-gray-500">{t('profile.accountStatus')}</Text>
                            <Text className="text-base">{user?.emailVerified ? t('profile.verified') : t('profile.unverified')}</Text>
                        </View>

                        <View className="py-3">
                            <Text className="text-sm text-gray-500">{t('profile.userId')}</Text>
                            <Text className="text-base">{user?.id || user?.uid || t('profile.notAvailable')}</Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}