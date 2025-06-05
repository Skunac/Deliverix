import { db } from '@/src/firebase/config';
import { User, IndividualUser, ProfessionalUser } from '@/src/models/user.model';
import { Delivery } from '@/src/models/delivery.model';
import { DeliveryAgent } from '@/src/models/delivery-agent.model';

export type EmailTemplate =
// Delivery journey
    | 'order_confirmation'
    | 'agent_assigned'
    | 'package_picked_up'
    | 'delivery_completed'
    | 'delivery_failed'
    | 'delivery_reminder'
    // Agent emails
    | 'new_delivery_available'
    | 'delivery_assignment'
    | 'agent_approved'
    | 'agent_rejected'
    // User management
    | 'welcome_user'
    | 'agent_application_received'
    // Admin alerts
    | 'new_agent_application'
    | 'delivery_failure_alert'
    | 'high_value_package_alert'
    // Financial
    | 'payment_confirmation'
    | 'refund_notification'
    // Automated
    | 'rating_request';

export interface EmailData {
    // User data
    user?: User;
    customer?: User;
    agent?: DeliveryAgent;

    // Delivery data
    delivery?: Delivery;

    // Additional context
    secretCode?: string;
    estimatedTime?: string;
    failureReason?: string;
    approvalStatus?: 'approved' | 'rejected';

    // Custom data
    [key: string]: any;
}

export interface EmailAttachment {
    filename: string;
    content?: string;
    path?: string;
    contentType?: string;
}

export class EmailService {
    private mailCollection = db.collection('mail');
    private usersCollection = db.collection('users');

