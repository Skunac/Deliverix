import { User } from '../../models/user.model';
import { firebaseAuth } from '../config';
import { Address } from '../../models/address.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export class UserAdapter {
    static fromFirebaseUser(user: any): User {
        return {
            id: user.uid,
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
            phoneNumber: user.phoneNumber,
            createdAt: user.metadata?.creationTime
                ? new Date(user.metadata.creationTime)
                : new Date(),
            updatedAt: user.metadata?.lastSignInTime
                ? new Date(user.metadata.lastSignInTime)
                : new Date()
        };
    }

    static fromFirestore(data: FirebaseFirestoreTypes.DocumentData, id: string): User {
        return {
            id,
            uid: data.uid || id,
            email: data.email || '',
            displayName: data.displayName,
            photoURL: data.photoURL,
            emailVerified: data.emailVerified,
            phoneNumber: data.phoneNumber,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
        };
    }

    static toFirestore(user: Partial<User>): Omit<User, "id"> {
        // Remove the id property
        const { id, ...userData } = user;

        // Ensure the email property is present for required type
        if (!userData.email && user.email) {
            userData.email = user.email;
        }

        // Default value for email if it's completely missing
        if (!userData.email) {
            userData.email = '';
        }

        return userData as Omit<User, "id">;
    }

    static addressFromFirestore(data: FirebaseFirestoreTypes.DocumentData, id: string): Address {
        return {
            id,
            userId: data.userId,
            placeId: data.placeId,
            formattedAddress: data.formattedAddress,
            label: data.label,
            coordinates: data.coordinates,
            additionalInstructions: data.additionalInstructions,
            isDefault: data.isDefault || false,
            components: data.components || {},
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
        };
    }

    static addressToFirestore(address: Partial<Address>): Record<string, any> {
        const { id, ...addressData } = address;
        return addressData;
    }
}