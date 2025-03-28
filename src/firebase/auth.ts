import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import auth from '@react-native-firebase/auth';
import { firebaseAuth } from './config';
import { UserRepository } from './repositories/user.repository';
import {
    User,
    UserType,
    IndividualUser,
    ProfessionalUser,
    DeliveryUser,
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
        userType: 'individual'
    } as Omit<IndividualUser, 'id'>;
}

function createProfessionalUserData(
    data: Partial<ProfessionalUser> & { userType: 'professional'; email: string; }
): Omit<ProfessionalUser, 'id'> {
    return {
        ...data,
        companyName: data.companyName || '',
        contactName: data.contactName || '',
        siret: data.siret || '',
        userType: 'professional'
    } as Omit<ProfessionalUser, 'id'>;
}

function createDeliveryUserData(
    data: Partial<DeliveryUser> & { userType: 'delivery'; email: string; }
): Omit<DeliveryUser, 'id'> {
    return {
        ...data,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        userType: 'delivery'
    } as Omit<DeliveryUser, 'id'>;
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
        userData: UserDataWithType
    ): Promise<User> => {
        console.log(`Attempting to create user: ${email}, type: ${userData.userType}`);
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

            if (userData.userType === 'individual' || userData.userType === 'delivery') {
                const typedData = userData as Partial<IndividualUser | DeliveryUser> & { userType: 'individual' | 'delivery' };
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
            };

            let fullUserData;

            // Create properly typed user data based on user type
            if (userData.userType === 'individual') {
                fullUserData = createIndividualUserData({
                    ...baseUserData,
                    ...userData as Partial<IndividualUser>,
                    userType: 'individual'
                } as Partial<IndividualUser> & { userType: 'individual'; email: string; });
            }
            else if (userData.userType === 'professional') {
                fullUserData = createProfessionalUserData({
                    ...baseUserData,
                    ...userData as Partial<ProfessionalUser>,
                    userType: 'professional'
                } as Partial<ProfessionalUser> & { userType: 'professional'; email: string; });
            }
            else { // delivery
                fullUserData = createDeliveryUserData({
                    ...baseUserData,
                    ...userData as Partial<DeliveryUser>,
                    userType: 'delivery'
                } as Partial<DeliveryUser> & { userType: 'delivery'; email: string; });
            }

            await userRepository.create(fullUserData, user.uid);

            return mapFirebaseUser(user)!;
        } catch (error) {
            console.log("Create user error:", error);
            throw error;
        }
    },

    // Legacy method for backward compatibility
    createUserWithEmailAndPassword: async (
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        phone: string
    ): Promise<User> => {
        return await authService.createUser(email, password, {
            firstName,
            lastName,
            phoneNumber: phone,
            userType: 'individual'
        });
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

    // Update profile
    updateProfile: async (
        data: { firstName?: string; lastName?: string; photoURL?: string }
    ): Promise<void> => {
        const user = firebaseAuth.currentUser;
        if (!user) {
            console.log("No user signed in");
            console.log("No user signed in");
            throw new Error('No user is signed in');
        }

        console.log(`Updating profile for: ${user.uid}`);

        // Get current user data from Firestore to determine user type
        const currentUserData = await userRepository.getById(user.uid);
        if (!currentUserData) {
            throw new Error('User not found in database');
        }

        const userType = currentUserData.userType;

        // Update display name based on user type
        if ((userType === 'individual' || userType === 'delivery') &&
            (data.firstName || data.lastName)) {
            // For individuals and delivery agents, get existing names
            const firstName = data.firstName ||
                (userType === 'individual' || userType === 'delivery' ?
                    (currentUserData as IndividualUser | DeliveryUser).firstName : '');

            const lastName = data.lastName ||
                (userType === 'individual' || userType === 'delivery' ?
                    (currentUserData as IndividualUser | DeliveryUser).lastName : '');

            const displayName = `${firstName} ${lastName}`.trim();

            await user.updateProfile({
                displayName,
                photoURL: data.photoURL
            });
        } else if (data.photoURL) {
            // Just update photo URL if that's all that's changing
            await user.updateProfile({
                photoURL: data.photoURL
            });
        }

        // Update user document in Firestore
        console.log("Updating user document in Firestore");
        await userRepository.update(user.uid, data);
    },

    // Email verification
    sendEmailVerification: async (): Promise<void> => {
        const user = firebaseAuth.currentUser;
        if (!user) throw new Error('No user is signed in');

        await user.sendEmailVerification();
    },

    // Change email
    updateEmail: async (newEmail: string): Promise<void> => {
        const user = firebaseAuth.currentUser;
        if (!user) throw new Error('No user is signed in');

        await user.updateEmail(newEmail);

        // Update email in Firestore
        await userRepository.update(user.uid, { email: newEmail });
    },

    // Change password
    updatePassword: async (newPassword: string): Promise<void> => {
        const user = firebaseAuth.currentUser;
        if (!user) throw new Error('No user is signed in');

        await user.updatePassword(newPassword);
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

    // Reauthenticate user
    reauthenticate: async (password: string): Promise<void> => {
        const user = firebaseAuth.currentUser;
        if (!user || !user.email) throw new Error('No user is signed in or email is missing');

        // Use the auth module's EmailAuthProvider
        const credential = auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
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