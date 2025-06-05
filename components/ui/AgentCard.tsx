import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeliveryAgent } from '@/src/models/delivery-agent.model';
import {useTranslation} from "react-i18next";

interface AgentCardProps {
    agent: DeliveryAgent | null;
}

const AgentCard = ({ agent }: AgentCardProps) => {
    const [imageError, setImageError] = useState(false);
    const { t } = useTranslation();

    // Testing with a simple public image
    const testImageUrl = 'https://reactnative.dev/img/tiny_logo.png';

    console.log("AgentCard Props:", agent?.personalInfo.photoUrl);

    if (!agent) {
        return (
            <View className="rounded-xl p-4 my-2 items-center justify-center">
                <Ionicons name="person-outline" size={40} color="#ffffff80" />
                <Text className="text-white opacity-60 italic font-cabin mt-2">Aucun livreur assigné</Text>
            </View>
        );
    }

    return (
        <View className="rounded-xl p-4 my-2">
            <View className="flex-row">
                {/* Profile Image */}
                <View className="mr-4">
                    {!imageError ? (
                        <Image
                            source={{
                                uri: agent.personalInfo.photoUrl || testImageUrl,
                            }}
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                backgroundColor: '#1e293b'
                            }}
                            onError={(e) => {
                                console.log("Image error:", e.nativeEvent.error);
                                setImageError(true);
                            }}
                        />
                    ) : (
                        <View className="w-16 h-16 rounded-full bg-slate-700 items-center justify-center">
                            <Ionicons name="person" size={32} color="#ffffff80" />
                        </View>
                    )}
                </View>

                {/* Agent Info */}
                <View className="flex-1 justify-center">
                    <Text className="text-white font-cabin-semibold text-lg">{`${agent.personalInfo.firstName} ${agent.personalInfo.lastName}`}</Text>

                    {/* Vehicle Info */}
                    <View className="flex-row items-center mt-1">
                        <Ionicons name="car-outline" size={16} color="#ffffff" />
                        <Text className="ml-1 text-white capitalize font-cabin">{t(`delivery.vehicleType.${agent.vehicleInfo.type}`)}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default AgentCard;