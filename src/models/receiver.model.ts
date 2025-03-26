import { FirestoreDocument } from './common.model';

export interface ReceiverInfo extends FirestoreDocument {
    name: string;
    email?: string;
    phoneNumber: string;
    deliveryId: string;
}
