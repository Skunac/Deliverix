import { User } from '../../models/user.model';
import firestore from '@react-native-firebase/firestore';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { serverTimestamp } from '../config';

// Convert app model to Firestore format
export function toFirestoreUser(user: Omit<User, 'id'>) {
    return {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: user.createdAt
            ? firestore.Timestamp.fromDate(user.createdAt)
            : serverTimestamp(),
        updatedAt: serverTimestamp()
    };
}

// Convert Firestore data to app model
export function fromFirestoreUser(id: string, data: FirebaseFirestoreTypes.DocumentData): User {
    return {
        id,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
    };
}