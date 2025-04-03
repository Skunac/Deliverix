import { DeliveryAgent, AgentStatus } from '../../models/delivery-agent.model';
import { COLLECTIONS, DEFAULT_DOCUMENT_ID } from '../collections';
import { db, serverTimestamp } from '../config';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import firebase from '@react-native-firebase/app';
import { FirestoreDocumentData } from '../../models/common.model';

export class DeliveryAgentRepository {
    private getAgentDocRef(userId: string) {
        // Utiliser directement le chemin structuré pour éviter les erreurs
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

    async updateAgentStatus(userId: string, status: AgentStatus): Promise<void> {
        // Separate model data from Firestore data
        const firestoreData: FirestoreDocumentData = {
            activeStatus: status,
            lastActive: new Date(),
            updatedAt: serverTimestamp()
        };

        await this.getAgentDocRef(userId).update(firestoreData);
    }

    async updateAgentLocation(userId: string, location: FirebaseFirestoreTypes.GeoPoint): Promise<void> {
        // Separate model data from Firestore data
        const firestoreData: FirestoreDocumentData = {
            currentLocation: location,
            lastLocationUpdate: new Date(),
            lastActive: new Date(),
            updatedAt: serverTimestamp()
        };

        await this.getAgentDocRef(userId).update(firestoreData);
    }

    async getAllAgents(): Promise<{ userId: string; agent: DeliveryAgent }[]> {
        // Use collection group query to get all deliveryAgent subcollections
        const snapshot = await db.collectionGroup('deliveryAgent').get();

        return snapshot.docs.map(doc => {
            // Extract the userId from the document path
            const pathSegments = doc.ref.path.split('/');
            const userId = pathSegments[1]; // users/{userId}/deliveryAgent

            return {
                userId,
                agent: { id: doc.id, ...doc.data() } as DeliveryAgent
            };
        });
    }

    async getAvailableAgents(): Promise<{ userId: string; agent: DeliveryAgent }[]> {
        // Use collection group query with filters
        const snapshot = await db.collectionGroup('deliveryAgent')
            .where('activeStatus', '==', 'available')
            .where('approvalStatus', '==', 'approved')
            .get();

        return snapshot.docs.map(doc => {
            const pathSegments = doc.ref.path.split('/');
            const userId = pathSegments[1];

            return {
                userId,
                agent: { id: doc.id, ...doc.data() } as DeliveryAgent
            };
        });
    }

    // Application and approval
    async updateApprovalStatus(userId: string, status: 'pending' | 'approved' | 'rejected', notes?: string): Promise<void> {
        // Separate model data from Firestore data
        const firestoreData: FirestoreDocumentData = {
            approvalStatus: status,
            updatedAt: serverTimestamp()
        };

        if (status === 'approved') {
            firestoreData.approvalDate = new Date();
        }

        if (notes) {
            firestoreData.verificationNotes = notes;
        }

        await this.getAgentDocRef(userId).update(firestoreData);
    }

    // Query agents by verification status
    async getAgentsByApprovalStatus(status: 'pending' | 'approved' | 'rejected'): Promise<{ userId: string; agent: DeliveryAgent }[]> {
        const snapshot = await db.collectionGroup('deliveryAgent')
            .where('approvalStatus', '==', status)
            .orderBy('applicationDate', 'asc')
            .get();

        return snapshot.docs.map(doc => {
            const pathSegments = doc.ref.path.split('/');
            const userId = pathSegments[1];

            return {
                userId,
                agent: { id: doc.id, ...doc.data() } as DeliveryAgent
            };
        });
    }

    // Analytics data
    async incrementCompletedDeliveries(userId: string): Promise<void> {
        await this.getAgentDocRef(userId).update({
            completedDeliveries: firebase.firestore.FieldValue.increment(1),
            updatedAt: serverTimestamp()
        });
    }

    async incrementCanceledDeliveries(userId: string): Promise<void> {
        await this.getAgentDocRef(userId).update({
            canceledDeliveries: firebase.firestore.FieldValue.increment(1),
            updatedAt: serverTimestamp()
        });
    }

    async updateAgentRating(userId: string, newRating: number): Promise<void> {
        // Get current agent
        const agent = await this.getByUserId(userId);
        if (!agent) throw new Error('Agent not found');

        // Calculate rolling average based on completed deliveries
        const totalDeliveries = agent.completedDeliveries;
        if (totalDeliveries === 0) {
            // First rating
            return this.update(userId, { rating: newRating });
        }

        // Calculate weighted average
        const currentWeight = totalDeliveries / (totalDeliveries + 1);
        const newWeight = 1 / (totalDeliveries + 1);
        const updatedRating = (agent.rating * currentWeight) + (newRating * newWeight);

        return this.update(userId, { rating: parseFloat(updatedRating.toFixed(2)) });
    }

    async addEarning(userId: string, amount: number, deliveryId: string): Promise<void> {
        // Update total earnings
        await this.getAgentDocRef(userId).update({
            totalEarnings: firebase.firestore.FieldValue.increment(amount),
            updatedAt: serverTimestamp()
        });
    }

    // Find nearby delivery agents
    async getNearbyAgents(
        location: FirebaseFirestoreTypes.GeoPoint,
        radiusInKm: number,
        onlyAvailable: boolean = true
    ): Promise<{ userId: string; agent: DeliveryAgent; distance: number }[]> {
        // First get all or only available agents
        let agents: { userId: string; agent: DeliveryAgent }[];

        if (onlyAvailable) {
            agents = await this.getAvailableAgents();
        } else {
            agents = await this.getAllAgents();
        }

        // Filter and add distance
        const result = agents.map(item => {
            const agentLocation = item.agent.currentLocation;

            // Skip agents without location
            if (!agentLocation) {
                return null;
            }

            // Calculate distance using Haversine formula
            const distance = this.calculateDistance(
                location.latitude, location.longitude,
                agentLocation.latitude, agentLocation.longitude
            );

            return {
                userId: item.userId,
                agent: item.agent,
                distance
            };
        })
            .filter(item => item !== null && item.distance <= radiusInKm) as { userId: string; agent: DeliveryAgent; distance: number }[];

        // Sort by distance
        return result.sort((a, b) => a.distance - b.distance);
    }

    // Helper method to calculate distance using Haversine formula
    private calculateDistance(
        lat1: number, lon1: number,
        lat2: number, lon2: number
    ): number {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in km
        return distance;
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI/180);
    }
}