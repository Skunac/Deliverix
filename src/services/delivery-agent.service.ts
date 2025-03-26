import { DeliveryAgent, AgentStatus, AvailabilitySlot, SpecificDateAvailability } from '../models/delivery-agent.model';
import { DeliveryAgentRepository } from '../firebase/repositories/delivery-agent.repository';
import { DeliveryAgentAdapter } from '../firebase/adapters/delivery-agent.adapter';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { UserService } from './user.service';

export class DeliveryAgentService {
    private repository: DeliveryAgentRepository;
    private userService: UserService;

    constructor() {
        this.repository = new DeliveryAgentRepository();
        this.userService = new UserService();
    }

    async registerAsAgent(userId: string, agentData: {
        firstName: string;
        lastName: string;
        vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'scooter' | 'van' | 'truck' | 'on_foot';
        vehicleMake?: string;
        vehicleModel?: string;
        vehicleYear?: number;
        vehiclePlateNumber?: string;
        biography?: string;
        serviceAreas?: string[];
        weeklyAvailability?: AvailabilitySlot[];
    }): Promise<void> {
        console.log(`Starting to register user ${userId} as delivery agent`);

        // Get user to ensure it exists
        const user = await this.userService.getUserById(userId);
        if (!user) {
            console.error(`User ${userId} not found during delivery agent registration`);
            throw new Error('User not found');
        }

        console.log(`User ${userId} found, creating delivery agent profile`);

        // Create default agent data
        const defaultAgentData: Omit<DeliveryAgent, 'id'> = {
            activeStatus: 'offline',
            approvalStatus: 'pending',
            firstName: agentData.firstName,
            lastName: agentData.lastName,
            biography: agentData.biography || '',
            vehicleType: agentData.vehicleType || 'car',
            vehicleMake: agentData.vehicleMake  || '',
            vehicleModel: agentData.vehicleModel || '',
            vehicleYear: agentData.vehicleYear || 2000,
            vehiclePlateNumber: agentData.vehiclePlateNumber,
            rating: 5,
            completedDeliveries: 0,
            canceledDeliveries: 0,
            totalEarnings: 0,
            weeklyAvailability: agentData.weeklyAvailability || [],
            specialAvailability: [],
            unavailableDates: [],
            serviceAreas: agentData.serviceAreas || [],
            paymentInfo: {},
            notificationPreferences: {
                email: true,
                push: true,
                sms: false
            },
            lastActive: new Date(),
            applicationDate: new Date()
        };

        // Create the agent profile
        try {
            await this.repository.create(userId, defaultAgentData);
            console.log(`Successfully created delivery agent profile for user ${userId}`);
        } catch (error) {
            console.error(`Error creating delivery agent profile for user ${userId}:`, error);
            throw error;
        }
    }

    async getAgentProfile(userId: string): Promise<DeliveryAgent | null> {
        return this.repository.getByUserId(userId);
    }

    async updateAgentProfile(userId: string, data: Partial<DeliveryAgent>): Promise<void> {
        return this.repository.update(userId, DeliveryAgentAdapter.toFirestore(data));
    }

    async updateAgentStatus(userId: string, status: AgentStatus): Promise<void> {
        return this.repository.updateAgentStatus(userId, status);
    }

    async updateAgentLocation(userId: string, location: FirebaseFirestoreTypes.GeoPoint): Promise<void> {
        return this.repository.updateAgentLocation(userId, location);
    }

    async getAllAgents(): Promise<{ userId: string; agent: DeliveryAgent }[]> {
        return this.repository.getAllAgents();
    }

    async getAvailableAgents(): Promise<{ userId: string; agent: DeliveryAgent }[]> {
        return this.repository.getAvailableAgents();
    }

    async updateWeeklyAvailability(userId: string, availability: AvailabilitySlot[]): Promise<void> {
        return this.repository.updateWeeklyAvailability(
            userId,
            DeliveryAgentAdapter.availabilitySlotsToFirestore(availability)
        );
    }

    async updateSpecialAvailability(userId: string, availability: SpecificDateAvailability[]): Promise<void> {
        return this.repository.updateSpecialAvailability(
            userId,
            DeliveryAgentAdapter.specificDateAvailabilityToFirestore(availability)
        );
    }

    async addUnavailableDate(userId: string, date: Date): Promise<void> {
        return this.repository.addUnavailableDate(userId, date);
    }

