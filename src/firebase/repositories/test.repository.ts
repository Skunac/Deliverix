import { Test } from '../../models/test.model';
import { BaseRepository } from './base.repository';
import { Collections } from '../collections';
import { toFirestoreTest, fromFirestoreTest } from '../adapters/test.adapter';
import { serverTimestamp } from '../config';

class TestRepository extends BaseRepository<Test> {
    constructor() {
        super(Collections.TEST);
    }

    async getById(id: string): Promise<Test | null> {
        const doc = await this.getCollectionRef().doc(id).get();

        if (!doc.exists) {
            return null;
        }

        return fromFirestoreTest(doc.id, doc.data()!);
    }

    async addMessage(message: string): Promise<string> {
        const testData = {
            message,
            timestamp: new Date()
        };

        const firestoreData = toFirestoreTest(testData);
        return super.create(firestoreData as any);
    }

    async getLatestMessage(): Promise<Test | null> {
        return this.getLatest('timestamp');
    }
}

export const testRepository = new TestRepository();