import { User } from '../models/user.model';
import { UserRepository } from '../firebase/repositories/user.repository';
import { UserAdapter } from '../firebase/adapters/user.adapter';
import { Address } from '../models/address.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { firebaseAuth } from '../firebase/config';

export class UserService {
    private repository: UserRepository;

    constructor() {
        this.repository = new UserRepository();
    }

    async getCurrentUser(): Promise<User | null> {
        const currentUser = firebaseAuth.currentUser;
        if (!currentUser) {
            return null;
        }

        // Convert Firebase User to our User model
        const userModel = UserAdapter.fromFirebaseUser(currentUser);

        // Check if user exists in Firestore
        const existingUser = await this.repository.getById(currentUser.uid);

        if (!existingUser) {
            // Create user in Firestore if not exists
            // Create a complete user object that satisfies Omit<User, "id">
            const userData: Omit<User, "id"> = {
                email: userModel.email,
                displayName: userModel.displayName,
                photoURL: userModel.photoURL,
                uid: userModel.uid,
                emailVerified: userModel.emailVerified,
                phoneNumber: userModel.phoneNumber,
                createdAt: userModel.createdAt,
                updatedAt: userModel.updatedAt
            };

            await this.repository.create(userData, currentUser.uid);
        }

        return userModel;
    }

    async getUserById(userId: string): Promise<User | null> {
        return this.repository.getById(userId);
    }

    async updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
        return this.repository.update(userId, data);
    }

    // Address methods
    async addUserAddress(userId: string, address: {
        placeId: string;
        formattedAddress: string;
        label?: string;
        coordinates: FirebaseFirestoreTypes.GeoPoint;
        additionalInstructions?: string;
        isDefault?: boolean;
        components: any;
    }): Promise<string> {
        // If this is marked as default, make sure other addresses are not default
        if (address.isDefault) {
            const addresses = await this.getUserAddresses(userId);
            for (const existingAddress of addresses) {
                if (existingAddress.isDefault) {
                    await this.repository.updateAddress(userId, existingAddress.id, { isDefault: false });
                }
            }
        }

        return this.repository.createAddress(userId, address);
    }

    async getUserAddresses(userId: string): Promise<Address[]> {
        return this.repository.getUserAddresses(userId);
    }

    async updateUserAddress(userId: string, addressId: string, data: Partial<Address>): Promise<void> {
        // If setting this address as default, make sure other addresses are not default
        if (data.isDefault) {
            const addresses = await this.getUserAddresses(userId);
            for (const existingAddress of addresses) {
                if (existingAddress.id !== addressId && existingAddress.isDefault) {
                    await this.repository.updateAddress(userId, existingAddress.id, { isDefault: false });
                }
            }
        }

        return this.repository.updateAddress(userId, addressId, UserAdapter.addressToFirestore(data));
    }

    async deleteUserAddress(userId: string, addressId: string): Promise<void> {
        // Check if it's the default address
        const addresses = await this.getUserAddresses(userId);
        const addressToDelete = addresses.find(addr => addr.id === addressId);

        if (addressToDelete?.isDefault && addresses.length > 1) {
            // Set another address as default
            const newDefaultAddress = addresses.find(addr => addr.id !== addressId);
            if (newDefaultAddress) {
                await this.repository.updateAddress(userId, newDefaultAddress.id, { isDefault: true });
            }
        }

        return this.repository.deleteAddress(userId, addressId);
    }

    async getDefaultAddress(userId: string): Promise<Address | null> {
        return this.repository.getDefaultAddress(userId);
    }
}