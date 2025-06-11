import { db, serverTimestamp } from '@/src/firebase/config';
import { User } from '@/src/models/user.model';

export class UserService {
    private usersCollection = db.collection('users');

    async getUserById(userId: string): Promise<User | undefined> {
        try {
            const doc = await this.usersCollection.doc(userId).get();

            if (!doc.exists) {
                return undefined;
            }

            return { id: doc.id, ...doc.data() } as User;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    }

    async createUser(userData: Omit<User, 'id'>, customId?: string): Promise<string> {
        try {
            const firestoreData = {
                ...userData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            if (customId) {
                await this.usersCollection.doc(customId).set(firestoreData);
                return customId;
            } else {
                const docRef = await this.usersCollection.add(firestoreData);
                return docRef.id;
            }
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
        try {
            const firestoreData = {
                ...data,
                updatedAt: serverTimestamp(),
            };

            await this.usersCollection.doc(userId).update(firestoreData);
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    async deleteUser(userId: string): Promise<void> {
        try {
            await this.usersCollection.doc(userId).delete();
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
}