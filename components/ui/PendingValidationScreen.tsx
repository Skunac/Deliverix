import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { GradientView } from '@/components/ui/GradientView';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/authContext';
import { ProfessionalUser } from '@/src/models/user.model';

export default function PendingValidationScreen() {
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
                <View className="w-24 h-24 rounded-full bg-yellow-500/20 items-center justify-center mb-6 self-center">
                    <Ionicons name="time-outline" size={48} color="#EAB308" />
                </View>

                {/* Title */}
                <Text className="text-white text-2xl font-cabin-bold text-center mb-4">
                    Profil livreur en cours de validation
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
                    Votre profil de livreur professionnel est actuellement en cours de validation par notre équipe.
                    Cette étape nous permet de vérifier vos documents et garantir la sécurité de notre plateforme
                    de livraison.
                </Text>

                {/* What happens next */}
                <View className="bg-dark p-4 rounded-xl mb-8 w-full">
                    <Text className="text-white font-cabin-medium text-base mb-3">
                        Prochaines étapes :
                    </Text>

                    <View className="flex-row items-start mb-2">
                        <View className="w-2 h-2 rounded-full bg-primary mt-2 mr-3" />
                        <Text className="text-gray-300 font-cabin flex-1">
                            Vérification de vos documents justificatifs
                        </Text>
                    </View>

                    <View className="flex-row items-start mb-2">
                        <View className="w-2 h-2 rounded-full bg-primary mt-2 mr-3" />
                        <Text className="text-gray-300 font-cabin flex-1">
                            Validation de votre assurance professionnelle
                        </Text>
                    </View>

                    <View className="flex-row items-start mb-2">
                        <View className="w-2 h-2 rounded-full bg-primary mt-2 mr-3" />
                        <Text className="text-gray-300 font-cabin flex-1">
                            Vous recevrez un email de confirmation une fois validé
                        </Text>
                    </View>

                    <View className="flex-row items-start">
                        <View className="w-2 h-2 rounded-full bg-primary mt-2 mr-3" />
                        <Text className="text-gray-300 font-cabin flex-1">
                            Accès complet aux livraisons après validation
                        </Text>
                    </View>
                </View>

                {/* Contact Support */}
                <View className="bg-blue-500/20 p-4 rounded-lg mb-6 w-full">
                    <View className="flex-row items-start">
                        <Ionicons name="information-circle" size={24} color="#3B82F6" className="mr-3 mt-1" />
                        <View className="flex-1">
                            <Text className="text-blue-400 font-cabin-medium mb-1">
                                Questions sur votre validation ?
                            </Text>
                            <Text className="text-blue-200 font-cabin text-sm">
                                Contactez notre équipe livreurs à livreurs@primex.com pour toute question
                                concernant votre validation ou vos documents.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Estimated Time */}
                <Text className="text-gray-400 text-sm font-cabin text-center mb-8">
                    Délai habituel de validation : 24-48 heures ouvrées
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
            </ScrollView>
        </GradientView>
    );
}