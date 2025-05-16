import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
    PackageCategory,
    PackageDimensions,
    EmbeddedAddress,
    Person
} from '@/src/models/delivery.model';

// Define the form state interface
interface DeliveryFormState {
    // Step 1: Package Details
    isFragile: boolean;
    packageDescription: string;
    packageWeight: number;
    packageDimensions: PackageDimensions;
    packageCategory: PackageCategory;
    termsAccepted: boolean;

    // Step 2: Addresses
    pickupAddress: EmbeddedAddress | null;
    deliveryAddress: EmbeddedAddress | null;
    isUserExpeditor: boolean;
    expeditor: Person | null;
    isUserReceiver: boolean;
    receiver: Person | null;

    // Step 3: Schedule & Comments
    scheduledDate: Date | null;
    timeSlotStart: Date | null;
    timeSlotEnd: Date | null;
    comment: string;

    // Step 4: Facturation
    billingContact: string;
    billingAddress: EmbeddedAddress | null;

    // Step 5: Delivery recap
    creator: string;
}

// Create an initial state with default values
const initialState: DeliveryFormState = {
    creator: '',
    // Step 1
    isFragile: false,
    packageDescription: '',
    packageWeight: 0,
    packageDimensions: { length: 0, width: 0, height: 0 },
    packageCategory: 'products',
    termsAccepted: false,

    // Step 2
    pickupAddress: null,
    deliveryAddress: null,
    isUserExpeditor: false,
    isUserReceiver: false,

    // Step 3
    scheduledDate: new Date(),
    timeSlotStart: (() => {
        const date = new Date();
        date.setHours(8, 0, 0, 0);
        return date;
    })(),
    timeSlotEnd: (() => {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        return date;
    })(),
    comment: '',

    // Step 4
    billingContact: '',
    billingAddress: null,
    expeditor: null,
    receiver: null
};

// Define the context shape
interface DeliveryFormContextType {
    formState: DeliveryFormState;
    updateFormState: (updates: Partial<DeliveryFormState>) => void;
    resetForm: () => void;
    validateStep: (step: number) => string[];
    isStepValid: (step: number) => boolean;
}

// Create the context
const DeliveryFormContext = createContext<DeliveryFormContextType | undefined>(undefined);

// Provider component
export const DeliveryFormProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [formState, setFormState] = useState<DeliveryFormState>(initialState);

    // Update the form state
    const updateFormState = (updates: Partial<DeliveryFormState>) => {
        setFormState((prevState) => ({
            ...prevState,
            ...updates
        }));
    };

    // Reset the form to initial state
    const resetForm = () => {
        setFormState(initialState);
    };

    // Validate each step
    const validateStep = (step: number): string[] => {
        const errors: string[] = [];

        switch (step) {
            case 1:
                // Validate package details
                if (!formState.packageDescription.trim()) {
                    errors.push('Package description is required');
                }
                if (formState.packageWeight <= 0) {
                    errors.push('Valid package weight is required');
                }
                if (formState.packageDimensions.length <= 0 ||
                    formState.packageDimensions.width <= 0 ||
                    formState.packageDimensions.height <= 0) {
                    errors.push('Valid package dimensions are required');
                }
                if (formState.packageDimensions.length > 100) {
                    errors.push('Package length cannot exceed 1 m');
                }
                if (formState.packageDimensions.width > 100) {
                    errors.push('Package width cannot exceed 1 m');
                }
                if (formState.packageDimensions.height > 100) {
                    errors.push('Package height cannot exceed 1 m');
                }
                if (formState.packageWeight > 60) {
                    errors.push('Package weight cannot exceed 60 kg');
                }
                if (!formState.termsAccepted) {
                    errors.push('You must accept the terms');
                }
                break;

            case 2:
                // Validate addresses
                if (!formState.pickupAddress) {
                    errors.push('Pickup address is required');
                }
                if (!formState.deliveryAddress) {
                    errors.push('Delivery address is required');
                }
                break;

            case 3:
                // Validate schedule
                if (!formState.scheduledDate) {
                    errors.push('Scheduled date is required');
                }
                if (!formState.timeSlotStart || !formState.timeSlotEnd) {
                    errors.push('Time slot is required');
                }
                break;

            case 4:
                // Validate contacts
                if (!formState.expeditor) {
                    errors.push('Expeditor information is required');
                }
                if (!formState.receiver) {
                    errors.push('Receiver information is required');
                }
                break;

            default:
                break;
        }

        return errors;
    };

    // Check if a step is valid
    const isStepValid = (step: number): boolean => {
        return validateStep(step).length === 0;
    };

    return (
        <DeliveryFormContext.Provider
            value={{
                formState,
                updateFormState,
                resetForm,
                validateStep,
                isStepValid
            }}
        >
            {children}
        </DeliveryFormContext.Provider>
    );
};

// Custom hook to use the context
export const useDeliveryForm = () => {
    const context = useContext(DeliveryFormContext);
    if (context === undefined) {
        throw new Error('useDeliveryForm must be used within a DeliveryFormProvider');
    }
    return context;
};