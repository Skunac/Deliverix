import { BaseRepository } from './base.repository';
import { Delivery } from '../../models/delivery.model';
import { COLLECTIONS } from '../collections';

export class DeliveryRepository extends BaseRepository<Delivery> {
    constructor() {
        super(COLLECTIONS.DELIVERIES);
    }

    async getDeliveriesByExpeditor(expeditorId: string): Promise<Delivery[]> {
        return this.query([['expeditorId', '==', expeditorId]], 'createdAt', 'desc');
    }
}