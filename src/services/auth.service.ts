import { firebaseAuth } from '@/src/firebase/config';
import { User, UserDataWithType } from '@/src/models/user.model';
import { handleAuthError } from '@/src/utils/error-handler';
import { UserService } from './user.service';

export class AuthService {
    private userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    /**
     * Get the current authenticated user
     */
    getCurrentUser(): User | null {
        const firebaseUser = firebaseAuth.currentUser;
        if (!firebaseUser) return null;

        // Basic mapping - this will be enhanced by Firestore data
        return {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            emailVerified: firebaseUser.emailVerified,
            phoneNumber: firebaseUser.phoneNumber,
            userType: 'individual', // Default type until loaded from Firestore
            isDeliveryAgent: false, // Default value until loaded from Firestore
            firstName: '',
            lastName: ''
        } as User; // Still need this type assertion for the IndividualUser/ProfessionalUser
    }

    /**
     * Create a new user with email and password
     */
    async createUser(
        email: string,
        password: string,
        userData: UserDataWithType,
        isDeliveryAgent = false
    ): Promise<User> {
        try {
            const userCredential = await firebaseAuth.createUserWithEmailAndPassword(
                email,
                password
            );

            const user = userCredential.user;

            const baseUserData = {
                ...userData,
                email: user.email || '',
                uid: user.uid,
                emailVerified: user.emailVerified,
                isDeliveryAgent: isDeliveryAgent,
            };

            await this.userService.createUser(baseUserData, user.uid);

            const userProfile = await this.userService.getUserById(user.uid);

            if (!userProfile) {
                throw new Error('Failed to create user profile');
            }

            return userProfile;
        } catch (error) {
            console.error('Create user error:', error);
            throw handleAuthError(error);
        }
    }

    /**
     * Sign in with email and password
     */
    async signInWithEmailAndPassword(email: string, password: string): Promise<User> {
        try {
            const userCredential = await firebaseAuth.signInWithEmailAndPassword(
                email,
                password
            );

            const user = userCredential.user;

            const userProfile = await this.userService.getUserById(user.uid);

            if (!userProfile) {
                throw new Error('User profile not found');
            }

            return userProfile;
        } catch (error) {
            console.error('Sign in error:', error);
            throw handleAuthError(error);
        }
    }

    /**
     * Sign out the current user
     */
    async signOut(): Promise<void> {
        try {
            await firebaseAuth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
            throw handleAuthError(error);
        }
    }

    /**
     * Delete the current user account and related data
     */
    async deleteAccount(): Promise<void> {
        const user = firebaseAuth.currentUser;
        if (!user) throw new Error('No user is signed in');

        try {
            await this.userService.deleteUser(user.uid);

            await user.delete();
        } catch (error) {
            console.error('Delete account error:', error);
            throw handleAuthError(error);
        }
    }

    /**
     * Register a listener for auth state changes
     */
    onAuthStateChanged(callback: (user: User | null) => void): () => void {
        return firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
            if (!firebaseUser) {
                callback(null);
                return;
            }

            try {
                const userProfile = await this.userService.getUserById(firebaseUser.uid);

                if (userProfile) {
                    callback(userProfile);
                    return;
                }

                callback({
                    id: firebaseUser.uid,
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    emailVerified: firebaseUser.emailVerified,
                    phoneNumber: firebaseUser.phoneNumber,
                    userType: 'individual',
                    isDeliveryAgent: false,
                    firstName: '',
                    lastName: ''
                } as User);
            } catch (error) {
                console.error('Error in auth state change handler:', error);
                callback({
                    id: firebaseUser.uid,
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    emailVerified: firebaseUser.emailVerified,
                    phoneNumber: firebaseUser.phoneNumber,
                    userType: 'individual',
                    isDeliveryAgent: false,
                    firstName: '',
                    lastName: ''
                } as User);
            }
        });
    }

    /**
     * Reset password for a given email
     */
    async resetPassword(email: string): Promise<void> {
        try {
            await firebaseAuth.sendPasswordResetEmail(email);
        } catch (error) {
            console.error('Reset password error:', error);
            throw handleAuthError(error);
        }
    }
}