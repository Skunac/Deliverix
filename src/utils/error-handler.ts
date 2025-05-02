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
    AUTH_INVALID_CREDENTIALS = 'auth/invalid-credential',

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

export const handleAuthError = (error: FirebaseAuthTypes.NativeFirebaseAuthError | any): AppError => {
    let appError: AppError = {
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Une erreur inconnue s\'est produite lors de l\'authentification.'
    };

    switch (error.code) {
        case ErrorCode.AUTH_EMAIL_ALREADY_IN_USE:
            appError = {
                code: error.code,
                message: 'Cette adresse email est déjà utilisée. Veuillez utiliser une autre adresse ou essayer de vous connecter.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_INVALID_CREDENTIALS:
            appError = {
                code: error.code,
                message: 'Les informations d\'identification sont invalides. Veuillez vérifier et réessayer.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_INVALID_EMAIL:
            appError = {
                code: error.code,
                message: 'L\'adresse email est invalide. Veuillez vérifier et réessayer.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_USER_DISABLED:
            appError = {
                code: error.code,
                message: 'Ce compte a été désactivé. Veuillez contacter le support pour obtenir de l\'aide.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_USER_NOT_FOUND:
            appError = {
                code: error.code,
                message: 'Aucun compte trouvé avec cette adresse email. Veuillez vérifier votre email ou créer un nouveau compte.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_WRONG_PASSWORD:
            appError = {
                code: error.code,
                message: 'Mot de passe incorrect. Veuillez réessayer ou réinitialiser votre mot de passe.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_WEAK_PASSWORD:
            appError = {
                code: error.code,
                message: 'Le mot de passe est trop faible. Veuillez utiliser un mot de passe plus fort avec au moins 6 caractères.',
                originalError: error
            };
            break;
        case ErrorCode.AUTH_REQUIRES_RECENT_LOGIN:
            appError = {
                code: error.code,
                message: 'Cette opération nécessite une connexion récente. Veuillez vous déconnecter et vous reconnecter, puis réessayer.',
                originalError: error
            };
            break;
        default:
            appError = {
                code: error.code || ErrorCode.UNKNOWN_ERROR,
                message: error.message || 'Une erreur d\'authentification s\'est produite. Veuillez réessayer.',
                originalError: error
            };
    }

    return appError;
};

export const createValidationError = (message: string): AppError => {
    return {
        code: ErrorCode.VALIDATION_ERROR,
        message
    };
};