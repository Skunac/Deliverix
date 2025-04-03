import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../config';
import { serverTimestamp } from '../config';
import { FirestoreDocument, FirestoreDocumentData } from '../../models/common.model';

export class BaseRepository<T extends FirestoreDocument> {
    constructor(protected collection: string) {}

    protected getCollectionRef() {
        return db.collection(this.collection);
    }

    protected getServerTimestamp() {
        return serverTimestamp();
    }

    async create(data: Omit<T, 'id'>, customId?: string): Promise<string> {
        // Separate model data from Firestore data with timestamps
        const firestoreData: FirestoreDocumentData = {
            ...data,
            createdAt: this.getServerTimestamp(),
            updatedAt: this.getServerTimestamp(),
        };

        if (customId) {
            await this.getCollectionRef().doc(customId).set(firestoreData);
            return customId;
        } else {
            const docRef = await this.getCollectionRef().add(firestoreData);
            return docRef.id;
        }
    }

    async getById(id: string): Promise<T | null> {
        const doc = await this.getCollectionRef().doc(id).get();

        if (!doc.exists) {
            return null;
        }

        return { id: doc.id, ...doc.data() } as T;
    }

    async query(
        queries: Array<[string, FirebaseFirestoreTypes.WhereFilterOp, any]> = [],
        orderByField?: string,
        orderDirection?: 'asc' | 'desc',
        limit?: number
    ): Promise<T[]> {
        let query: FirebaseFirestoreTypes.Query = this.getCollectionRef();

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
    }

    async update(id: string, data: Partial<T>): Promise<void> {
        // Separate model data from Firestore data with timestamp
        const firestoreData: FirestoreDocumentData = {
            ...data,
            updatedAt: this.getServerTimestamp(),
        };

        await this.getCollectionRef().doc(id).update(firestoreData);
    }

    async delete(id: string): Promise<void> {
        await this.getCollectionRef().doc(id).delete();
    }
}