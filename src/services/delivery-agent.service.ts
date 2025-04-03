import {
    DeliveryAgent,
    PersonalInfo,
    CompanyInfo,
    VehicleInfo,
    DriverInfo,
    CompanyType,
    VehicleType
} from '../models/delivery-agent.model';
import { DeliveryAgentRepository } from '../firebase/repositories/delivery-agent.repository';
import { DeliveryAgentAdapter } from '../firebase/adapters/delivery-agent.adapter';
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
}