    async removeUnavailableDate(userId: string, date: Date): Promise<void> {
        return this.repository.removeUnavailableDate(userId, date);
    }

    async approveAgent(userId: string, notes?: string): Promise<void> {
        return this.repository.updateApprovalStatus(userId, 'approved', notes);
    }

    async rejectAgent(userId: string, notes: string): Promise<void> {
        return this.repository.updateApprovalStatus(userId, 'rejected', notes);
    }

    async getPendingAgents(): Promise<{ userId: string; agent: DeliveryAgent }[]> {
        return this.repository.getAgentsByApprovalStatus('pending');
    }

    async getApprovedAgents(): Promise<{ userId: string; agent: DeliveryAgent }[]> {
        return this.repository.getAgentsByApprovalStatus('approved');
    }

    async getAgentsInServiceArea(area: string): Promise<{ userId: string; agent: DeliveryAgent }[]> {
        return this.repository.getAgentsInServiceArea(area);
    }

    async recordDeliveryCompletion(userId: string, deliveryId: string, earnings: number): Promise<void> {
        // Create a batch of operations to ensure atomicity
        await this.repository.incrementCompletedDeliveries(userId);
        await this.repository.addEarning(userId, earnings, deliveryId);
    }

    async recordDeliveryCancellation(userId: string): Promise<void> {
        await this.repository.incrementCanceledDeliveries(userId);
    }

    async rateAgent(userId: string, rating: number): Promise<void> {
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        await this.repository.updateAgentRating(userId, rating);
    }

    // Check if user can become a delivery agent
    async isEligibleForAgentRegistration(userId: string): Promise<boolean> {
        // Check if user already has an agent profile
        const existingAgent = await this.repository.getByUserId(userId);
        if (existingAgent) {
            return false;
        }

        // Check if user exists and has required fields
        const user = await this.userService.getUserById(userId);
        if (!user || !user.email || !user.phoneNumber) {
            return false;
        }

        // Additional eligibility checks can be added here

        return true;
    }

    // Find nearby agents
    async getNearbyAgents(
        location: FirebaseFirestoreTypes.GeoPoint,
        radiusInKm: number,
        onlyAvailable: boolean = true
    ): Promise<{ userId: string; agent: DeliveryAgent; distance: number }[]> {
        return this.repository.getNearbyAgents(location, radiusInKm, onlyAvailable);
    }

    // Check agent availability for a specific time
    async checkAgentAvailabilityForTime(
        userId: string,
        date: Date,
        startTime: string,
        endTime: string
    ): Promise<boolean> {
        const agent = await this.repository.getByUserId(userId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        // Check if date is in unavailable dates
        const dateString = date.toDateString();
        const unavailableDatesStrings = agent.unavailableDates.map(d => d.toDateString());
        if (unavailableDatesStrings.includes(dateString)) {
            return false;
        }

        // Check special availability for this date
        const specialAvailForDate = agent.specialAvailability.find(
            a => a.date.toDateString() === dateString
        );

        if (specialAvailForDate) {
            // Check if time slot is within any of the special availability slots
            return specialAvailForDate.slots.some(slot =>
                slot.startTime <= startTime && slot.endTime >= endTime
            );
        }

        // Check weekly availability
        const dayOfWeek = date.getDay();
        const weeklySlots = agent.weeklyAvailability.filter(slot =>
            slot.dayOfWeek === dayOfWeek && slot.isRecurring
        );

        return weeklySlots.some(slot =>
            slot.startTime <= startTime && slot.endTime >= endTime
        );
    }

    // Get agents available for a specific delivery time
    async getAvailableAgentsForDelivery(
        date: Date,
        startTime: string,
        endTime: string,
        pickupLocation: FirebaseFirestoreTypes.GeoPoint,
        radiusInKm: number = 10
    ): Promise<{ userId: string; agent: DeliveryAgent; distance: number }[]> {
        // First get nearby agents
        const nearbyAgents = await this.repository.getNearbyAgents(pickupLocation, radiusInKm, true);

        // Filter for time availability
        const availableAgents = [];

        for (const agentData of nearbyAgents) {
            const isAvailable = await this.checkAgentAvailabilityForTime(
                agentData.userId,
                date,
                startTime,
                endTime
            );

            if (isAvailable) {
                availableAgents.push(agentData);
            }
        }

        return availableAgents;
    }
}