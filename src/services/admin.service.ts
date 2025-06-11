import { db, serverTimestamp, query, where, orderBy, getDocs, getDoc, doc, updateDoc } from '@/src/firebase/config';
import { User, UserType } from '@/src/models/user.model';
import {emailService} from "@/src/services/email.service";

export interface UserStats {
    totalUsers: number;
    individualUsers: number;
    professionalUsers: number;
    deliveryAgents: number;
    activeUsers: number;
    pendingDeliveryAgents: number;
}

export class AdminUserService {
    private usersCollection = db.collection('users');

    /**
     * Get all users (admin only)
     */
    async getAllUsers(): Promise<User[]> {
        try {
            const q = query(
                this.usersCollection,
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
        } catch (error) {
            console.error('Error fetching all users:', error);
            throw error;
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<User | null> {
        try {
            const userDoc = await getDoc(doc(this.usersCollection, userId));

            if (!userDoc) {
                return null;
            }

            return {
                id: userDoc.id,
                ...userDoc.data()
            } as User;
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            throw error;
        }
    }

    /**
     * Update user status (activate/deactivate)
     */
    async updateUserStatus(userId: string, isAllowed: boolean): Promise<void> {
        try {
            const updateData: any = {
                updatedAt: serverTimestamp()
            };

            if (isAllowed) {
                updateData.isAllowed = true;
                updateData.isBanned = false;
            } else {
                updateData.isAllowed = false;
                updateData.isBanned = true;
            }

            await updateDoc(doc(this.usersCollection, userId), updateData);
        } catch (error) {
            console.error('Error updating user status:', error);
            throw error;
        }
    }

    /**
     * Update user profile data
     */
    async updateUser(userId: string, userData: Partial<User>): Promise<void> {
        try {
            const updateData = {
                ...userData,
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(this.usersCollection, userId), updateData);
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    /**
     * Delete user (admin only)
     */
    async deleteUser(userId: string): Promise<void> {
        try {
            await doc(this.usersCollection, userId).delete();
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    /**
     * Get all delivery agents
     */
    async getDeliveryAgents(): Promise<User[]> {
        try {
            const q = query(
                this.usersCollection,
                where('isDeliveryAgent', '==', true),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
        } catch (error) {
            console.error('Error fetching delivery agents:', error);
            throw error;
        }
    }

    /**
     * Update delivery agent status (approve/reject)
     */
    async updateDeliveryAgentStatus(agentId: string, isAllowed: boolean): Promise<void> {
        try {
            await updateDoc(doc(this.usersCollection, agentId), {
                isAllowed,
                updatedAt: serverTimestamp()
            });

            try {
                const emailTemplate = isAllowed ? 'agent_approved' : 'agent_rejected';
                await emailService.sendEmailToUser(
                    emailTemplate,
                    agentId,
                    {
                        approvalStatus: isAllowed ? 'approved' : 'rejected'
                    }
                );
                console.log(`Agent ${isAllowed ? 'approval' : 'rejection'} email sent to agent ${agentId}`);
            } catch (emailError) {
                console.error(`Failed to send agent ${isAllowed ? 'approval' : 'rejection'} email:`, emailError);
            }
        } catch (error) {
            console.error('Error updating delivery agent status:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     */
    async getUserStats(): Promise<UserStats> {
        try {
            // Get all users
            const allUsersSnapshot = await getDocs(this.usersCollection);
            const allUsers = allUsersSnapshot.docs.map(doc => doc.data()) as User[];

            // Calculate statistics
            const stats: UserStats = {
                totalUsers: allUsers.length,
                individualUsers: allUsers.filter(user => user.userType === 'individual').length,
                professionalUsers: allUsers.filter(user => user.userType === 'professional').length,
                deliveryAgents: allUsers.filter(user => user.isDeliveryAgent).length,
                activeUsers: allUsers.filter(user => user.isAllowed !== false).length,
                pendingDeliveryAgents: allUsers.filter(user =>
                    user.isDeliveryAgent && user.isAllowed === false
                ).length
            };

            return stats;
        } catch (error) {
            console.error('Error fetching user stats:', error);
            throw error;
        }
    }

    /**
     * Search users by email, name, or phone
     */
    async searchUsers(searchQuery: string): Promise<User[]> {
        try {
            const allUsers = await this.getAllUsers();

            const query = searchQuery.toLowerCase();

            return allUsers.filter(user => {
                const searchFields = [
                    user.email,
                    user.phoneNumber,
                    user.userType === 'individual' ? `${(user as any).firstName} ${(user as any).lastName}` : '',
                    user.userType === 'professional' ? (user as any).companyName : '',
                    user.userType === 'professional' ? (user as any).contactName : ''
                ].filter(Boolean).join(' ').toLowerCase();

                return searchFields.includes(query);
            });
        } catch (error) {
            console.error('Error searching users:', error);
            throw error;
        }
    }

    /**
     * Get users by type
     */
    async getUsersByType(userType: UserType): Promise<User[]> {
        try {
            const q = query(
                this.usersCollection,
                where('userType', '==', userType),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
        } catch (error) {
            console.error('Error fetching users by type:', error);
            throw error;
        }
    }

    /**
     * Get users by status
     */
    async getUsersByStatus(isActive: boolean): Promise<User[]> {
        try {
            const q = query(
                this.usersCollection,
                where('isAllowed', '==', isActive),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
        } catch (error) {
            console.error('Error fetching users by status:', error);
            throw error;
        }
    }

    /**
     * Bulk update users
     */
    async bulkUpdateUsers(userIds: string[], updateData: Partial<User>): Promise<void> {
        try {
            const batch = db.batch();

            userIds.forEach(userId => {
                const userRef = doc(this.usersCollection, userId);
                batch.update(userRef, {
                    ...updateData,
                    updatedAt: serverTimestamp()
                });
            });

            await batch.commit();
        } catch (error) {
            console.error('Error bulk updating users:', error);
            throw error;
        }
    }
}