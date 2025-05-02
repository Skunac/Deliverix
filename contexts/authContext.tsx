import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '@/src/services/auth.service';
import { User } from '@/src/models/user.model';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticating: boolean;
    error: Error | null;
    errorMessage: string;
    resetErrors: () => void;
    signIn: (email: string, password: string) => Promise<boolean>;
    signUpIndividual: (
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        phone: string
    ) => Promise<boolean>;
    signUpProfessional: (
        email: string,
        password: string,
        companyName: string,
        contactName: string,
        phone: string,
        isDeliveryAgent?: boolean
    ) => Promise<boolean>;
    resetPassword: (email: string) => Promise<boolean>;
    updateProfile: (data: { firstName?: string; lastName?: string; photoURL?: string }) => Promise<boolean>;
    signOut: () => Promise<boolean>;
    isAuthenticated: boolean;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a single instance of AuthService to be used across the app
const authService = new AuthService();

export function AuthProvider({ children }: { children: ReactNode }) {
    // State management
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Set up auth state listener on component mount
    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((authUser) => {
            setUser(authUser);
            setLoading(false);
        });

        // Clean up subscription on unmount
        return unsubscribe;
    }, []);

    // Reset all errors
    const resetErrors = () => {
        setError(null);
        setErrorMessage('');
    };

    const signIn = async (email: string, password: string) => {
        try {
            resetErrors();
            setIsAuthenticating(true);

            await authService.signInWithEmailAndPassword(email, password);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Authentication failed'));
            setErrorMessage(err instanceof Error ? err.message : 'Authentication failed');
            return false;
        } finally {
            setIsAuthenticating(false);
        }
    };

    const signUpIndividual = async (email: string, password: string, firstName: string, lastName: string, phone: string) => {
        try {
            resetErrors();
            setIsAuthenticating(true);

            // Create user data object
            const userData = {
                email,
                firstName,
                lastName,
                phoneNumber: phone,
                userType: 'individual' as const
            };

            await authService.createUser(email, password, userData);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Registration failed'));
            setErrorMessage(err instanceof Error ? err.message : 'Registration failed');
            return false;
        } finally {
            setIsAuthenticating(false);
        }
    };

    const signUpProfessional = async (email: string, password: string, companyName: string, contactName: string, phone: string, isDeliveryAgent = false) => {
        try {
            resetErrors();
            setIsAuthenticating(true);

            // Create user data object
            const userData = {
                email,
                companyName,
                contactName,
                phoneNumber: phone,
                userType: 'professional' as const
            };

            await authService.createUser(email, password, userData, isDeliveryAgent);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Registration failed'));
            setErrorMessage(err instanceof Error ? err.message : 'Registration failed');
            return false;
        } finally {
            setIsAuthenticating(false);
        }
    };

    const resetPassword = async (email: string) => {
        try {
            resetErrors();
            setIsAuthenticating(true);

            await authService.resetPassword(email);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Password reset failed'));
            setErrorMessage(err instanceof Error ? err.message : 'Password reset failed');
            return false;
        } finally {
            setIsAuthenticating(false);
        }
    };

    const updateProfile = async (data: { firstName?: string; lastName?: string; photoURL?: string }) => {
        try {
            resetErrors();

            if (!user || !user.uid) {
                throw new Error('User not authenticated');
            }

            // Call service to update profile (this would need to be added to AuthService)
            // await authService.updateUserProfile(user.uid, data);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Profile update failed'));
            setErrorMessage(err instanceof Error ? err.message : 'Profile update failed');
            return false;
        }
    };

    const signOut = async () => {
        try {
            resetErrors();
            setIsAuthenticating(true);

            await authService.signOut();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Sign out failed'));
            setErrorMessage(err instanceof Error ? err.message : 'Sign out failed');
            return false;
        } finally {
            setIsAuthenticating(false);
        }
    };

    const contextValue: AuthContextType = {
        user,
        loading,
        isAuthenticating,
        error,
        errorMessage,
        resetErrors,
        signIn,
        signUpIndividual,
        signUpProfessional,
        resetPassword,
        updateProfile,
        signOut,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}