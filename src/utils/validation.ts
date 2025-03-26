// src/utils/validation.ts
import { createValidationError } from './error-handler';

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
    // At least 6 characters
    return password.length >= 6;
};

export const validatePasswordStrength = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 6) {
        return {
            isValid: false,
            message: 'Password must be at least 6 characters long.'
        };
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one number.'
        };
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one uppercase letter.'
        };
    }

    return { isValid: true, message: 'Password is strong.' };
};

export const validatePhoneNumber = (phoneNumber: string): boolean => {
    // Remove spaces and dashes
    const cleanedNumber = phoneNumber.replace(/[\s-]/g, '');
    // Check if it's a valid international format (starts with + and has 8-15 digits)
    const phoneRegex = /^\+[0-9]{8,15}$/;
    return phoneRegex.test(cleanedNumber);
};

export const validateDeliveryPayload = (payload: any): void => {
    // Check required fields
    const requiredFields = [
        'expeditorId',
        'pickupAddress',
        'deliveryAddress',
        'scheduledDate',
        'timeSlot',
        'packageDescription',
        'packageWeight',
        'packageDimensions',
        'packageCategory',
        'price'
    ];

    for (const field of requiredFields) {
        if (!payload[field]) {
            throw createValidationError(`The field '${field}' is required.`);
        }
    }

    // Validate pickup and delivery addresses
    for (const addressType of ['pickupAddress', 'deliveryAddress']) {
        const address = payload[addressType];
        if (!address.placeId || !address.formattedAddress || !address.coordinates) {
            throw createValidationError(`The ${addressType} is incomplete.`);
        }
    }

    // Validate time slot
    if (!payload.timeSlot.start || !payload.timeSlot.end) {
        throw createValidationError('The time slot must have start and end times.');
    }

    const startTime = new Date(payload.timeSlot.start);
    const endTime = new Date(payload.timeSlot.end);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        throw createValidationError('Invalid time slot dates.');
    }

    if (startTime >= endTime) {
        throw createValidationError('The time slot end time must be after the start time.');
    }

    // Validate package dimensions
    const { length, width, height } = payload.packageDimensions;
    if (!length || !width || !height) {
        throw createValidationError('Package dimensions must include length, width, and height.');
    }

    // Validate price
    if (typeof payload.price !== 'number' || payload.price <= 0) {
        throw createValidationError('Price must be a positive number.');
    }
};

export const validateAgentRegistrationPayload = (payload: any): void => {
    // Check required fields
    const requiredFields = [
        'firstName',
        'lastName',
        'vehicleType'
    ];

    for (const field of requiredFields) {
        if (!payload[field]) {
            throw createValidationError(`The field '${field}' is required.`);
        }
    }

    // Validate vehicle type
    const validVehicleTypes = [
        'car', 'motorcycle', 'bicycle', 'scooter', 'van', 'truck', 'on_foot'
    ];

    if (!validVehicleTypes.includes(payload.vehicleType)) {
        throw createValidationError('Invalid vehicle type.');
    }

    // Validate vehicle details if provided
    if (payload.vehicleType !== 'on_foot' && payload.vehicleType !== 'bicycle') {
        if (!payload.vehiclePlateNumber) {
            throw createValidationError('Vehicle plate number is required for motorized vehicles.');
        }
    }

    // Validate weekly availability if provided
    if (payload.weeklyAvailability) {
        for (const slot of payload.weeklyAvailability) {
            if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
                throw createValidationError('Day of week must be between 0 (Sunday) and 6 (Saturday).');
            }

            if (!slot.startTime || !slot.endTime) {
                throw createValidationError('Availability slots must have start and end times.');
            }

            // Validate time format (HH:MM)
            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
                throw createValidationError('Time must be in 24-hour format (HH:MM).');
            }

            if (slot.startTime >= slot.endTime) {
                throw createValidationError('End time must be after start time.');
            }
        }
    }
};