import React, { useEffect, useState } from 'react';
import {View, Text, ScrollView, ActivityIndicator, StyleSheet, SafeAreaView, TouchableOpacity} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DeliveryService } from "@/src/services/delivery.service";
import { Delivery } from "@/src/models/delivery.model";
import { GradientView } from "@/components/ui/GradientView";
import { Ionicons } from '@expo/vector-icons';
import { DeliveryAgentService } from '@/src/services/delivery-agent.service';
import { DeliveryAgent } from '@/src/models/delivery-agent.model';
import StyledButton from '@/components/ui/StyledButton';
import { format } from 'date-fns';
import AgentCard from "@/components/ui/AgentCard";
import {Separator} from "@/components/ui/Separator";

export default function DeliveryDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const deliveryService = new DeliveryService();
    const deliveryAgentService = new DeliveryAgentService();

    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [agent, setAgent] = useState<DeliveryAgent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDeliveryDetails = async () => {
            try {
                setLoading(true);
                // Fetch the delivery details
                const deliveryData = await deliveryService.getDeliveryById(id as string);
                setDelivery(deliveryData);

                // If there's a delivery agent, fetch their details
                if (deliveryData?.deliveryAgentId) {
                    console.log("Fetching delivery agent details for ID:", deliveryData.deliveryAgentId);
                    const agentData = await deliveryAgentService.getAgentProfile(deliveryData.deliveryAgentId);
                    setAgent(agentData);
                    console.log('agent',agent);
                }
            } catch (err) {
                console.error("Error fetching delivery details:", err);
                setError("Échec du chargement des détails de livraison");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDeliveryDetails();
        }
    }, [id]);

    const InfoRow = ({ label, value }: { label: string, value: string | number | React.ReactNode }) => (
        <View className="flex-row justify-between items-center py-2">
            <Text className="text-gray-300 font-cabin">{label}</Text>
            {typeof value === 'string' || typeof value === 'number' ? (
                <Text className="text-white font-cabin-medium">{value}</Text>
            ) : (
                value
            )}
        </View>
    );

    const SectionTitle = ({ title }: { title: string }) => (
        <Text className="text-white text-lg font-cabin-semibold mb-3">{title}</Text>
    );

    const handleModifyDelivery = () => {
        // Implement modify delivery functionality
        console.log("Modify delivery");
    };

    const handleCancelDelivery = () => {
        // Implement cancel delivery functionality
        console.log("Cancel delivery");
    };

    if (loading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#2EC3F5" />
                    <Text className="mt-4 text-white font-cabin">Chargement des détails de livraison...</Text>
                </View>
            </GradientView>
        );
    }

    if (error || !delivery) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text className="mt-4 text-lg text-red-500 font-cabin">{error || "Livraison non trouvée"}</Text>
                    <StyledButton
                        variant="primary"
                        className="mt-6"
                        onPress={() => router.back()}
                    >
                        <Text className="text-white font-cabin-medium">Retour</Text>
                    </StyledButton>
                </View>
            </GradientView>
        );
    }

    return (
        <GradientView>
            <SafeAreaView className="flex-1 relative">
                <ScrollView className="flex-1 p-4 pb-48">
                    {/* Key Information */}
                    <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-xl text-white font-cabin-bold">Livraison #{delivery.id.substring(0, 6)}</Text>
                        <View className="py-1 px-3 rounded-full" style={getStatusStyle(delivery.status)}>
                            <Text className="text-white font-cabin-medium">{getStatusText(delivery.status)}</Text>
                        </View>
                    </View>

                    <InfoRow
                        label="Date Prévue"
                        value={formatFirestoreDate(delivery.scheduledDate)}
                    />
                    <InfoRow
                        label="Créneau Horaire"
                        value={`${formatFirestoreTime(delivery.timeSlot.start)} - ${formatFirestoreTime(delivery.timeSlot.end)}`}
                    />

                    <Separator />

                    {/* Price Information */}
                    <SectionTitle title="Prix" />
                    <InfoRow
                        label="Prix Total"
                        value={`${delivery.price.toFixed(2)} €`}
                    />

                    <Separator />

                    {/* Delivery Route */}
                    <SectionTitle title="Itinéraire de Livraison" />

                    {/* Map Placeholder */}
                    <View style={styles.mapPlaceholder}>
                        <Ionicons name="map-outline" size={32} color="white" style={{ opacity: 0.6 }} />
                        <Text className="text-white opacity-60 mt-2 font-cabin">Carte</Text>
                    </View>

                    <Separator />

                    {/* Delivery Agent Information - Using the new AgentCard component */}
                    <SectionTitle title="Livreur" />
                    <AgentCard agent={agent} />

                    <Separator />

                    {/* Package Details */}
                    <SectionTitle title="Détails du Colis" />
                    <InfoRow
                        label="Description"
                        value={delivery.packageDescription}
                    />
                    <InfoRow
                        label="Catégorie"
                        value={delivery.packageCategory}
                    />
                    <InfoRow
                        label="Poids"
                        value={`${delivery.packageWeight} kg`}
                    />
                    <InfoRow
                        label="Dimensions"
                        value={`${delivery.packageDimensions.length} x ${delivery.packageDimensions.width} x ${delivery.packageDimensions.height} cm`}
                    />

                    <Separator />

                    {/* Comments */}
                    <SectionTitle title="Commentaires" />
                    <Text className="text-white font-cabin-medium mb-1">Commentaires Expéditeur:</Text>
                    {delivery.expeditorComments ? (
                        <Text className="text-white opacity-80 mb-3 font-cabin">{delivery.expeditorComments}</Text>
                    ) : (
                        <Text className="text-white opacity-60 italic mb-3 font-cabin">Aucun commentaire de l'expéditeur</Text>
                    )}

                    <Text className="text-white font-cabin-medium mb-1">Commentaires Livraison:</Text>
                    {delivery.deliveryComments ? (
                        <Text className="text-white opacity-80 mb-3 font-cabin">{delivery.deliveryComments}</Text>
                    ) : (
                        <Text className="text-white opacity-60 italic mb-3 font-cabin">Aucun commentaire de livraison</Text>
                    )}

                    <View className="h-8" />
                </ScrollView>

                {/* Bottom Action Bar - Stacked Vertically */}
                <View className="absolute bottom-0 left-0 right-0 flex-col bg-slate-900/95 px-2 py-1.5 border-t border-white/10">
                    <TouchableOpacity
                        onPress={handleModifyDelivery}
                        style={styles.actionButton}
                        className="flex-row justify-center bg-primary rounded-xl"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                        <Text className="text-white text-xs font-cabin-medium ml-1">Modifier</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleCancelDelivery}
                        style={[styles.actionButton, {backgroundColor: '#EAB308'}]}
                        className="flex-row justify-center rounded-xl"
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close-outline" size={14} color="#FFFFFF" />
                        <Text className="text-white text-xs font-cabin-medium ml-1">Annuler</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </GradientView>
    );
}

