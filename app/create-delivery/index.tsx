import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientView } from '@/components/ui/GradientView';
import StyledTextInput from '@/components/ui/StyledTextInput';
import StyledButton from '@/components/ui/StyledButton';
import { PackageCategory } from '@/src/models/delivery.model';
import { Ionicons } from '@expo/vector-icons';
import {useDeliveryForm} from "@/contexts/DeliveryFormContext";
import {useAuth} from "@/contexts/authContext";
import {useTranslation} from "react-i18next";

const categories: { value: PackageCategory; label: string }[] = [
    { value: 'products', label: 'General Products' },
    { value: 'gift', label: 'Gift' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'expensive', label: 'Expensive' },
    { value: 'sensitive', label: 'Sensitive' },
    { value: 'it_equipment', label: 'IT Equipment' },
    { value: 'urgent_mechanical_parts', label: 'Urgent Mechanical Parts' },
    { value: 'aeronotics', label: 'Aeronautics' },
    { value: 'rare', label: 'Rare Items' },
    { value: 'sentimental_value', label: 'Sentimental Value' },
    { value: 'exceptional', label: 'Exceptional Items' },
];

export default function PackageDetailsScreen() {
    const router = useRouter();
    const { formState, updateFormState, validateStep } = useDeliveryForm();
    const [errors, setErrors] = useState<string[]>([]);
    const user = useAuth();
    const { t } = useTranslation();

    const handleContinue = () => {
        const stepErrors = validateStep(1);
        if (stepErrors.length > 0) {
            setErrors(stepErrors);
            return;
        }

        if (user.user?.uid) {
            formState.creator = user.user?.uid;
        }

        router.push('/create-delivery/step2');
    };

    return (
        <GradientView>
            <ScrollView className="flex-1 p-4">
                <Text className="text-white text-lg font-cabin-medium mb-6">
                    Parlez-nous de votre colis
                </Text>

                {/* Display validation errors if any */}
                {errors.length > 0 && (
                    <View className="bg-red-500/20 p-4 rounded-lg mb-4">
                        {errors.map((error, index) => (
                            <Text key={index} className="text-red-400 font-cabin">
                                • {error}
                            </Text>
                        ))}
                    </View>
                )}

                {/* Package Description */}
                <StyledTextInput
                    label="Description du colis"
                    placeholder="Décrivez votre colis"
                    multiline
                    numberOfLines={3}
                    value={formState.packageDescription}
                    onChangeText={(text) => updateFormState({ packageDescription: text })}
                />

                {/* Package Weight */}
                <StyledTextInput
                    label="Poids du colis (kg)"
                    placeholder="Entrez le poids en kg"
                    keyboardType="numeric"
                    value={formState.packageWeight.toString() || ''}
                    onChangeText={(text) => {
                        const weight = parseFloat(text) || 0;
                        updateFormState({ packageWeight: weight });
                    }}
                />

                {/* Package Dimensions */}
                <Text className="text-white mb-2 font-cabin-medium">Dimensions du colis (cm)</Text>
                <View className="flex-row justify-between mb-4">
                    <View className="flex-1 mr-2">
                        <StyledTextInput
                            placeholder="Longueur"
                            keyboardType="numeric"
                            value={formState.packageDimensions.length.toString() || ''}
                            onChangeText={(text) => {
                                const length = parseFloat(text) || 0;
                                updateFormState({
                                    packageDimensions: {
                                        ...formState.packageDimensions,
                                        length
                                    }
                                });
                            }}
                        />
                    </View>
                    <View className="flex-1 mx-2">
                        <StyledTextInput
                            placeholder="Largeur"
                            keyboardType="numeric"
                            value={formState.packageDimensions.width.toString() || ''}
                            onChangeText={(text) => {
                                const width = parseFloat(text) || 0;
                                updateFormState({
                                    packageDimensions: {
                                        ...formState.packageDimensions,
                                        width
                                    }
                                });
                            }}
                        />
                    </View>
                    <View className="flex-1 ml-2">
                        <StyledTextInput
                            placeholder="Hauteur"
                            keyboardType="numeric"
                            value={formState.packageDimensions.height.toString() || ''}
                            onChangeText={(text) => {
                                const height = parseFloat(text) || 0;
                                updateFormState({
                                    packageDimensions: {
                                        ...formState.packageDimensions,
                                        height
                                    }
                                });
                            }}
                        />
                    </View>
                </View>

                {/* Package Category */}
                <Text className="text-white mb-2 font-cabin-medium">Catégorie du colis</Text>
                <View className="flex-row flex-wrap mb-4">
                    {categories.map((category) => (
                        <Pressable
                            key={category.value}
                            className={`m-1 p-2 rounded-lg ${
                                formState.packageCategory === category.value
                                    ? 'bg-primary'
                                    : 'bg-gray-800'
                            }`}
                            onPress={() => updateFormState({ packageCategory: category.value })}
                        >
                            <Text className="text-white">{t(`delivery.packageCategory.${category.value}`)}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Fragile Switch */}
                <View className="flex-row items-center justify-between mb-6 bg-gray-800 p-4 rounded-lg">
                    <Text className="text-white font-cabin-medium">Le colis est-il fragile ?</Text>
                    <Switch
                        value={formState.isFragile}
                        onValueChange={(value) => updateFormState({ isFragile: value })}
                        trackColor={{ false: '#767577', true: '#2EC3F5' }}
                        thumbColor={formState.isFragile ? '#fff' : '#f4f3f4'}
                    />
                </View>

                {/* Terms Acceptance */}
                <View className="flex-row items-start mb-8">
                    <Pressable
                        onPress={() => updateFormState({ termsAccepted: !formState.termsAccepted })}
                        className="mr-2 mt-1"
                    >
                        <View
                            className={`h-6 w-6 rounded border ${
                                formState.termsAccepted
                                    ? 'bg-primary border-primary'
                                    : 'border-white'
                            } items-center justify-center`}
                        >
                            {formState.termsAccepted && (
                                <Ionicons name="checkmark" size={16} color="white" />
                            )}
                        </View>
                    </Pressable>
                    <Text className="text-white flex-1">
                        Je m'engage à ne pas expédier de substances illégales, de drogues, ou tout autre produit interdit par la loi.
                    </Text>
                </View>

                {/* Continue Button */}
                <StyledButton
                    variant="primary"
                    shadow
                    className="mb-4"
                    onPress={handleContinue}
                >
                    <Text className="text-white font-cabin-medium">Continuer</Text>
                </StyledButton>
            </ScrollView>
        </GradientView>
    );
}