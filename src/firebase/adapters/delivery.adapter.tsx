import { Delivery, EmbeddedAddress } from '../../models/delivery.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { ReceiverInfo } from '../../models/receiver.model';
import { DeliveryHistoryEvent } from '../../models/delivery-history.model';

export class DeliveryAdapter {
    static fromFirestore(data: FirebaseFirestoreTypes.DocumentData, id: string): Delivery {
        return {
            id,
            status: data.status,
            state: data.state,
            expeditorId: data.expeditorId,
            receiverId: data.receiverId,
            pickupAddress: this.addressFromFirestore(data.pickupAddress),
            deliveryAddress: this.addressFromFirestore(data.deliveryAddress),
            scheduledDate: data.scheduledDate?.toDate(),
            timeSlot: {
                start: data.timeSlot?.start?.toDate(),
                end: data.timeSlot?.end?.toDate()
            },
            packageDescription: data.packageDescription,
            packageWeight: data.packageWeight,
            packageDimensions: data.packageDimensions,
            packageCategory: data.packageCategory,
            expeditorComments: data.expeditorComments,
            deliveryComments: data.deliveryComments,
            deliveryAgentId: data.deliveryAgentId,
            price: data.price,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
        };
    }

    static toFirestore(delivery: Partial<Delivery>): Omit<Delivery, 'id'> {
        const { id, ...deliveryData } = delivery;

        if (delivery.id && !this.isPartialDelivery(deliveryData)) {
            const requiredFields = [
                'status', 'state', 'expeditorId', 'pickupAddress', 'deliveryAddress',
                'scheduledDate', 'timeSlot', 'packageDescription', 'packageWeight',
                'packageDimensions', 'packageCategory', 'price'
            ];

            for (const field of requiredFields) {
                if (!(field in deliveryData) && field in delivery) {
                    (deliveryData as any)[field] = (delivery as any)[field];
                }
            }
        }

        return deliveryData as Omit<Delivery, 'id'>;
    }

    // Helper method to check if we're dealing with a partial delivery
    private static isPartialDelivery(data: Partial<Delivery>): boolean {
        const requiredFields = [
            'status', 'state', 'expeditorId', 'pickupAddress', 'deliveryAddress',
            'scheduledDate', 'timeSlot', 'packageDescription', 'packageWeight',
            'packageDimensions', 'packageCategory', 'price'
        ];

        return !requiredFields.every(field => field in data);
    }

    private static addressFromFirestore(data: any): EmbeddedAddress {
        if (!data) {
            throw new Error('Address data is required');
        }

        return {
            placeId: data.placeId,
            formattedAddress: data.formattedAddress,
            coordinates: data.coordinates,
            additionalInstructions: data.additionalInstructions,
            components: data.components || {}
        };
    }

    static receiverInfoFromFirestore(data: FirebaseFirestoreTypes.DocumentData, id: string): ReceiverInfo {
        return {
            id,
            name: data.name,
            email: data.email,
            phoneNumber: data.phoneNumber,
            deliveryId: data.deliveryId,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
        };
    }

    static receiverInfoToFirestore(info: Partial<ReceiverInfo>): Record<string, any> {
        const { id, ...infoData } = info;
        return infoData;
    }

    static historyEventFromFirestore(data: FirebaseFirestoreTypes.DocumentData, id: string): DeliveryHistoryEvent {
        return {
            id,
            timestamp: data.timestamp?.toDate(),
            status: data.status,
            state: data.state,
            agentId: data.agentId,
            location: data.location,
            notes: data.notes,
            deliveryId: data.deliveryId,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
        };
    }
}