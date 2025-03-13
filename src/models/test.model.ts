import { FirestoreDocument } from './common.model';

export interface Test extends FirestoreDocument {
    message: string;
    timestamp: Date;
}