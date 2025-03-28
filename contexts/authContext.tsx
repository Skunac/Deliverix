import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { User } from '@/src/models/user.model';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: Error | null;
    authError: string;
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
        siret: string
    ) => Promise<boolean>;
    signUpDelivery: (
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        phone: string,
        vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'van' | 'truck' | 'on_foot',
        licenseNumber: string,
        availability?: 'full-time' | 'part-time',
        serviceAreas?: string[]
    ) => Promise<boolean>;
    signOut: () => Promise<boolean>;
    updateProfile: (data: { firstName?: string; lastName?: string; photoURL?: string }) => Promise<boolean>;
    isAuthenticated: boolean;
}

// Create a context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a provider component
export function AuthProvider({ children }: { children: ReactNode }) {
    const auth = useAuthHook();
    const [authError, setAuthError] = useState<string>('');

    // Function to reset all errors when navigating between screens
    const resetErrors = () => {
        setAuthError('');
        auth.setError(null);
    };

    // Enhanced auth methods with proper error handling for UI
    const enhancedAuth = {
        ...auth,
        authError,
        resetErrors,

        signIn: async (email: string, password: string) => {
            try {
                // Reset all errors first
                resetErrors();

                const result = await auth.signIn(email, password);
                if (!result && auth.error) {
                    setAuthError(auth.error.message || 'Erreur de connexion');
                }
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
                setAuthError(errorMessage);
                return false;
            }
        },

        signUpIndividual: async (email: string, password: string, firstName: string, lastName: string, phone: string) => {
            try {
                // Reset all errors first
                resetErrors();

                const result = await auth.signUpIndividual(email, password, firstName, lastName, phone);
                if (!result && auth.error) {
                    setAuthError(auth.error.message || 'Erreur lors de l\'inscription');
                }
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'inscription';
                setAuthError(errorMessage);
                return false;
            }
        },

        signUpProfessional: async (email: string, password: string, companyName: string, contactName: string, phone: string, siret: string) => {
            try {
                // Reset all errors first
                resetErrors();

                const result = await auth.signUpProfessional(email, password, companyName, contactName, phone, siret);
                if (!result && auth.error) {
                    setAuthError(auth.error.message || 'Erreur lors de l\'inscription');
                }
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'inscription';
                setAuthError(errorMessage);
                return false;
            }
        },

        signUpDelivery: async (email: string, password: string, firstName: string, lastName: string, phone: string, vehicleType: any, licenseNumber: string, availability?: any, serviceAreas?: string[]) => {
            try {
                // Reset all errors first
                resetErrors();

                const result = await auth.signUpDelivery(email, password, firstName, lastName, phone, vehicleType, licenseNumber, availability, serviceAreas);
                if (!result && auth.error) {
                    setAuthError(auth.error.message || 'Erreur lors de l\'inscription');
                }
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'inscription';
                setAuthError(errorMessage);
                return false;
            }
        },

        signOut: async () => {
            try {
                // Reset all errors first
                resetErrors();

                const result = await auth.signOut();
                if (!result && auth.error) {
                    setAuthError(auth.error.message || 'Erreur lors de la déconnexion');
                }
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la déconnexion';
                setAuthError(errorMessage);
                return false;
            }
        },

        updateProfile: async (data: { firstName?: string; lastName?: string; photoURL?: string }) => {
            try {
                // Reset all errors first
                resetErrors();

                const result = await auth.updateProfile(data);
                if (!result && auth.error) {
                    setAuthError(auth.error.message || 'Erreur lors de la mise à jour du profil');
                }
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du profil';
                setAuthError(errorMessage);
                return false;
            }
        }
    };

    return (
        <AuthContext.Provider value={enhancedAuth}>
            {children}
        </AuthContext.Provider>
    );
}

// Create a hook to use the auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}