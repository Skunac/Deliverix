import { BaseRepository } from './base.repository';
import {Delivery, DeliveryState, DeliveryStatus} from '../../models/delivery.model';
import { COLLECTIONS } from '../collections';

export class DeliveryRepository extends BaseRepository<Delivery> {
    constructor() {
        super(COLLECTIONS.DELIVERIES);
    }

    async getDeliveriesByExpeditor(expeditorId: string): Promise<Delivery[]> {
        return this.query([['expeditorId', '==', expeditorId]], 'createdAt', 'desc');
    }

    async getDeliverieByStatusByExpeditor(expeditorId: string, state: DeliveryState): Promise<Delivery[]> {
        return this.query([['expeditorId', '==', expeditorId], ['state', '==', state]], 'createdAt', 'desc');
    }

    async getLatestDeliveryByStatusByExpeditor(expeditorId: string, state?: DeliveryState): Promise<Delivery[]> {
        return this.query([['expeditorId', '==', expeditorId], ['state', '==', state]], 'createdAt', 'desc', 1);
    }

    async getLatestDeliveriesByExpeditor(expeditorId: string, limit: number): Promise<Delivery[]> {
        return this.query([['expeditorId', '==', expeditorId]], 'createdAt', 'desc', limit);
    }
}