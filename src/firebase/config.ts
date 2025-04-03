import { initializeApp } from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

console.log("Initializing Firebase configuration");

// Initialize Firebase with empty config since we're using native configuration
const app = initializeApp({
    apiKey: '',
    appId: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    databaseURL: '',
});

// Export Firestore instance directly
console.log("Creating Firestore instance");
export const db = firestore();

// Export Auth instance directly
console.log("Creating Auth instance");
export const firebaseAuth = auth();

console.log("Creating Storage instance");
export const firebaseStorage = storage();

// Log Firebase initialization status
console.log("Firebase initialized:", {
    appInitialized: !!app,
    firestoreInitialized: !!db,
    authInitialized: !!firebaseAuth,
    storageInitialized: !!firebaseStorage,
});

export const serverTimestamp = () => firestore.FieldValue.serverTimestamp();

export default app;