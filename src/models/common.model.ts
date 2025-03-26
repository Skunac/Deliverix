import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface FirestoreDocument {
    id: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// Interface for creating documents that will use server timestamps
export interface FirestoreDocumentData {
    [key: string]: any;
    createdAt?: FirebaseFirestoreTypes.FieldValue | Date;
    updatedAt?: FirebaseFirestoreTypes.FieldValue | Date;
}