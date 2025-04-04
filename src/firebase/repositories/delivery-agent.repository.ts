import { DeliveryAgent } from '../../models/delivery-agent.model';
import { COLLECTIONS, DEFAULT_DOCUMENT_ID } from '../collections';
import { db, serverTimestamp } from '../config';
import { FirestoreDocumentData } from '../../models/common.model';

export class DeliveryAgentRepository {
    private getAgentDocRef(userId: string) {
        return db.doc(`${COLLECTIONS.USER_DELIVERY_AGENT(userId)}/${DEFAULT_DOCUMENT_ID}`);
    }

    async create(userId: string, data: Omit<DeliveryAgent, 'id'>): Promise<void> {
        console.log(`Creating delivery agent document for user ${userId}`);

        try {
            // Separate model data from Firestore data
            const firestoreData: FirestoreDocumentData = {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const agentDocRef = this.getAgentDocRef(userId);

            console.log(`Creating document at ${COLLECTIONS.USER_DELIVERY_AGENT(userId)}/${DEFAULT_DOCUMENT_ID}`);
            await agentDocRef.set(firestoreData);

            console.log(`Successfully created delivery agent document for user ${userId}`);
        } catch (error) {
            console.error(`Error creating delivery agent document for user ${userId}:`, error);
            throw error;
        }
    }

    async getByUserId(userId: string): Promise<DeliveryAgent | null> {
        try {
            const doc = await this.getAgentDocRef(userId).get();

            if (!doc.exists) {
                console.log(`No delivery agent found for user ${userId}`);
                return null;
            }

            return {
                id: userId,
                ...doc.data()
            } as DeliveryAgent;
        } catch (error) {
            console.error(`Error fetching delivery agent for user ${userId}:`, error);
            return null;
        }
    }

    async update(userId: string, data: Partial<DeliveryAgent>): Promise<void> {
        try {
            // Separate model data from Firestore data
            const firestoreData: FirestoreDocumentData = {
                ...data,
                updatedAt: serverTimestamp(),
            };

            await this.getAgentDocRef(userId).update(firestoreData);
        } catch (error) {
            console.error(`Error updating delivery agent for user ${userId}:`, error);
            throw error;
        }
    }
}