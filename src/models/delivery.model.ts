import { FirestoreDocument } from './common.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type DeliveryState = 'waiting_for_prepayment' | 'prepaid'  | 'processing' | 'waiting_for_payment' | 'paid' | 'completed' | 'cancelled'; // financial state
export type DeliveryStatus = 'waiting_for_delivery_guy' | 'delivery_guy_accepted' | 'picked_up' | 'delivered' | 'failed'; // delivery state
export type PackageCategory = 'exceptional' | 'urgent' | 'expensive' | 'sensitive' | 'urgent_mechanical_parts' | 'aeronotics' | 'rare' | 'sentimental_value' | 'products' | 'it_equipment' | 'gift';

export interface DeliveryTimeSlot {
    start: Date;
    end: Date;
}

export interface PackageDimensions {
    length: number;
    width: number;
    height: number;
}

export interface EmbeddedAddress {
    placeId: string;
    formattedAddress: string;
    coordinates: FirebaseFirestoreTypes.GeoPoint;
    obfuscatedCoordinates: FirebaseFirestoreTypes.GeoPoint;
    complementaryAddress?: string;
    additionalInstructions?: string;
    components: {
        street_number?: string;
        route?: string;
        locality?: string;
        administrative_area_level_1?: string;
        country?: string;
        postal_code?: string;
    };
}

export interface Person {
    firstName: string;
    phoneNumber: string;
    address: EmbeddedAddress;
}

export interface Delivery extends FirestoreDocument {
    status: DeliveryStatus;
    state: DeliveryState;
    creator: string;
    expeditor: Person;
    receiver: Person;

    secretCode: string;

    billingAddress: EmbeddedAddress;
    pickupAddress: EmbeddedAddress;
    deliveryAddress: EmbeddedAddress;

    scheduledDate: Date;
    timeSlot: DeliveryTimeSlot;

    packageDescription: string;
    packageWeight: number;
    packageDimensions: PackageDimensions;
    packageCategory: PackageCategory;
    isFragile: boolean;

    comment?: string;

    deliveryAgentId?: string;
    price: number;

    deleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
}