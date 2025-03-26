import { useState, useEffect } from 'react';
import { authService } from '@/src/firebase/auth';
import { UserService } from '@/src/services/user.service';
import { User } from '@/src/models/user.model';
import { handleAuthError, AppError } from '@/src/utils/error-handler';
import { FirebaseAuthTypes } from "@react-native-firebase/auth";

const userService = new UserService();

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

    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged(async (authUser) => {
            if (authUser) {
                try {
                    // For just authenticated users, we already have basic profile info
                    setUser(authUser);

                    // But we can fetch the complete profile with any additional data
                    const userProfile = await userService.getUserById(authUser.uid!);
                    if (userProfile) {
                        // Merge auth data with profile data - prioritize Firestore profile over auth
                        setUser({
                            ...authUser,
                            ...userProfile,
                            // Make sure displayName from Firestore overrides auth if available
                            displayName: userProfile.displayName || authUser.displayName,
                            // Ensure id and uid are consistent
                            id: authUser.uid!,
                            uid: authUser.uid
                        });
                    }
                } catch (err) {
                    console.error('Error fetching user profile:', err);
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
            console.error('Sign in error:', err);
            const appError = handleAuthError(err as FirebaseAuthTypes.NativeFirebaseAuthError);
            setError(createErrorFromAppError(appError));
            return false;
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email: string, password: string, displayName?: string) => {
        try {
            setLoading(true);
            setError(null);
            const newUser = await authService.createUserWithEmailAndPassword(email, password, displayName);

            // Manually update the user state with displayName to show immediately
            if (displayName && newUser) {
                setUser(prevUser => {
                    if (prevUser) {
                        return {
                            ...prevUser,
                            displayName: displayName
                        };
                    }
                    return prevUser;
                });
            }

            return true;
        } catch (err) {
            console.error('Sign up error:', err);
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
            return true;
        } catch (err) {
            console.error('Sign out error:', err);
            const appError = handleAuthError(err as FirebaseAuthTypes.NativeFirebaseAuthError);
            setError(createErrorFromAppError(appError));
            return false;
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (data: { displayName?: string; photoURL?: string }) => {
        try {
            setLoading(true);
            setError(null);
            await authService.updateProfile(data);

            // Update local state immediately
            if (user) {
                setUser({
                    ...user,
                    displayName: data.displayName ?? user.displayName,
                    photoURL: data.photoURL ?? user.photoURL
                });
            }

            return true;
        } catch (err) {
            console.error('Update profile error:', err);
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
        signUp,
        signOut,
        updateProfile,
        isAuthenticated: !!user
    };
}