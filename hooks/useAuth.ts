import { useState, useEffect } from 'react';
import { authService } from '@/src/firebase/auth';
import { UserService } from '@/src/services/user.service';
import { DeliveryAgentService } from '@/src/services/delivery-agent.service';
import {
    User,
    IndividualUser,
    ProfessionalUser,
} from '@/src/models/user.model';
import { handleAuthError, AppError } from '@/src/utils/error-handler';
import { FirebaseAuthTypes } from "@react-native-firebase/auth";

const userService = new UserService();
const deliveryAgentService = new DeliveryAgentService();

// Convert AppError to standard Error
const createErrorFromAppError = (appError: AppError): Error => {
    const error = new Error(appError.message);
    error.name = appError.code as string;
    return error;
};

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Function to fetch the complete user profile
    const fetchCompleteUserProfile = async (uid: string, basicUser: User) => {
        try {
            const userProfile = await userService.getUserById(uid);
            if (userProfile) {
                // Merge auth data with profile data - prioritize Firestore profile over auth
                setUser({
                    ...basicUser,
                    ...userProfile,
                    id: uid,
                    uid: uid
                });
            }
        } catch (err) {
            console.log('Error fetching user profile:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch user profile'));
        }
    };

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
            if (authUser) {
                try {
                    // For just authenticated users, we already have basic profile info
                    setUser(authUser);

                    // Fetch the complete profile with any additional data
                    await fetchCompleteUserProfile(authUser.uid!, authUser);
                } catch (err) {
                    console.log('Error fetching user profile:', err);
                    setError(err instanceof Error ? err : new Error('Failed to fetch user profile'));
                }
            } else {
                setUser(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);
            await authService.signInWithEmailAndPassword(email, password);
            return true;
        } catch (err) {
            console.log('Sign in error:', err);
            const appError = handleAuthError(err as FirebaseAuthTypes.NativeFirebaseAuthError);
            setError(createErrorFromAppError(appError));
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Individual user sign up
    const signUpIndividual = async (
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        phone: string
    ) => {
        try {
            setLoading(true);
            setError(null);
            const userData: Partial<IndividualUser> & { userType: 'individual' } = {
                email,
                firstName,
                lastName,
                phoneNumber: phone,
                userType: 'individual'
            };

            const newUser = await authService.createUser(email, password, userData);

            // Manually fetch the complete user profile after registration
            if (newUser && newUser.uid) {
                await fetchCompleteUserProfile(newUser.uid, newUser);
            } else {
                // If for some reason we can't fetch the complete profile,
                // at least set the basic user information
                setUser(newUser as User);
            }

            return true;
        } catch (err) {
            console.log('Sign up error:', err);
            const appError = handleAuthError(err as FirebaseAuthTypes.NativeFirebaseAuthError);
            setError(createErrorFromAppError(appError));
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Professional user sign up
    const signUpProfessional = async (
        email: string,
        password: string,
        companyName: string,
        contactName: string,
        phone: string,
        isDeliveryAgent = false
    ) => {
        try {
            setLoading(true);
            setError(null);
            const userData: Partial<ProfessionalUser> & { userType: 'professional' } = {
                email,
                companyName,
                contactName,
                phoneNumber: phone,
                userType: 'professional'
            };

            const newUser = await authService.createUser(email, password, userData, isDeliveryAgent);

            // Manually fetch the complete user profile after registration
            if (newUser && newUser.uid) {
                await fetchCompleteUserProfile(newUser.uid, newUser);
            } else {
                // If for some reason we can't fetch the complete profile,
                // at least set the basic user information
                setUser(newUser as User);
            }

            return true;
        } catch (err) {
            console.log('Sign up error:', err);
            const appError = handleAuthError(err as FirebaseAuthTypes.NativeFirebaseAuthError);
            setError(createErrorFromAppError(appError));
            return false;
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setLoading(true);
            setError(null);
            await authService.signOut();
            setUser(null);
            return true;
        } catch (err) {
            console.log('Sign out error:', err);
            const appError = handleAuthError(err as FirebaseAuthTypes.NativeFirebaseAuthError);
            setError(createErrorFromAppError(appError));
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        user,
        loading,
        error,
        signIn,
        signUpIndividual,
        signUpProfessional,
        signOut,
        setError,
        isAuthenticated: !!user
    };
}