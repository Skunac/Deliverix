export function validateUser(userData: any): string[] | null {
    const errors: string[] = [];

    if (!userData.email) {
        errors.push('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
        errors.push('Email is invalid');
    }

    return errors.length > 0 ? errors : null;
}

export function validateTest(testData: any): string[] | null {
    const errors: string[] = [];

    if (!testData.message) {
        errors.push('Message is required');
    }

    if (!testData.timestamp) {
        errors.push('Timestamp is required');
    }

    return errors.length > 0 ? errors : null;
}