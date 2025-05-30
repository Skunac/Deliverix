import { FirestoreDocument } from './common.model';
import {EmbeddedAddress} from "@/src/models/delivery.model";

export type UserType = 'individual' | 'professional' | 'delivery';

export interface BaseUser extends FirestoreDocument {
    // Core fields
    email: string;
    userType: UserType;
    isDeliveryAgent: boolean;
    ìsAdmin: boolean;

    billingAddress?: EmbeddedAddress;

    // Auth-specific fields
    uid?: string;
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
}

export type User = IndividualUser | ProfessionalUser;

// Utility types to help with creating partial user data
export type IndividualUserData = Partial<IndividualUser> & { userType: 'individual' };
export type ProfessionalUserData = Partial<ProfessionalUser> & { userType: 'professional' };

// Ensure that when creating user data, the userType is always present
export type UserDataWithType =
    IndividualUserData |
    ProfessionalUserData