import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/src/models/user.model';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: Error | null;
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, password: string, displayName?: string) => Promise<boolean>;
    logout: () => Promise<boolean>;
    updateProfile: (data: { displayName?: string; photoURL?: string }) => Promise<boolean>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const auth = useAuth();

    return (
        <AuthContext.Provider value={{
            user: auth.user,
            loading: auth.loading,
            error: auth.error,
            login: auth.signIn,
            register: auth.signUp,
            logout: auth.signOut,
            updateProfile: auth.updateProfile,
            isAuthenticated: auth.isAuthenticated
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}