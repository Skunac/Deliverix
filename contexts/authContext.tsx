import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { User } from '@/src/models/user.model';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: Error | null;
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

    return (
        <AuthContext.Provider value={auth}>
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