import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '@/config/firebaseConfig';

// Collection references
export const Collections = {
    TEST: 'test',
    USERS: 'users',
    // Add more collections as needed
} as const;

// Generic type for Firestore documents
export interface FirestoreDocument {
    id: string;
    createdAt?: FirebaseFirestoreTypes.Timestamp;
    updatedAt?: FirebaseFirestoreTypes.Timestamp;
}

// Define specific document types
export interface TestDocument extends FirestoreDocument {
    message: string;
    timestamp: FirebaseFirestoreTypes.Timestamp;
}

export interface UserDocument extends FirestoreDocument {
    email: string;
    displayName?: string | null;
    photoURL?: string | null;
    // Add more user fields as needed
}

// Timestamp utilities
export const serverTimestamp = () => firestore.FieldValue.serverTimestamp();

// CRUD operations
export const firestoreService = {
    // Create document
    createDocument: async <T>(
        collection: string,
        data: Omit<T, 'id'>,
        customId?: string
    ): Promise<string> => {
        const documentData = {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        if (customId) {
            await db.collection(collection).doc(customId).set(documentData);
            return customId;
        } else {
            const docRef = await db.collection(collection).add(documentData);
            return docRef.id;
        }
    },

    // Read document
    getDocument: async <T extends FirestoreDocument>(
        collection: string,
        id: string
    ): Promise<T | null> => {
        const doc = await db.collection(collection).doc(id).get();

        if (!doc.exists) {
            return null;
        }

        return { id: doc.id, ...doc.data() } as T;
    },

    // Query documents
    queryDocuments: async <T extends FirestoreDocument>(
        collection: string,
        queries: Array<[string, FirebaseFirestoreTypes.WhereFilterOp, any]> = [],
        orderByField?: string,
        orderDirection?: 'asc' | 'desc',
        limit?: number
    ): Promise<T[]> => {
        let query: FirebaseFirestoreTypes.Query = db.collection(collection);

        // Apply where clauses
        queries.forEach(([field, operator, value]) => {
            query = query.where(field, operator, value);
        });

        // Apply ordering
        if (orderByField) {
            query = query.orderBy(orderByField, orderDirection || 'asc');
        }

        // Apply limit
        if (limit) {
            query = query.limit(limit);
        }

        const snapshot = await query.get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as T[];
    },

    // Update document
    updateDocument: async <T>(
        collection: string,
        id: string,
        data: Partial<T>
    ): Promise<void> => {
        const updateData = {
            ...data,
            updatedAt: serverTimestamp(),
        };

        await db.collection(collection).doc(id).update(updateData);
    },

    // Delete document
    deleteDocument: async (
        collection: string,
        id: string
    ): Promise<void> => {
        await db.collection(collection).doc(id).delete();
    },

    // Get latest document from a collection
    getLatestDocument: async <T extends FirestoreDocument>(
        collection: string,
        orderByField: string = 'createdAt'
    ): Promise<T | null> => {
        const snapshot = await db
            .collection(collection)
            .orderBy(orderByField, 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as T;
    }
};

// Export convenience methods for test collection
export const testCollection = {
    add: async (message: string): Promise<string> => {
        return firestoreService.createDocument<TestDocument>(Collections.TEST, {
            message,
            timestamp: serverTimestamp() as FirebaseFirestoreTypes.Timestamp,
        });
    },

    getLatest: async (): Promise<TestDocument | null> => {
        return firestoreService.getLatestDocument<TestDocument>(
            Collections.TEST,
            'timestamp'
        );
    }
};