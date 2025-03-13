export class AppError extends Error {
    constructor(message: string, public code?: string) {
        super(message);
        this.name = 'AppError';
    }
}

export function handleFirebaseError(error: any): AppError {
    console.error('Firebase error:', error);

    // Map Firebase error codes to application error codes
    let code = 'unknown_error';
    let message = 'An unknown error occurred';

    if (error.code) {
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                code = 'invalid_credentials';
                message = 'Invalid email or password';
                break;
            case 'auth/email-already-in-use':
                code = 'email_in_use';
                message = 'Email is already in use';
                break;
            case 'auth/weak-password':
                code = 'weak_password';
                message = 'Password is too weak';
                break;
            case 'auth/requires-recent-login':
                code = 'reauth_required';
                message = 'Please sign in again to complete this action';
                break;
            default:
                code = error.code;
                message = error.message || 'Firebase error occurred';
        }
    }

    return new AppError(message, code);
}