    /**
     * Send an email using the Firebase Trigger Email extension
     */
    async sendEmail(
        template: EmailTemplate,
        recipient: string | string[],
        data: EmailData = {},
        attachments: EmailAttachment[] = []
    ): Promise<string> {
        try {
            // Ensure we have a clean template data object
            const templateData = this.prepareTemplateData(data);

            // Build email document with proper structure
            const emailDoc: any = {
                to: Array.isArray(recipient) ? recipient : [recipient],
                template: {
                    name: template,
                    data: templateData
                }
            };

            // Only add attachments if they exist and are valid
            if (attachments && attachments.length > 0) {
                emailDoc.attachments = attachments;
            }

            console.log('Sending email with template:', template);
            console.log('Email document structure:', JSON.stringify(emailDoc, null, 2));

            const docRef = await this.mailCollection.add(emailDoc);
            console.log(`Email queued: ${template} to ${recipient}`, docRef.id);

            return docRef.id;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    /**
     * Send email to user by UID (looks up email from users collection)
     */
    async sendEmailToUser(
        template: EmailTemplate,
        userId: string,
        data: EmailData = {},
        attachments: EmailAttachment[] = []
    ): Promise<string> {
        try {
            const userDoc = await this.usersCollection.doc(userId).get();

            if (!userDoc.exists) {
                throw new Error(`User not found: ${userId}`);
            }

            const user = { id: userDoc.id, ...userDoc.data() } as User;

            if (!user.email) {
                throw new Error(`User has no email: ${userId}`);
            }

            // Add user data to template data
            const enrichedData = {
                ...data,
                user: user
            };

            return this.sendEmail(template, user.email, enrichedData, attachments);
        } catch (error) {
            console.error('Error sending email to user:', error);
            throw error;
        }
    }

    /**
     * Send email to multiple users by UIDs
     */
    async sendEmailToUsers(
        template: EmailTemplate,
        userIds: string[],
        data: EmailData = {},
        attachments: EmailAttachment[] = []
    ): Promise<string[]> {
        const results = await Promise.allSettled(
            userIds.map(userId => this.sendEmailToUser(template, userId, data, attachments))
        );

        const successful = results
            .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
            .map(result => result.value);

        const failed = results
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .map(result => result.reason);

        if (failed.length > 0) {
            console.error(`Failed to send ${failed.length} emails:`, failed);
        }

        return successful;
    }

    /**
     * Send email to all admin users
     */
    async sendEmailToAdmins(
        template: EmailTemplate,
        data: EmailData = {},
        attachments: EmailAttachment[] = []
    ): Promise<string[]> {
        try {
            const adminQuery = await this.usersCollection
                .where('isAdmin', '==', true)
                .get();

            const adminIds = adminQuery.docs.map(doc => doc.id);

            if (adminIds.length === 0) {
                console.warn('No admin users found');
                return [];
            }

            return this.sendEmailToUsers(template, adminIds, data, attachments);
        } catch (error) {
            console.error('Error sending email to admins:', error);
            throw error;
        }
    }

    /**
     * Send email to eligible delivery agents in area
     */
    async sendEmailToEligibleAgents(
        template: EmailTemplate,
        delivery: Delivery,
        data: EmailData = {},
        attachments: EmailAttachment[] = []
    ): Promise<string[]> {
        try {
            // Get all active delivery agents
            const agentsQuery = await this.usersCollection
                .where('isDeliveryAgent', '==', true)
                .where('isAllowed', '==', true)
                .get();

            const agentIds = agentsQuery.docs.map(doc => doc.id);

            if (agentIds.length === 0) {
                console.warn('No eligible delivery agents found');
                return [];
            }

            // Add delivery data to template data
            const enrichedData = {
                ...data,
                delivery: delivery
            };

            return this.sendEmailToUsers(template, agentIds, enrichedData, attachments);
        } catch (error) {
            console.error('Error sending email to eligible agents:', error);
            throw error;
        }
    }

    /**
     * Prepare and clean template data
     */
    private prepareTemplateData(data: EmailData): Record<string, any> {
        const templateData: Record<string, any> = {};

        try {
            // Process user data
            if (data.user) {
                templateData.user = this.formatUserForTemplate(data.user);
            }

            if (data.customer) {
                templateData.customer = this.formatUserForTemplate(data.customer);
            }

            // Process delivery data
            if (data.delivery) {
                templateData.delivery = this.formatDeliveryForTemplate(data.delivery);
            }

            // Process agent data
            if (data.agent) {
                templateData.agent = this.formatAgentForTemplate(data.agent);
            }

            // Add other data directly (but safely)
            Object.keys(data).forEach(key => {
                if (!['user', 'customer', 'delivery', 'agent'].includes(key)) {
                    const value = data[key];
                    // Only add defined, serializable values
                    if (value !== undefined && value !== null) {
                        try {
                            // Test if value is serializable
                            JSON.stringify(value);
                            templateData[key] = value;
                        } catch (e) {
                            console.warn(`Skipping non-serializable value for key ${key}:`, e);
                        }
                    }
                }
            });

            // Add common data
            templateData.appName = 'Primex';
            templateData.supportEmail = 'support@primex.com';
            templateData.currentYear = new Date().getFullYear();
            templateData.timestamp = new Date().toISOString();

            // Clean the data to remove any undefined values
            return this.cleanTemplateData(templateData);

        } catch (error) {
            console.error('Error preparing template data:', error);
            // Return minimal safe data
            return {
                appName: 'Primex',
                supportEmail: 'support@primex.com',
                currentYear: new Date().getFullYear(),
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Clean template data to remove undefined values and ensure serialization
     */
    private cleanTemplateData(data: any): Record<string, any> {
        const cleaned: Record<string, any> = {};

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== null) {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    // Recursively clean nested objects
                    const cleanedNested = this.cleanTemplateData(value);
                    if (Object.keys(cleanedNested).length > 0) {
                        cleaned[key] = cleanedNested;
                    }
                } else {
                    cleaned[key] = value;
                }
            }
        }

        return cleaned;
    }

    /**
     * Format user data for email templates
     */
    private formatUserForTemplate(user: User): Record<string, any> {
        const baseData = {
            id: user.id,
            email: user.email,
            userType: user.userType,
            isDeliveryAgent: user.isDeliveryAgent
        };

        if (user.userType === 'individual') {
            const individualUser = user as IndividualUser;
            return {
                ...baseData,
                firstName: individualUser.firstName,
                lastName: individualUser.lastName,
                fullName: `${individualUser.firstName} ${individualUser.lastName}`
            };
        } else {
            const professionalUser = user as ProfessionalUser;
            return {
                ...baseData,
                companyName: professionalUser.companyName,
                contactName: professionalUser.contactName,
                fullName: professionalUser.contactName
            };
        }
    }

    /**
     * Format delivery data for email templates
     */
    private formatDeliveryForTemplate(delivery: Delivery): Record<string, any> {
        try {
            const formattedDelivery: Record<string, any> = {
                id: delivery.id || '',
                status: delivery.status || '',
                state: delivery.state || '',
                price: delivery.price || 0,
                priceFormatted: `€${(delivery.price || 0).toFixed(2)}`,
                secretCode: delivery.secretCode || '',
                packageDescription: delivery.packageDescription || '',
                packageWeight: delivery.packageWeight || 0,
                packageCategory: delivery.packageCategory || '',
                isFragile: Boolean(delivery.isFragile),
                comment: delivery.comment || ''
            };

            // Safely handle addresses
            if (delivery.pickupAddress?.formattedAddress) {
                formattedDelivery.pickupAddress = delivery.pickupAddress.formattedAddress;
            }

            if (delivery.deliveryAddress?.formattedAddress) {
                formattedDelivery.deliveryAddress = delivery.deliveryAddress.formattedAddress;
            }

            // Safely handle contact information
            if (delivery.expeditor) {
                formattedDelivery.expeditorName = delivery.expeditor.firstName || '';
                formattedDelivery.expeditorPhone = delivery.expeditor.phoneNumber || '';
            }

            if (delivery.receiver) {
                formattedDelivery.receiverName = delivery.receiver.firstName || '';
                formattedDelivery.receiverPhone = delivery.receiver.phoneNumber || '';
            }

            // Safely handle dates
            if (delivery.scheduledDate) {
                formattedDelivery.scheduledDate = this.formatDate(delivery.scheduledDate);
            }

            if (delivery.timeSlot?.start) {
                formattedDelivery.timeSlotStart = this.formatTime(delivery.timeSlot.start);
            }

            if (delivery.timeSlot?.end) {
                formattedDelivery.timeSlotEnd = this.formatTime(delivery.timeSlot.end);
            }

            if (delivery.timeSlot?.start && delivery.timeSlot?.end) {
                formattedDelivery.timeSlotFormatted = `${this.formatTime(delivery.timeSlot.start)} - ${this.formatTime(delivery.timeSlot.end)}`;
            }

            return formattedDelivery;

        } catch (error) {
            console.error('Error formatting delivery for template:', error);
            // Return minimal safe delivery data
            return {
                id: delivery.id || '',
                status: delivery.status || '',
                state: delivery.state || '',
                price: delivery.price || 0,
                priceFormatted: `€${(delivery.price || 0).toFixed(2)}`
            };
        }
    }

    /**
     * Format agent data for email templates
     */
    private formatAgentForTemplate(agent: DeliveryAgent): Record<string, any> {
        return {
            id: agent.id,
            firstName: agent.personalInfo.firstName,
            lastName: agent.personalInfo.lastName,
            fullName: `${agent.personalInfo.firstName} ${agent.personalInfo.lastName}`,
            email: agent.personalInfo.email,
            phoneNumber: agent.personalInfo.phoneNumber,
            rating: agent.rating,
            vehicleType: agent.vehicleInfo.type,
            vehicleModel: agent.vehicleInfo.model,
            companyName: agent.companyInfo.name
        };
    }

    /**
     * Format date for display
     */
    private formatDate(date: Date | any): string {
        try {
            // Handle different date formats
            let parsedDate: Date;

            if (date instanceof Date) {
                parsedDate = date;
            } else if (date && typeof date.toDate === 'function') {
                // Firestore timestamp
                parsedDate = date.toDate();
            } else if (date && date.seconds) {
                // Firestore timestamp object
                parsedDate = new Date(date.seconds * 1000);
            } else {
                parsedDate = new Date(date);
            }

            return parsedDate.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return 'Date non définie';
        }
    }

    /**
     * Format time for display
     */
    private formatTime(time: Date | any): string {
        try {
            // Handle different time formats
            let parsedTime: Date;

            if (time instanceof Date) {
                parsedTime = time;
            } else if (time && typeof time.toDate === 'function') {
                // Firestore timestamp
                parsedTime = time.toDate();
            } else if (time && time.seconds) {
                // Firestore timestamp object
                parsedTime = new Date(time.seconds * 1000);
            } else {
                parsedTime = new Date(time);
            }

            return parsedTime.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Heure non définie';
        }
    }

    /**
     * Get email delivery status
     */
    async getEmailStatus(emailId: string): Promise<any> {
        try {
            const emailDoc = await this.mailCollection.doc(emailId).get();

            if (!emailDoc.exists) {
                throw new Error(`Email not found: ${emailId}`);
            }

            const data = emailDoc.data();

            return {
                id: emailDoc.id,
                status: data?.delivery?.state || 'PENDING',
                template: data?.template?.name,
                recipients: data?.to,
                createdAt: data?.createdAt,
                processedAt: data?.processedAt,
                errorMessage: data?.delivery?.error?.message,
                ...(data?.delivery && {
                    deliveryState: data.delivery.state,
                    deliveryInfo: data.delivery.info
                })
            };
        } catch (error) {
            console.error('Error getting email status:', error);
            throw error;
        }
    }

    /**
     * Resend failed email
     */
    async resendEmail(emailId: string): Promise<void> {
        try {
            const emailDoc = await this.mailCollection.doc(emailId).get();

            if (!emailDoc.exists) {
                throw new Error(`Email not found: ${emailId}`);
            }

            // Create a new email document instead of modifying the existing one
            const originalData = emailDoc.data();

            const newEmailDoc = {
                to: originalData?.to,
                template: originalData?.template,
                // Remove any delivery status to start fresh
                ...(originalData?.attachments && { attachments: originalData.attachments })
            };

            const newDocRef = await this.mailCollection.add(newEmailDoc);
            console.log(`Email resent with new ID: ${newDocRef.id}`);

        } catch (error) {
            console.error('Error resending email:', error);
            throw error;
        }
    }

    /**
     * Get email history for a user
     */
    async getUserEmailHistory(userId: string, limit: number = 10): Promise<any[]> {
        try {
            const emailQuery = await this.mailCollection
                .where('to', 'array-contains', userId)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            return emailQuery.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting user email history:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const emailService = new EmailService();