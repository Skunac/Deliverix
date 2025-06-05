import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientView } from '@/components/ui/GradientView';
import StyledTextInput from '@/components/ui/StyledTextInput';
import StyledButton from '@/components/ui/StyledButton';

interface RescheduleModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (reason?: string) => void;
    isLoading?: boolean;
    rescheduleCount: number;
    maxReschedules: number;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({
                                                             visible,
                                                             onClose,
                                                             onConfirm,
                                                             isLoading = false,
                                                             rescheduleCount,
                                                             maxReschedules
                                                         }) => {
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        onConfirm(reason.trim() || undefined);
        setReason('');
    };

    const handleClose = () => {
        setReason('');
        onClose();
    };

    const remainingReschedules = maxReschedules - rescheduleCount;
    const isLastReschedule = remainingReschedules === 1;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View className="flex-1 justify-center items-center bg-black/50">
                <View className="bg-dark mx-4 rounded-xl p-6 w-full max-w-sm border border-gray-700">
                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-full bg-yellow-500/20 items-center justify-center mr-3">
                                <Ionicons name="time-outline" size={18} color="#EAB308" />
                            </View>
                            <Text className="text-white text-lg font-cabin-medium">
                                Reporter la livraison
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleClose}
                            className="p-1"
                            disabled={isLoading}
                        >
                            <Ionicons name="close" size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    {/* Warning Message */}
                    <View className={`p-3 rounded-lg mb-4 ${
                        isLastReschedule ? 'bg-red-500/20' : 'bg-yellow-500/20'
                    }`}>
                        <View className="flex-row items-start">
                            <Ionicons
                                name={isLastReschedule ? "warning" : "information-circle"}
                                size={20}
                                color={isLastReschedule ? "#EF4444" : "#EAB308"}
                                className="mr-2 mt-1"
                            />
                            <View className="flex-1">
                                <Text className={`font-cabin-medium text-sm mb-1 ${
                                    isLastReschedule ? 'text-red-400' : 'text-yellow-400'
                                }`}>
                                    {isLastReschedule ? 'Dernier report possible' : 'Attention'}
                                </Text>
                                <Text className={`font-cabin text-sm ${
                                    isLastReschedule ? 'text-red-200' : 'text-yellow-200'
                                }`}>
                                    {isLastReschedule
                                        ? 'Si vous reportez cette livraison, elle sera automatiquement marquée comme échouée.'
                                        : `Il vous reste ${remainingReschedules} report${remainingReschedules > 1 ? 's' : ''} possible${remainingReschedules > 1 ? 's' : ''} avant que la livraison soit marquée comme échouée.`
                                    }
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Reschedule Count Info */}
                    <View className="bg-gray-800/50 p-3 rounded-lg mb-4">
                        <Text className="text-gray-400 font-cabin text-sm">Reports effectués</Text>
                        <Text className="text-white font-cabin-medium">
                            {rescheduleCount} / {maxReschedules}
                        </Text>
                    </View>

                    {/* Reason Input */}
                    <StyledTextInput
                        label="Motif du report (optionnel)"
                        placeholder="Ex: Destinataire absent, adresse incorrecte..."
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={3}
                        darkBackground={true}
                        editable={!isLoading}
                    />

                    {/* Action Buttons */}
                    <View className="flex-row">
                        <TouchableOpacity
                            onPress={handleClose}
                            disabled={isLoading}
                            className="flex-1 mr-2 bg-transparent border border-gray-600 p-3 rounded-lg items-center justify-center"
                            style={{ opacity: isLoading ? 0.5 : 1 }}
                        >
                            <Text className="text-gray-300 font-cabin-medium">Annuler</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleConfirm}
                            disabled={isLoading}
                            className="flex-1 ml-2 bg-yellow-600 p-3 rounded-lg items-center justify-center"
                            style={{ opacity: isLoading ? 0.8 : 1 }}
                        >
                            {isLoading ? (
                                <View className="flex-row items-center">
                                    <ActivityIndicator size="small" color="white" />
                                    <Text className="text-white font-cabin-medium ml-2">
                                        Report...
                                    </Text>
                                </View>
                            ) : (
                                <Text className="text-white font-cabin-medium">
                                    {isLastReschedule ? 'Reporter (échec)' : 'Reporter'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default RescheduleModal;