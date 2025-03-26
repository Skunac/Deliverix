import { Delivery, DeliveryStatus, EmbeddedAddress } from '../models/delivery.model';
import { DeliveryRepository } from '../firebase/repositories/delivery.repository';
import { DeliveryAdapter } from '../firebase/adapters/delivery.adapter';
import { ReceiverInfo } from '../models/receiver.model';
import { DeliveryHistoryEvent } from '../models/delivery-history.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { DeliveryAgentService } from './delivery-agent.service';

export class DeliveryService {
    private repository: DeliveryRepository;

    constructor() {
        this.repository = new DeliveryRepository();
    }

    async createDelivery(data: {
        expeditorId: string;
        receiverId?: string;
        pickupAddress: EmbeddedAddress;
        deliveryAddress: EmbeddedAddress;
        scheduledDate: Date;
        timeSlot: { start: Date; end: Date };
        packageDescription: string;
        packageWeight: number;
        packageDimensions: { length: number; width: number; height: number };
        packageCategory: string;
        expeditorComments?: string;
        price: number;
    }): Promise<string> {
        // Create a complete delivery object that matches Omit<Delivery, 'id'>
        const deliveryData: Omit<Delivery, 'id'> = {
            ...data,
            status: 'pending',
            state: 'awaiting_acceptance',
            deliveryComments: '',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Use the adapter to prepare for Firestore
        return this.repository.create(deliveryData);
    }

    async getDeliveryById(deliveryId: string): Promise<Delivery | null> {
        return this.repository.getById(deliveryId);
    }

    async updateDelivery(deliveryId: string, data: Partial<Delivery>): Promise<void> {
        return this.repository.update(deliveryId, data);
    }

    async cancelDelivery(deliveryId: string, reason: string): Promise<void> {
        const delivery = await this.repository.getById(deliveryId);
        if (!delivery) {
            throw new Error('Delivery not found');
        }

        // If delivery was assigned to an agent, update agent status
        if (delivery.deliveryAgentId) {
            const agentService = new DeliveryAgentService();
            await agentService.recordDeliveryCancellation(delivery.deliveryAgentId);
            await agentService.updateAgentStatus(delivery.deliveryAgentId, 'available');
        }

        return this.repository.updateDeliveryStatus(
            deliveryId,
            'cancelled',
            'cancelled_by_expeditor',
            reason
        );
    }

    async assignDeliveryAgent(deliveryId: string, userId: string): Promise<void> {
        // Get the delivery to ensure it exists
        const delivery = await this.repository.getById(deliveryId);
        if (!delivery) {
            throw new Error('Delivery not found');
        }

        // Get the agent to ensure it exists and is available
        const agentService = new DeliveryAgentService();
        const agent = await agentService.getAgentProfile(userId);

        if (!agent) {
            throw new Error('Delivery agent not found');
        }

        if (agent.activeStatus !== 'available' || agent.approvalStatus !== 'approved') {
            throw new Error('Delivery agent is not available or not approved');
        }

        // Update the delivery with the agent's ID
        await this.repository.update(deliveryId, {
            deliveryAgentId: userId,
            status: 'accepted',
            state: 'assigned_to_agent'
        });

        // Update delivery status and create history entry
        await this.repository.updateDeliveryStatus(
            deliveryId,
            'accepted',
            'assigned_to_agent',
            'Delivery assigned to agent',
            userId
        );

        // Update agent status to busy
        await agentService.updateAgentStatus(userId, 'busy');
    }

    async startDelivery(deliveryId: string, agentId: string, location: FirebaseFirestoreTypes.GeoPoint): Promise<void> {
        return this.repository.updateDeliveryStatus(
            deliveryId,
            'in_progress',
            'pickup_in_progress',
            'Agent is on the way to pickup',
            agentId,
            location
        );
    }

    async completePickup(deliveryId: string, agentId: string, location: FirebaseFirestoreTypes.GeoPoint): Promise<void> {
        return this.repository.updateDeliveryStatus(
            deliveryId,
            'in_progress',
            'package_in_transit',
            'Package picked up and in transit',
            agentId,
            location
        );
    }

    async completeDelivery(deliveryId: string, agentId: string, location: FirebaseFirestoreTypes.GeoPoint, notes?: string): Promise<void> {
        // Update delivery status
        await this.repository.updateDeliveryStatus(
            deliveryId,
            'delivered',
            'package_delivered',
            notes || 'Package delivered successfully',
            agentId,
            location
        );

        // Get the delivery to get the price
        const delivery = await this.repository.getById(deliveryId);
        if (!delivery) {
            throw new Error('Delivery not found');
        }

        // Calculate agent earnings (for example, 80% of the delivery price)
        const agentEarnings = delivery.price * 0.8;

        // Update agent data
        const agentService = new DeliveryAgentService();
        await agentService.recordDeliveryCompletion(agentId, deliveryId, agentEarnings);

        // Set agent back to available
        await agentService.updateAgentStatus(agentId, 'available');
    }

    // Non-user receiver management
    async addReceiverInfo(deliveryId: string, info: {
        name: string;
        email?: string;
        phoneNumber: string;
    }): Promise<string> {
        return this.repository.createReceiverInfo(deliveryId, info);
    }

    async getReceiverInfo(deliveryId: string): Promise<ReceiverInfo | null> {
        return this.repository.getReceiverInfo(deliveryId);
    }

    // History and queries
    async getDeliveryHistory(deliveryId: string): Promise<DeliveryHistoryEvent[]> {
        return this.repository.getDeliveryHistory(deliveryId);
    }

    async getUserDeliveries(userId: string): Promise<Delivery[]> {
        return this.repository.getDeliveriesByExpeditor(userId);
    }

    async getAgentDeliveries(agentId: string): Promise<Delivery[]> {
        return this.repository.getDeliveriesByAgent(agentId);
    }

    async getPendingDeliveries(): Promise<Delivery[]> {
        return this.repository.getDeliveriesByStatus('pending');
    }

    async getNearbyDeliveries(
        location: FirebaseFirestoreTypes.GeoPoint,
        radiusInKm: number
    ): Promise<Delivery[]> {
        return this.repository.getNearbyDeliveries(location, radiusInKm);
    }
}