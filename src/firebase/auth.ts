import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import auth from '@react-native-firebase/auth';
import { firebaseAuth } from './config';
import { UserRepository } from './repositories/user.repository';
import {
    User,
    UserType,
    IndividualUser,
    ProfessionalUser,
    UserDataWithType
} from '../models/user.model';
import { UserAdapter } from './adapters/user.adapter';

const userRepository = new UserRepository();

// Convert Firebase user to app user model
export const mapFirebaseUser = (
    user: FirebaseAuthTypes.User | null
): User | null => {
    if (!user) return null;

    console.log("Mapping Firebase user:", user.uid);

    return UserAdapter.fromFirebaseUser(user);
};

// Helper functions to create properly typed user data for each user type
function createIndividualUserData(
    data: Partial<IndividualUser> & { userType: 'individual'; email: string; }
): Omit<IndividualUser, 'id'> {
    return {
        ...data,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        userType: 'individual',
        isDeliveryAgent: false
    } as Omit<IndividualUser, 'id'>;
}

function createProfessionalUserData(
    data: Partial<ProfessionalUser> & { userType: 'professional'; email: string; }
): Omit<ProfessionalUser, 'id'> {
    return {
        ...data,
        companyName: data.companyName || '',
        contactName: data.contactName || '',
        userType: 'professional',
        isDeliveryAgent: data.isDeliveryAgent || false
    } as Omit<ProfessionalUser, 'id'>;
}

export const authService = {
    // Current user
    getCurrentUser: (): User | null => {
        const user = firebaseAuth.currentUser;
        console.log("Getting current user:", user?.uid || "none");
        return mapFirebaseUser(user);
    },

    // Sign in with email/password
    signInWithEmailAndPassword: async (
        email: string,
        password: string
    ): Promise<User> => {
        console.log(`Attempting to sign in: ${email}`);
        try {
            const userCredential = await firebaseAuth.signInWithEmailAndPassword(
                email,
                password
            );
            console.log("Sign in successful:", userCredential.user.uid);
            return mapFirebaseUser(userCredential.user)!;
        } catch (error) {
            console.log("Sign in error:", error);
            throw error;
        }
    },

    // Generic user creation method for all user types
    createUser: async (
        email: string,
        password: string,
        userData: UserDataWithType,
        isDeliveryAgent = false
    ): Promise<User> => {
        console.log(`Attempting to create user: ${email}, type: ${userData.userType}, isDeliveryAgent: ${isDeliveryAgent}`);
        try {
            // Create the user account
            const userCredential = await firebaseAuth.createUserWithEmailAndPassword(
                email,
                password
            );

            let user = userCredential.user;
            console.log("User created:", user.uid);

            // Handle display name based on user type
            let displayName = '';

            if (userData.userType === 'individual') {
                const typedData = userData as Partial<IndividualUser> & { userType: 'individual' };
                displayName = `${typedData.firstName || ''} ${typedData.lastName || ''}`.trim();
            } else if (userData.userType === 'professional') {
                const typedData = userData as Partial<ProfessionalUser> & { userType: 'professional' };
                displayName = typedData.companyName || '';
            }

            // Update profile if displayName is provided
            if (displayName) {
                try {
                    console.log(`Updating profile with displayName: ${displayName}`);

                    // Ensure we have the latest user reference
                    const currentUser = firebaseAuth.currentUser;
                    if (!currentUser) {
                        console.warn("No current user found when trying to update profile");
                    } else {
                        // Update profile and wait for it to complete
                        await currentUser.updateProfile({
                            displayName: displayName
                        });

                        // Wait a moment for the update to process
                        await new Promise(resolve => setTimeout(resolve, 1000));

                        // Reload user data to get updated profile
                        await currentUser.reload();

                        // Get fresh user object after reload
                        user = firebaseAuth.currentUser!;

                        // Log to see if the displayName was updated
                        console.log("User after profile update:", {
                            displayName: user?.displayName,
                            uid: user?.uid
                        });
                    }
                } catch (profileError) {
                    console.log("Error updating user profile:", profileError);
                    // Continue with user creation even if profile update fails
                }
            }

            // Create user document in Firestore with reliable data
            console.log("Creating user document in Firestore");

            // Prepare the user data with common fields
            const baseUserData = {
                email: user.email || '',
                photoURL: user.photoURL,
                uid: user.uid,
                emailVerified: user.emailVerified,
                phoneNumber: userData.phoneNumber || user.phoneNumber,
                createdAt: new Date(),
                updatedAt: new Date(),
                isDeliveryAgent: isDeliveryAgent, // Set the delivery agent flag based on the parameter
            };

            let fullUserData;

            // Create properly typed user data based on user type
            if (userData.userType === 'individual') {
                fullUserData = createIndividualUserData({
                    ...baseUserData,
                    ...userData as Partial<IndividualUser>,
                    userType: 'individual'
                } as Partial<IndividualUser> & { userType: 'individual'; email: string; });
            } else {
                fullUserData = createProfessionalUserData({
                    ...baseUserData,
                    ...userData as Partial<ProfessionalUser>,
                    userType: 'professional'
                } as Partial<ProfessionalUser> & { userType: 'professional'; email: string; });
            }

            await userRepository.create(fullUserData, user.uid);

            return mapFirebaseUser(user)!;
        } catch (error) {
            console.log("Create user error:", error);
            throw error;
        }
    },

    // Sign out
    signOut: async (): Promise<void> => {
        console.log("Attempting to sign out");
        try {
            await firebaseAuth.signOut();
            console.log("Sign out successful");
        } catch (error) {
            console.log("Sign out error:", error);
            throw error;
        }
    },

    // Password reset
    sendPasswordResetEmail: async (email: string): Promise<void> => {
        console.log(`Sending password reset email to: ${email}`);
        await firebaseAuth.sendPasswordResetEmail(email);
    },

    // Email verification
    sendEmailVerification: async (): Promise<void> => {
        const user = firebaseAuth.currentUser;
        if (!user) throw new Error('No user is signed in');

        await user.sendEmailVerification();
    },

    // Delete account
    deleteAccount: async (): Promise<void> => {
        const user = firebaseAuth.currentUser;
        if (!user) throw new Error('No user is signed in');

        // Delete user document from Firestore
        await userRepository.delete(user.uid);

        // Delete Firebase auth account
        await user.delete();
    },

    // Auth state observer
    onAuthStateChanged: (
        callback: (user: User | null) => void
    ): (() => void) => {
        console.log("Setting up auth state listener");
        return firebaseAuth.onAuthStateChanged((user) => {
            console.log("Auth state changed:", user?.uid || "signed out");
            callback(mapFirebaseUser(user));
        });
    },
};

export default authService;