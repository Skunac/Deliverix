import { initializeApp } from '@react-native-firebase/app';
import { initializeFirestore } from '@react-native-firebase/firestore';

// Initialize Firebase with empty config since we're using native configuration
const app = initializeApp({
    apiKey: '',
    appId: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    databaseURL: '',
});

// Initialize Firestore with specific settings for React Native
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true
});