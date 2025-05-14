import { FirestoreDocument } from './common.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {EmbeddedAddress} from "@/src/models/delivery.model";

export type AgentStatus = 'available' | 'busy' | 'offline' | 'pending_approval';
export type CompanyType = 'micro' | 'sarl' | 'sas' | 'ei' | 'eirl' | 'other';
export type VehicleType = 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'van' | 'truck';

export interface PersonalInfo {
    firstName: string;
    lastName: string;
    birthDate: Date;
    nationality: string;
    birthPlace: string;
    address: EmbeddedAddress;
    email: string;
    phoneNumber: string;
    idType: 'identity_card' | 'passport' | 'residence_permit';
    idPhotoUrl?: string | null; // Changé pour accepter null
    photoUrl?: string | null; // Changé pour accepter null
}

export interface CompanyInfo {
    name: string;
    type: CompanyType;
    sirenNumber: string; // Numéro SIREN/SIRET
    kbisPhotoUrl?: string | null; // Changé pour accepter null
    professionalInsuranceProvider?: string;
    professionalInsurancePhotoUrl?: string | null; // Changé pour accepter null
}

export interface VehicleInfo {
    type: VehicleType;
    model: string;
    year: number;
    plateNumber: string;
    registrationPhotoUrl?: string | null; // Changé pour accepter null
    insuranceProvider?: string;
    insurancePhotoUrl?: string | null; // Changé pour accepter null
}

export interface DriverInfo {
    licenseType: string;
    licensePhotoUrl?: string | null; // Changé pour accepter null
    transportCertificatePhotoUrl?: string | null; // Changé pour accepter null
    trainingRegistrationPhotoUrl?: string | null; // Changé pour accepter null
}

export interface DeliveryAgent extends FirestoreDocument {
    // Status and verification
    activeStatus: AgentStatus;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    termsAccepted: boolean;
    termsAcceptanceDate: Date;

    // Core information
    personalInfo: PersonalInfo;
    companyInfo: CompanyInfo;
    vehicleInfo: VehicleInfo;
    driverInfo: DriverInfo;

    // Location and tracking
    currentLocation?: FirebaseFirestoreTypes.GeoPoint;
    lastLocationUpdate?: Date;

    // Delivery range in kilometers
    deliveryRange?: number;

    // Performance metrics
    rating: number;
    completedDeliveries: number;
    canceledDeliveries: number;
    totalEarnings: number;

    // Payment and financial
    vatApplicable: boolean;
    vatNumber?: string | null; // Changé pour accepter null

    // Settings
    notificationPreferences: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };

    // Timestamps
    lastActive: Date;
    applicationDate: Date;
    approvalDate?: Date;
}