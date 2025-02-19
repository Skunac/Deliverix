import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { firebaseAuth } from '@/config/firebaseConfig';
import { firestoreService, Collections, UserDocument } from './firestore';

export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    phoneNumber: string | null;
}

// Convert Firebase user to app user model
export const mapFirebaseUser = (
    user: FirebaseAuthTypes.User | null
): AuthUser | null => {
    if (!user) return null;

    console.log("Mapping Firebase user:", user.uid);

    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
    };
};

export const authService = {
    // Current user
    getCurrentUser: (): AuthUser | null => {
        const user = firebaseAuth.currentUser;
        console.log("Getting current user:", user?.uid || "none");
        return mapFirebaseUser(user);
    },

    // Sign in with email/password
    signInWithEmailAndPassword: async (
        email: string,
        password: string
    ): Promise<AuthUser> => {
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
    ): Promise<AuthUser> => {
        console.log(`Attempting to create user: ${email}`);
        try {
            const userCredential = await firebaseAuth.createUserWithEmailAndPassword(
                email,
                password
            );

            const user = userCredential.user;
            console.log("User created:", user.uid);

            // Update profile if displayName is provided
            if (displayName) {
                console.log(`Updating profile with displayName: ${displayName}`);
                await user.updateProfile({ displayName });
            }

            // Create user document in Firestore
            console.log("Creating user document in Firestore");
            await firestoreService.createDocument<UserDocument>(
                Collections.USERS,
                {
                    email: user.email || '',  // Fallback if null
                    displayName: user.displayName,
                    photoURL: user.photoURL,
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
        await firestoreService.updateDocument<UserDocument>(
            Collections.USERS,
            user.uid,
            data
        );
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
        await firestoreService.updateDocument<UserDocument>(
            Collections.USERS,
            user.uid,
            { email: newEmail }
        );
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
        await firestoreService.deleteDocument(Collections.USERS, user.uid);

        // Delete Firebase auth account
        await user.delete();
    },

    // Auth state observer
    onAuthStateChanged: (
        callback: (user: AuthUser | null) => void
    ): (() => void) => {
        console.log("Setting up auth state listener");
        return firebaseAuth.onAuthStateChanged((user) => {
            console.log("Auth state changed:", user?.uid || "signed out");
            callback(mapFirebaseUser(user));
        });
    },
};