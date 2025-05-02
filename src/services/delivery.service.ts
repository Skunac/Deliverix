import { db, serverTimestamp } from '@/src/firebase/config';
import {
    Delivery,
    DeliveryState,
    EmbeddedAddress
} from '@/src/models/delivery.model';
import { DeliveryAgentService } from './delivery-agent.service';

export interface DeliveryWithAgent extends Delivery {
    agentFirstName?: string;
    agentLastName?: string;
}

export class DeliveryService {
    private deliveriesCollection = db.collection('deliveries');
    private deliveryAgentService: DeliveryAgentService;

    constructor() {
        this.deliveryAgentService = new DeliveryAgentService();
    }

    async getDeliveryById(deliveryId: string): Promise<DeliveryWithAgent | null> {
        try {
            const doc = await this.deliveriesCollection.doc(deliveryId).get();

            if (!doc.exists) {
                return null;
            }

            const delivery = { id: doc.id, ...doc.data() } as Delivery;
            return this.enrichDeliveryWithAgentInfo(delivery);
        } catch (error) {
            console.error('Error fetching delivery:', error);
            throw error;
        }
    }

    async getUserDeliveries(userId: string, state?: DeliveryState): Promise<DeliveryWithAgent[]> {
        try {
            let query = this.deliveriesCollection
                .where('creator', '==', userId)
                .orderBy('createdAt', 'desc');

            if (state) {
                query = query.where('state', '==', state);
            }

            const snapshot = await query.get();

            const deliveries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Delivery[];

            const enrichedDeliveries = await Promise.all(
                deliveries.map(delivery => this.enrichDeliveryWithAgentInfo(delivery))
            );

            return enrichedDeliveries;
        } catch (error) {
            console.error('Error fetching user deliveries:', error);
            throw error;
        }
    }

    async getLatestDelivery(userId: string, state?: DeliveryState): Promise<DeliveryWithAgent[]> {
        try {
            let query = this.deliveriesCollection
                .where('creator', '==', userId)
                .orderBy('createdAt', 'desc')
                .limit(1);

            if (state) {
                query = query.where('state', '==', state);
            }

            const snapshot = await query.get();

            const deliveries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Delivery[];

            const enrichedDeliveries = await Promise.all(
                deliveries.map(delivery => this.enrichDeliveryWithAgentInfo(delivery))
            );

            return enrichedDeliveries;
        } catch (error) {
            console.error('Error fetching latest delivery:', error);
            throw error;
        }
    }

    async createDelivery(delivery: Omit<Delivery, "id">): Promise<DeliveryWithAgent> {
        try {
            // Format the pickup address
            delivery.pickupAddress.formattedAddress = this.formatAddress(delivery.pickupAddress);

            // Format the delivery address
            delivery.deliveryAddress.formattedAddress = this.formatAddress(delivery.deliveryAddress);

            // Format the billing address
            delivery.billingAddress.formattedAddress = this.formatAddress(delivery.billingAddress);

            // Add timestamps
            const deliveryWithTimestamps = {
                ...delivery,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Create the delivery in Firestore
            const docRef = await this.deliveriesCollection.add(deliveryWithTimestamps);

            // Fetch the created delivery
            const doc = await docRef.get();

            if (!doc.exists) {
                throw new Error('Failed to create delivery');
            }

            // Return the created delivery with agent info
            const createdDelivery = { id: doc.id, ...doc.data() } as Delivery;
            return this.enrichDeliveryWithAgentInfo(createdDelivery);
        } catch (error) {
            console.error('Error creating delivery:', error);
            throw error;
        }
    }

    async updateDelivery(deliveryId: string, data: Partial<Delivery>): Promise<void> {
        try {
            // Add updated timestamp
            const updateData = {
                ...data,
                updatedAt: serverTimestamp()
            };

            await this.deliveriesCollection.doc(deliveryId).update(updateData);
        } catch (error) {
            console.error('Error updating delivery:', error);
            throw error;
        }
    }

    async deleteDelivery(deliveryId: string): Promise<void> {
        try {
            await this.deliveriesCollection.doc(deliveryId).delete();
        } catch (error) {
            console.error('Error deleting delivery:', error);
            throw error;
        }
    }

    /**
     * Enriches a delivery object with agent information
     */
    private async enrichDeliveryWithAgentInfo(delivery: Delivery): Promise<DeliveryWithAgent> {
        // Create a copy of the delivery with the extended interface
        const enrichedDelivery: DeliveryWithAgent = { ...delivery };

        // If there's no delivery agent assigned, return early
        if (!delivery.deliveryAgentId) {
            return enrichedDelivery;
        }

        try {
            // Get the delivery agent profile
            const agent = await this.deliveryAgentService.getAgentProfile(delivery.deliveryAgentId);

            if (agent) {
                // Add the agent's first and last name to the delivery
                enrichedDelivery.agentFirstName = agent.personalInfo.firstName;
                enrichedDelivery.agentLastName = agent.personalInfo.lastName;
            }
        } catch (error) {
            console.error(`Failed to get agent info for delivery ${delivery.id}:`, error);
            // Continue without agent info rather than failing the whole request
        }

        return enrichedDelivery;
    }

    // Helper method to format an address from components
    private formatAddress(address: EmbeddedAddress): string {
        const components = address.components;

        // Build the formatted address from components
        const streetAddress = [
            components.street_number,
            components.route
        ].filter(Boolean).join(' ');

        const cityInfo = [
            components.postal_code,
            components.locality
        ].filter(Boolean).join(' ');

        const regionCountry = [
            components.administrative_area_level_1,
            components.country
        ].filter(Boolean).join(', ');

        const formattedParts = [
            streetAddress,
            cityInfo,
            regionCountry
        ].filter(part => part.trim().length > 0);

        // Add complementary address if available
        if (address.complementaryAddress) {
            formattedParts.splice(1, 0, address.complementaryAddress);
        }

        return formattedParts.join(', ');
    }
}