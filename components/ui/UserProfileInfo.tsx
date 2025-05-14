import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@/src/models/user.model';

interface UserProfileInfoProps {
    user: User | null;
}

const UserProfileInfo = ({ user }: UserProfileInfoProps) => {
    if (!user) {
        return (
            <View className="items-center pt-6 pb-4">
                <Text className="text-2xl font-cabin-bold text-white">
                    Non connecté
                </Text>
            </View>
        );
    }

    // Common user information that appears for all user types
    const renderCommonInfo = () => (
        <>
            <Text className="text-white font-cabin mb-2">{user.email || "Email non disponible"}</Text>
            <Text className="text-white font-cabin mb-1">{user.phoneNumber || "Téléphone non renseigné"}</Text>

            {user.billingAddress && (
                <Text className="text-white font-cabin mb-3 text-center mx-4">
                    {user.billingAddress.formattedAddress}
                </Text>
            )}
        </>
    );

    // Render individual user specific information
    const renderIndividualInfo = () => {
        const individualUser = user as any;
        return (
            <>
                <Text className="text-2xl font-cabin-bold text-white">
                    {individualUser.firstName} {individualUser.lastName}
                </Text>
                {renderCommonInfo()}
            </>
        );
    };

    // Render professional user specific information
    const renderProfessionalInfo = () => {
        const professionalUser = user as any;
        return (
            <>
                <Text className="text-2xl font-cabin-bold text-white">
                    {professionalUser.companyName}
                </Text>
                <Text className="text-xl font-cabin-medium text-white mb-1">
                    Contact: {professionalUser.contactName}
                </Text>
                {renderCommonInfo()}
            </>
        );
    };

    return (
        <View className="items-center pt-6 pb-4">
            {/* Render different user information based on user type */}
            {user.userType === 'individual' && renderIndividualInfo()}
            {user.userType === 'professional' && renderProfessionalInfo()}
        </View>
    );
};

export default UserProfileInfo;