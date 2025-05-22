import { db, serverTimestamp } from '@/src/firebase/config';
import {
    Delivery,
    DeliveryState,
    DeliveryStatus,
    EmbeddedAddress
} from '@/src/models/delivery.model';
import { DeliveryAgentService } from './delivery-agent.service';
import { formatAddress } from "@/utils/formatters/address-formatter";
import { getObfuscatedPoint } from "@/utils/obfuscate/address-obfuscation";
import { calculateDistance } from "@/utils/geo-helper/distance-calculator";

export interface DeliveryWithAgent extends Delivery {
    agentFirstName?: string;
    agentLastName?: string;
}

export interface DeliveryQueryOptions {
    state?: DeliveryState;
    status?: DeliveryStatus;
    limit?: number;
}

export class EnhancedDeliveryService {
    private deliveriesCollection = db.collection('deliveries');
    private deliveryAgentService: DeliveryAgentService;
    private activeListeners: Map<string, () => void> = new Map();

    constructor() {
        this.deliveryAgentService = new DeliveryAgentService();
    }

    // ==================== REAL-TIME SUBSCRIPTIONS ====================

    // Real-time subscription for single delivery
    subscribeToDelivery(
        deliveryId: string,
        callback: (delivery: DeliveryWithAgent | null) => void,
        onError?: (error: Error) => void
    ): () => void {
        const listenerKey = `delivery-${deliveryId}`;

        // Clean up existing listener
        this.cleanupListener(listenerKey);

        const unsubscribe = this.deliveriesCollection
            .doc(deliveryId)
            .onSnapshot(
                async (doc) => {
                    try {
                        if (!doc.exists) {
                            callback(null);
                            return;
                        }

                        const delivery = { id: doc.id, ...doc.data() } as Delivery;
                        const enrichedDelivery = await this.enrichDeliveryWithAgentInfo(delivery);
                        callback(enrichedDelivery);
                    } catch (error) {
                        console.error('Error in delivery subscription:', error);
                        onError?.(error as Error);
                    }
                },
                (error) => {
                    console.error('Firestore delivery subscription error:', error);
                    onError?.(error);
                }
            );

        this.activeListeners.set(listenerKey, unsubscribe);
        return () => this.cleanupListener(listenerKey);
    }

    // Real-time subscription for user deliveries
    subscribeToUserDeliveries(
        userId: string,
        callback: (deliveries: DeliveryWithAgent[]) => void,
        options?: DeliveryQueryOptions,
        onError?: (error: Error) => void
    ): () => void {
        const listenerKey = `user-${userId}-${JSON.stringify(options || {})}`;

        this.cleanupListener(listenerKey);

        let query = this.deliveriesCollection
            .where('creator', '==', userId)
            .orderBy('createdAt', 'desc');

        if (options?.state) {
            query = query.where('state', '==', options.state);
        }

        if (options?.status) {
            query = query.where('status', '==', options.status);
        }

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        const unsubscribe = query.onSnapshot(
            async (snapshot) => {
                try {
                    const deliveries = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Delivery[];

                    const enrichedDeliveries = await Promise.all(
                        deliveries.map(delivery => this.enrichDeliveryWithAgentInfo(delivery))
                    );

                    callback(enrichedDeliveries);
                } catch (error) {
                    console.error('Error in user deliveries subscription:', error);
                    onError?.(error as Error);
                }
            },
            (error) => {
                console.error('Firestore user deliveries subscription error:', error);
                onError?.(error);
            }
        );

        this.activeListeners.set(listenerKey, unsubscribe);
        return () => this.cleanupListener(listenerKey);
    }

    // Real-time subscription for agent deliveries
    subscribeToAgentDeliveries(
        agentId: string,
        callback: (deliveries: DeliveryWithAgent[]) => void,
        options?: DeliveryQueryOptions,
        onError?: (error: Error) => void
    ): () => void {
        const listenerKey = `agent-${agentId}-${JSON.stringify(options || {})}`;

        this.cleanupListener(listenerKey);

        let query = this.deliveriesCollection
            .where('deliveryAgentId', '==', agentId)
            .orderBy('createdAt', 'desc');

        if (options?.state) {
            query = query.where('state', '==', options.state);
        }

        if (options?.status) {
            query = query.where('status', '==', options.status);
        }

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        const unsubscribe = query.onSnapshot(
            async (snapshot) => {
                try {
                    const deliveries = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Delivery[];

                    const enrichedDeliveries = await Promise.all(
                        deliveries.map(delivery => this.enrichDeliveryWithAgentInfo(delivery))
                    );

                    callback(enrichedDeliveries);
                } catch (error) {
                    console.error('Error in agent deliveries subscription:', error);
                    onError?.(error as Error);
                }
            },
            (error) => {
                console.error('Firestore agent deliveries subscription error:', error);
                onError?.(error);
            }
        );

        this.activeListeners.set(listenerKey, unsubscribe);
        return () => this.cleanupListener(listenerKey);
    }

