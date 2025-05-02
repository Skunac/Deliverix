import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from "@/contexts/authContext";
import { Ionicons } from '@expo/vector-icons';
import UserProfileInfo from "@/components/ui/UserProfileInfo";
import {GradientView} from "@/components/ui/GradientView";

type IconName =
    | 'person-outline'
    | 'location-outline'
    | 'settings-outline'
    | 'help-circle-outline'
    | 'mail-outline'
    | 'information-circle-outline'
    | 'document-text-outline'
    | 'chevron-forward';

interface MenuItem {
    id: string;
    title: string;
    icon: IconName;
}

export default function ProfileScreen() {
    const { user, signOut } = useAuth();

    console.log("ProfileScreen rendered, user:", user?.id || "not logged in");

    // Menu items configuration with navigation
    const menuItems: MenuItem[] = [
        {
            id: 'edit-profile',
            title: 'Modifier mon profil',
            icon: 'person-outline'
        },
        {
            id: 'addresses',
            title: 'Voir mes adresses enregistrées',
            icon: 'location-outline'
        },
        {
            id: 'settings',
            title: 'Paramètres',
            icon: 'settings-outline'
        },
        {
            id: 'help',
            title: 'Aide FAQ',
            icon: 'help-circle-outline'
        },
        {
            id: 'contact',
            title: 'Contact',
            icon: 'mail-outline'
        },
        {
            id: 'about',
            title: 'À propos',
            icon: 'information-circle-outline'
        },
        {
            id: 'legal',
            title: 'Mentions légales',
            icon: 'document-text-outline'
        }
    ];

    return (
        <GradientView>
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={true}
            >
                {/* User Profile Info Component */}
                <UserProfileInfo user={user} />

                {/* Sign Out Button */}
                {user && (
                    <View className="items-center mt-3">
                        <TouchableOpacity
                            className="px-4 py-2 bg-dark rounded-full"
                            onPress={signOut}
                        >
                            <Text className="text-white font-cabin-medium">Déconnexion</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Menu Categories */}
                {user && (
                    <View className="mt-6 mx-4 mb-6">
                        {menuItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                className="flex-row items-center mb-3 p-4 bg-white rounded-xl shadow-sm"
                            >
                                <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-4">
                                    <Ionicons name={item.icon} size={22} color="#5DD6FF" />
                                </View>
                                <Text className="text-base text-dark font-cabin-medium flex-1">{item.title}</Text>
                                <Ionicons name="chevron-forward" size={20} color="#9EAEB4" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* App Version */}
                <View className="items-center mb-6">
                    <Text className="text-secondary font-cabin">Version 1.0.0</Text>
                </View>
            </ScrollView>
        </GradientView>
    );
}