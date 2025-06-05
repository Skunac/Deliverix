import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { EmailService } from '@/src/services/email.service';
import { IndividualUser } from '@/src/models/user.model';
import { DeliveryAgent } from '@/src/models/delivery-agent.model';
import { Delivery, PackageCategory, DeliveryState, DeliveryStatus } from '@/src/models/delivery.model';
import { createGeoPoint } from '@/utils/formatters/address-formatter';

const TestEmailButton = () => {
    const [isLoading, setIsLoading] = useState(false);
    const emailService = new EmailService();

    const fakeUser: IndividualUser = {
        id: 'test-user-123',
        uid: 'test-user-123',
        email: 'antduchesne@hotmail.fr',
        userType: 'individual',
        isDeliveryAgent: false,
        isAllowed: true,
        isBanned: false,
        isAdmin: false,
        firstName: 'Antoine',
        lastName: 'Duchesne',
        phoneNumber: '+33 6 12 34 56 78',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2025-06-05'),
        billingAddress: {
            placeId: 'ChIJD7fiBh9u5kcRYJSMaMOCCwQ',
            formattedAddress: '123 Rue de Rivoli, 75001 Paris, France',
            coordinates: createGeoPoint(48.8566, 2.3522),
            obfuscatedCoordinates: createGeoPoint(48.8568, 2.3525),
            components: {
                street_number: '123',
                route: 'Rue de Rivoli',
                locality: 'Paris',
                administrative_area_level_1: 'Île-de-France',
                country: 'France',
                postal_code: '75001'
            }
        }
    };

    const fakeAgent: DeliveryAgent = {
        id: 'test-agent-456',
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2025-06-05'),
        activeStatus: 'available',
        approvalStatus: 'approved',
        termsAccepted: true,
        termsAcceptanceDate: new Date('2024-03-10'),
        personalInfo: {
            firstName: 'Pierre',
            lastName: 'Martin',
            birthDate: new Date('1988-07-15'),
            nationality: 'Française',
            birthPlace: 'Lyon, France',
            address: {
                placeId: 'ChIJMVd4MymAhYAR_aCnhjhLdto',
                formattedAddress: '789 Avenue de la République, 75011 Paris, France',
                coordinates: createGeoPoint(48.8677, 2.3736),
                obfuscatedCoordinates: createGeoPoint(48.8680, 2.3740),
                components: {
                    street_number: '789',
                    route: 'Avenue de la République',
                    locality: 'Paris',
                    administrative_area_level_1: 'Île-de-France',
                    country: 'France',
                    postal_code: '75011'
                }
            },
            email: 'pierre.martin@primex.com',
            phoneNumber: '+33 6 98 76 54 32',
            idType: 'identity_card',
            idPhotoUrl: 'https://storage.firebase.com/agents/456/id_photo.jpg',
            photoUrl: 'https://storage.firebase.com/agents/456/profile.jpg'
        },
        companyInfo: {
            name: 'Express Livraisons SARL',
            type: 'sarl',
            sirenNumber: '123456789',
            kbisPhotoUrl: 'https://storage.firebase.com/agents/456/kbis.jpg',
            professionalInsuranceProvider: 'AXA Pro',
            professionalInsurancePhotoUrl: 'https://storage.firebase.com/agents/456/insurance_pro.jpg'
        },
        vehicleInfo: {
            type: 'car',
            model: 'Peugeot Partner',
            year: 2022,
            plateNumber: 'AB-123-CD',
            registrationPhotoUrl: 'https://storage.firebase.com/agents/456/vehicle_reg.jpg',
            insuranceProvider: 'Maif',
            insurancePhotoUrl: 'https://storage.firebase.com/agents/456/vehicle_insurance.jpg'
        },
        driverInfo: {
            licenseType: 'Permis B',
            licensePhotoUrl: 'https://storage.firebase.com/agents/456/license.jpg',
            transportCertificatePhotoUrl: 'https://storage.firebase.com/agents/456/transport_cert.jpg',
            trainingRegistrationPhotoUrl: null
        },
        currentLocation: createGeoPoint(48.8677, 2.3736),
        lastLocationUpdate: new Date('2025-06-05T10:30:00Z'),
        deliveryRange: 25,
        canceledDeliveries: 3,
        totalEarnings: 12450.75,
        vatApplicable: true,
        vatNumber: 'FR12345678901',
        notificationPreferences: {
            email: true,
            push: true,
            sms: false
        },
        lastActive: new Date('2025-06-05T11:00:00Z'),
        applicationDate: new Date('2024-03-10'),
        approvalDate: new Date('2024-03-15')
    };

    const fakeDelivery: Delivery = {
        id: 'DEL-2025-001234',
        createdAt: new Date('2025-06-05T09:00:00Z'),
        updatedAt: new Date('2025-06-05T11:30:00Z'),
        status: 'delivery_guy_accepted' as DeliveryStatus,
        state: 'processing' as DeliveryState,
        creator: 'test-user-123',
        expeditor: {
            firstName: 'Jean Dupont',
            phoneNumber: '+33 6 11 22 33 44',
            address: {
                placeId: 'ChIJD7fiBh9u5kcRYJSMaMOCCwQ',
                formattedAddress: '123 Rue de la Paix, 75001 Paris, France',
                coordinates: createGeoPoint(48.8566, 2.3522),
                obfuscatedCoordinates: createGeoPoint(48.8568, 2.3525),
                components: {
                    street_number: '123',
                    route: 'Rue de la Paix',
                    locality: 'Paris',
                    administrative_area_level_1: 'Île-de-France',
                    country: 'France',
                    postal_code: '75001'
                }
            }
        },
        receiver: {
            firstName: 'Marie Dubois',
            phoneNumber: '+33 6 55 66 77 88',
            address: {
                placeId: 'ChIJMVd4MymAhYAR_aCnhjhLdto',
                formattedAddress: '456 Avenue des Champs-Élysées, 75008 Paris, France',
                coordinates: createGeoPoint(48.8738, 2.2950),
                obfuscatedCoordinates: createGeoPoint(48.8740, 2.2953),
                components: {
                    street_number: '456',
                    route: 'Avenue des Champs-Élysées',
                    locality: 'Paris',
                    administrative_area_level_1: 'Île-de-France',
                    country: 'France',
                    postal_code: '75008'
                }
            }
        },
        secretCode: 'ABC123',
        billingAddress: {
            placeId: 'ChIJD7fiBh9u5kcRYJSMaMOCCwQ',
            formattedAddress: '123 Rue de Rivoli, 75001 Paris, France',
            coordinates: createGeoPoint(48.8566, 2.3522),
            obfuscatedCoordinates: createGeoPoint(48.8568, 2.3525),
            components: {
                street_number: '123',
                route: 'Rue de Rivoli',
                locality: 'Paris',
                administrative_area_level_1: 'Île-de-France',
                country: 'France',
                postal_code: '75001'
            }
        },
        pickupAddress: {
            placeId: 'ChIJD7fiBh9u5kcRYJSMaMOCCwQ',
            formattedAddress: '123 Rue de la Paix, 75001 Paris, France',
            coordinates: createGeoPoint(48.8566, 2.3522),
            obfuscatedCoordinates: createGeoPoint(48.8568, 2.3525),
            complementaryAddress: 'Bâtiment A, 2ème étage',
            additionalInstructions: 'Sonner à l\'interphone "DUPONT"',
            components: {
                street_number: '123',
                route: 'Rue de la Paix',
                locality: 'Paris',
                administrative_area_level_1: 'Île-de-France',
                country: 'France',
                postal_code: '75001'
            }
        },
        deliveryAddress: {
            placeId: 'ChIJMVd4MymAhYAR_aCnhjhLdto',
            formattedAddress: '456 Avenue des Champs-Élysées, 75008 Paris, France',
            coordinates: createGeoPoint(48.8738, 2.2950),
            obfuscatedCoordinates: createGeoPoint(48.8740, 2.2953),
            complementaryAddress: 'Appartement 15, Code: 4587B',
            additionalInstructions: 'Si absent, laisser chez la gardienne Mme Leroy (loge)',
            components: {
                street_number: '456',
                route: 'Avenue des Champs-Élysées',
                locality: 'Paris',
                administrative_area_level_1: 'Île-de-France',
                country: 'France',
                postal_code: '75008'
            }
        },
        scheduledDate: new Date('2025-06-06T14:00:00Z'),
        timeSlot: {
            start: new Date('2025-06-06T14:00:00Z'),
            end: new Date('2025-06-06T16:00:00Z')
        },
        packageDescription: 'Documents contractuels + échantillons produits tech',
        packageWeight: 2.5,
        packageDimensions: {
            length: 35,
            width: 25,
            height: 15
        },
        packageCategory: 'urgent' as PackageCategory,
        isFragile: true,
        comment: 'Colis fragile contenant des composants électroniques. Sonner à l\'interphone "DUBOIS" au 3ème étage. Si absent, laisser chez la gardienne Mme Leroy.',
        deliveryAgentId: 'test-agent-456',
        price: 18.50,
        rescheduleCount: 0,
        rescheduleHistory: [],
        maxReschedules: 2,
        deleted: false
    };

    const sendTestEmails = async () => {
        setIsLoading(true);
        const testEmail = 'antduchesne@hotmail.fr';

        try {
            console.log('🚀 Starting email tests...');

            // 1. Order Confirmation
            console.log('📧 Sending order confirmation...');
            await emailService.sendEmail('order_confirmation', testEmail, {
                user: fakeUser,
                delivery: fakeDelivery
            });

            // Wait 2 seconds between emails to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 2. Agent Assigned
            console.log('📧 Sending agent assigned...');
            await emailService.sendEmail('agent_assigned', testEmail, {
                user: fakeUser,
                delivery: fakeDelivery,
                agent: fakeAgent
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            // 3. Package Picked Up
            console.log('📧 Sending package picked up...');
            await emailService.sendEmail('package_picked_up', testEmail, {
                user: fakeUser,
                delivery: fakeDelivery,
                agent: fakeAgent
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            // 4. Delivery Reminder
            console.log('📧 Sending delivery reminder...');
            await emailService.sendEmail('delivery_reminder', testEmail, {
                user: fakeUser,
                delivery: fakeDelivery,
                agent: fakeAgent
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            // 5. Delivery Completed
            console.log('📧 Sending delivery completed...');
            await emailService.sendEmail('delivery_completed', testEmail, {
                user: fakeUser,
                delivery: fakeDelivery,
                agent: fakeAgent
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            // 6. Delivery Failed (alternative ending)
            console.log('📧 Sending delivery failed...');
            await emailService.sendEmail('delivery_failed', testEmail, {
                user: fakeUser,
                delivery: fakeDelivery,
                agent: fakeAgent,
                failureReason: 'Destinataire absent malgré plusieurs tentatives de contact'
            });

            Alert.alert(
                '✅ Test terminé !',
                'Tous les emails de test ont été envoyés à antduchesne@hotmail.fr\n\n' +
                'Emails envoyés avec données complètes :\n' +
                '• Commande confirmée\n' +
                '• Livreur assigné (Pierre Martin)\n' +
                '• Colis récupéré\n' +
                '• Rappel de livraison\n' +
                '• Livraison réussie\n' +
                '• Échec de livraison\n\n' +
                'Données utilisées :\n' +
                `• Client: ${fakeUser.firstName} ${fakeUser.lastName}\n` +
                `• Livreur: ${fakeAgent.personalInfo.firstName} ${fakeAgent.personalInfo.lastName}\n` +
                `• Véhicule: ${fakeAgent.vehicleInfo.type} ${fakeAgent.vehicleInfo.model}\n` +
                `• Commande: ${fakeDelivery.id}\n` +
                `• Code secret: ${fakeDelivery.secretCode}\n\n` +
                'Vérifiez votre boîte mail (et les spams) !',
                [{ text: 'OK' }]
            );

        } catch (error) {
            console.error('❌ Error sending test emails:', error);
            Alert.alert(
                '❌ Erreur',
                `Erreur lors de l'envoi des emails de test :\n${error.message}`,
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🧪 Test des emails</Text>
            <Text style={styles.description}>
                Envoie tous les templates d'emails de livraison avec des données de test
            </Text>

            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={sendTestEmails}
                disabled={isLoading}
            >
                <Text style={styles.buttonText}>
                    {isLoading ? '📤 Envoi en cours...' : '📧 Tester tous les emails'}
                </Text>
            </TouchableOpacity>

            <Text style={styles.emailInfo}>
                📩 Destination: antduchesne@hotmail.fr
            </Text>

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>
                        Envoi des 6 templates d'emails...
                        {'\n'}Cela peut prendre 10-15 secondes
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f9f9f9',
        padding: 20,
        margin: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#5DD6FF',
        borderStyle: 'dashed',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F2026',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    button: {
        backgroundColor: '#5DD6FF',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 8,
        marginBottom: 15,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    emailInfo: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    loadingContainer: {
        marginTop: 15,
        padding: 15,
        backgroundColor: '#fff3cd',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
    },
    loadingText: {
        fontSize: 14,
        color: '#856404',
        textAlign: 'center',
        lineHeight: 20,
    },
});
export default TestEmailButton;