    // Real-time subscription for available deliveries
    subscribeToAvailableDeliveries(
        agentId: string,
        callback: (deliveries: Delivery[]) => void,
        onError?: (error: Error) => void
    ): () => void {
        const listenerKey = `available-${agentId}`;

        this.cleanupListener(listenerKey);

        const query = this.deliveriesCollection
            .where('state', '==', 'prepaid')
            .where('status', '==', 'waiting_for_delivery_guy')
            .orderBy('createdAt', 'desc');

        const unsubscribe = query.onSnapshot(
            async (snapshot) => {
                try {
                    // Get agent profile to filter by delivery range
                    const agent = await this.deliveryAgentService.getAgentProfile(agentId);

                    if (!agent) {
                        callback([]);
                        return;
                    }

                    const deliveryRange = agent.deliveryRange || 20;
                    const agentLocation = agent.currentLocation || agent.personalInfo.address.coordinates;

                    if (!agentLocation) {
                        callback([]);
                        return;
                    }

                    const deliveriesInRange: Delivery[] = [];

                    for (const doc of snapshot.docs) {
                        const delivery = { id: doc.id, ...doc.data() } as Delivery;

                        const pickupDistance = calculateDistance(
                            agentLocation.latitude,
                            agentLocation.longitude,
                            delivery.pickupAddress.coordinates.latitude,
                            delivery.pickupAddress.coordinates.longitude
                        );

                        const deliveryDistance = calculateDistance(
                            agentLocation.latitude,
                            agentLocation.longitude,
                            delivery.deliveryAddress.coordinates.latitude,
                            delivery.deliveryAddress.coordinates.longitude
                        );

                        if (pickupDistance <= deliveryRange && deliveryDistance <= deliveryRange) {
                            deliveriesInRange.push(delivery);
                        }
                    }

                    callback(deliveriesInRange);
                } catch (error) {
                    console.error('Error in available deliveries subscription:', error);
                    onError?.(error as Error);
                }
            },
            (error) => {
                console.error('Firestore available deliveries subscription error:', error);
                onError?.(error);
            }
        );

        this.activeListeners.set(listenerKey, unsubscribe);
        return () => this.cleanupListener(listenerKey);
    }

    // ==================== ONE-TIME FETCH METHODS ====================

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

    async getUserDeliveries(
        userId: string,
        options?: DeliveryQueryOptions
    ): Promise<DeliveryWithAgent[]> {
        try {
            let query = this.deliveriesCollection
                .where('creator', '==', userId)
                .orderBy('createdAt', 'desc');

            if (options?.state) {
                query = query.where('state', '==', options.state);
            }

            if (options?.status) {
                query = query.where('status', '==', options.status);
            }

            if (options?.limit) {
                query = query.limit(options.limit);
            }

            const snapshot = await query.get();

            const deliveries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Delivery[];

            return Promise.all(
                deliveries.map(delivery => this.enrichDeliveryWithAgentInfo(delivery))
            );
        } catch (error) {
            console.error('Error fetching user deliveries:', error);
            throw error;
        }
    }

    async getAgentDeliveries(
        agentId: string,
        options?: DeliveryQueryOptions
    ): Promise<DeliveryWithAgent[]> {
        try {
            let query = this.deliveriesCollection
                .where('deliveryAgentId', '==', agentId)
                .orderBy('createdAt', 'desc');

            if (options?.state) {
                query = query.where('state', '==', options.state);
            }

            if (options?.status) {
                query = query.where('status', '==', options.status);
            }

            if (options?.limit) {
                query = query.limit(options.limit);
            }

            const snapshot = await query.get();

            const deliveries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Delivery[];

            return Promise.all(
                deliveries.map(delivery => this.enrichDeliveryWithAgentInfo(delivery))
            );
        } catch (error) {
            console.error('Error fetching agent deliveries:', error);
            throw error;
        }
    }

