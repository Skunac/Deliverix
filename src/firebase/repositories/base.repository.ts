import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../config';
import { serverTimestamp } from '../config';
import { FirestoreDocument } from '../../models/common.model';

export class BaseRepository<T extends FirestoreDocument> {
    constructor(protected collection: string) {}

    protected getCollectionRef() {
        return db.collection(this.collection);
    }

    async create(data: Omit<T, 'id'>, customId?: string): Promise<string> {
        const documentData = {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        if (customId) {
            await this.getCollectionRef().doc(customId).set(documentData);
            return customId;
        } else {
            const docRef = await this.getCollectionRef().add(documentData);
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
        const updateData = {
            ...data,
            updatedAt: serverTimestamp(),
        };

        await this.getCollectionRef().doc(id).update(updateData);
    }

    async delete(id: string): Promise<void> {
        await this.getCollectionRef().doc(id).delete();
    }

    async getLatest(orderByField: string = 'createdAt'): Promise<T | null> {
        const snapshot = await this.getCollectionRef()
            .orderBy(orderByField, 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as T;
    }
}