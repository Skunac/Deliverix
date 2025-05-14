import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AuthService } from '@/src/services/auth.service';
import { DeliveryAgentService } from '@/src/services/delivery-agent.service';
import { uploadFormImages } from "@/src/utils/image-helpers";
import { useAuth } from "@/contexts/authContext";

// Types for Vehicle and Company
type VehicleType = 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'van' | 'truck';
type CompanyType = 'micro' | 'sarl' | 'sas' | 'ei' | 'eirl' | 'other';

// Step 1 Form Data
interface Step1FormData {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    password: string;
}

// Step 2 Form Data
interface Step2FormData {
    // Personal info
    firstName: string;
    lastName: string;
    birthDate: Date;
    birthPlace: string;
    nationality: string;

    // Address
    street: string;
    postalCode: string;
    city: string;

    // ID Document
    idType: 'identity_card' | 'passport' | 'residence_permit';
    idPhoto: string | null;

    // Profile photo
    profilePhoto: string | null;

    // Driver info
    licenseType: string;
    licensePhoto: string | null;

    // Vehicle info
    vehicleType: VehicleType;
    vehicleModel: string;
    vehicleYear: number;
    vehiclePlateNumber: string;
    vehicleRegistrationPhoto: string | null;

    // Insurance
    vehicleInsuranceProvider: string;
    vehicleInsurancePhoto: string | null;
    professionalInsuranceProvider: string;
    professionalInsurancePhoto: string | null;

    // Documents
    kbisPhoto: string | null;

    // Financial info
    vatApplicable: boolean;
    vatNumber: string;

    // Delivery range
    deliveryRange: number;

    // Optional certificates
    transportCertificatePhoto: string | null;
    trainingRegistrationPhoto: string | null;

    // Terms acceptance
    termsAccepted: boolean;
}

// Context type
interface DeliveryAgentRegistrationContextType {
    step1Data: Step1FormData | null;
    saveStep1Data: (data: Step1FormData) => void;
    registerDeliveryAgent: (step2Data: Step2FormData) => Promise<boolean>;
    isRegistering: boolean;
    registrationError: string | null;
    clearRegistrationError: () => void;
}

// Create the context
const DeliveryAgentRegistrationContext = createContext<DeliveryAgentRegistrationContextType | undefined>(undefined);

// Provider component
export const DeliveryAgentRegistrationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { updateRegistrationStatus, completeRegistration } = useAuth();
    const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [registrationError, setRegistrationError] = useState<string | null>(null);

    const authService = new AuthService();
    const deliveryAgentService = new DeliveryAgentService();

    // Save Step 1 data
    const saveStep1Data = (data: Step1FormData) => {
        setStep1Data(data);
    };

    // Clear registration error
    const clearRegistrationError = () => {
        setRegistrationError(null);
    };

    // Complete registration with Step 2 data
    const registerDeliveryAgent = async (step2Data: Step2FormData): Promise<boolean> => {
        if (!step1Data) {
            setRegistrationError('Missing Step 1 data. Please go back and complete the first step.');
            return false;
        }

        setIsRegistering(true);
        setRegistrationError(null);

        try {
            // Step 1: Create the user account
            const userCredential = await authService.createUser(
                step1Data.email,
                step1Data.password,
                {
                    userType: 'professional',
                    companyName: step1Data.companyName,
                    contactName: step1Data.contactName,
                    phoneNumber: step1Data.phone,
                    isDeliveryAgent: true
                }
            );

            const userId = userCredential.uid;

            // Update registration status in the auth context
            updateRegistrationStatus({
                isCompleted: false,
                currentStep: 2,
                userType: 'delivery'
            });

            // Step 2: Process images
            const processedFormData = await uploadFormImages(step2Data, userId);

            // Step 3: Register as delivery agent
            await deliveryAgentService.registerAsAgent(userId, {
                // Personal info
                personalInfo: {
                    firstName: step2Data.firstName,
                    lastName: step2Data.lastName,
                    email: step1Data.email,
                    phoneNumber: step1Data.phone
                },
                // Company info
                companyInfo: {
                    name: step1Data.companyName,
                    type: 'micro' as CompanyType, // Default value
                    sirenNumber: ''
                },
                // Vehicle info (minimal)
                vehicleInfo: {
                    type: step2Data.vehicleType,
                    plateNumber: step2Data.vehiclePlateNumber
                }
            });

            // Step 4: Update detailed personal information
            await deliveryAgentService.updatePersonalInfo(userId, {
                firstName: step2Data.firstName,
                lastName: step2Data.lastName,
                birthDate: step2Data.birthDate,
                birthPlace: step2Data.birthPlace,
                nationality: step2Data.nationality,
                address: {
                    street: step2Data.street,
                    postalCode: step2Data.postalCode,
                    city: step2Data.city,
                    country: 'France'
                },
                idType: step2Data.idType,
                idPhotoUrl: processedFormData.idPhoto,
                photoUrl: processedFormData.profilePhoto
            });

            // Step 5: Update vehicle information
            await deliveryAgentService.updateVehicleInfo(userId, {
                type: step2Data.vehicleType,
                model: step2Data.vehicleModel,
                year: step2Data.vehicleYear,
                plateNumber: step2Data.vehiclePlateNumber,
                registrationPhotoUrl: processedFormData.vehicleRegistrationPhoto,
                insuranceProvider: step2Data.vehicleInsuranceProvider,
                insurancePhotoUrl: processedFormData.vehicleInsurancePhoto
            });

            // Step 6: Update driver information
            await deliveryAgentService.updateDriverInfo(userId, {
                licenseType: step2Data.licenseType,
                licensePhotoUrl: processedFormData.licensePhoto,
                transportCertificatePhotoUrl: processedFormData.transportCertificatePhoto,
                trainingRegistrationPhotoUrl: processedFormData.trainingRegistrationPhoto
            });

            // Step 7: Update company information
            await deliveryAgentService.updateCompanyInfo(userId, {
                kbisPhotoUrl: processedFormData.kbisPhoto,
                professionalInsuranceProvider: step2Data.professionalInsuranceProvider,
                professionalInsurancePhotoUrl: processedFormData.professionalInsurancePhoto
            });

            // Step 8: Update VAT and terms
            await deliveryAgentService.updateAgentProfile(userId, {
                deliveryRange: step2Data.deliveryRange,
                vatApplicable: step2Data.vatApplicable,
                vatNumber: step2Data.vatNumber,
                termsAccepted: step2Data.termsAccepted,
                termsAcceptanceDate: new Date()
            });

            // Mark registration as complete
            completeRegistration();

            return true;
        } catch (error) {
            console.error('Registration error:', error);
            setRegistrationError(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'inscription');
            return false;
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <DeliveryAgentRegistrationContext.Provider
            value={{
                step1Data,
                saveStep1Data,
                registerDeliveryAgent,
                isRegistering,
                registrationError,
                clearRegistrationError
            }}
        >
            {children}
        </DeliveryAgentRegistrationContext.Provider>
    );
};

// Hook for using this context
export const useDeliveryAgentRegistration = () => {
    const context = useContext(DeliveryAgentRegistrationContext);

    if (context === undefined) {
        throw new Error('useDeliveryAgentRegistration must be used within a DeliveryAgentRegistrationProvider');
    }

    return context;
};