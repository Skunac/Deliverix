import { User, UserType, IndividualUser, ProfessionalUser, DeliveryUser, isIndividualUser, isProfessionalUser, isDeliveryUser } from '../../models/user.model';
import { firebaseAuth } from '../config';
import { Address } from '../../models/address.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export class UserAdapter {
    static fromFirebaseUser(user: any): User {
        // Basic user data from Firebase Auth
        const baseUser = {
            id: user.uid,
            uid: user.uid,
            email: user.email || '',
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

        const displayNameParts = user.displayName ? user.displayName.split(' ') : ['', ''];

        // Return a complete Individual User (this will be overridden later with Firestore data)
        return {
            ...baseUser,
            firstName: displayNameParts[0] || '',
            lastName: displayNameParts.slice(1).join(' ') || '',
            userType: 'individual' as const  // Use const assertion to ensure type is exact
        };
    }

    static fromFirestore(data: FirebaseFirestoreTypes.DocumentData, id: string): User {
        // Base user properties common to all user types
        const baseUser = {
            id,
            uid: data.uid || id,
            email: data.email || '',
            photoURL: data.photoURL,
            emailVerified: data.emailVerified,
            phoneNumber: data.phoneNumber,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        };

        // Determine user type and return appropriate model
        const userType = data.userType as UserType || 'individual';

        switch (userType) {
            case 'individual':
                return {
                    ...baseUser,
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    userType: 'individual' as const
                };

            case 'professional':
                return {
                    ...baseUser,
                    companyName: data.companyName || '',
                    contactName: data.contactName || '',
                    siret: data.siret || '',
                    userType: 'professional' as const
                };

            case 'delivery':
                return {
                    ...baseUser,
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    userType: 'delivery' as const
                };

            default:
                // Default to individual if no user type is specified
                return {
                    ...baseUser,
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    userType: 'individual' as const
                };
        }
    }

    static toFirestore(user: Partial<User>): Record<string, any> {
        // Remove the id property
        const { id, ...userData } = user;

        // Ensure the email property is present
        const result: Record<string, any> = {
            ...userData,
            email: userData.email || ''
        };

        // Add any user-type specific properties
        if (user.userType) {
            result.userType = user.userType;

            // For individual and delivery types, ensure firstName and lastName
            if (user.userType === 'individual' || user.userType === 'delivery') {
                const typedUser = user as Partial<IndividualUser> | Partial<DeliveryUser>;
                if (typedUser.firstName) result.firstName = typedUser.firstName;
                if (typedUser.lastName) result.lastName = typedUser.lastName;
            }

            // For professional type, ensure companyName, contactName, and siret
            if (user.userType === 'professional') {
                const typedUser = user as Partial<ProfessionalUser>;
                if (typedUser.companyName) result.companyName = typedUser.companyName;
                if (typedUser.contactName) result.contactName = typedUser.contactName;
                if (typedUser.siret) result.siret = typedUser.siret;
            }
        }

        return result;
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
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
        };
    }

    static addressToFirestore(address: Partial<Address>): Record<string, any> {
        const { id, ...addressData } = address;
        return addressData;
    }
}