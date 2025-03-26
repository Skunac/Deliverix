import { FirestoreDocument } from './common.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type DeliveryStatus = 'pending' | 'accepted' | 'in_progress' | 'delivered' | 'cancelled';

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

export interface Delivery extends FirestoreDocument {
    status: DeliveryStatus;
    state: string;
    expeditorId: string;
    receiverId?: string;

    pickupAddress: EmbeddedAddress;
    deliveryAddress: EmbeddedAddress;

    scheduledDate: Date;
    timeSlot: DeliveryTimeSlot;

    packageDescription: string;
    packageWeight: number;
    packageDimensions: PackageDimensions;
    packageCategory: string;

    expeditorComments?: string;
    deliveryComments?: string;

    deliveryAgentId?: string;
    price: number;
}
