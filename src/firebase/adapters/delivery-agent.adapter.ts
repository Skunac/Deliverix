import { DeliveryAgent, AvailabilitySlot, SpecificDateAvailability } from '../../models/delivery-agent.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export class DeliveryAgentAdapter {
    static fromFirestore(data: FirebaseFirestoreTypes.DocumentData): DeliveryAgent {
        // Convert Firestore timestamps to JavaScript Date objects
        const createdAt = data.createdAt?.toDate() || new Date();
        const updatedAt = data.updatedAt?.toDate() || new Date();
        const lastActive = data.lastActive?.toDate() || new Date();
        const lastLocationUpdate = data.lastLocationUpdate?.toDate();
        const applicationDate = data.applicationDate?.toDate() || new Date();
        const approvalDate = data.approvalDate?.toDate();

        // Convert arrays of dates
        const unavailableDates = (data.unavailableDates || []).map((timestamp: any) =>
            timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
        );

        // Convert special availability dates
        const specialAvailability = (data.specialAvailability || []).map((item: any) => ({
            date: item.date.toDate ? item.date.toDate() : new Date(item.date),
            slots: item.slots || []
        }));

        return {
            id: data.id || 'default',
            activeStatus: data.activeStatus,
            approvalStatus: data.approvalStatus,
            verificationNotes: data.verificationNotes,
            firstName: data.firstName,
            lastName: data.lastName,
            profilePhoto: data.profilePhoto,
            biography: data.biography,
            currentLocation: data.currentLocation,
            lastLocationUpdate,
            vehicleType: data.vehicleType,
            vehicleMake: data.vehicleMake,
            vehicleModel: data.vehicleModel,
            vehicleYear: data.vehicleYear,
            vehiclePlateNumber: data.vehiclePlateNumber,
            rating: data.rating || 5,
            completedDeliveries: data.completedDeliveries || 0,
            canceledDeliveries: data.canceledDeliveries || 0,
            totalEarnings: data.totalEarnings || 0,
            weeklyAvailability: data.weeklyAvailability || [],
            specialAvailability,
            unavailableDates,
            maxDailyDeliveries: data.maxDailyDeliveries,
            maxDeliveryDistance: data.maxDeliveryDistance,
            serviceAreas: data.serviceAreas || [],
            paymentInfo: data.paymentInfo || {},
            notificationPreferences: data.notificationPreferences || {
                email: true,
                push: true,
                sms: false
            },
            lastActive,
            applicationDate,
            approvalDate,
            createdAt,
            updatedAt
        };
    }

    static toFirestore(agent: Partial<DeliveryAgent>): Partial<DeliveryAgent> {
        // Remove id from the data to be sent to Firestore
        const { id, ...agentData } = agent;
        return agentData;
    }

    static availabilitySlotsToFirestore(slots: AvailabilitySlot[]): AvailabilitySlot[] {
        return slots.map(slot => ({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isRecurring: slot.isRecurring
        }));
    }

    static specificDateAvailabilityToFirestore(dates: SpecificDateAvailability[]): SpecificDateAvailability[] {
        return dates.map(item => ({
            date: item.date,
            slots: item.slots.map(slot => ({
                startTime: slot.startTime,
                endTime: slot.endTime
            }))
        }));
    }
}