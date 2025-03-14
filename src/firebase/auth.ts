import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { firebaseAuth } from './config';
import { userRepository } from './repositories/user.repository';
import { User } from '../models/user.model';

// Convert Firebase user to app user model
export const mapFirebaseUser = (
    user: FirebaseAuthTypes.User | null
): User | null => {
    if (!user) return null;

    console.log("Mapping Firebase user:", user.uid);

    return {
        id: user.uid,         // Set the document id to match the uid
        uid: user.uid,        // Keep the uid field for clarity
        email: user.email || '',
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
    };
};

export const auth = {
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
            console.error("Sign in error:", error);
            throw error;
        }
    },

    // Create account with email/password
    createUserWithEmailAndPassword: async (
        email: string,
        password: string,
        displayName?: string
    ): Promise<User> => {
        console.log(`Attempting to create user: ${email}`);
        try {
            // Create the user account
            const userCredential = await firebaseAuth.createUserWithEmailAndPassword(
                email,
                password
            );

            let user = userCredential.user;
            console.log("User created:", user.uid);

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
                        user = firebaseAuth.currentUser;

                        // Log to see if the displayName was updated
                        console.log("User after profile update:", {
                            displayName: user?.displayName,
                            uid: user?.uid
                        });
                    }
                } catch (profileError) {
                    console.error("Error updating user profile:", profileError);
                    // Continue with user creation even if profile update fails
                }
            }

            // Create user document in Firestore with reliable data
            console.log("Creating user document in Firestore");
            await userRepository.create(
                {
                    email: user.email || '',  // Fallback if null
                    displayName: user?.displayName || displayName || '',
                    photoURL: user.photoURL,
                    uid: user.uid,
                    emailVerified: user.emailVerified,
                    phoneNumber: user.phoneNumber
                },
                user.uid // Use UID as document ID
            );

            return mapFirebaseUser(user)!;
        } catch (error) {
            console.error("Create user error:", error);
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
            console.error("Sign out error:", error);
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
        data: { displayName?: string; photoURL?: string }
    ): Promise<void> => {
        const user = firebaseAuth.currentUser;
        if (!user) {
            console.error("No user signed in");
            throw new Error('No user is signed in');
        }

        console.log(`Updating profile for: ${user.uid}`);
        await user.updateProfile(data);

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