import { FirestoreDocument } from './common.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type AgentStatus = 'available' | 'busy' | 'offline' | 'pending_approval';

export interface AvailabilitySlot {
    dayOfWeek: number; // 0-6 (Sunday to Saturday)
    startTime: string; // Format: "HH:MM" in 24h format
    endTime: string; // Format: "HH:MM" in 24h format
    isRecurring: boolean;
}

export interface SpecificDateAvailability {
    date: Date;
    slots: Array<{
        startTime: string;
        endTime: string;
    }>;
}

export interface PaymentInfo {
    iban?: string;
    bankName?: string;
    accountHolderName?: string;
    taxIdentificationNumber?: string;
}

export interface DeliveryAgent extends FirestoreDocument {
    // Status and verification
    activeStatus: AgentStatus;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    verificationNotes?: string;

    // Profile and capabilities
    firstName: string;
    lastName: string;
    profilePhoto?: string;
    biography?: string;

    // Location and tracking
    currentLocation?: FirebaseFirestoreTypes.GeoPoint;
    lastLocationUpdate?: Date;

    // Vehicle information
    vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'van' | 'truck' | 'on_foot';
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehiclePlateNumber?: string;

    // Performance metrics
    rating: number;
    completedDeliveries: number;
    canceledDeliveries: number;
    totalEarnings: number;

    // Schedule and availability
    weeklyAvailability: AvailabilitySlot[];
    specialAvailability: SpecificDateAvailability[];
    unavailableDates: Date[];
    maxDailyDeliveries?: number;
    maxDeliveryDistance?: number;
    serviceAreas?: string[]; // ZIP codes or area names

    // Payment and financial
    paymentInfo: PaymentInfo;

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