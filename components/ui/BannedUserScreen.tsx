import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { GradientView } from '@/components/ui/GradientView';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/authContext';
import { ProfessionalUser } from '@/src/models/user.model';

export default function BannedUserScreen() {
    const { user, signOut } = useAuth();

    return (
        <GradientView>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: 'center',
                    padding: 24
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Status Icon */}
                <View className="w-24 h-24 rounded-full bg-red-500/20 items-center justify-center mb-6 self-center">
                    <Ionicons name="ban-outline" size={48} color="#EF4444" />
                </View>

                {/* Title */}
                <Text className="text-white text-2xl font-cabin-bold text-center mb-4">
                    Compte suspendu
                </Text>

                {/* User Name */}
                <Text className="text-white text-lg font-cabin-medium text-center mb-6">
                    {user?.userType === 'individual'
                        ? `${(user as any)?.firstName} ${(user as any)?.lastName}`
                        : (user as ProfessionalUser)?.companyName
                    }
                </Text>

                {/* Description */}
                <Text className="text-gray-300 text-base font-cabin text-center mb-8 leading-6">
                    Votre compte a été suspendu et vous ne pouvez plus accéder aux services de
                    notre plateforme. Cette mesure a été prise suite à une violation de nos
                    conditions d'utilisation ou de nos politiques de sécurité.
                </Text>

                {/* Reasons */}
                <View className="bg-dark p-4 rounded-xl mb-8 w-full">
                    <Text className="text-white font-cabin-medium text-base mb-3">
                        Raisons possibles de suspension :
                    </Text>

                    <View className="flex-row items-start mb-2">
                        <View className="w-2 h-2 rounded-full bg-red-500 mt-2 mr-3" />
                        <Text className="text-gray-300 font-cabin flex-1">
                            Violation des conditions d'utilisation
                        </Text>
                    </View>

                    <View className="flex-row items-start mb-2">
                        <View className="w-2 h-2 rounded-full bg-red-500 mt-2 mr-3" />
                        <Text className="text-gray-300 font-cabin flex-1">
                            Activité frauduleuse ou suspecte
                        </Text>
                    </View>

                    <View className="flex-row items-start mb-2">
                        <View className="w-2 h-2 rounded-full bg-red-500 mt-2 mr-3" />
                        <Text className="text-gray-300 font-cabin flex-1">
                            Comportement inapproprié envers d'autres utilisateurs
                        </Text>
                    </View>

                    <View className="flex-row items-start">
                        <View className="w-2 h-2 rounded-full bg-red-500 mt-2 mr-3" />
                        <Text className="text-gray-300 font-cabin flex-1">
                            Non-respect des politiques de livraison
                        </Text>
                    </View>
                </View>

                {/* Appeal Section */}
                <View className="bg-blue-500/20 p-4 rounded-lg mb-6 w-full">
                    <View className="flex-row items-start">
                        <Ionicons name="mail-outline" size={24} color="#3B82F6" className="mr-3 mt-1" />
                        <View className="flex-1">
                            <Text className="text-blue-400 font-cabin-medium mb-1">
                                Contester cette décision ?
                            </Text>
                            <Text className="text-blue-200 font-cabin text-sm mb-3">
                                Si vous pensez que cette suspension est une erreur ou si vous souhaitez
                                faire appel de cette décision, contactez notre équipe support.
                            </Text>
                            <Text className="text-blue-200 font-cabin text-sm font-medium">
                                📧 support@primex.com
                            </Text>
                            <Text className="text-blue-200 font-cabin text-sm">
                                Incluez votre ID utilisateur et les détails de votre situation.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Warning Message */}
                <View className="bg-red-500/20 p-4 rounded-lg mb-6 w-full">
                    <View className="flex-row items-start">
                        <Ionicons name="warning" size={20} color="#EF4444" className="mr-3 mt-1" />
                        <View className="flex-1">
                            <Text className="text-red-400 font-cabin-medium mb-1">
                                Important
                            </Text>
                            <Text className="text-red-200 font-cabin text-sm">
                                Toute tentative de création d'un nouveau compte pour contourner
                                cette suspension pourrait entraîner une interdiction permanente.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* User ID for reference */}
                <Text className="text-gray-400 text-sm font-cabin text-center mb-8">
                    ID utilisateur : {user?.id || user?.uid || 'Non disponible'}
                </Text>

                {/* Sign Out Button */}
                <View className="items-center">
                    <TouchableOpacity
                        onPress={signOut}
                        className="flex-row items-center bg-gray-700 px-6 py-3 rounded-lg"
                    >
                        <Ionicons name="log-out-outline" size={20} color="white" className="mr-2" />
                        <Text className="text-white font-cabin-medium">
                            Se déconnecter
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text className="text-gray-500 text-xs font-cabin text-center mt-8">
                    Cette suspension est effective immédiatement et reste en vigueur
                    jusqu'à nouvel ordre de notre équipe.
                </Text>
            </ScrollView>
        </GradientView>
    );
}