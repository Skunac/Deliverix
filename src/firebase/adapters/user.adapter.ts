import { User } from '../../models/user.model';

export class UserAdapter {
    static fromFirebaseUser(user: any): User {
        // Basic user data from Firebase Auth
        const baseUser = {
            id: user.uid,
            uid: user.uid,
            email: user.email || '',
            emailVerified: user.emailVerified,
            phoneNumber: user.phoneNumber,
            isDeliveryAgent: false, // Default to false for new users
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
}