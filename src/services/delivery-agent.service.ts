import { db, serverTimestamp } from '@/src/firebase/config';
import { COLLECTIONS, DEFAULT_DOCUMENT_ID } from '@/src/firebase/collections';
import {
    DeliveryAgent,
    PersonalInfo,
    CompanyInfo,
    VehicleInfo,
    DriverInfo,
    CompanyType,
    VehicleType
} from '@/src/models/delivery-agent.model';

export class DeliveryAgentService {
    private userCollection = db.collection('users');

    private getAgentDocRef(userId: string) {
        return db.doc(`${COLLECTIONS.USER_DELIVERY_AGENT(userId)}/${DEFAULT_DOCUMENT_ID}`);
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
        const userDoc = await this.userCollection.doc(userId).get();

        if (!userDoc.exists) {
            console.error(`User ${userId} not found during delivery agent registration`);
            throw new Error('User not found');
        }

        const user = userDoc.data();

        // Verify this is a professional user
        if (user?.userType !== 'professional') {
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
            birthDate: new Date(),
            nationality: '',
            birthPlace: '',
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
        const defaultAgentData = {
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
            applicationDate: new Date(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Update user record to mark as delivery agent
        await this.userCollection.doc(userId).update({
            isDeliveryAgent: true,
            updatedAt: serverTimestamp()
        });

        // Create the agent profile
        try {
            await this.getAgentDocRef(userId).set(defaultAgentData);
            console.log(`Successfully created delivery agent profile for user ${userId}`);
        } catch (error) {
            console.error(`Error creating delivery agent profile for user ${userId}:`, error);
            throw error;
        }
    }

    async getAgentProfile(userId: string): Promise<DeliveryAgent | null> {
        try {
            const doc = await this.getAgentDocRef(userId).get();

            if (!doc.exists) {
                console.log(`No delivery agent found for user ${userId}`);
                return null;
            }

            return {
                id: userId,
                ...doc.data()
            } as DeliveryAgent;
        } catch (error) {
            console.error(`Error fetching delivery agent for user ${userId}:`, error);
            return null;
        }
    }

    async updateAgentProfile(userId: string, data: Partial<DeliveryAgent>): Promise<void> {
        try {
            const { id, ...updateData } = data;

            const firestoreData = {
                ...updateData,
                updatedAt: serverTimestamp()
            };

            await this.getAgentDocRef(userId).update(firestoreData);
        } catch (error) {
            console.error(`Error updating delivery agent for user ${userId}:`, error);
            throw error;
        }
    }

    // Update personal information
    async updatePersonalInfo(userId: string, personalInfo: Partial<PersonalInfo>): Promise<void> {
        try {
            const agentDoc = await this.getAgentDocRef(userId).get();

            if (!agentDoc.exists) {
                throw new Error('Agent not found');
            }

            const agent = agentDoc.data();

            if (!agent) {
                throw new Error('Agent data is undefined');
            }

            await this.getAgentDocRef(userId).update({
                personalInfo: {
                    ...agent.personalInfo,
                    ...personalInfo
                },
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error(`Error updating personal info for agent ${userId}:`, error);
            throw error;
        }
    }

    // Update company information
    async updateCompanyInfo(userId: string, companyInfo: Partial<CompanyInfo>): Promise<void> {
        try {
            const agentDoc = await this.getAgentDocRef(userId).get();

            if (!agentDoc.exists) {
                throw new Error('Agent not found');
            }

            const agent = agentDoc.data();

            if (!agent) {
                throw new Error('Agent data is undefined');
            }

            await this.getAgentDocRef(userId).update({
                companyInfo: {
                    ...agent.companyInfo,
                    ...companyInfo
                },
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error(`Error updating company info for agent ${userId}:`, error);
            throw error;
        }
    }

    // Update vehicle information
    async updateVehicleInfo(userId: string, vehicleInfo: Partial<VehicleInfo>): Promise<void> {
        try {
            const agentDoc = await this.getAgentDocRef(userId).get();

            if (!agentDoc.exists) {
                throw new Error('Agent not found');
            }

            const agent = agentDoc.data();

            if (!agent) {
                throw new Error('Agent data is undefined');
            }

            await this.getAgentDocRef(userId).update({
                vehicleInfo: {
                    ...agent.vehicleInfo,
                    ...vehicleInfo
                },
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error(`Error updating vehicle info for agent ${userId}:`, error);
            throw error;
        }
    }

    // Update driver information
    async updateDriverInfo(userId: string, driverInfo: Partial<DriverInfo>): Promise<void> {
        try {
            const agentDoc = await this.getAgentDocRef(userId).get();

            if (!agentDoc.exists) {
                throw new Error('Agent not found');
            }

            const agent = agentDoc.data();

            if (!agent) {
                throw new Error('Agent data is undefined');
            }

            await this.getAgentDocRef(userId).update({
                driverInfo: {
                    ...agent.driverInfo,
                    ...driverInfo
                },
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error(`Error updating driver info for agent ${userId}:`, error);
            throw error;
        }
    }
}