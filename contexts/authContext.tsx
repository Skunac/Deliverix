import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, AuthUser } from '@/services/firebase/auth';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName?: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log("AuthProvider: Setting up auth state listener");
        // Check current user on initialization
        const initialUser = authService.getCurrentUser();
        console.log("Initial auth user:", initialUser?.uid || "none");

        // Set up auth state listener
        const unsubscribe = authService.onAuthStateChanged((user) => {
            console.log("AuthProvider: Auth state changed", user?.uid || "signed out");
            setUser(user);
            setLoading(false);
        });

        // Cleanup subscription
        return () => {
            console.log("AuthProvider: Cleaning up auth listener");
            unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        console.log(`AuthProvider: Attempting login for ${email}`);
        setError(null);
        try {
            setLoading(true);
            await authService.signInWithEmailAndPassword(email, password);
            console.log("AuthProvider: Login successful");
        } catch (err) {
            const errorMessage = (err as Error).message;
            console.error("AuthProvider: Login error", errorMessage);
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const register = async (email: string, password: string, displayName?: string) => {
        console.log(`AuthProvider: Attempting registration for ${email}`);
        setError(null);
        try {
            setLoading(true);
            await authService.createUserWithEmailAndPassword(email, password, displayName);
            console.log("AuthProvider: Registration successful");
        } catch (err) {
            const errorMessage = (err as Error).message;
            console.error("AuthProvider: Registration error", errorMessage);
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        console.log("AuthProvider: Attempting logout");
        setError(null);
        try {
            setLoading(true);
            await authService.signOut();
            console.log("AuthProvider: Logout successful");
        } catch (err) {
            const errorMessage = (err as Error).message;
            console.error("AuthProvider: Logout error", errorMessage);
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (email: string) => {
        console.log(`AuthProvider: Attempting password reset for ${email}`);
        setError(null);
        try {
            setLoading(true);
            await authService.sendPasswordResetEmail(email);
            console.log("AuthProvider: Password reset email sent");
        } catch (err) {
            const errorMessage = (err as Error).message;
            console.error("AuthProvider: Password reset error", errorMessage);
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateUserProfile = async (data: { displayName?: string; photoURL?: string }) => {
        console.log("AuthProvider: Attempting profile update", data);
        setError(null);
        try {
            setLoading(true);
            await authService.updateProfile(data);
            console.log("AuthProvider: Profile update successful");
            // Update local user state with new profile data
            if (user) {
                const updatedUser = {
                    ...user,
                    displayName: data.displayName ?? user.displayName,
                    photoURL: data.photoURL ?? user.photoURL,
                };
                console.log("AuthProvider: Updating local user state", updatedUser);
                setUser(updatedUser);
            }
        } catch (err) {
            const errorMessage = (err as Error).message;
            console.error("AuthProvider: Profile update error", errorMessage);
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Log state changes
    useEffect(() => {
        console.log("AuthContext state updated:", {
            userExists: !!user,
            userId: user?.uid,
            loading,
            errorExists: !!error,
        });
    }, [user, loading, error]);

    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        resetPassword,
        updateUserProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        console.error("useAuth must be used within an AuthProvider");
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};