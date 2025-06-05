import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientView } from '@/components/ui/GradientView';
import StyledButton from '@/components/ui/StyledButton';
import StyledTextInput from '@/components/ui/StyledTextInput';
import ModernAddressInput from '@/components/ui/AddressInput';
import { DeliveryWithAgent } from '@/src/services/delivery.service.enhanced';
import {
    useDeliveryPermissions,
    useEditDelivery,
    useDeleteDelivery
} from '@/hooks/useDeliveryQueries';
import { useAuth } from '@/contexts/authContext';
import { Delivery, PackageCategory } from '@/src/models/delivery.model';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { parseTimestamp } from '@/utils/formatters/date-formatters';

interface EditDeliveryScreenProps {
    delivery: DeliveryWithAgent;
    onClose: () => void;
    onSuccess?: () => void;
}

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

export default function EditDeliveryScreen({
                                               delivery,
                                               onClose,
                                               onSuccess
                                           }: EditDeliveryScreenProps) {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'night'>('morning');
    const [mode, setMode] = useState<'view' | 'edit'>('edit');

    // Fetch permissions
    const {
        data: permissions,
        isLoading: permissionsLoading
    } = useDeliveryPermissions(delivery.id, user?.uid || '');

    // Mutations
    const editDeliveryMutation = useEditDelivery();
    const deleteDeliveryMutation = useDeleteDelivery();

    // Form state
    const [formData, setFormData] = useState({
        packageDescription: delivery.packageDescription,
        packageWeight: delivery.packageWeight,
        packageDimensions: delivery.packageDimensions,
        packageCategory: delivery.packageCategory,
        isFragile: delivery.isFragile,
        comment: delivery.comment || '',
        scheduledDate: parseTimestamp(delivery.scheduledDate) || new Date(),
        timeSlotStart: parseTimestamp(delivery.timeSlot.start) || new Date(),
        timeSlotEnd: parseTimestamp(delivery.timeSlot.end) || new Date(),
        expeditor: delivery.expeditor,
        receiver: delivery.receiver,
        pickupAddress: delivery.pickupAddress,
        deliveryAddress: delivery.deliveryAddress,
        billingAddress: delivery.billingAddress
    });

    // Initialize time slot based on existing data
    useEffect(() => {
        const startDate = parseTimestamp(delivery.timeSlot.start);
        if (startDate) {
            const startHour = startDate.getHours();
            if (startHour >= 8 && startHour < 12) {
                setTimeSlot('morning');
            } else if (startHour >= 12 && startHour < 18) {
                setTimeSlot('afternoon');
            } else {
                setTimeSlot('night');
            }
        }
    }, [delivery.timeSlot.start]);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (selectedDate) {
            setFormData(prev => ({ ...prev, scheduledDate: selectedDate }));
        }
    };

    const handleDonePress = () => {
        setShowDatePicker(false);
    };

    const handleTimeSlotChange = (slot: 'morning' | 'afternoon' | 'night') => {
        setTimeSlot(slot);

        const startDate = new Date(formData.scheduledDate);
        const endDate = new Date(formData.scheduledDate);

        if (slot === 'morning') {
            startDate.setHours(8, 0, 0, 0);
            endDate.setHours(12, 0, 0, 0);
        } else if (slot === 'afternoon') {
            startDate.setHours(12, 0, 0, 0);
            endDate.setHours(18, 0, 0, 0);
        } else if (slot === 'night') {
            startDate.setHours(18, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        }

        setFormData(prev => ({
            ...prev,
            timeSlotStart: startDate,
            timeSlotEnd: endDate
        }));
    };

    const handleDelete = () => {
        Alert.alert(
            'Supprimer la livraison',
            'Êtes-vous sûr de vouloir supprimer cette livraison ? Cette action ne peut pas être annulée.',
            [
                {
                    text: 'Annuler',
                    style: 'cancel'
                },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () => {
                        deleteDeliveryMutation.mutate(delivery.id, {
                            onSuccess: () => {
                                Alert.alert(
                                    'Succès',
                                    'La livraison a été supprimée avec succès.',
                                    [
                                        {
                                            text: 'OK',
                                            onPress: () => {
                                                onSuccess?.();
                                                onClose();
                                            }
                                        }
                                    ]
                                );
                            },
                            onError: (error: any) => {
                                Alert.alert(
                                    'Erreur',
                                    error.message || 'Impossible de supprimer la livraison'
                                );
                            }
                        });
                    }
                }
            ]
        );
    };

    const handleSave = () => {
        const updateData: Partial<Delivery> = {
            packageDescription: formData.packageDescription,
            packageWeight: formData.packageWeight,
            packageDimensions: formData.packageDimensions,
            packageCategory: formData.packageCategory,
            isFragile: formData.isFragile,
            comment: formData.comment,
            scheduledDate: formData.scheduledDate,
            timeSlot: {
                start: formData.timeSlotStart,
                end: formData.timeSlotEnd
            },
            expeditor: formData.expeditor,
            receiver: formData.receiver,
            pickupAddress: formData.pickupAddress,
            deliveryAddress: formData.deliveryAddress,
            billingAddress: formData.billingAddress
        };

        editDeliveryMutation.mutate(
            { deliveryId: delivery.id, updateData },
            {
                onSuccess: () => {
                    Alert.alert(
                        'Succès',
                        'La livraison a été modifiée avec succès.',
                        [
                            {
                                text: 'OK',
                                onPress: () => {
                                    setMode('view');
                                    onSuccess?.();
                                }
                            }
                        ]
                    );
                },
                onError: (error: any) => {
                    Alert.alert(
                        'Erreur',
                        error.message || 'Impossible de modifier la livraison'
                    );
                }
            }
        );
    };

    const updateExpeditor = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            expeditor: {
                ...prev.expeditor,
                [field]: value
            }
        }));
    };

    const updateReceiver = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            receiver: {
                ...prev.receiver,
                [field]: value
            }
        }));
    };

    // Loading state
    if (permissionsLoading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5DD6FF" />
                    <Text className="text-white mt-4 font-cabin">
                        Vérification des permissions...
                    </Text>
                </View>
            </GradientView>
        );
    }

    // No permissions state
    if (!permissions?.canEdit && !permissions?.canDelete) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="lock-closed-outline" size={48} color="#ef4444" />
                    <Text className="text-white text-lg font-cabin-medium mt-4 text-center">
                        Modification non autorisée
                    </Text>
                    <Text className="text-gray-300 font-cabin text-center mt-2">
                        {permissions?.reason || 'Vous ne pouvez pas modifier cette livraison'}
                    </Text>
                    <StyledButton
                        variant="primary"
                        onPress={onClose}
                        className="mt-6"
                    >
                        <Text className="text-darker font-cabin-medium">Fermer</Text>
                    </StyledButton>
                </View>
            </GradientView>
        );
    }

    return (
        <GradientView>
            <ScrollView className="flex-1 p-4">
                {/* Header */}
                <View className="flex-row items-center mb-6">
                    <TouchableOpacity
                        onPress={onClose}
                        className="mr-4"
                    >
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-cabin-medium">
                        Modifier la livraison
                    </Text>
                </View>

                {/* Package Details */}
                <View className="bg-dark p-5 rounded-xl mb-6 border border-gray-800">
                    <View className="flex-row items-center mb-4">
                        <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                            <Ionicons name="cube-outline" size={16} color="#0F2026" />
                        </View>
                        <Text className="text-white text-lg font-cabin-medium">
                            Détails du colis
                        </Text>
                    </View>

                    {user?.isAdmin && (
                        <>
                            <StyledTextInput
                                label="Description du colis"
                                placeholder="Décrivez votre colis"
                                multiline
                                numberOfLines={3}
                                value={formData.packageDescription}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, packageDescription: text }))}
                                darkBackground={true}
                            />

                            <StyledTextInput
                                label="Poids du colis (kg)"
                                placeholder="Entrez le poids en kg"
                                keyboardType="numeric"
                                value={formData.packageWeight.toString()}
                                onChangeText={(text) => setFormData(prev => ({
                                    ...prev,
                                    packageWeight: parseFloat(text) || 0
                                }))}
                                darkBackground={true}
                            />

                            {/* Package Dimensions */}
                            <Text className="text-white mb-2 font-cabin-medium">Dimensions du colis (cm)</Text>
                            <View className="flex-row justify-between mb-4">
                                <View className="flex-1 mr-2">
                                    <StyledTextInput
                                        placeholder="Longueur"
                                        keyboardType="numeric"
                                        value={formData.packageDimensions.length.toString()}
                                        onChangeText={(text) => setFormData(prev => ({
                                            ...prev,
                                            packageDimensions: {
                                                ...prev.packageDimensions,
                                                length: parseFloat(text) || 0
                                            }
                                        }))}
                                        editable={mode === 'edit'}
                                        darkBackground={true}
                                    />
                                </View>
                                <View className="flex-1 mx-2">
                                    <StyledTextInput
                                        placeholder="Largeur"
                                        keyboardType="numeric"
                                        value={formData.packageDimensions.width.toString()}
                                        onChangeText={(text) => setFormData(prev => ({
                                            ...prev,
                                            packageDimensions: {
                                                ...prev.packageDimensions,
                                                width: parseFloat(text) || 0
                                            }
                                        }))}
                                        editable={mode === 'edit'}
                                        darkBackground={true}
                                    />
                                </View>
                                <View className="flex-1 ml-2">
                                    <StyledTextInput
                                        placeholder="Hauteur"
                                        keyboardType="numeric"
                                        value={formData.packageDimensions.height.toString()}
                                        onChangeText={(text) => setFormData(prev => ({
                                            ...prev,
                                            packageDimensions: {
                                                ...prev.packageDimensions,
                                                height: parseFloat(text) || 0
                                            }
                                        }))}
                                        editable={mode === 'edit'}
                                        darkBackground={true}
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
                                            formData.packageCategory === category.value
                                                ? 'bg-primary'
                                                : 'bg-gray-800'
                                        }`}
                                        onPress={() => {
                                            if (mode === 'edit') {
                                                setFormData(prev => ({ ...prev, packageCategory: category.value }));
                                            }
                                        }}
                                        disabled={mode === 'view'}
                                    >
                                        <Text className="text-white">{t(`delivery.packageCategory.${category.value}`)}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            {/* Fragile Switch */}
                            <View className="flex-row items-center justify-between mb-4 bg-darker p-3 rounded-lg">
                                <Text className="text-white font-cabin-medium">Le colis est-il fragile ?</Text>
                                <Switch
                                    value={formData.isFragile}
                                    onValueChange={(value) => {
                                        setFormData(prev => ({ ...prev, isFragile: value }));
                                    }}
                                    trackColor={{ false: '#576D75', true: '#5DD6FF' }}
                                    thumbColor={formData.isFragile ? '#fff' : '#f4f3f4'}
                                    ios_backgroundColor="#576D75"
                                />
                            </View>
                        </>
                    )}

                    <StyledTextInput
                        label="Commentaire"
                        placeholder="Informations pour le livreur"
                        multiline
                        numberOfLines={3}
                        value={formData.comment}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, comment: text }))}
                        darkBackground={true}
                    />
                </View>

                {/* Schedule */}
                {user?.isAdmin && (
                    <>
                        <View className="bg-dark p-5 rounded-xl mb-6 border border-gray-800">
                            <View className="flex-row items-center mb-4">
                                <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                                    <Ionicons name="calendar-outline" size={16} color="#0F2026" />
                                </View>
                                <Text className="text-white text-lg font-cabin-medium">
                                    Date et heure de livraison
                                </Text>
                            </View>

                            {/* Date Picker */}
                            <TouchableOpacity
                                onPress={() => {
                                    if (mode === 'edit') {
                                        setShowDatePicker(true);
                                    }
                                }}
                                className="bg-darker p-3 rounded-lg mb-6 flex-row items-center justify-between"
                                disabled={mode === 'view'}
                            >
                                <Text className="text-white font-cabin-medium">
                                    Date : {formData.scheduledDate ? format(formData.scheduledDate, 'dd/MM/yyyy', { locale: fr }) : 'Date invalide'}
                                </Text>
                                <Ionicons name="calendar" size={20} color="#5DD6FF" />
                            </TouchableOpacity>

                            {/* Time Slot */}
                            <Text className="text-white mb-3 font-cabin-medium">Créneau horaire</Text>
                            <View className="flex-row mb-2">
                                <Pressable
                                    className={`flex-1 p-4 rounded-lg mr-2 items-center justify-center ${
                                        timeSlot === 'morning' ? 'bg-primary' : 'bg-darker'
                                    }`}
                                    onPress={() => {
                                        if (mode === 'edit') {
                                            handleTimeSlotChange('morning');
                                        }
                                    }}
                                    disabled={mode === 'view'}
                                >
                                    <View className="items-center">
                                        <Ionicons
                                            name="sunny-outline"
                                            size={24}
                                            color="white"
                                            style={{ marginBottom: 4 }}
                                        />
                                        <Text className="text-white font-cabin-medium">Matin</Text>
                                        <Text className="text-gray-300 text-xs">8:00 - 12:00</Text>
                                    </View>
                                </Pressable>

                                <Pressable
                                    className={`flex-1 p-4 rounded-lg ml-2 mr-2 items-center justify-center ${
                                        timeSlot === 'afternoon' ? 'bg-primary' : 'bg-darker'
                                    }`}
                                    onPress={() => {
                                        if (mode === 'edit') {
                                            handleTimeSlotChange('afternoon');
                                        }
                                    }}
                                    disabled={mode === 'view'}
                                >
                                    <View className="items-center">
                                        <Ionicons
                                            name="partly-sunny-outline"
                                            size={24}
                                            color="white"
                                            style={{ marginBottom: 4 }}
                                        />
                                        <Text className="text-white font-cabin-medium">Après-midi</Text>
                                        <Text className="text-gray-300 text-xs">12:00 - 18:00</Text>
                                    </View>
                                </Pressable>

                                <Pressable
                                    className={`flex-1 p-4 rounded-lg ml-2 items-center justify-center ${
                                        timeSlot === 'night' ? 'bg-primary' : 'bg-darker'
                                    }`}
                                    onPress={() => {
                                        if (mode === 'edit') {
                                            handleTimeSlotChange('night');
                                        }
                                    }}
                                    disabled={mode === 'view'}
                                >
                                    <View className="items-center">
                                        <Ionicons
                                            name="moon-outline"
                                            size={24}
                                            color="white"
                                            style={{ marginBottom: 4 }}
                                        />
                                        <Text className="text-white font-cabin-medium">Soir</Text>
                                        <Text className="text-gray-300 text-xs">18:00 - 00:00</Text>
                                    </View>
                                </Pressable>
                            </View>
                        </View>
                    </>
                )}

                {/* Addresses and Contacts */}
                <View className="bg-dark p-5 rounded-xl mb-6 border border-gray-800">
                    <View className="flex-row items-center mb-4">
                        <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                            <Ionicons name="location-outline" size={16} color="#0F2026" />
                        </View>
                        <Text className="text-white text-lg font-cabin-medium">
                            Adresses et contacts
                        </Text>
                    </View>

                    {/* Pickup Section */}
                    <View className="mb-6">
                        <Text className="text-primary font-cabin-medium mb-3">Point de ramassage</Text>

                        {user?.isAdmin && (
                            <>
                                <ModernAddressInput
                                    address={formData.pickupAddress}
                                    onAddressSelected={(address) => {
                                        if (mode === 'edit') {
                                            setFormData(prev => ({ ...prev, pickupAddress: address }));
                                        }
                                    }}
                                    isDeliveryAddress={false}
                                />
                            </>
                        )}

                        <StyledTextInput
                            label="Nom complet de l'expéditeur"
                            placeholder="Entrez le nom complet"
                            value={formData.expeditor.firstName}
                            onChangeText={(text) => {
                                if (mode === 'edit') {
                                    updateExpeditor('firstName', text);
                                }
                            }}
                            editable={mode === 'edit'}
                            darkBackground={true}
                        />

                        <StyledTextInput
                            label="Téléphone de l'expéditeur"
                            placeholder="Entrez le numéro de téléphone"
                            keyboardType="phone-pad"
                            value={formData.expeditor.phoneNumber}
                            onChangeText={(text) => {
                                if (mode === 'edit') {
                                    updateExpeditor('phoneNumber', text);
                                }
                            }}
                            editable={mode === 'edit'}
                            darkBackground={true}
                        />
                    </View>

                    {/* Delivery Section */}
                    <View>
                        <Text className="text-primary font-cabin-medium mb-3">Point de livraison</Text>

                        {user?.isAdmin && (
                            <>
                                <ModernAddressInput
                                    address={formData.deliveryAddress}
                                    onAddressSelected={(address) => {
                                        if (mode === 'edit') {
                                            setFormData(prev => ({ ...prev, deliveryAddress: address }));
                                        }
                                    }}
                                    isDeliveryAddress={true}
                                />
                            </>
                        )}

                        <StyledTextInput
                            label="Nom complet du destinataire"
                            placeholder="Entrez le nom complet"
                            value={formData.receiver.firstName}
                            onChangeText={(text) => {
                                if (mode === 'edit') {
                                    updateReceiver('firstName', text);
                                }
                            }}
                            editable={mode === 'edit'}
                            darkBackground={true}
                        />

                        <StyledTextInput
                            label="Téléphone du destinataire"
                            placeholder="Entrez le numéro de téléphone"
                            keyboardType="phone-pad"
                            value={formData.receiver.phoneNumber}
                            onChangeText={(text) => {
                                if (mode === 'edit') {
                                    updateReceiver('phoneNumber', text);
                                }
                            }}
                            editable={mode === 'edit'}
                            darkBackground={true}
                        />
                    </View>
                </View>

                {/* Show error messages if any */}
                {editDeliveryMutation.error && (
                    <View className="bg-red-500/20 p-3 rounded-lg mb-4">
                        <Text className="text-red-400 font-cabin text-center">
                            {editDeliveryMutation.error.message}
                        </Text>
                    </View>
                )}

                {deleteDeliveryMutation.error && (
                    <View className="bg-red-500/20 p-3 rounded-lg mb-4">
                        <Text className="text-red-400 font-cabin text-center">
                            {deleteDeliveryMutation.error.message}
                        </Text>
                    </View>
                )}

                {/* Action Buttons - Only Save and Cancel */}
                <View className="mb-8">
                    <StyledButton
                        variant="primary"
                        shadow
                        onPress={handleSave}
                        disabled={editDeliveryMutation.isPending}
                        className="mb-4"
                    >
                        <Text className="text-darker font-cabin-medium">
                            {editDeliveryMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                        </Text>
                    </StyledButton>

                    <StyledButton
                        variant="bordered"
                        onPress={onClose}
                        disabled={editDeliveryMutation.isPending}
                    >
                        <Text className="text-white font-cabin-medium">Annuler</Text>
                    </StyledButton>
                </View>
            </ScrollView>

            {/* Date Picker Modal */}
            {showDatePicker && (
                <>
                    {Platform.OS === 'ios' && (
                        <View className="w-full bg-white p-2 flex-row justify-end">
                            <TouchableOpacity onPress={handleDonePress}>
                                <Text className="text-blue-500 text-lg font-bold">Terminé</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={{
                        flexDirection: 'row',
                        backgroundColor: 'white',
                        margin: 0,
                        padding: 0,
                        width: '100%'
                    }}>
                        <DateTimePicker
                            locale="fr-FR"
                            value={formData.scheduledDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleDateChange}
                            minimumDate={new Date()}
                            style={{
                                flex: 1,
                                width: '100%',
                                backgroundColor: 'white',
                                margin: 0,
                                padding: 0
                            }}
                            textColor="black"
                        />
                    </View>
                </>
            )}
        </GradientView>
    );
}