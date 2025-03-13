import { User } from '../models/user.model';
import { userRepository } from '../firebase/repositories/user.repository';
import { validateUser } from '../utils/validation';

export const userService = {
    async getUserProfile(userId: string): Promise<User | null> {
        if (!userId) throw new Error('User ID is required');

        return userRepository.getById(userId);
    },

    async createUser(userData: Omit<User, 'id'>, id?: string): Promise<string> {
        // Validate user data before saving
        const validationErrors = validateUser(userData);
        if (validationErrors) {
            throw new Error(`Invalid user data: ${JSON.stringify(validationErrors)}`);
        }

        return userRepository.create(userData, id);
    },

    async updateUser(id: string, userData: Partial<User>): Promise<void> {
        if (!id) throw new Error('User ID is required');

        return userRepository.update(id, userData);
    },

    async deleteUser(id: string): Promise<void> {
        if (!id) throw new Error('User ID is required');

        return userRepository.delete(id);
    },

    async findUserByEmail(email: string): Promise<User | null> {
        if (!email) throw new Error('Email is required');

        return userRepository.findByEmail(email);
    }
};