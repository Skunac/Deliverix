// src/utils/error-handler.ts
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {Error} from "@firebase/auth-types";

export enum ErrorCode {
    // Auth errors
    AUTH_EMAIL_ALREADY_IN_USE = 'auth/email-already-in-use',
    AUTH_INVALID_EMAIL = 'auth/invalid-email',
    AUTH_USER_DISABLED = 'auth/user-disabled',
    AUTH_USER_NOT_FOUND = 'auth/user-not-found',
    AUTH_WRONG_PASSWORD = 'auth/wrong-password',
    AUTH_WEAK_PASSWORD = 'auth/weak-password',
    AUTH_REQUIRES_RECENT_LOGIN = 'auth/requires-recent-login',

    // Firestore errors
    FIRESTORE_DOCUMENT_NOT_FOUND = 'firestore/document-not-found',
    FIRESTORE_PERMISSION_DENIED = 'firestore/permission-denied',

    // App specific errors
    VALIDATION_ERROR = 'app/validation-error',
    NETWORK_ERROR = 'app/network-error',
    UNAUTHORIZED = 'app/unauthorized',
    NOT_FOUND = 'app/not-found',
    SERVER_ERROR = 'app/server-error',
    UNKNOWN_ERROR = 'app/unknown-error'
}

export interface AppError {
    code: ErrorCode | string;
    message: string;
    originalError?: any;
}

export const handleAuthError = (error: FirebaseAuthTypes.NativeFirebaseAuthError): AppError => {
    let appError: AppError = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'An unknown error occurred during authentication.'
    };

    switch (error.code) {
        case ErrorCode.AUTH_EMAIL_ALREADY_IN_USE:
            appError = {
                code: error.code,
                message: 'This email address is already in use. Please use a different email or try signing in.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_INVALID_EMAIL:
            appError = {
                code: error.code,
                message: 'The email address is invalid. Please check and try again.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_USER_DISABLED:
            appError = {
                code: error.code,
                message: 'This account has been disabled. Please contact support for assistance.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_USER_NOT_FOUND:
            appError = {
                code: error.code,
                message: 'No account found with this email address. Please check your email or create a new account.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_WRONG_PASSWORD:
            appError = {
                code: error.code,
                message: 'Incorrect password. Please try again or reset your password.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_WEAK_PASSWORD:
            appError = {
                code: error.code,
                message: 'Password is too weak. Please use a stronger password with at least 6 characters.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_REQUIRES_RECENT_LOGIN:
            appError = {
                code: error.code,
                message: 'This operation requires a recent login. Please sign out and sign back in, then try again.',
                originalError: error
            };
            break;
        default:
            appError = {
                code: error.code || ErrorCode.UNKNOWN_ERROR,
                message: error.message || 'An authentication error occurred. Please try again.',
                originalError: error
            };
    }

    return appError;
};

export const handleFirestoreError = (error: Error): AppError => {
    let appError: AppError = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'An unknown database error occurred.'
    };

    switch (error.code) {
        case 'permission-denied':
            appError = {
                code: ErrorCode.FIRESTORE_PERMISSION_DENIED,
                message: 'You do not have permission to perform this operation.',
                originalError: error
            };
            break;
        case 'not-found':
            appError = {
                code: ErrorCode.FIRESTORE_DOCUMENT_NOT_FOUND,
                message: 'The requested document was not found.',
                originalError: error
            };
            break;
        default:
            appError = {
                code: `firestore/${error.code}` || ErrorCode.UNKNOWN_ERROR,
                message: error.message || 'A database error occurred. Please try again.',
                originalError: error
            };
    }

    return appError;
};

export const handleNetworkError = (error: Error): AppError => {
    return {
        code: ErrorCode.NETWORK_ERROR,
        message: 'A network error occurred. Please check your internet connection and try again.',
        originalError: error
    };
};

export const handleUnknownError = (error: any): AppError => {
    return {
        code: ErrorCode.UNKNOWN_ERROR,
        message: error.message || 'An unexpected error occurred. Please try again.',
        originalError: error
    };
};

export const createValidationError = (message: string): AppError => {
    return {
        code: ErrorCode.VALIDATION_ERROR,
        message
    };
};

export const handleApiError = (error: any): AppError => {
    if (error.response) {
        // The request was made, but the server responded with an error status
        const status = error.response.status;

        if (status === 401 || status === 403) {
            return {
                code: ErrorCode.UNAUTHORIZED,
                message: 'You are not authorized to perform this action.',
                originalError: error
            };
        } else if (status === 404) {
            return {
                code: ErrorCode.NOT_FOUND,
                message: 'The requested resource was not found.',
                originalError: error
            };
        } else if (status >= 500) {
            return {
                code: ErrorCode.SERVER_ERROR,
                message: 'A server error occurred. Please try again later.',
                originalError: error
            };
        }
    } else if (error.request) {
        // The request was made but no response was received
        return handleNetworkError(error);
    }

    // Something else happened while setting up the request
    return handleUnknownError(error);
};