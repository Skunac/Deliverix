import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { DeliveryAgentService } from '@/src/services/delivery-agent.service';
import { StorageService } from '@/src/services/storage.service';
import { DeliveryAgent } from '@/src/models/delivery-agent.model';
import { useAuth } from '@/contexts/authContext';
import StyledButton from '@/components/ui/StyledButton';
import { GradientView } from '@/components/ui/GradientView';

interface DocumentItem {
    key: string;
    title: string;
    description: string;
    required: boolean;
    category: 'personal' | 'vehicle' | 'professional' | 'certificates';
}

interface DeliveryAgentDocumentsProps {
    onClose: () => void;
}

const DeliveryAgentDocuments: React.FC<DeliveryAgentDocumentsProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [agent, setAgent] = useState<DeliveryAgent | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploadingDocuments, setUploadingDocuments] = useState<string[]>([]);
    const [updating, setUpdating] = useState(false);

    const deliveryAgentService = new DeliveryAgentService();
    const storageService = new StorageService();

    // Document configuration
    const documents: DocumentItem[] = [
        // Personal documents
        {
            key: 'idPhoto',
            title: 'Pièce d\'identité',
            description: 'Carte d\'identité, passeport ou titre de séjour',
            required: true,
            category: 'personal'
        },
        {
            key: 'profilePhoto',
            title: 'Photo de profil',
            description: 'Photo récente pour votre profil livreur',
            required: false,
            category: 'personal'
        },
        // Driver documents
        {
            key: 'licensePhoto',
            title: 'Permis de conduire',
            description: 'Recto-verso de votre permis de conduire',
            required: true,
            category: 'personal'
        },
        // Vehicle documents
        {
            key: 'vehicleRegistrationPhoto',
            title: 'Carte grise du véhicule',
            description: 'Certificat d\'immatriculation de votre véhicule',
            required: true,
            category: 'vehicle'
        },
        {
            key: 'vehicleInsurancePhoto',
            title: 'Assurance véhicule',
            description: 'Attestation d\'assurance de votre véhicule',
            required: true,
            category: 'vehicle'
        },
        // Professional documents
        {
            key: 'professionalInsurancePhoto',
            title: 'Assurance professionnelle',
            description: 'Attestation d\'assurance responsabilité civile professionnelle',
            required: true,
            category: 'professional'
        },
        {
            key: 'kbisPhoto',
            title: 'Extrait Kbis/SIRENE',
            description: 'Extrait Kbis ou relevé SIRENE de moins de 3 mois',
            required: true,
            category: 'professional'
        },
        // Optional certificates
        {
            key: 'transportCertificatePhoto',
            title: 'Certificat de transport -3t5',
            description: 'Certificat de capacité de transport (optionnel)',
            required: false,
            category: 'certificates'
        },
        {
            key: 'trainingRegistrationPhoto',
            title: 'Justificatif de formation',
            description: 'Attestation de formation transport (optionnel)',
            required: false,
            category: 'certificates'
        }
    ];

    // Load agent data
    useEffect(() => {
        const loadAgentData = async () => {
            if (!user?.uid || !user?.isDeliveryAgent) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const agentData = await deliveryAgentService.getAgentProfile(user.uid);
                setAgent(agentData);
            } catch (error) {
                console.error('Error loading agent data:', error);
                Alert.alert('Erreur', 'Impossible de charger vos documents');
            } finally {
                setLoading(false);
            }
        };

        loadAgentData();
    }, [user?.uid, user?.isDeliveryAgent]);

    // Get document URL from agent data
    const getDocumentUrl = (documentKey: string): string | null => {
        if (!agent) return null;

        switch (documentKey) {
            case 'idPhoto':
                return agent.personalInfo?.idPhotoUrl || null;
            case 'profilePhoto':
                return agent.personalInfo?.photoUrl || null;
            case 'licensePhoto':
                return agent.driverInfo?.licensePhotoUrl || null;
            case 'vehicleRegistrationPhoto':
                return agent.vehicleInfo?.registrationPhotoUrl || null;
            case 'vehicleInsurancePhoto':
                return agent.vehicleInfo?.insurancePhotoUrl || null;
            case 'professionalInsurancePhoto':
                return agent.companyInfo?.professionalInsurancePhotoUrl || null;
            case 'kbisPhoto':
                return agent.companyInfo?.kbisPhotoUrl || null;
            case 'transportCertificatePhoto':
                return agent.driverInfo?.transportCertificatePhotoUrl || null;
            case 'trainingRegistrationPhoto':
                return agent.driverInfo?.trainingRegistrationPhotoUrl || null;
            default:
                return null;
        }
    };

    // Handle document upload
    const uploadDocument = async (documentKey: string) => {
        if (!user?.uid) {
            Alert.alert('Erreur', 'Utilisateur non authentifié');
            return;
        }

        try {
            // Request permission and pick image
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            setUploadingDocuments(prev => [...prev, documentKey]);

            // Determine storage path based on document type
            let storagePath = '';
            switch (documentKey) {
                case 'idPhoto':
                    storagePath = `users/${user.uid}/documents/identity/`;
                    break;
                case 'profilePhoto':
                    storagePath = `users/${user.uid}/profile/`;
                    break;
                case 'licensePhoto':
                    storagePath = `users/${user.uid}/documents/license/`;
                    break;
                case 'vehicleRegistrationPhoto':
                    storagePath = `users/${user.uid}/documents/vehicle/`;
                    break;
                case 'vehicleInsurancePhoto':
                    storagePath = `users/${user.uid}/documents/insurance/`;
                    break;
                case 'professionalInsurancePhoto':
                    storagePath = `users/${user.uid}/documents/insurance/`;
                    break;
                case 'kbisPhoto':
                    storagePath = `users/${user.uid}/documents/business/`;
                    break;
                case 'transportCertificatePhoto':
                case 'trainingRegistrationPhoto':
                    storagePath = `users/${user.uid}/documents/certificates/`;
                    break;
                default:
                    storagePath = `users/${user.uid}/documents/other/`;
            }

            // Upload to Firebase Storage
            const photoUrl = await storageService.uploadImage(result.assets[0].uri, storagePath);

            // Update agent profile based on document type
            await updateAgentDocument(documentKey, photoUrl);

            // Reload agent data
            const updatedAgent = await deliveryAgentService.getAgentProfile(user.uid);
            setAgent(updatedAgent);

            Alert.alert('Succès', 'Document mis à jour avec succès');

        } catch (error) {
            console.error('Error uploading document:', error);
            Alert.alert('Erreur', 'Impossible de télécharger le document');
        } finally {
            setUploadingDocuments(prev => prev.filter(key => key !== documentKey));
        }
    };

    // Update agent document in Firestore
    const updateAgentDocument = async (documentKey: string, photoUrl: string) => {
        if (!user?.uid) return;

        const updateData: any = {};

        switch (documentKey) {
            case 'idPhoto':
                await deliveryAgentService.updatePersonalInfo(user.uid, {
                    idPhotoUrl: photoUrl
                });
                break;
            case 'profilePhoto':
                await deliveryAgentService.updatePersonalInfo(user.uid, {
                    photoUrl: photoUrl
                });
                break;
            case 'licensePhoto':
                await deliveryAgentService.updateDriverInfo(user.uid, {
                    licensePhotoUrl: photoUrl
                });
                break;
            case 'vehicleRegistrationPhoto':
                await deliveryAgentService.updateVehicleInfo(user.uid, {
                    registrationPhotoUrl: photoUrl
                });
                break;
            case 'vehicleInsurancePhoto':
                await deliveryAgentService.updateVehicleInfo(user.uid, {
                    insurancePhotoUrl: photoUrl
                });
                break;
            case 'professionalInsurancePhoto':
                await deliveryAgentService.updateCompanyInfo(user.uid, {
                    professionalInsurancePhotoUrl: photoUrl
                });
                break;
            case 'kbisPhoto':
                await deliveryAgentService.updateCompanyInfo(user.uid, {
                    kbisPhotoUrl: photoUrl
                });
                break;
            case 'transportCertificatePhoto':
                await deliveryAgentService.updateDriverInfo(user.uid, {
                    transportCertificatePhotoUrl: photoUrl
                });
                break;
            case 'trainingRegistrationPhoto':
                await deliveryAgentService.updateDriverInfo(user.uid, {
                    trainingRegistrationPhotoUrl: photoUrl
                });
                break;
        }
    };

    // Render document item
    const renderDocumentItem = (document: DocumentItem) => {
        const documentUrl = getDocumentUrl(document.key);
        const isUploading = uploadingDocuments.includes(document.key);

        return (
            <View key={document.key} className="mb-4">
                <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 mr-4">
                        <View className="flex-row items-center mb-1">
                            <Text className="text-white font-cabin-medium text-base">
                                {document.title}
                            </Text>
                            {document.required && (
                                <Text className="text-red-400 ml-1">*</Text>
                            )}
                        </View>
                        <Text className="text-gray-300 font-cabin text-sm">
                            {document.description}
                        </Text>
                    </View>

                    {/* Document preview */}
                    <View className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 items-center justify-center">
                        {documentUrl ? (
                            <Image
                                source={{ uri: documentUrl }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        ) : (
                            <Ionicons name="document-outline" size={24} color="#9CA3AF" />
                        )}
                    </View>
                </View>

                {/* Action button */}
                <TouchableOpacity
                    onPress={() => uploadDocument(document.key)}
                    disabled={isUploading}
                    className={`flex-row items-center justify-center p-3 rounded-lg ${
                        documentUrl ? 'bg-blue-600' : 'bg-primary'
                    }`}
                >
                    {isUploading ? (
                        <>
                            <ActivityIndicator size="small" color="white" />
                            <Text className="text-white font-cabin-medium ml-2">
                                Téléchargement...
                            </Text>
                        </>
                    ) : (
                        <>
                            <Ionicons
                                name={documentUrl ? "refresh" : "camera"}
                                size={18}
                                color="white"
                            />
                            <Text className="text-white font-cabin-medium ml-2">
                                {documentUrl ? 'Remplacer' : 'Ajouter'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Status indicator */}
                <View className="flex-row items-center mt-2">
                    <Ionicons
                        name={documentUrl ? "checkmark-circle" : "alert-circle"}
                        size={16}
                        color={documentUrl ? "#10B981" : "#F59E0B"}
                    />
                    <Text className={`font-cabin text-sm ml-1 ${
                        documentUrl ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                        {documentUrl ? 'Document ajouté' : 'Document manquant'}
                    </Text>
                </View>
            </View>
        );
    };

    // Render document category
    const renderDocumentCategory = (categoryTitle: string, categoryKey: string) => {
        const categoryDocuments = documents.filter(doc => doc.category === categoryKey);

        return (
            <View key={categoryKey} className="bg-dark p-5 rounded-xl mb-6 border border-gray-800">
                <View className="flex-row items-center mb-4">
                    <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-3">
                        <Ionicons name={getCategoryIcon(categoryKey)} size={16} color="#0F2026" />
                    </View>
                    <Text className="text-white text-lg font-cabin-medium">
                        {categoryTitle}
                    </Text>
                </View>
                {categoryDocuments.map(renderDocumentItem)}
            </View>
        );
    };

    // Get category icon
    const getCategoryIcon = (categoryKey: string): string => {
        switch (categoryKey) {
            case 'personal':
                return 'person-outline';
            case 'vehicle':
                return 'car-outline';
            case 'professional':
                return 'briefcase-outline';
            case 'certificates':
                return 'school-outline';
            default:
                return 'document-outline';
        }
    };

    // Loading state
    if (loading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5DD6FF" />
                    <Text className="text-white mt-4 font-cabin">
                        Chargement de vos documents...
                    </Text>
                </View>
            </GradientView>
        );
    }

    // Not authorized state
    if (!user?.isDeliveryAgent) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text className="text-white text-lg font-cabin-medium mt-4 text-center">
                        Accès non autorisé
                    </Text>
                    <Text className="text-gray-300 font-cabin text-center mt-2">
                        Cette section est réservée aux livreurs professionnels.
                    </Text>
                    <StyledButton
                        variant="primary"
                        onPress={onClose}
                        className="mt-6"
                    >
                        <Text className="text-darker font-cabin-medium">Retour</Text>
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
                        Mes documents
                    </Text>
                </View>

                {/* Info banner */}
                <View className="bg-blue-600/20 p-4 rounded-xl mb-6 border border-blue-600/30">
                    <View className="flex-row items-start">
                        <Ionicons name="information-circle" size={24} color="#3B82F6" className="mr-3 mt-1" />
                        <View className="flex-1">
                            <Text className="text-blue-400 font-cabin-medium mb-1">
                                Mise à jour des documents
                            </Text>
                            <Text className="text-blue-200 font-cabin text-sm">
                                Vous pouvez mettre à jour vos documents justificatifs à tout moment.
                                Les documents marqués d'un (*) sont obligatoires pour exercer en tant que livreur.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Document categories */}
                {renderDocumentCategory('Documents personnels', 'personal')}

                {agent?.vehicleInfo.type !== "bicycle" && (
                    renderDocumentCategory('Documents véhicule', 'vehicle')
                )}

                {renderDocumentCategory('Documents professionnels', 'professional')}
                {renderDocumentCategory('Certificats (optionnels)', 'certificates')}

                {/* Bottom spacing */}
                <View className="h-8" />
            </ScrollView>
        </GradientView>
    );
};

export default DeliveryAgentDocuments;