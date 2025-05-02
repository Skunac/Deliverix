import { useState, useEffect } from 'react';
import { User } from '@/src/models/user.model';
import {AuthService} from "@/src/services/auth.service";

// Create a single instance of the AuthService
const authService = new AuthService();

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Set up auth state listener on component mount
    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((authUser) => {
            // The new AuthService now handles the complete user profile fetching internally
            setUser(authUser);
            setLoading(false);
        });

        // Clean up subscription on unmount
        return unsubscribe;
    }, []);

    // Sign in with email and password
    const signIn = async (email: string, password: string) => {
        try {
            setLoading(true);
            setError(null);
            await authService.signInWithEmailAndPassword(email, password);
            return true;
        } catch (err) {
            console.log('Sign in error:', err);
            setError(err instanceof Error ? err : new Error('Authentication failed'));
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

            // Create user data object
            const userData = {
                email,
                firstName,
                lastName,
                phoneNumber: phone,
                userType: 'individual' as const
            };

            // Use the new createUser method that handles both Auth and Firestore
            await authService.createUser(email, password, userData);
            return true;
        } catch (err) {
            console.log('Sign up error:', err);
            setError(err instanceof Error ? err : new Error('Registration failed'));
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

            // Create user data object
            const userData = {
                email,
                companyName,
                contactName,
                phoneNumber: phone,
                userType: 'professional' as const
            };

            // Use the new createUser method that handles both Auth and Firestore
            await authService.createUser(email, password, userData, isDeliveryAgent);
            return true;
        } catch (err) {
            console.log('Sign up error:', err);
            setError(err instanceof Error ? err : new Error('Registration failed'));
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Sign out
    const signOut = async () => {
        try {
            setLoading(true);
            setError(null);
            await authService.signOut();
            setUser(null);
            return true;
        } catch (err) {
            console.log('Sign out error:', err);
            setError(err instanceof Error ? err : new Error('Sign out failed'));
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Password reset
    const resetPassword = async (email: string) => {
        try {
            setLoading(true);
            setError(null);
            await authService.resetPassword(email);
            return true;
        } catch (err) {
            console.log('Reset password error:', err);
            setError(err instanceof Error ? err : new Error('Password reset failed'));
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Return the hook values and methods
    return {
        user,
        loading,
        error,
        signIn,
        signUpIndividual,
        signUpProfessional,
        signOut,
        resetPassword,
        setError,
        isAuthenticated: !!user
    };
}