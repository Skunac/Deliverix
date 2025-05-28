import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService } from '@/src/services/auth.service';
import { User } from '@/src/models/user.model';
import { UserService } from "@/src/services/user.service";
import {queryClient} from "@/contexts/queryContext";
import {enhancedDeliveryService} from "@/src/services/delivery.service.enhanced";

interface RegistrationStatus {
    isCompleted: boolean;
    currentStep: number;
    userType: 'individual' | 'professional' | 'delivery' | null;
}

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
    refreshUserProfile: () => Promise<void>;
    signOut: () => Promise<boolean>;
    isAuthenticated: boolean;

    // Registration flow management
    registrationStatus: RegistrationStatus;
    updateRegistrationStatus: (status: Partial<RegistrationStatus>) => void;
    completeRegistration: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authService = new AuthService();
const userService = new UserService();

export function AuthProvider({ children }: { children: ReactNode }) {
    // State management
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Registration status state
    const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>({
        isCompleted: true,
        currentStep: 1,
        userType: null
    });

    // Set up auth state listener on component mount
    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((authUser) => {
            setUser(authUser);

            // For existing users that log in, ensure registration is marked as complete
            if (authUser && !loading) {
                // Check if this is a returning user (not a new registration)
                if (!['delivery', 'individual', 'professional'].includes(registrationStatus.userType || '')) {
                    setRegistrationStatus({
                        isCompleted: true,
                        currentStep: 1,
                        userType: null
                    });
                }
            }

            setLoading(false);
        });

        // Clean up subscription on unmount
        return unsubscribe;
    }, []);

    useEffect(() => {
        // Clean up queries when user logs out (becomes null)
        if (!user && !loading) {
            console.log('🧹 User is null - ensuring query cleanup');
            queryClient.clear();

            // Cleanup Firestore listeners
            if (typeof enhancedDeliveryService?.cleanup === 'function') {
                enhancedDeliveryService.cleanup();
            }
        }
    }, [user, loading]);

    // Reset all errors
    const resetErrors = () => {
        setError(null);
        setErrorMessage('');
    };

    // Update registration status
    const updateRegistrationStatus = (status: Partial<RegistrationStatus>) => {
        setRegistrationStatus(prev => ({ ...prev, ...status }));
        console.log('Registration status updated:', { ...registrationStatus, ...status });
    };

    // Mark registration as complete
    const completeRegistration = () => {
        setRegistrationStatus({
            isCompleted: true,
            currentStep: 1,
            userType: null
        });
        console.log('Registration completed');
    };

    // Enhanced sign in method
    const signIn = async (email: string, password: string) => {
        try {
            resetErrors();
            setIsAuthenticating(true);

            await authService.signInWithEmailAndPassword(email, password);

            // Ensure registration is marked as complete for signed-in users
            setRegistrationStatus({
                isCompleted: true,
                currentStep: 1,
                userType: null
            });

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

            // Set registration status - individual registration is one-step
            updateRegistrationStatus({
                isCompleted: true,
                currentStep: 1,
                userType: 'individual'
            });

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

            if (isDeliveryAgent) {
                // Delivery agent registration is multi-step
                updateRegistrationStatus({
                    isCompleted: false,
                    currentStep: 2,
                    userType: 'delivery'
                });
            } else {
                // Regular professional registration is complete in one step
                updateRegistrationStatus({
                    isCompleted: true,
                    currentStep: 1,
                    userType: 'professional'
                });
            }

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

            await userService.updateUserProfile(user.uid, data);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Profile update failed'));
            setErrorMessage(err instanceof Error ? err.message : 'Profile update failed');
            return false;
        }
    };

    const refreshUserProfile = async () => {
        if (!user?.uid) {
            console.log('No user to refresh');
            return;
        }

        try {
            console.log('Refreshing user profile...');
            const updatedUser = await userService.getUserById(user.uid);
            if (updatedUser) {
                setUser(updatedUser);
                console.log('User profile refreshed successfully');
            }
        } catch (error) {
            console.error('Error refreshing user profile:', error);
        }
    };

    const signOut = async () => {
        try {
            resetErrors();
            setIsAuthenticating(true);

            console.log('🧹 Clearing React Query cache before logout...');
            queryClient.clear();

            if (typeof enhancedDeliveryService?.cleanup === 'function') {
                enhancedDeliveryService.cleanup();
            }

            await authService.signOut();

            // Reset registration status on sign out
            setRegistrationStatus({
                isCompleted: true,
                currentStep: 1,
                userType: null
            });

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
        isAuthenticated: !!user,
        registrationStatus,
        updateRegistrationStatus,
        refreshUserProfile,
        completeRegistration
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