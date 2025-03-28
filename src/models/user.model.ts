import { FirestoreDocument } from './common.model';

export type UserType = 'individual' | 'professional' | 'delivery';

export interface BaseUser extends FirestoreDocument {
    // Core fields
    email: string;
    photoURL?: string | null;
    userType: UserType;  // Required, never undefined
    isDeliveryAgent: boolean;  // Flag to identify delivery agents

    // Auth-specific fields
    uid?: string;
    emailVerified?: boolean;
    phoneNumber?: string | null;
}

export interface IndividualUser extends BaseUser {
    userType: 'individual';
    firstName: string;
    lastName: string;
}

export interface ProfessionalUser extends BaseUser {
    userType: 'professional';
    companyName: string;
    contactName: string;
    siret: string;
}

// This interface intentionally has overlap with the DeliveryAgent model
// The User model contains auth information while DeliveryAgent contains operational data
export interface DeliveryUser extends BaseUser {
    userType: 'delivery';
    firstName: string;
    lastName: string;
    // These fields will link this user to their full DeliveryAgent profile
    // The full DeliveryAgent model is stored in a separate collection
}

export type User = IndividualUser | ProfessionalUser | DeliveryUser;

// Type guards for user types - these help with TypeScript narrowing
export const isIndividualUser = (user: User): user is IndividualUser =>
    user.userType === 'individual';

export const isProfessionalUser = (user: User): user is ProfessionalUser =>
    user.userType === 'professional';

export const isDeliveryUser = (user: User): user is DeliveryUser =>
    user.userType === 'delivery';

// New type guard for delivery agents
export const isDeliveryAgent = (user: User): boolean =>
    user.isDeliveryAgent === true;

// Utility types to help with creating partial user data
export type IndividualUserData = Partial<IndividualUser> & { userType: 'individual' };
export type ProfessionalUserData = Partial<ProfessionalUser> & { userType: 'professional' };
export type DeliveryUserData = Partial<DeliveryUser> & { userType: 'delivery' };

// Ensure that when creating user data, the userType is always present
export type UserDataWithType =
    IndividualUserData |
    ProfessionalUserData |
    DeliveryUserData;