import {
    DeliveryAgent,
    PersonalInfo,
    CompanyInfo,
    VehicleInfo,
    DriverInfo
} from '../../models/delivery-agent.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export class DeliveryAgentAdapter {
    static fromFirestore(data: FirebaseFirestoreTypes.DocumentData): DeliveryAgent {
        // Convert Firestore timestamps to JavaScript Date objects
        const createdAt = data.createdAt?.toDate() || new Date();
        const updatedAt = data.updatedAt?.toDate() || new Date();
        const lastActive = data.lastActive?.toDate() || new Date();
        const lastLocationUpdate = data.lastLocationUpdate?.toDate();
        const applicationDate = data.applicationDate?.toDate() || new Date();
        const approvalDate = data.approvalDate?.toDate();
        const termsAcceptanceDate = data.termsAcceptanceDate?.toDate() || new Date();
        const birthDate = data.personalInfo?.birthDate?.toDate() || new Date();

        // Convert personal info with dates
        const personalInfo: PersonalInfo = {
            firstName: data.personalInfo?.firstName || '',
            lastName: data.personalInfo?.lastName || '',
            birthDate: birthDate,
            nationality: data.personalInfo?.nationality || '',
            birthPlace: data.personalInfo?.birthPlace || '',
            address: data.personalInfo?.address || {
                street: '',
                postalCode: '',
                city: '',
                country: 'France'
            },
            email: data.personalInfo?.email || '',
            phoneNumber: data.personalInfo?.phoneNumber || '',
            idType: data.personalInfo?.idType || 'identity_card',
            idPhotoUrl: data.personalInfo?.idPhotoUrl,
            photoUrl: data.personalInfo?.photoUrl
        };

        // Convert company info
        const companyInfo: CompanyInfo = {
            name: data.companyInfo?.name || '',
            type: data.companyInfo?.type || 'other',
            sirenNumber: data.companyInfo?.sirenNumber || '',
            kbisPhotoUrl: data.companyInfo?.kbisPhotoUrl,
            professionalInsuranceProvider: data.companyInfo?.professionalInsuranceProvider || '',
            professionalInsurancePhotoUrl: data.companyInfo?.professionalInsurancePhotoUrl
        };

        // Convert vehicle info
        const vehicleInfo: VehicleInfo = {
            type: data.vehicleInfo?.type || 'car',
            model: data.vehicleInfo?.model || '',
            year: data.vehicleInfo?.year || new Date().getFullYear(),
            plateNumber: data.vehicleInfo?.plateNumber || '',
            registrationPhotoUrl: data.vehicleInfo?.registrationPhotoUrl,
            insuranceProvider: data.vehicleInfo?.insuranceProvider || '',
            insurancePhotoUrl: data.vehicleInfo?.insurancePhotoUrl
        };

        // Convert driver info
        const driverInfo: DriverInfo = {
            licenseType: data.driverInfo?.licenseType || '',
            licensePhotoUrl: data.driverInfo?.licensePhotoUrl,
            transportCertificatePhotoUrl: data.driverInfo?.transportCertificatePhotoUrl,
            trainingRegistrationPhotoUrl: data.driverInfo?.trainingRegistrationPhotoUrl
        };

        return {
            id: data.id || 'default',
            activeStatus: data.activeStatus || 'offline',
            approvalStatus: data.approvalStatus || 'pending',
            termsAccepted: data.termsAccepted || false,
            termsAcceptanceDate: termsAcceptanceDate,

            // Core information
            personalInfo: personalInfo,
            companyInfo: companyInfo,
            vehicleInfo: vehicleInfo,
            driverInfo: driverInfo,

            // Location and tracking
            currentLocation: data.currentLocation,
            lastLocationUpdate,

            // Performance metrics
            rating: data.rating || 5,
            completedDeliveries: data.completedDeliveries || 0,
            canceledDeliveries: data.canceledDeliveries || 0,
            totalEarnings: data.totalEarnings || 0,

            // Delivery range
            deliveryRange: data.deliveryRange,

            // Payment and financial
            vatApplicable: data.vatApplicable || false,
            vatNumber: data.vatNumber,

            // Settings
            notificationPreferences: data.notificationPreferences || {
                email: true,
                push: true,
                sms: false
            },

            // Timestamps
            lastActive,
            applicationDate,
            approvalDate,
            createdAt,
            updatedAt
        };
    }

    static toFirestore(agent: Partial<DeliveryAgent>): Record<string, any> {
        // Remove id from the data to be sent to Firestore
        const { id, ...agentData } = agent;
        return agentData;
    }
}