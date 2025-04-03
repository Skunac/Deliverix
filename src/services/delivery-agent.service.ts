import {
    DeliveryAgent,
    AgentStatus,
    PersonalInfo,
    CompanyInfo,
    VehicleInfo,
    DriverInfo,
    CompanyType,
    VehicleType
} from '../models/delivery-agent.model';
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
        // Personal info
        personalInfo: {
            firstName: string;
            lastName: string;
            email: string;
            phoneNumber: string;
        };
        // Company info
        companyInfo: {
            name: string;
            type: CompanyType;
            sirenNumber: string;
        };
        // Vehicle info (minimal required)
        vehicleInfo?: {
            type: VehicleType;
            plateNumber: string;
        };
    }): Promise<void> {
        console.log(`Starting to register user ${userId} as delivery agent`);

        // Get user to ensure it exists
        const user = await this.userService.getUserById(userId);
        if (!user) {
            console.error(`User ${userId} not found during delivery agent registration`);
            throw new Error('User not found');
        }

        // Verify this is a professional user
        if (user.userType !== 'professional') {
            console.error(`User ${userId} is not a professional user`);
            throw new Error('Only professional users can be registered as delivery agents');
        }

        console.log(`User ${userId} found, creating delivery agent profile`);

        // Create default personal info
        const personalInfo: PersonalInfo = {
            firstName: agentData.personalInfo.firstName,
            lastName: agentData.personalInfo.lastName,
            email: agentData.personalInfo.email || user.email,
            phoneNumber: agentData.personalInfo.phoneNumber || user.phoneNumber || '',
            birthDate: new Date(), // Will be filled in by the user
            nationality: '', // Will be filled in by the user
            birthPlace: '', // Will be filled in by the user
            address: {
                street: '',
                postalCode: '',
                city: '',
                country: 'France'
            },
            idType: 'identity_card'
        };

        // Create default company info
        const companyInfo: CompanyInfo = {
            name: agentData.companyInfo.name,
            type: agentData.companyInfo.type,
            sirenNumber: agentData.companyInfo.sirenNumber
        };

        // Create default vehicle info
        const vehicleInfo: VehicleInfo = {
            type: agentData.vehicleInfo?.type || 'car',
            model: '',
            year: new Date().getFullYear(),
            plateNumber: agentData.vehicleInfo?.plateNumber || ''
        };

        // Create default driver info
        const driverInfo: DriverInfo = {
            licenseType: ''
        };

        // Create default agent data
        const defaultAgentData: Omit<DeliveryAgent, 'id'> = {
            activeStatus: 'offline',
            approvalStatus: 'pending',
            termsAccepted: false,
            termsAcceptanceDate: new Date(),

            // Core information
            personalInfo,
            companyInfo,
            vehicleInfo,
            driverInfo,

            rating: 5,
            completedDeliveries: 0,
            canceledDeliveries: 0,
            totalEarnings: 0,
            vatApplicable: false,
            notificationPreferences: {
                email: true,
                push: true,
                sms: false
            },
            lastActive: new Date(),
            applicationDate: new Date()
        };

        // Update user record to mark as delivery agent
        await this.userService.updateUserProfile(userId, {
            isDeliveryAgent: true
        });

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

    // Update personal information
    async updatePersonalInfo(userId: string, personalInfo: Partial<PersonalInfo>): Promise<void> {
        const agent = await this.repository.getByUserId(userId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        return this.repository.update(userId, {
            personalInfo: {
                ...agent.personalInfo,
                ...personalInfo
            }
        });
    }

    // Update company information
    async updateCompanyInfo(userId: string, companyInfo: Partial<CompanyInfo>): Promise<void> {
        const agent = await this.repository.getByUserId(userId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        return this.repository.update(userId, {
            companyInfo: {
                ...agent.companyInfo,
                ...companyInfo
            }
        });
    }

    // Update vehicle information
    async updateVehicleInfo(userId: string, vehicleInfo: Partial<VehicleInfo>): Promise<void> {
        const agent = await this.repository.getByUserId(userId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        return this.repository.update(userId, {
            vehicleInfo: {
                ...agent.vehicleInfo,
                ...vehicleInfo
            }
        });
    }

    // Update driver information
    async updateDriverInfo(userId: string, driverInfo: Partial<DriverInfo>): Promise<void> {
        const agent = await this.repository.getByUserId(userId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        return this.repository.update(userId, {
            driverInfo: {
                ...agent.driverInfo,
                ...driverInfo
            }
        });
    }

    // Accept terms and conditions
    async acceptTerms(userId: string): Promise<void> {
        return this.repository.update(userId, {
            termsAccepted: true,
            termsAcceptanceDate: new Date()
        });
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

        // Check if user exists
        const user = await this.userService.getUserById(userId);
        if (!user) {
            return false;
        }

        // Check if user is a professional user
        if (user.userType !== 'professional') {
            return false;
        }

        // Check if user has required fields
        if (!user.email) {
            return false;
        }

        // Check if user is already marked as a delivery agent (but missing profile)
        return !user.isDeliveryAgent;
    }

    // Get agents near a specific location based on their delivery range
    async getNearbyAgentsForDelivery(
        deliveryLocation: FirebaseFirestoreTypes.GeoPoint,
        radiusInKm: number = 10
    ): Promise<{ userId: string; agent: DeliveryAgent; distance: number }[]> {
        // Get all available agents
        const allAgents = await this.repository.getAvailableAgents();

        // Calculate distance and filter by delivery range
        const eligibleAgents = [];

        for (const agentData of allAgents) {
            // Skip agents without location data
            if (!agentData.agent.currentLocation) {
                continue;
            }

            // Calculate distance to delivery location
            const distance = this.calculateDistance(
                deliveryLocation.latitude, deliveryLocation.longitude,
                agentData.agent.currentLocation.latitude, agentData.agent.currentLocation.longitude
            );

            // Check if delivery location is within the agent's delivery range
            const maxRange = agentData.agent.deliveryRange || radiusInKm;
            if (distance <= maxRange) {
                eligibleAgents.push({
                    userId: agentData.userId,
                    agent: agentData.agent,
                    distance
                });
            }
        }

        // Sort by distance
        return eligibleAgents.sort((a, b) => a.distance - b.distance);
    }

    // Calculate distance using Haversine formula
    private calculateDistance(
        lat1: number, lon1: number,
        lat2: number, lon2: number
    ): number {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in km
        return distance;
    }

    private deg2rad(deg: number): number {
        return deg * (Math.PI/180);
    }
}