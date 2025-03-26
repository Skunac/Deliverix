import { FirestoreDocument } from './common.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { DeliveryStatus } from './delivery.model';

export interface DeliveryHistoryEvent extends FirestoreDocument {
    timestamp: Date;
    status: DeliveryStatus;
    state: string;
    agentId?: string;
    location?: FirebaseFirestoreTypes.GeoPoint;
    notes?: string;
    deliveryId: string;
}
