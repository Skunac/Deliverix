import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Image,
    Share,
    Linking, Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GradientView } from "@/components/ui/GradientView";
import { Ionicons } from '@expo/vector-icons';
import { DeliveryAgentService } from '@/src/services/delivery-agent.service';
import { DeliveryAgent } from '@/src/models/delivery-agent.model';
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { formatDate, formatTime } from "@/utils/formatters/date-formatters";
import { formatCurrency } from "@/utils/formatters/currency-formatter";
import { useTranslation } from "react-i18next";
import { NavigationButton } from "@/components/ui/NavigationButton";
import { Separator } from "@/components/ui/Separator";
import { useAuth } from "@/contexts/authContext";
import StyledTextInput from "@/components/ui/StyledTextInput";
import StyledButton from "@/components/ui/StyledButton";
import {
    useDelivery,
    useValidateDelivery,
    useDeliveryQueryCleanup, useDeleteDelivery, useDeliveryPermissions, useRescheduleDelivery
} from "@/hooks/useDeliveryQueries";
import { useEffect } from 'react';
import EditDeliveryScreen from "@/components/ui/DeliveryEditModal";
import RescheduleModal from "@/components/ui/RescheduleModal";

export default function DeliveryDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    const mapRef = useRef<MapView>(null);
    const deliveryAgentService = new DeliveryAgentService();
    const GOOGLE_MAPS_API_KEY = "AIzaSyBmDRLS39EJf9I54k9lDGfu1hdumFZ7v0c";
    const { user } = useAuth();

    // Local state for agent details and secret code
    const [agent, setAgent] = useState<DeliveryAgent | null>(null);
    const [agentLoading, setAgentLoading] = useState(false);
    const [secretCode, setSecretCode] = useState<string>('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);

    // Ensure query cleanup on auth changes
    useDeliveryQueryCleanup();

    // Use React Query for delivery data
    const {
        data: delivery,
        isLoading,
        error,
        refetch
    } = useDelivery(id as string, true); // Enable real-time updates

    // Use React Query mutation for delivery validation
    const validateDeliveryMutation = useValidateDelivery();

    // Use React Query mutation for delivery deletion
    const deleteDeliveryMutation = useDeleteDelivery();

    const rescheduleDeliveryMutation = useRescheduleDelivery();

    // Fetch permissions for edit/delete buttons
    const {
        data: permissions
    } = useDeliveryPermissions(
        id as string,
        user?.uid || ''
    );

    // Fetch agent details when delivery data changes
    useEffect(() => {
        const fetchAgentDetails = async () => {
            if (delivery?.deliveryAgentId && delivery.deliveryAgentId !== agent?.id) {
                try {
                    setAgentLoading(true);
                    console.log("Fetching delivery agent details for ID:", delivery.deliveryAgentId);
                    const agentData = await deliveryAgentService.getAgentProfile(delivery.deliveryAgentId);
                    setAgent(agentData);
                } catch (err) {
                    console.error("Error fetching agent details:", err);
                    // Don't show error for agent fetch failure, just continue without agent info
                } finally {
                    setAgentLoading(false);
                }
            } else if (!delivery?.deliveryAgentId) {
                // Clear agent if no agent is assigned
                setAgent(null);
            }
        };

        fetchAgentDetails();
    }, [delivery?.deliveryAgentId, agent?.id]);

    // Helper function for status styling
    function getStatusStyle(status: string): object {
        switch (status) {
            case 'waiting_for_delivery_guy':
                return { backgroundColor: '#EAB308' }; // yellow
            case 'delivery_guy_accepted':
                return { backgroundColor: '#3B82F6' }; // blue
            case 'picked_up':
                return { backgroundColor: '#8B5CF6' }; // purple
            case 'delivered':
                return { backgroundColor: '#22C55E' }; // green
            case 'failed':
                return { backgroundColor: '#EF4444' }; // red
            default:
                return { backgroundColor: '#6B7280' }; // gray
        }
    }

    const handleCodeSubmit = async () => {
        if (secretCode === '') {
            Alert.alert('Erreur', 'Veuillez entrer le code secret.');
            return;
        }

        if (!delivery) {
            Alert.alert('Erreur', 'Détails de livraison non disponibles.');
            return;
        }

        if (secretCode === delivery.secretCode) {
            try {
                await validateDeliveryMutation.mutateAsync(delivery.id);
                Alert.alert(
                    'Succès',
                    'La livraison a été validée avec succès.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.replace('/dashboard')
                        }
                    ]
                );
            } catch (error) {
                console.error("Error validating delivery:", error);
                Alert.alert('Erreur', 'Échec de la validation de la livraison.');
            }
        } else {
            Alert.alert('Erreur', 'Le code secret est incorrect.');
        }
    };

    const handleShareSecretCode = async () => {
        if (!delivery || !delivery.secretCode || !delivery.receiver) {
            Alert.alert('Erreur', 'Informations manquantes pour le partage.');
            return;
        }

        const message = `Bonjour ${delivery.receiver.firstName},

        Votre livraison est en cours de traitement. Voici votre code secret à donner au livreur pour valider la réception de votre colis :
        
        🔑 CODE SECRET : ${delivery.secretCode}
        
        Ce code est nécessaire pour confirmer que vous avez bien reçu votre colis. Ne le partagez qu'avec le livreur officiel.
        
        Détails de la livraison :
        📦 ${delivery.packageDescription}
        📍 ${delivery.deliveryAddress.formattedAddress}
        📅 ${formatDate(delivery.scheduledDate)} entre ${formatTime(delivery.timeSlot.start)} et ${formatTime(delivery.timeSlot.end)}
        
        Merci pour votre confiance !`;

        try {
            const result = await Share.share({
                message: message,
                title: 'Code secret de livraison'
            });

            if (result.action === Share.sharedAction) {
                console.log('Secret code shared successfully');
            }
        } catch (error) {
            console.error('Error sharing secret code:', error);
            Alert.alert('Erreur', 'Impossible de partager le code secret.');
        }
    };

    const handleSendSMS = () => {
        if (!delivery || !delivery.secretCode || !delivery.receiver?.phoneNumber) {
            Alert.alert('Erreur', 'Numéro de téléphone du destinataire manquant.');
            return;
        }

        const message = `Bonjour ${delivery.receiver.firstName}, votre code secret de livraison est : ${delivery.secretCode}. Donnez ce code au livreur pour valider la réception de votre colis. Livraison prévue le ${formatDate(delivery.scheduledDate)} entre ${formatTime(delivery.timeSlot.start)} et ${formatTime(delivery.timeSlot.end)}.`;

        const smsUrl = `sms:${delivery.receiver.phoneNumber}?body=${encodeURIComponent(message)}`;

        Linking.canOpenURL(smsUrl)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(smsUrl);
                } else {
                    Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application SMS.');
                }
            })
            .catch((error) => {
                console.error('Error opening SMS:', error);
                Alert.alert('Erreur', 'Erreur lors de l\'ouverture de l\'application SMS.');
            });
    };

    const handleRefresh = () => {
        refetch();
    };

    const handleDelete = () => {
        if (!delivery) return;

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
                                                router.back();
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

    const handleReschedule = async (reason?: string) => {
        if (!delivery || !user?.uid) {
            Alert.alert('Erreur', 'Informations manquantes pour reporter la livraison.');
            return;
        }

        try {
            await rescheduleDeliveryMutation.mutateAsync({
                deliveryId: delivery.id,
                agentId: user.uid,
                reason
            });

            setShowRescheduleModal(false);

            // Check if delivery will fail after this reschedule
            const currentCount = delivery.rescheduleCount || 0;
            const maxReschedules = delivery.maxReschedules || 2;
            const willFail = (currentCount + 1) >= maxReschedules;

            Alert.alert(
                willFail ? 'Livraison échouée' : 'Livraison reportée',
                willFail
                    ? 'La livraison a été marquée comme échouée après avoir atteint le nombre maximum de reports.'
                    : 'La livraison a été reportée avec succès.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            if (willFail) {
                                router.replace('/dashboard');
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error rescheduling delivery:', error);
            Alert.alert('Erreur', 'Impossible de reporter la livraison. Veuillez réessayer.');
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5DD6FF" />
                    <Text className="mt-4 text-white font-cabin">Chargement des détails de livraison...</Text>
                </View>
            </GradientView>
        );
    }

    // Error state
    if (error || !delivery) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text className="mt-4 text-lg text-red-500 font-cabin">
                        {error?.message || "Livraison non trouvée"}
                    </Text>
                    <TouchableOpacity
                        className="mt-6 p-3 bg-primary rounded-lg"
                        onPress={handleRefresh}
                    >
                        <Text className="text-darker font-cabin-medium">Réessayer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="mt-4 p-3 bg-gray-600 rounded-lg"
                        onPress={() => router.back()}
                    >
                        <Text className="text-white font-cabin-medium">Retour</Text>
                    </TouchableOpacity>
                </View>
            </GradientView>
        );
    }

    // Define the pickup and delivery coordinates
    const pickupCoords = {
        latitude: delivery.pickupAddress.coordinates.latitude,
        longitude: delivery.pickupAddress.coordinates.longitude,
    };

    const deliveryCoords = {
        latitude: delivery.deliveryAddress.coordinates.latitude,
        longitude: delivery.deliveryAddress.coordinates.longitude,
    };

    // Calculate the midpoint between pickup and delivery
    const midLat = (pickupCoords.latitude + deliveryCoords.latitude) / 2;
    const midLng = (pickupCoords.longitude + deliveryCoords.longitude) / 2;

    // Calculate the distance between points (approximately)
    const latDiff = Math.abs(pickupCoords.latitude - deliveryCoords.latitude);
    const lngDiff = Math.abs(pickupCoords.longitude - deliveryCoords.longitude);

    // Increase padding significantly (200%) to zoom out more
    const latDelta = Math.max(latDiff * 2.0, 0.05);
    const lngDelta = Math.max(lngDiff * 2.0, 0.05);

    return (
        <GradientView>
            <ScrollView className="flex-1 p-4">
                {/* Delivery Agent Information with Avatar - Top Section */}
                {!user?.isDeliveryAgent && (
                    <View className="bg-dark p-4 rounded-xl mb-4 border border-gray-700/50">
                        <View className="flex-row justify-between items-center mb-3">
                            <Text className="text-white text-lg font-cabin-semibold">Livreur</Text>
                            {agentLoading && (
                                <ActivityIndicator size="small" color="#5DD6FF" />
                            )}
                        </View>

                        <View className="flex-row">
                            {/* Agent Information */}
                            <View className="flex-1 mr-3">
                                {agent ? (
                                    <>
                                        <Text className="text-white font-cabin-semibold text-base">
                                            {agent.personalInfo.firstName} {agent.personalInfo.lastName}
                                        </Text>

                                        {/* Vehicle Info */}
                                        <View className="flex-row items-center mt-1">
                                            <Ionicons name="car-outline" size={16} color="#ffffff" />
                                            <Text className="ml-1 text-white capitalize font-cabin">
                                                {t(`delivery.vehicleType.${agent.vehicleInfo.type}`)}
                                            </Text>
                                        </View>

                                        {/* Phone Info */}
                                        <View className="flex-row items-center mt-1">
                                            <Ionicons name="call-outline" size={16} color="#ffffff" />
                                            <Text className="ml-1 text-white font-cabin">
                                                {agent.personalInfo.phoneNumber}
                                            </Text>
                                        </View>
                                    </>
                                ) : (
                                    <View className="items-start">
                                        <Text className="text-white opacity-60 italic font-cabin mt-2">
                                            Aucun livreur assigné
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Agent Avatar */}
                            {agent && (
                                <View className="items-end justify-center">
                                    {agent.personalInfo.photoUrl ? (
                                        <Image
                                            source={{ uri: agent.personalInfo.photoUrl }}
                                            style={{
                                                width: 70,
                                                height: 70,
                                                borderRadius: 35,
                                                borderWidth: 2,
                                                borderColor: '#2EC3F5'
                                            }}
                                        />
                                    ) : (
                                        <View style={{
                                            width: 70,
                                            height: 70,
                                            borderRadius: 35,
                                            backgroundColor: '#1a2e35',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            borderWidth: 2,
                                            borderColor: '#2EC3F5'
                                        }}>
                                            <Ionicons name="person" size={36} color="#5DD6FF" />
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Status Badge and Price - Middle Section */}
                <View className="bg-dark p-4 rounded-xl mb-4 border border-gray-700/50">
                    <View className="flex-row justify-between items-center">
                        <View
                            className="py-1 px-3 rounded-full"
                            style={getStatusStyle(delivery.status)}
                        >
                            <Text className="text-white font-cabin-medium">
                                {user?.isDeliveryAgent ? t(`delivery.deliveryStatus.${delivery.status}`) : t(`delivery.status.${delivery.status}`)}
                            </Text>
                        </View>

                        <View>
                            <Text className="text-white font-cabin-semibold text-right">
                                {formatCurrency(delivery.price)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Secret Code Section - Display if it exists */}
                {delivery.secretCode && !user?.isDeliveryAgent && delivery.status !== 'delivered' && (
                    <View className="bg-primary p-4 rounded-xl mb-4 border border-primary/80">
                        <View className="flex-row justify-between items-center mb-3">
                            <View className="flex-row items-center">
                                <Ionicons name="key" size={24} color="#0F2026" />
                                <Text className="text-darker font-cabin-bold text-lg ml-2">
                                    CODE SECRET
                                </Text>
                            </View>
                            <Text className="text-darker font-cabin-bold text-xl tracking-widest">
                                {delivery.secretCode}
                            </Text>
                        </View>

                        {/* Show reschedule info if status is rescheduled */}
                        {delivery.status === 'rescheduled' && (
                            <View className="bg-yellow-900/30 p-3 rounded-lg mb-3">
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="time" size={16} color="#EAB308" />
                                    <Text className="text-yellow-400 font-cabin-medium ml-2">
                                        Livraison reportée
                                    </Text>
                                </View>
                                <Text className="text-yellow-200 font-cabin text-sm">
                                    Cette livraison a été reportée par le livreur.
                                    Reports: {delivery.rescheduleCount || 0} / {delivery.maxReschedules || 2}
                                </Text>
                                {delivery.rescheduleHistory && delivery.rescheduleHistory.length > 0 && (
                                    <Text className="text-yellow-200 font-cabin text-sm mt-1">
                                        Dernier motif: {delivery.rescheduleHistory[delivery.rescheduleHistory.length - 1].reason || 'Aucun motif spécifié'}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Information message */}
                        <View className="bg-darker/20 p-3 rounded-lg mb-3">
                            <Text className="text-darker font-cabin text-sm">
                                Ce code doit être donné par le destinataire au livreur pour valider la réception du colis.
                            </Text>
                        </View>

                        {/* Share buttons */}
                        <View className="flex-row space-x-2">
                            <TouchableOpacity
                                onPress={handleSendSMS}
                                className="flex-1 bg-darker p-3 rounded-lg flex-row items-center justify-center mr-2"
                            >
                                <Ionicons name="chatbubble-outline" size={18} color="#5DD6FF" />
                                <Text className="text-primary font-cabin-medium ml-2">Envoyer SMS</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleShareSecretCode}
                                className="flex-1 bg-darker p-3 rounded-lg flex-row items-center justify-center ml-2"
                            >
                                <Ionicons name="share-outline" size={18} color="#5DD6FF" />
                                <Text className="text-primary font-cabin-medium ml-2">Partager</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {user?.isDeliveryAgent && delivery.status !== 'delivered' && delivery.status !== 'failed' && (
                    <View className="bg-dark p-4 rounded-xl mb-4 border border-gray-700/50">
                        {/* Show reschedule info if delivery was rescheduled */}
                        {delivery.status === 'rescheduled' && (
                            <View className="bg-yellow-900/20 p-3 rounded-lg mb-4">
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="time" size={20} color="#EAB308" />
                                    <Text className="text-yellow-400 font-cabin-medium ml-2">
                                        Livraison reportée
                                    </Text>
                                </View>
                                <Text className="text-yellow-200 font-cabin text-sm mb-2">
                                    Reports effectués: {delivery.rescheduleCount || 0} / {delivery.maxReschedules || 2}
                                </Text>
                                {delivery.rescheduleHistory && delivery.rescheduleHistory.length > 0 && (
                                    <Text className="text-yellow-200 font-cabin text-sm">
                                        Dernier motif: {delivery.rescheduleHistory[delivery.rescheduleHistory.length - 1].reason || 'Aucun motif spécifié'}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Code input section */}
                        <StyledTextInput
                            label="Code secret donné par le destinataire"
                            placeholder="Code secret"
                            value={secretCode}
                            onChangeText={setSecretCode}
                        />

                        {/* Show validation error if any */}
                        {validateDeliveryMutation.error && (
                            <View className="bg-red-500/20 p-3 rounded-lg mb-3">
                                <Text className="text-red-400 font-cabin text-center">
                                    {validateDeliveryMutation.error.message || 'Erreur lors de la validation'}
                                </Text>
                            </View>
                        )}

                        {/* Show reschedule error if any */}
                        {rescheduleDeliveryMutation.error && (
                            <View className="bg-red-500/20 p-3 rounded-lg mb-3">
                                <Text className="text-red-400 font-cabin text-center">
                                    {rescheduleDeliveryMutation.error.message || 'Erreur lors du report'}
                                </Text>
                            </View>
                        )}

                        {/* Action buttons */}
                        <View className="flex-row space-x-3">
                            {/* Reschedule button - only show if not at max reschedules */}
                            {((delivery.rescheduleCount || 0) < (delivery.maxReschedules || 2)) && (
                                <StyledButton
                                    variant="bordered"
                                    onPress={() => setShowRescheduleModal(true)}
                                    disabled={rescheduleDeliveryMutation.isPending}
                                    className="flex-1 border-yellow-500 mr-2"
                                >
                                    <View className="flex-row items-center">
                                        <Ionicons name="time-outline" size={18} color="#EAB308" />
                                        <Text className="text-yellow-500 font-cabin-medium ml-2">
                                            Reporter
                                        </Text>
                                    </View>
                                </StyledButton>
                            )}

                            {/* Validate button */}
                            <StyledButton
                                variant="primary"
                                onPress={handleCodeSubmit}
                                disabled={validateDeliveryMutation.isPending}
                                className={((delivery.rescheduleCount || 0) < (delivery.maxReschedules || 2)) ? "flex-1" : "w-full"}
                            >
                                <Text className="text-white font-cabin-medium">
                                    {validateDeliveryMutation.isPending ? 'Validation en cours...' : 'Valider la livraison'}
                                </Text>
                            </StyledButton>
                        </View>
                    </View>
                )}

                {/* Delivery Details Section with Map */}
                <View className="bg-dark p-4 rounded-xl mb-4 border border-gray-700/50">
                    <Text className="text-white font-cabin-semibold text-lg mb-3">
                        Détails de la course
                    </Text>

                    {/* Map Section */}
                    <View style={styles.mapContainer}>
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={{
                                latitude: midLat,
                                longitude: midLng,
                                latitudeDelta: latDelta,
                                longitudeDelta: lngDelta
                            }}
                        >
                            {/* Directions between markers */}
                            <MapViewDirections
                                origin={pickupCoords}
                                destination={deliveryCoords}
                                apikey={GOOGLE_MAPS_API_KEY}
                                strokeWidth={3}
                                strokeColor="#5DD6FF"
                                mode="DRIVING"
                            />
                            <Marker
                                coordinate={pickupCoords}
                                title="Point de collecte"
                                pinColor="green"
                                tracksViewChanges={false}
                                description={delivery.pickupAddress.formattedAddress}
                            />
                            <Marker
                                coordinate={deliveryCoords}
                                pinColor="red"
                                tracksViewChanges={false}
                                title="Destination"
                                description={delivery.deliveryAddress.formattedAddress}
                            />
                        </MapView>
                    </View>

                    {/* Navigation App Shortcuts */}
                    {user?.isDeliveryAgent && (
                        <View className="flex-row justify-around my-3">
                            <NavigationButton
                                app="google"
                                origin={pickupCoords}
                                destination={deliveryCoords}
                            />
                            <NavigationButton
                                app="waze"
                                origin={pickupCoords}
                                destination={deliveryCoords}
                            />
                        </View>
                    )}

                    {/* Pickup Information */}
                    <View className="bg-gray-800/50 p-3 rounded-lg mb-3">
                        <View className="flex-row items-center mb-2">
                            <View className="w-8 h-8 rounded-full bg-green-500 items-center justify-center mr-2">
                                <Ionicons name="location" size={18} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-primary font-cabin-medium">Point de collecte</Text>
                                <Text className="text-white font-cabin">{delivery.pickupAddress.formattedAddress}</Text>
                                {delivery.pickupAddress.complementaryAddress && (
                                    <Text className="text-gray-300 font-cabin">
                                        {delivery.pickupAddress.complementaryAddress}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Pickup Time */}
                        <View className="bg-black/20 p-2 rounded-lg mt-1">
                            <Text className="text-primary font-cabin-medium text-sm">Créneau de ramassage:</Text>
                            <Text className="text-white font-cabin">
                                {formatDate(delivery.scheduledDate)} de {formatTime(delivery.timeSlot.start)} à {formatTime(delivery.timeSlot.end)}
                            </Text>
                        </View>

                        {/* Expeditor Information */}
                        <View className="mt-2 pt-2 border-t border-gray-700">
                            <Text className="text-primary font-cabin-medium text-sm">Contact expéditeur:</Text>
                            <Text className="text-white font-cabin">{delivery.expeditor.firstName}</Text>
                            <Text className="text-white font-cabin">{delivery.expeditor.phoneNumber}</Text>
                        </View>
                    </View>

                    {/* Delivery Information */}
                    <View className="bg-gray-800/50 p-3 rounded-lg">
                        <View className="flex-row items-center mb-2">
                            <View className="w-8 h-8 rounded-full bg-red-500 items-center justify-center mr-2">
                                <Ionicons name="location" size={18} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-primary font-cabin-medium">Destination</Text>
                                <Text className="text-white font-cabin">{delivery.deliveryAddress.formattedAddress}</Text>
                                {delivery.deliveryAddress.complementaryAddress && (
                                    <Text className="text-gray-300 font-cabin">
                                        {delivery.deliveryAddress.complementaryAddress}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Delivery Instructions */}
                        {delivery.deliveryAddress.additionalInstructions && (
                            <View className="bg-yellow-900/20 p-2 rounded-lg mt-1 mb-2">
                                <Text className="text-yellow-400 font-cabin-medium text-sm">Instructions:</Text>
                                <Text className="text-white font-cabin">{delivery.deliveryAddress.additionalInstructions}</Text>
                            </View>
                        )}

                        {/* Delivery Time */}
                        <View className="bg-black/20 p-2 rounded-lg mt-1">
                            <Text className="text-primary font-cabin-medium text-sm">Créneau de livraison:</Text>
                            <Text className="text-white font-cabin">
                                {formatDate(delivery.scheduledDate)} de {formatTime(delivery.timeSlot.start)} à {formatTime(delivery.timeSlot.end)}
                            </Text>
                        </View>

                        {/* Receiver Information */}
                        <View className="mt-2 pt-2 border-t border-gray-700">
                            <Text className="text-primary font-cabin-medium text-sm">Contact destinataire:</Text>
                            <Text className="text-white font-cabin">{delivery.receiver.firstName}</Text>
                            <Text className="text-white font-cabin">{delivery.receiver.phoneNumber}</Text>
                        </View>
                    </View>
                </View>

                {/* Package Details */}
                <View className="bg-dark p-4 rounded-xl mb-4 border border-gray-700/50">
                    <Text className="text-white font-cabin-semibold text-lg mb-3">
                        Détails du Colis
                    </Text>

                    <View className="bg-gray-800/50 p-3 rounded-lg">
                        <View className="flex-row mb-2">
                            <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center mr-2">
                                <Ionicons name="cube" size={18} color="white" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-primary font-cabin-medium">Description</Text>
                                <Text className="text-white font-cabin">{delivery.packageDescription}</Text>
                            </View>
                        </View>

                        <Separator />

                        <View className="flex-row justify-between mt-3">
                            <View className="flex-1">
                                <Text className="text-primary font-cabin-medium text-sm">Catégorie</Text>
                                <Text className="text-white font-cabin">
                                    {t(`delivery.packageCategory.${delivery.packageCategory}`)}
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-primary font-cabin-medium text-sm">Poids</Text>
                                <Text className="text-white font-cabin">{delivery.packageWeight} kg</Text>
                            </View>
                        </View>

                        <View className="flex-row justify-between mt-3">
                            <View className="flex-1">
                                <Text className="text-primary font-cabin-medium text-sm">Dimensions</Text>
                                <Text className="text-white font-cabin">
                                    {delivery.packageDimensions.length} × {delivery.packageDimensions.width} × {delivery.packageDimensions.height} cm
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-primary font-cabin-medium text-sm">Fragile</Text>
                                <Text className="text-white font-cabin">{delivery.isFragile ? 'Oui' : 'Non'}</Text>
                            </View>
                        </View>

                        {/* Comments */}
                        {delivery.comment && (
                            <View className="mt-3 pt-2 border-t border-gray-700">
                                <Text className="text-primary font-cabin-medium text-sm">Commentaire</Text>
                                <Text className="text-white font-cabin">{delivery.comment}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {!user?.isDeliveryAgent && (permissions?.canEdit || permissions?.canDelete) && (
                    <View className="h-32"/>
                )}
            </ScrollView>

            {!user?.isDeliveryAgent && (permissions?.canEdit || permissions?.canDelete || user?.isAdmin) && (
                <View className="absolute bottom-0 left-0 right-0 bg-dark p-4 border-t border-gray-700">
                    {(permissions?.canEdit || user?.isAdmin) && (
                        <StyledButton
                            variant="primary"
                            shadow
                            onPress={() => setShowEditModal(true)}
                            className="mb-3"
                        >
                            <Text className="text-darker font-cabin-medium">Modifier</Text>
                        </StyledButton>
                    )}

                    {(permissions?.canDelete || user?.isAdmin) && (
                        <StyledButton
                            variant="bordered"
                            onPress={handleDelete}
                            disabled={deleteDeliveryMutation.isPending}
                            className="border-red-500"
                        >
                            <Text className="text-red-500 font-cabin-medium">
                                {deleteDeliveryMutation.isPending ? 'Suppression...' : 'Supprimer'}
                            </Text>
                        </StyledButton>
                    )}
                </View>
            )}

            <Modal
                visible={showEditModal}
                animationType="slide"
                transparent={false}
                presentationStyle="fullScreen"
            >
                <EditDeliveryScreen
                    delivery={delivery}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={() => {
                        setShowEditModal(false);
                        refetch(); // Refresh the delivery data
                    }}
                />
            </Modal>

            <RescheduleModal
                visible={showRescheduleModal}
                onClose={() => setShowRescheduleModal(false)}
                onConfirm={handleReschedule}
                isLoading={rescheduleDeliveryMutation.isPending}
                rescheduleCount={delivery?.rescheduleCount || 0}
                maxReschedules={delivery?.maxReschedules || 2}
            />

        </GradientView>
    );
}

const styles = StyleSheet.create({
    mapContainer: {
        height: 180,
        width: '100%',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 16,
    },
    map: {
        width: '100%',
        height: '100%',
    }
});