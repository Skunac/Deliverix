export const COLLECTIONS = {
    TEST: 'tests',
    USERS: 'users',
    USER_ADDRESSES: (userId: string) => `users/${userId}/addresses`,
    USER_DELIVERY_AGENT: (userId: string) => `users/${userId}/deliveryAgent`,
    AGENT_AVAILABILITY: (userId: string) => `users/${userId}/deliveryAgent/availability`,
    DELIVERIES: 'deliveries',
    RECEIVER_INFO: (deliveryId: string) => `deliveries/${deliveryId}/receiverInfo`,
    DELIVERY_HISTORY: (deliveryId: string) => `deliveries/${deliveryId}/history`,
};

export const DEFAULT_DOCUMENT_ID = 'default';