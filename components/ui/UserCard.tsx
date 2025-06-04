import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User, IndividualUser, ProfessionalUser } from '@/src/models/user.model';
import { formatDate } from '@/utils/formatters/date-formatters';

interface UserCardProps {
    user: User;
    onPress?: () => void;
    onToggleStatus?: (currentIsAllowed: boolean) => void;
    isUpdating?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({
                                               user,
                                               onPress,
                                               onToggleStatus,
                                               isUpdating = false
                                           }) => {
    // Determine if user is active (allowed)
    const isActive = user.isAllowed !== false;

    // Get user display information based on type
    const getUserDisplayInfo = () => {
        if (user.userType === 'individual') {
            const individualUser = user as IndividualUser;
            return {
                primaryName: `${individualUser.firstName} ${individualUser.lastName}`,
                secondaryName: null,
                icon: 'person-outline' as const
            };
        } else {
            const professionalUser = user as ProfessionalUser;
            return {
                primaryName: professionalUser.companyName,
                secondaryName: professionalUser.contactName,
                icon: 'business-outline' as const
            };
        }
    };

    const displayInfo = getUserDisplayInfo();

    // Get status color and text
    const getStatusInfo = () => {
        if (user.isDeliveryAgent) {
            if (isActive) {
                return {
                    color: '#22C55E', // green
                    text: 'Livreur actif',
                    icon: 'bicycle-outline' as const
                };
            } else {
                return {
                    color: '#EAB308', // yellow
                    text: 'En attente validation',
                    icon: 'time-outline' as const
                };
            }
        } else {
            if (isActive) {
                return {
                    color: '#22C55E', // green
                    text: 'Actif',
                    icon: 'checkmark-circle-outline' as const
                };
            } else {
                return {
                    color: '#EF4444', // red
                    text: 'Désactivé',
                    icon: 'close-circle-outline' as const
                };
            }
        }
    };

    const statusInfo = getStatusInfo();

    const renderCardContent = () => (
        <View className="bg-dark p-4 rounded-xl border border-gray-700/50">
            <View className="flex-row items-center justify-between">
                {/* User Info Section */}
                <View className="flex-1 mr-4">
                    {/* User Icon and Primary Name */}
                    <View className="flex-row items-center mb-2">
                        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
                            <Ionicons name={displayInfo.icon} size={20} color="#5DD6FF" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-cabin-medium text-base" numberOfLines={1}>
                                {displayInfo.primaryName}
                            </Text>
                            {displayInfo.secondaryName && (
                                <Text className="text-gray-300 font-cabin text-sm" numberOfLines={1}>
                                    {displayInfo.secondaryName}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* User Details */}
                    <View className="ml-13">
                        <View className="flex-row items-center mb-1">
                            <Ionicons name="mail-outline" size={14} color="#9CA3AF" />
                            <Text className="text-gray-300 font-cabin text-sm ml-2" numberOfLines={1}>
                                {user.email}
                            </Text>
                        </View>

                        {user.phoneNumber && (
                            <View className="flex-row items-center mb-1">
                                <Ionicons name="call-outline" size={14} color="#9CA3AF" />
                                <Text className="text-gray-300 font-cabin text-sm ml-2">
                                    {user.phoneNumber}
                                </Text>
                            </View>
                        )}

                        <View className="flex-row items-center">
                            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                            <Text className="text-gray-300 font-cabin text-sm ml-2">
                                Inscrit {user.createdAt ? formatDate(user.createdAt) : 'Date inconnue'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Status and Actions Section */}
                <View className="items-end">
                    {/* Status Badge */}
                    <View
                        className="px-3 py-1 rounded-full mb-3"
                        style={{ backgroundColor: statusInfo.color + '20' }}
                    >
                        <View className="flex-row items-center">
                            <Ionicons
                                name={statusInfo.icon}
                                size={14}
                                color={statusInfo.color}
                                style={{ marginRight: 4 }}
                            />
                            <Text
                                className="font-cabin-medium text-xs"
                                style={{ color: statusInfo.color }}
                            >
                                {statusInfo.text}
                            </Text>
                        </View>
                    </View>

                    {/* Toggle Status Button (only for non-delivery agents or admin control) */}
                    {onToggleStatus && (
                        <TouchableOpacity
                            onPress={() => onToggleStatus(isActive)}
                            disabled={isUpdating}
                            className={`px-3 py-2 rounded-lg flex-row items-center ${
                                isActive
                                    ? 'bg-red-500/20 border border-red-500/50'
                                    : 'bg-green-500/20 border border-green-500/50'
                            }`}
                        >
                            {isUpdating ? (
                                <Text className="text-gray-300 font-cabin text-xs">
                                    Mise à jour...
                                </Text>
                            ) : (
                                <>
                                    <Ionicons
                                        name={isActive ? 'close-outline' : 'checkmark-outline'}
                                        size={16}
                                        color={isActive ? '#EF4444' : '#22C55E'}
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text
                                        className="font-cabin-medium text-xs"
                                        style={{ color: isActive ? '#EF4444' : '#22C55E' }}
                                    >
                                        {isActive ? 'Désactiver' : 'Activer'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Additional Info for Delivery Agents */}
            {user.isDeliveryAgent && (
                <View className="mt-3 pt-3 border-t border-gray-700">
                    <View className="flex-row items-center">
                        <Ionicons name="information-circle-outline" size={16} color="#5DD6FF" />
                        <Text className="text-primary font-cabin text-sm ml-2">
                            Compte livreur professionnel
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );

    // Make the card clickable if onPress is provided
    if (onPress) {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={onPress}
            >
                {renderCardContent()}
            </TouchableOpacity>
        );
    }

    // Otherwise, render as a static card
    return renderCardContent();
};

export default UserCard;