// Helper functions
function formatFirestoreDate(timestamp: any): string {
    if (!timestamp) return 'N/A';

    // Convert Firestore timestamp to JS Date
    const date = timestamp.toDate ? timestamp.toDate() :
        (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date());

    return format(date, 'dd MMM yyyy');
}

function formatFirestoreTime(timestamp: any): string {
    if (!timestamp) return 'N/A';

    // Convert Firestore timestamp to JS Date
    const date = timestamp.toDate ? timestamp.toDate() :
        (timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date());

    return format(date, 'HH:mm');
}

// Helper functions for status styling
function getStatusStyle(status: string): object {
    let backgroundColor;
    let padding = 4

    switch (status) {
        case 'pending':
            backgroundColor = '#EAB308'; // yellow-500
            break;
        case 'accepted':
            backgroundColor = '#3B82F6'; // blue-500
            break;
        case 'in_progress':
            backgroundColor = '#6366F1'; // indigo-500
            break;
        case 'delivered':
            backgroundColor = '#22C55E'; // green-500
            break;
        case 'cancelled':
            backgroundColor = '#EF4444'; // red-500
            break;
        default:
            backgroundColor = '#6B7280'; // gray-500
    }

    return { backgroundColor, padding };
}

function getStatusText(status: string): string {
    switch (status) {
        case 'pending':
            return 'En attente';
        case 'accepted':
            return 'Accepté';
        case 'in_progress':
            return 'En cours';
        case 'delivered':
            return 'Livré';
        case 'cancelled':
            return 'Annulé';
        default:
            return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
}

const styles = StyleSheet.create({
    mapPlaceholder: {
        height: 120,
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    actionButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 2,
        marginHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center'
    }
});