    async getAvailableDeliveriesForAgent(agentId: string): Promise<Delivery[]> {
        try {
            const agent = await this.deliveryAgentService.getAgentProfile(agentId);

            if (!agent) {
                throw new Error('Agent not found');
            }

            const deliveryRange = agent.deliveryRange || 20;
            const agentLocation = agent.currentLocation || agent.personalInfo.address.coordinates;

            if (!agentLocation) {
                throw new Error('Agent location not available');
            }

            const query = this.deliveriesCollection
                .where('state', '==', 'prepaid')
                .where('status', '==', 'waiting_for_delivery_guy')
                .orderBy('createdAt', 'desc');

            const snapshot = await query.get();

            const deliveriesInRange: Delivery[] = [];

            for (const doc of snapshot.docs) {
                const delivery = { id: doc.id, ...doc.data() } as Delivery;

                const pickupDistance = calculateDistance(
                    agentLocation.latitude,
                    agentLocation.longitude,
                    delivery.pickupAddress.coordinates.latitude,
                    delivery.pickupAddress.coordinates.longitude
                );

                const deliveryDistance = calculateDistance(
                    agentLocation.latitude,
                    agentLocation.longitude,
                    delivery.deliveryAddress.coordinates.latitude,
                    delivery.deliveryAddress.coordinates.longitude
                );

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

    // ==================== MUTATION METHODS ====================

    async createDelivery(delivery: Omit<Delivery, "id">): Promise<DeliveryWithAgent> {
        try {
            delivery.pickupAddress.formattedAddress = formatAddress(delivery.pickupAddress);
            delivery.deliveryAddress.formattedAddress = formatAddress(delivery.deliveryAddress);
            delivery.billingAddress.formattedAddress = formatAddress(delivery.billingAddress);

            delivery.pickupAddress.obfuscatedCoordinates = getObfuscatedPoint(
                delivery.pickupAddress.coordinates.latitude,
                delivery.pickupAddress.coordinates.longitude,
                300
            );

            delivery.deliveryAddress.obfuscatedCoordinates = getObfuscatedPoint(
                delivery.deliveryAddress.coordinates.latitude,
                delivery.deliveryAddress.coordinates.longitude,
                300
            );

            delivery.secretCode = this.secretCodeGenerator();

            const deliveryWithTimestamps = {
                ...delivery,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await this.deliveriesCollection.add(deliveryWithTimestamps);
            const doc = await docRef.get();

            if (!doc.exists) {
                throw new Error('Failed to create delivery');
            }

            const createdDelivery = { id: doc.id, ...doc.data() } as Delivery;
            return this.enrichDeliveryWithAgentInfo(createdDelivery);
        } catch (error) {
            console.error('Error creating delivery:', error);
            throw error;
        }
    }

    async updateDelivery(deliveryId: string, data: Partial<Delivery>): Promise<void> {
        try {
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

    async acceptDelivery(deliveryId: string, agentId: string): Promise<void> {
        try {
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

    async validateDelivery(deliveryId: string): Promise<void> {
        try {
            await this.updateDelivery(deliveryId, {
                status: 'delivered',
                state: 'completed',
            });
        } catch (error) {
            console.error('Error validating delivery:', error);
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

    // ==================== PRIVATE HELPER METHODS ====================

    private cleanupListener(listenerKey: string): void {
        const existingUnsubscribe = this.activeListeners.get(listenerKey);
        if (existingUnsubscribe) {
            existingUnsubscribe();
            this.activeListeners.delete(listenerKey);
        }
    }

    cleanup(): void {
        this.activeListeners.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.activeListeners.clear();
    }

    private async enrichDeliveryWithAgentInfo(delivery: Delivery): Promise<DeliveryWithAgent> {
        const enrichedDelivery: DeliveryWithAgent = { ...delivery };

        if (!delivery.deliveryAgentId) {
            return enrichedDelivery;
        }

        try {
            const agent = await this.deliveryAgentService.getAgentProfile(delivery.deliveryAgentId);

            if (agent) {
                enrichedDelivery.agentFirstName = agent.personalInfo.firstName;
                enrichedDelivery.agentLastName = agent.personalInfo.lastName;
            }
        } catch (error) {
            console.error(`Failed to get agent info for delivery ${delivery.id}:`, error);
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

// Create singleton instance
export const enhancedDeliveryService = new EnhancedDeliveryService();