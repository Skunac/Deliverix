import { BaseRepository } from './base.repository';
import { Delivery, DeliveryStatus } from '../../models/delivery.model';
import { COLLECTIONS } from '../collections';
import { db } from '../config';
import { ReceiverInfo } from '../../models/receiver.model';
import { DeliveryHistoryEvent } from '../../models/delivery-history.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { FirestoreDocumentData } from '../../models/common.model';

export class DeliveryRepository extends BaseRepository<Delivery> {
    constructor() {
        super(COLLECTIONS.DELIVERIES);
    }

    async createReceiverInfo(deliveryId: string, info: Omit<ReceiverInfo, 'id' | 'deliveryId'>): Promise<string> {
        const receiverData = {
            ...info,
            deliveryId
        };

        // Separate model data from Firestore data
        const firestoreData: FirestoreDocumentData = {
            ...receiverData,
            createdAt: this.getServerTimestamp(),
            updatedAt: this.getServerTimestamp()
        };

        const receiverRef = db.collection(COLLECTIONS.RECEIVER_INFO(deliveryId));
        const docRef = await receiverRef.add(firestoreData);

        return docRef.id;
    }

    async getReceiverInfo(deliveryId: string): Promise<ReceiverInfo | null> {
        const receiverSnapshot = await db.collection(COLLECTIONS.RECEIVER_INFO(deliveryId)).limit(1).get();

        if (receiverSnapshot.empty) {
            return null;
        }

        const doc = receiverSnapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        } as ReceiverInfo;
    }

    async updateDeliveryStatus(
        deliveryId: string,
        status: DeliveryStatus,
        state: string,
        notes?: string,
        agentId?: string,
        location?: any
    ): Promise<void> {
        // Start a batch write
        const batch = db.batch();

        // Update delivery document
        const deliveryRef = this.getCollectionRef().doc(deliveryId);

        // Firestore data for delivery update
        const deliveryUpdateData: FirestoreDocumentData = {
            status,
            state,
            updatedAt: this.getServerTimestamp()
        };

        batch.update(deliveryRef, deliveryUpdateData);

        // Add history event
        const historyRef = db.collection(COLLECTIONS.DELIVERY_HISTORY(deliveryId)).doc();

        // Create history event data - separate between model data and Firestore data
        const currentTime = new Date();

        // This is the data that matches our model
        const historyData: Partial<DeliveryHistoryEvent> = {
            timestamp: currentTime,
            status,
            state,
            deliveryId
        };

        if (notes) historyData.notes = notes;
        if (agentId) historyData.agentId = agentId;
        if (location) historyData.location = location;

        // This is what we'll actually send to Firestore, with the server timestamps
        const firestoreData: FirestoreDocumentData = {
            ...historyData,
            createdAt: this.getServerTimestamp(),
            updatedAt: this.getServerTimestamp()
        };

        batch.set(historyRef, firestoreData);

        // Commit the batch
        await batch.commit();
    }

    async getDeliveryHistory(deliveryId: string): Promise<DeliveryHistoryEvent[]> {
        const historySnapshot = await db
            .collection(COLLECTIONS.DELIVERY_HISTORY(deliveryId))
            .orderBy('timestamp', 'desc')
            .get();

        return historySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as DeliveryHistoryEvent));
    }

    async getDeliveriesByExpeditor(expeditorId: string): Promise<Delivery[]> {
        return this.query([['expeditorId', '==', expeditorId]], 'createdAt', 'desc');
    }

    async getDeliveriesByReceiver(receiverId: string): Promise<Delivery[]> {
        return this.query([['receiverId', '==', receiverId]], 'createdAt', 'desc');
    }

    async getDeliveriesByAgent(agentId: string): Promise<Delivery[]> {
        return this.query([['deliveryAgentId', '==', agentId]], 'createdAt', 'desc');
    }

    async getDeliveriesByStatus(status: DeliveryStatus): Promise<Delivery[]> {
        return this.query([['status', '==', status]], 'createdAt', 'desc');
    }

    // New method for nearby deliveries
    async getNearbyDeliveries(
        location: FirebaseFirestoreTypes.GeoPoint,
        radiusInKm: number,
        status: DeliveryStatus = 'pending'
    ): Promise<Delivery[]> {

        // First get pending deliveries
        const deliveries = await this.getDeliveriesByStatus(status);

        // Filter by distance
        return deliveries.filter(delivery => {
            const pickupLat = delivery.pickupAddress.coordinates.latitude;
            const pickupLng = delivery.pickupAddress.coordinates.longitude;

            // Calculate distance using Haversine formula
            const distance = this.calculateDistance(
                location.latitude, location.longitude,
                pickupLat, pickupLng
            );

            return distance <= radiusInKm;
        });
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