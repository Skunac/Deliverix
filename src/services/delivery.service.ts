import { db, serverTimestamp } from '@/src/firebase/config';
import {
    Delivery,
    DeliveryState,
    EmbeddedAddress
} from '@/src/models/delivery.model';
import { DeliveryAgentService } from './delivery-agent.service';
import {formatAddress} from "@/utils/formatters/address-formatter";
import {getObfuscatedPoint} from "@/utils/obfuscate/address-obfuscation";
import {calculateDistance} from "@/utils/geo-helper/distance-calculator";

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
            delivery.pickupAddress.formattedAddress = formatAddress(delivery.pickupAddress);

            // Format the delivery address
            delivery.deliveryAddress.formattedAddress = formatAddress(delivery.deliveryAddress);

            // Format the billing address
            delivery.billingAddress.formattedAddress = formatAddress(delivery.billingAddress);

            // Obfuscate the coordinates of pickup
            delivery.pickupAddress.obfuscatedCoordinates = getObfuscatedPoint(delivery.pickupAddress.coordinates.latitude, delivery.pickupAddress.coordinates.longitude, 300);

            // Obfuscate the coordinates of delivery
            delivery.deliveryAddress.obfuscatedCoordinates = getObfuscatedPoint(delivery.deliveryAddress.coordinates.latitude, delivery.deliveryAddress.coordinates.longitude, 300);

            delivery.secretCode = this.secretCodeGenerator();

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


    async getAvailableDeliveriesForAgent(agentId: string): Promise<Delivery[]> {
        try {
            // First get the agent profile to obtain their delivery range and location
            const agentService = new DeliveryAgentService();
            const agent = await agentService.getAgentProfile(agentId);

            if (!agent) {
                throw new Error('Agent not found');
            }

            // Get the agent's delivery range (defaults to 20km if not set)
            const deliveryRange = agent.deliveryRange || 20;

            // Get the agent's current location or home address coordinates if current location not available
            const agentLocation = agent.currentLocation || agent.personalInfo.address.coordinates;

            if (!agentLocation) {
                throw new Error('Agent location not available');
            }

            // First, get deliveries that are available
            const query = this.deliveriesCollection
                .where('state', '==', 'prepaid')
                .where('status', '==', 'waiting_for_delivery_guy')
                .orderBy('createdAt', 'desc');

            const snapshot = await query.get();

            const deliveriesInRange: Delivery[] = [];

            for (const doc of snapshot.docs) {
                const delivery = { id: doc.id, ...doc.data() } as Delivery;

                // Calculate distance to pickup location
                const pickupDistance = calculateDistance(
                    agentLocation.latitude,
                    agentLocation.longitude,
                    delivery.pickupAddress.coordinates.latitude,
                    delivery.pickupAddress.coordinates.longitude
                );

                // Calculate distance to delivery location
                const deliveryDistance = calculateDistance(
                    agentLocation.latitude,
                    agentLocation.longitude,
                    delivery.deliveryAddress.coordinates.latitude,
                    delivery.deliveryAddress.coordinates.longitude
                );

                // Both locations must be within the agent's delivery range
                if (pickupDistance <= deliveryRange && deliveryDistance <= deliveryRange) {
                    deliveriesInRange.push(delivery);
                }
            }

            return deliveriesInRange;
        } catch (error) {
            console.error('Error fetching available deliveries for agent:', error);
            throw error;
        }
    }

    async getAgentDeliveries(agentId: string, state?: DeliveryState): Promise<Delivery[]> {
        try {
            let query = this.deliveriesCollection
                .where('deliveryAgentId', '==', agentId)
                .orderBy('createdAt', 'desc');

            if (state) {
                query = query.where('state', '==', state);
            }

            const snapshot = await query.get();

            const deliveries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Delivery[];


            return deliveries;
        } catch (error) {
            console.error('Error fetching agent deliveries:', error);
            throw error;
        }
    }

    /**
     * Accept a delivery (assign it to the delivery agent)
     */
    async acceptDelivery(deliveryId: string, agentId: string): Promise<void> {
        try {
            // Update the delivery with the delivery agent's ID and new status
            await this.updateDelivery(deliveryId, {
                deliveryAgentId: agentId,
                status: 'delivery_guy_accepted',
                state: 'processing'
            });
        } catch (error) {
            console.error('Error accepting delivery:', error);
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

    private secretCodeGenerator(): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        const length = 6;

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            result += characters[randomIndex];
        }

        return result;
    }
}