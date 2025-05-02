import {Delivery, DeliveryState, EmbeddedAddress} from '../models/delivery.model';
import { DeliveryRepository } from '../firebase/repositories/delivery.repository';
import { DeliveryAgentRepository } from '../firebase/repositories/delivery-agent.repository';

// Define an extended delivery type with agent info
export interface DeliveryWithAgent extends Delivery {
    agentFirstName?: string;
    agentLastName?: string;
}

export class DeliveryService {
    private repository: DeliveryRepository;
    private agentRepository: DeliveryAgentRepository;

    constructor() {
        this.repository = new DeliveryRepository();
        this.agentRepository = new DeliveryAgentRepository();
    }

    async getDeliveryById(deliveryId: string): Promise<DeliveryWithAgent | null> {
        const delivery = await this.repository.getById(deliveryId);
        if (!delivery) return null;

        return this.enrichDeliveryWithAgentInfo(delivery);
    }

    async getUserDeliveries(userId: string, state?: DeliveryState): Promise<DeliveryWithAgent[]> {
        let deliveries: Delivery[];

        if (state) {
            deliveries = await this.repository.getDeliverieByStatusByExpeditor(userId, state);
        } else {
            deliveries = await this.repository.getDeliveriesByExpeditor(userId);
        }

        // Enrich all deliveries with agent info
        const enrichedDeliveries = await Promise.all(
            deliveries.map(delivery => this.enrichDeliveryWithAgentInfo(delivery))
        );

        return enrichedDeliveries;
    }

    async getLatestDelivery(userId: string, state?: DeliveryState): Promise<DeliveryWithAgent[]> {
        let deliveries: Delivery[];

        if (state) {
            deliveries = await this.repository.getLatestDeliveryByStatusByExpeditor(userId, state);
        } else {
            deliveries = await this.repository.getLatestDeliveriesByExpeditor(userId, 1);
        }

        // Enrich all deliveries with agent info
        const enrichedDeliveries = await Promise.all(
            deliveries.map(delivery => this.enrichDeliveryWithAgentInfo(delivery))
        );

        return enrichedDeliveries;
    }

    async createDelivery(delivery: Omit<Delivery, "id">): Promise<DeliveryWithAgent> {
        // Format the pickup address
        delivery.pickupAddress.formattedAddress = this.formatAddress(delivery.pickupAddress);

        // Format the delivery address
        delivery.deliveryAddress.formattedAddress = this.formatAddress(delivery.deliveryAddress);

        // Format the billing address
        delivery.billingAddress.formattedAddress = this.formatAddress(delivery.billingAddress);

        // Create the delivery in Firestore
        const deliveryId = await this.repository.create(delivery);

        // Fetch the created delivery
        const createdDelivery = await this.repository.getById(deliveryId);

        if (!createdDelivery) {
            throw new Error('Failed to create delivery');
        }

        // Enrich the created delivery with agent info
        return createdDelivery;
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
            // Get the delivery agent document from the subcollection
            const agent = await this.agentRepository.getByUserId(delivery.deliveryAgentId);

            console.log(`Agent info for delivery ${delivery.id}:`, agent);

            if (agent) {
                // Add the agent's first and last name to the delivery
                enrichedDelivery.agentFirstName = agent.personalInfo.firstName;
                enrichedDelivery.agentLastName = agent.personalInfo.lastName;
            } else {
                console.log(`No agent found for ID: ${delivery.deliveryAgentId}`);
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