export type DeliveryStatus = 'waiting_for_delivery_guy' | 'delivery_guy_accepted' | 'picked_up' | 'delivered' | 'rescheduled' | 'failed';
export type UserType = 'individual' | 'professional';

export interface DeliveryData {
    id?: string;
    status: DeliveryStatus;
    creator: string;
    packageDescription?: string;
    packageWeight?: number;
    packageCategory?: string;
    isFragile?: boolean;
    comment?: string;
    price?: number;
    secretCode?: string;
    deleted?: boolean;
    rescheduleCount?: number;
    maxReschedules?: number;
    timeSlot?: {
        start: any;
        end: any;
    };
    scheduledDate?: any;
    pickupAddress?: {
        formattedAddress?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    deliveryAddress?: {
        formattedAddress?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    expeditor?: {
        firstName?: string;
        phoneNumber?: string;
    };
    receiver?: {
        firstName?: string;
        phoneNumber?: string;
    };
    rescheduleHistory?: Array<{
        rescheduleDate: any;
        reason?: string;
        agentId: string;
    }>;
}

export interface UserData {
    id?: string;
    email?: string;
    userType?: UserType;
    isDeliveryAgent?: boolean;
    isAdmin?: boolean;
    firstName?: string;
    lastName?: string;
    contactName?: string;
}