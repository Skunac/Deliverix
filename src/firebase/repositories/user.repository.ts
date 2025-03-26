import { BaseRepository } from './base.repository';
import { User } from '../../models/user.model';
import { COLLECTIONS } from '../collections';
import { db } from '../config';
import { Address } from '../../models/address.model';

export class UserRepository extends BaseRepository<User> {
    constructor() {
        super(COLLECTIONS.USERS);
    }

    async createAddress(userId: string, address: Omit<Address, 'id' | 'userId'>): Promise<string> {
        const addressData = {
            ...address,
            userId
        };

        const addressRef = db.collection(COLLECTIONS.USER_ADDRESSES(userId));
        const docRef = await addressRef.add({
            ...addressData,
            createdAt: this.getServerTimestamp(),
            updatedAt: this.getServerTimestamp()
        });

        return docRef.id;
    }

    async getUserAddresses(userId: string): Promise<Address[]> {
        const addressesSnapshot = await db.collection(COLLECTIONS.USER_ADDRESSES(userId)).get();

        return addressesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Address));
    }

    async updateAddress(userId: string, addressId: string, data: Partial<Address>): Promise<void> {
        const updateData = {
            ...data,
            updatedAt: this.getServerTimestamp()
        };

        await db.collection(COLLECTIONS.USER_ADDRESSES(userId)).doc(addressId).update(updateData);
    }

    async deleteAddress(userId: string, addressId: string): Promise<void> {
        await db.collection(COLLECTIONS.USER_ADDRESSES(userId)).doc(addressId).delete();
    }

    async getDefaultAddress(userId: string): Promise<Address | null> {
        const snapshot = await db.collection(COLLECTIONS.USER_ADDRESSES(userId))
            .where('isDefault', '==', true)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Address;
    }
}