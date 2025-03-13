import { FirestoreDocument } from './common.model';

export interface User extends FirestoreDocument {
    // Core fields
    email: string;
    displayName?: string | null;
    photoURL?: string | null;

    // Auth-specific fields
    uid?: string;
    emailVerified?: boolean;
    phoneNumber?: string | null;

    // Any additional user profile fields
    // (like preferences, settings, etc.)
}