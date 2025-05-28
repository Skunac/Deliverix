import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useAuth } from "@/contexts/authContext";
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import UserProfileInfo from "@/components/ui/UserProfileInfo";
import {GradientView} from "@/components/ui/GradientView";
import EditProfileScreen from "@/components/ui/EditProfileScreen";

type IconName =
    | 'person-outline'
    | 'location-outline'
    | 'settings-outline'
    | 'help-circle-outline'
    | 'mail-outline'
    | 'information-circle-outline'
    | 'document-text-outline'
    | 'chevron-forward'
    | 'create-outline';

interface MenuItem {
    id: string;
    title: string;
    icon: IconName;
    onPress?: () => void;
}

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [showEditModal, setShowEditModal] = useState(false);

    console.log("ProfileScreen rendered, user:", user?.id || "not logged in");

    // Menu items configuration with navigation
    const menuItems: MenuItem[] = [
        {
            id: 'edit-profile',
            title: 'Modifier mon profil',
            icon: 'create-outline',
            onPress: () => setShowEditModal(true)
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

    const handleMenuItemPress = (item: MenuItem) => {
        if (item.onPress) {
            item.onPress();
        } else {
            // Placeholder for other menu items
            console.log(`Menu item pressed: ${item.id}`);
        }
    };

    return (
        <GradientView>
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={true}
            >
                {/* User Profile Info Component */}
                <UserProfileInfo user={user} />

                {/* Menu Categories */}
                {user && (
                    <View className="mt-6 mx-4 mb-6">
                        {menuItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                className="flex-row items-center mb-3 p-4 bg-dark rounded-xl shadow-sm"
                                onPress={() => handleMenuItemPress(item)}
                            >
                                <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-4">
                                    <Ionicons name={item.icon} size={22} color="#5DD6FF" />
                                </View>
                                <Text className="text-base text-white font-cabin-medium flex-1">{item.title}</Text>
                                <Ionicons name="chevron-forward" size={20} color="#9EAEB4" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Sign Out Button */}
                {user && (
                    <View className="items-center my-3">
                        <TouchableOpacity
                            className="px-4 py-2 bg-red-600 rounded-full"
                            onPress={signOut}
                        >
                            <Text className="text-white font-cabin-medium">Déconnexion</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* App Version */}
                <View className="items-center mb-6">
                    <Text className="text-secondary font-cabin">Version 1.0.0</Text>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowEditModal(false)}
            >
                <EditProfileScreen onClose={() => setShowEditModal(false)} />
            </Modal>
        </GradientView>
    );
}