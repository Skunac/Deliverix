import { useState, useEffect } from 'react';
import { authService } from '@/src/firebase/auth';
import { UserService } from '@/src/services/user.service';
import { DeliveryAgentService } from '@/src/services/delivery-agent.service';
import { User, DeliveryUser, IndividualUser, ProfessionalUser } from '@/src/models/user.model';
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

            // Manually update the user state to show immediately
            if (newUser) {
                setUser(newUser as User);
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

    // Professional user sign up
    const signUpProfessional = async (
        email: string,
        password: string,
        companyName: string,
        contactName: string,
        phone: string,
        siret: string
    ) => {
        try {
            setLoading(true);
            setError(null);
            const userData: Partial<ProfessionalUser> & { userType: 'professional' } = {
                email,
                companyName,
                contactName,
                phoneNumber: phone,
                siret,
                userType: 'professional'
            };

            const newUser = await authService.createUser(email, password, userData);

            // Manually update the user state to show immediately
            if (newUser) {
                setUser(newUser as User);
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

    // Delivery agent sign up - using your existing DeliveryAgentService
    const signUpDelivery = async (
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        phone: string,
        vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'van' | 'truck' | 'on_foot',
        licenseNumber: string,
        availability?: 'full-time' | 'part-time',
        serviceAreas?: string[]
    ) => {
        try {
            setLoading(true);
            setError(null);

            // 1. Create the user account first with required user type
            const userData: Partial<DeliveryUser> & { userType: 'delivery' } = {
                email,
                firstName,
                lastName,
                phoneNumber: phone,
                userType: 'delivery'
            };

            console.log("Creating delivery user account:", email);
            const newUser = await authService.createUser(email, password, userData);

            if (!newUser || !newUser.uid) {
                throw new Error('Failed to create user account');
            }

            console.log("User created successfully, registering as delivery agent:", newUser.uid);

            // 2. Create weekly availability based on full-time/part-time selection
            const weeklyAvailability = availability === 'full-time'
                ? [0, 1, 2, 3, 4, 5, 6].map(day => ({
                    dayOfWeek: day,
                    startTime: '08:00',
                    endTime: '18:00',
                    isRecurring: true
                }))
                : [1, 2, 3, 4, 5].map(day => ({
                    dayOfWeek: day,
                    startTime: '09:00',
                    endTime: '17:00',
                    isRecurring: true
                }));

            // 3. Now register as delivery agent using your existing service
            try {
                await deliveryAgentService.registerAsAgent(newUser.uid, {
                    firstName,
                    lastName,
                    vehicleType,
                    vehiclePlateNumber: licenseNumber,
                    biography: `${availability === 'full-time' ? 'Full-time' : 'Part-time'} delivery agent`,
                    serviceAreas,
                    weeklyAvailability
                });

                console.log("Successfully registered as delivery agent");
            } catch (agentError) {
                console.error("Failed to register as delivery agent:", agentError);
                throw new Error(`User created but failed to register as delivery agent: ${agentError}`);
            }

            // 4. Manually update the user state to show immediately
            setUser(newUser as User);

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
            setUser(null);
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

    const updateProfile = async (data: { firstName?: string; lastName?: string; photoURL?: string }) => {
        try {
            setLoading(true);
            setError(null);

            if (!user) {
                throw new Error('No user is signed in');
            }

            await authService.updateProfile(data);

            // If it's a delivery agent, update their profile in the delivery agent collection
            if (user.userType === 'delivery' && user.uid) {
                const agentProfile = await deliveryAgentService.getAgentProfile(user.uid);
                if (agentProfile) {
                    await deliveryAgentService.updateAgentProfile(user.uid, {
                        firstName: data.firstName || agentProfile.firstName,
                        lastName: data.lastName || agentProfile.lastName,
                        profilePhoto: data.photoURL || agentProfile.profilePhoto
                    });
                }
            }

            // Update local state immediately
            if (user) {
                if (user.userType === 'individual' || user.userType === 'delivery') {
                    // Type assertion to access firstName/lastName
                    const typedUser = user as IndividualUser | DeliveryUser;
                    setUser({
                        ...user,
                        firstName: data.firstName ?? typedUser.firstName,
                        lastName: data.lastName ?? typedUser.lastName,
                        photoURL: data.photoURL ?? user.photoURL
                    });
                } else {
                    // For professional users
                    setUser({
                        ...user,
                        photoURL: data.photoURL ?? user.photoURL
                    });
                }
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
        signUpIndividual,
        signUpProfessional,
        signUpDelivery,
        signOut,
        updateProfile,
        isAuthenticated: !!user
    };
}