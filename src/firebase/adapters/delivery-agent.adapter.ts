import {
    DeliveryAgent,
} from '../../models/delivery-agent.model';

export class DeliveryAgentAdapter {
    static toFirestore(agent: Partial<DeliveryAgent>): Record<string, any> {
        // Remove id from the data to be sent to Firestore
        const { id, ...agentData } = agent;
        return agentData;
    }
}