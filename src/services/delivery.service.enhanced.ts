import { db, serverTimestamp } from '@/src/firebase/config';
import {
    Delivery,
    DeliveryState,
    DeliveryStatus,
    EmbeddedAddress, RescheduleRecord
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

    // Real-time subscription for user deliveries (with deleted filter)
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
            .where('deleted', '==', false) // Filter out deleted deliveries
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

    // Real-time subscription for agent deliveries (with deleted filter)
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
            .where('deleted', '==', false) // Filter out deleted deliveries
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

    // Real-time subscription for available deliveries (with deleted filter)
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
            .where('deleted', '==', false) // Filter out deleted deliveries
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
                .where('deleted', '==', false) // Filter out deleted deliveries
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
                .where('deleted', '==', false) // Filter out deleted deliveries
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
                .where('deleted', '==', false) // Filter out deleted deliveries
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
                deleted: false, // Set default deleted field
                rescheduleCount: 0,
                rescheduleHistory: [],
                maxReschedules: 2, // Default maximum reschedules
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

    async canEditOrDeleteDelivery(deliveryId: string, userId: string, isAdmin: boolean = false): Promise<{ canEdit: boolean; canDelete: boolean; reason?: string }> {
        try {
            console.log(`Checking permissions for user ${userId} on delivery ${deliveryId} (isAdmin: ${isAdmin})`);
            if (isAdmin) {
                return { canEdit: true, canDelete: true };
            }
            const delivery = await this.getDeliveryById(deliveryId);

            if (!delivery) {
                return { canEdit: false, canDelete: false, reason: 'Livraison non trouvée' };
            }

            // Check if user is the creator
            if (delivery.creator !== userId) {
                return { canEdit: false, canDelete: false, reason: 'Vous n\'êtes pas autorisé à modifier cette livraison' };
            }

            // Check if delivery is soft deleted
            if (delivery.deleted) {
                return { canEdit: false, canDelete: false, reason: 'Cette livraison a été supprimée' };
            }

            // Check if delivery has been accepted by a delivery agent
            const hasDeliveryAgent = delivery.deliveryAgentId && delivery.status !== 'waiting_for_delivery_guy';

            if (hasDeliveryAgent) {
                return {
                    canEdit: false,
                    canDelete: false,
                    reason: 'Cette livraison a été acceptée par un livreur. Pour toute modification, veuillez contacter notre support à support@primex.com'
                };
            }

            // Can edit if payment is not completed yet
            const canEdit = delivery.state === 'waiting_for_prepayment' || delivery.state === 'prepaid';

            // Can delete if not yet accepted
            const canDelete = delivery.status === 'waiting_for_delivery_guy';

            return { canEdit, canDelete };
        } catch (error) {
            console.error('Error checking delivery edit permissions:', error);
            throw error;
        }
    }

    async softDeleteDelivery(deliveryId: string, userId: string): Promise<void> {
        try {
            const permissions = await this.canEditOrDeleteDelivery(deliveryId, userId);

            if (!permissions.canDelete) {
                throw new Error(permissions.reason || 'Impossible de supprimer cette livraison');
            }

            await this.updateDelivery(deliveryId, {
                deleted: true,
                deletedAt: new Date(),
                deletedBy: userId
            });
        } catch (error) {
            console.error('Error soft deleting delivery:', error);
            throw error;
        }
    }

    async editDelivery(
        deliveryId: string,
        userId: string,
        updateData: Partial<Delivery>,
        isAdmin: boolean = false
    ): Promise<DeliveryWithAgent> {
        try {
            const permissions = await this.canEditOrDeleteDelivery(deliveryId, userId, isAdmin);

            if (!permissions.canEdit) {
                throw new Error(permissions.reason || 'Impossible de modifier cette livraison');
            }

            // Remove fields that shouldn't be updated
            const allowedFields = [
                'packageDescription',
                'packageWeight',
                'packageDimensions',
                'packageCategory',
                'isFragile',
                'comment',
                'scheduledDate',
                'timeSlot',
                'expeditor',
                'receiver',
                'pickupAddress',
                'deliveryAddress',
                'billingAddress'
            ];

            const filteredUpdateData: any = {};
            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    filteredUpdateData[key] = updateData[key as keyof Delivery];
                }
            });

            // If addresses are being updated, recalculate obfuscated coordinates
            if (filteredUpdateData.pickupAddress) {
                filteredUpdateData.pickupAddress.formattedAddress = formatAddress(filteredUpdateData.pickupAddress);
                filteredUpdateData.pickupAddress.obfuscatedCoordinates = getObfuscatedPoint(
                    filteredUpdateData.pickupAddress.coordinates.latitude,
                    filteredUpdateData.pickupAddress.coordinates.longitude,
                    300
                );
            }

            if (filteredUpdateData.deliveryAddress) {
                filteredUpdateData.deliveryAddress.formattedAddress = formatAddress(filteredUpdateData.deliveryAddress);
                filteredUpdateData.deliveryAddress.obfuscatedCoordinates = getObfuscatedPoint(
                    filteredUpdateData.deliveryAddress.coordinates.latitude,
                    filteredUpdateData.deliveryAddress.coordinates.longitude,
                    300
                );
            }

            if (filteredUpdateData.billingAddress) {
                filteredUpdateData.billingAddress.formattedAddress = formatAddress(filteredUpdateData.billingAddress);
            }

            await this.updateDelivery(deliveryId, filteredUpdateData);

            // Return updated delivery
            const updatedDelivery = await this.getDeliveryById(deliveryId);
            if (!updatedDelivery) {
                throw new Error('Failed to retrieve updated delivery');
            }

            return updatedDelivery;
        } catch (error) {
            console.error('Error editing delivery:', error);
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

    async rescheduleDelivery(
        deliveryId: string,
        agentId: string,
        reason?: string
    ): Promise<DeliveryWithAgent> {
        try {
            // Get current delivery
            const delivery = await this.getDeliveryById(deliveryId);

            if (!delivery) {
                throw new Error('Delivery not found');
            }

            // Verify agent is assigned to this delivery
            if (delivery.deliveryAgentId !== agentId) {
                throw new Error('Agent not authorized to reschedule this delivery');
            }

            // Check if delivery can be rescheduled
            if (delivery.status === 'delivered' || delivery.status === 'failed') {
                throw new Error('Cannot reschedule completed or failed delivery');
            }

            // Check reschedule limit
            const maxReschedules = delivery.maxReschedules || 2;
            const currentCount = delivery.rescheduleCount || 0;

            if (currentCount >= maxReschedules) {
                // Set to failed if max reschedules reached
                await this.updateDelivery(deliveryId, {
                    status: 'failed',
                    state: 'cancelled',
                    rescheduleCount: currentCount + 1,
                    rescheduleHistory: [
                        ...(delivery.rescheduleHistory || []),
                        {
                            rescheduleDate: new Date(),
                            reason: reason || 'Maximum reschedules exceeded',
                            agentId
                        }
                    ]
                });

                const updatedDelivery = await this.getDeliveryById(deliveryId);
                if (!updatedDelivery) {
                    throw new Error('Failed to retrieve updated delivery');
                }
                return updatedDelivery;
            }

            // Update delivery with reschedule
            const newRescheduleRecord: RescheduleRecord = {
                rescheduleDate: new Date(),
                reason: reason || 'Delivery rescheduled by agent',
                agentId
            };

            const updatedRescheduleCount = currentCount + 1;
            const willFail = updatedRescheduleCount >= maxReschedules;

            await this.updateDelivery(deliveryId, {
                status: willFail ? 'failed' : 'rescheduled',
                state: willFail ? 'cancelled' : 'processing',
                rescheduleCount: updatedRescheduleCount,
                rescheduleHistory: [
                    ...(delivery.rescheduleHistory || []),
                    newRescheduleRecord
                ]
            });

            // Return updated delivery
            const updatedDelivery = await this.getDeliveryById(deliveryId);
            if (!updatedDelivery) {
                throw new Error('Failed to retrieve updated delivery');
            }

            return updatedDelivery;
        } catch (error) {
            console.error('Error rescheduling delivery:', error);
            throw error;
        }
    }

    // ==================== ADMIN METHODS ====================

    // Real-time subscription for all deliveries (admin only)
    subscribeToAllDeliveries(
        callback: (deliveries: DeliveryWithAgent[]) => void,
        options?: DeliveryQueryOptions,
        onError?: (error: Error) => void
    ): () => void {
        const listenerKey = `admin-all-${JSON.stringify(options || {})}`;

        this.cleanupListener(listenerKey);

        let query = this.deliveriesCollection
            .where('deleted', '==', false) // Filter out deleted deliveries
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
                    console.error('Error in admin all deliveries subscription:', error);
                    onError?.(error as Error);
                }
            },
            (error) => {
                console.error('Firestore admin all deliveries subscription error:', error);
                onError?.(error);
            }
        );

        this.activeListeners.set(listenerKey, unsubscribe);
        return () => this.cleanupListener(listenerKey);
    }

    // One-time fetch for all deliveries (admin only)
    async getAllDeliveries(options?: DeliveryQueryOptions): Promise<DeliveryWithAgent[]> {
        try {
            let query = this.deliveriesCollection

                .where('deleted', '==', false) // Filter out deleted deliveries
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
            console.error('Error fetching all deliveries:', error);
            throw error;
        }
    }

    // Admin method to permanently delete a delivery
    async adminDeleteDelivery(deliveryId: string, adminUserId: string): Promise<void> {
        try {
            await this.deliveriesCollection.doc(deliveryId).delete();
            console.log(`Delivery ${deliveryId} permanently deleted by admin ${adminUserId}`);
        } catch (error) {
            console.error('Error permanently deleting delivery:', error);
            throw error;
        }
    }

    // Admin method to restore a soft-deleted delivery
    async adminRestoreDelivery(deliveryId: string, adminUserId: string): Promise<void> {
        try {
            await this.updateDelivery(deliveryId, {
                deleted: false,
                deletedAt: null as any,
                deletedBy: null as any,
            });
            console.log(`Delivery ${deliveryId} restored by admin ${adminUserId}`);
        } catch (error) {
            console.error('Error restoring delivery:', error);
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