import { Test } from '../models/test.model';
import { testRepository } from '../firebase/repositories/test.repository';

export const testService = {
    async addTestMessage(message: string): Promise<string> {
        if (!message) throw new Error('Message is required');

        return testRepository.addMessage(message);
    },

    async getLatestTestMessage(): Promise<Test | null> {
        return testRepository.getLatestMessage();
    }
};