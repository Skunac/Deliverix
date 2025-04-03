import { Delivery } from '../models/delivery.model';
import { DeliveryRepository } from '../firebase/repositories/delivery.repository';

export class DeliveryService {
    private repository: DeliveryRepository;

    constructor() {
        this.repository = new DeliveryRepository();
    }

    async getDeliveryById(deliveryId: string): Promise<Delivery | null> {
        return this.repository.getById(deliveryId);
    }

    async getUserDeliveries(userId: string): Promise<Delivery[]> {
        return this.repository.getDeliveriesByExpeditor(userId);
    }
}