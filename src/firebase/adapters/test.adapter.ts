import { Test } from '../../models/test.model';
import firestore from '@react-native-firebase/firestore';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { serverTimestamp } from '../config';

// Convert app model to Firestore format
export function toFirestoreTest(test: Omit<Test, 'id'>) {
    return {
        message: test.message,
        timestamp: test.timestamp instanceof Date
            ? firestore.Timestamp.fromDate(test.timestamp)
            : test.timestamp,
        createdAt: test.createdAt
            ? firestore.Timestamp.fromDate(test.createdAt)
            : serverTimestamp(),
        updatedAt: serverTimestamp()
    };
}

// Convert Firestore data to app model
export function fromFirestoreTest(id: string, data: FirebaseFirestoreTypes.DocumentData): Test {
    return {
        id,
        message: data.message,
        timestamp: data.timestamp?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
    };
}