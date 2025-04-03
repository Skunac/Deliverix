import { DeliveryAgent } from '../../models/delivery-agent.model';
import { DEFAULT_DOCUMENT_ID } from '../collections';
import { db, serverTimestamp } from '../config';
import { FirestoreDocumentData } from '../../models/common.model';

export class DeliveryAgentRepository {
    private getAgentDocRef(userId: string) {
        return db.collection('users').doc(userId).collection('deliveryAgent').doc(DEFAULT_DOCUMENT_ID);
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

            // Utiliser directement le chemin structuré
            const agentDocRef = db.collection('users').doc(userId).collection('deliveryAgent').doc(DEFAULT_DOCUMENT_ID);

            console.log(`Creating document at users/${userId}/deliveryAgent/${DEFAULT_DOCUMENT_ID}`);
            await agentDocRef.set(firestoreData);

            console.log(`Successfully created delivery agent document for user ${userId}`);
        } catch (error) {
            console.error(`Error creating delivery agent document for user ${userId}:`, error);
            throw error;
        }
    }

    async getByUserId(userId: string): Promise<DeliveryAgent | null> {
        const doc = await this.getAgentDocRef(userId).get();

        if (!doc.exists) {
            return null;
        }

        return { id: doc.id, ...doc.data() } as DeliveryAgent;
    }

    async update(userId: string, data: Partial<DeliveryAgent>): Promise<void> {
        // Separate model data from Firestore data
        const firestoreData: FirestoreDocumentData = {
            ...data,
            updatedAt: serverTimestamp(),
        };

        await this.getAgentDocRef(userId).update(firestoreData);
    }
}