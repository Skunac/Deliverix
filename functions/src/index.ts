import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { DeliveryData, UserData, DeliveryStatus } from './types';

admin.initializeApp();
const db = admin.firestore();

/**
 * DELIVERY REMINDER FUNCTION
 * Runs every hour and sends email reminders for deliveries happening soon
 */
export const deliveryReminder = functions.pubsub
    .schedule('0 * * * *') // Every hour
    .timeZone('Europe/Paris')
    .onRun(async (context) => {
        console.log('🔔 Checking for delivery reminders...');

        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + (2 * 60 * 60 * 1000));

        try {
            // Get deliveries that need reminders
            const deliveries = await db.collection('deliveries')
                .where('status', '==', 'delivery_guy_accepted')
                .where('deleted', '==', false)
                .get();

            let sent = 0;

            for (const doc of deliveries.docs) {
                const delivery = { id: doc.id, ...doc.data() } as DeliveryData;

                // Check if delivery is in the next 2 hours
                let deliveryTime: Date;
                try {
                    if (delivery.timeSlot?.start) {
                        if (typeof delivery.timeSlot.start.toDate === 'function') {
                            deliveryTime = delivery.timeSlot.start.toDate();
                        } else {
                            deliveryTime = new Date(delivery.timeSlot.start);
                        }
                    } else {
                        continue;
                    }
                } catch (error) {
                    console.warn(`Error parsing delivery time for ${delivery.id}:`, error);
                    continue;
                }

                if (!deliveryTime || deliveryTime <= now || deliveryTime > twoHoursLater) {
                    continue;
                }

                // Check if reminder already sent
                const reminderExists = await db.collection('emailReminders')
                    .where('deliveryId', '==', delivery.id)
                    .get();

                if (!reminderExists.empty) continue;

                // Get customer
                const customerDoc = await db.collection('users').doc(delivery.creator).get();
                const customer = customerDoc.data() as UserData;

                if (!customer?.email) continue;

                // Get user display name
                const userName = getUserDisplayName(customer);

                // Send reminder email
                await db.collection('mail').add({
                    to: [customer.email],
                    template: {
                        name: 'delivery_reminder',
                        data: {
                            user: {
                                firstName: userName,
                                email: customer.email,
                                userType: customer.userType
                            },
                            delivery: {
                                id: delivery.id,
                                packageDescription: delivery.packageDescription || 'Colis',
                                deliveryAddress: delivery.deliveryAddress?.formattedAddress || 'Adresse non définie',
                                scheduledDate: deliveryTime.toLocaleDateString('fr-FR'),
                                timeSlot: formatTimeSlot(delivery.timeSlot),
                                secretCode: delivery.secretCode || '',
                                price: delivery.price || 0,
                                priceFormatted: `€${(delivery.price || 0).toFixed(2)}`
                            }
                        }
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Mark reminder as sent
                await db.collection('emailReminders').add({
                    deliveryId: delivery.id,
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    type: 'delivery_reminder'
                });

                sent++;
                console.log(`📧 Reminder sent for delivery ${delivery.id} to ${customer.email}`);
            }

            console.log(`✅ Sent ${sent} reminders`);
            return { remindersSent: sent };

        } catch (error) {
            console.error('❌ Error:', error);
            throw error;
        }
    });

/**
 * DELIVERY STATUS CHANGE TRIGGER
 */
export const onDeliveryStatusChange = functions.firestore
    .document('deliveries/{deliveryId}')
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data() as DeliveryData;
        const afterData = change.after.data() as DeliveryData;
        const deliveryId = context.params.deliveryId;

        // Only process if status actually changed
        if (beforeData.status === afterData.status) {
            return null;
        }

        console.log(`📦 Delivery ${deliveryId} status: ${beforeData.status} → ${afterData.status}`);

        try {
            // Get customer data
            const customerDoc = await db.collection('users').doc(afterData.creator).get();
            const customer = customerDoc.data() as UserData;

            if (!customer?.email) {
                console.warn(`No email for customer ${afterData.creator}`);
                return null;
            }

            const emailTemplate = getEmailTemplateForStatus(afterData.status);
            if (!emailTemplate) {
                console.log(`No email template for status: ${afterData.status}`);
                return null;
            }

            const userName = getUserDisplayName(customer);

            const emailData: any = {
                user: {
                    firstName: userName,
                    email: customer.email,
                    userType: customer.userType
                },
                delivery: {
                    id: deliveryId,
                    packageDescription: afterData.packageDescription || 'Colis',
                    deliveryAddress: afterData.deliveryAddress?.formattedAddress || 'Adresse non définie',
                    pickupAddress: afterData.pickupAddress?.formattedAddress || 'Adresse non définie',
                    price: afterData.price || 0,
                    priceFormatted: `€${(afterData.price || 0).toFixed(2)}`,
                    secretCode: afterData.secretCode || '',
                    scheduledDate: formatDate(afterData.scheduledDate),
                    timeSlot: formatTimeSlot(afterData.timeSlot)
                }
            };

            // Add status-specific data
            if (afterData.status === 'failed') {
                emailData.failureReason = 'Livraison échouée';
            } else if (afterData.status === 'rescheduled') {
                emailData.rescheduleCount = afterData.rescheduleCount || 1;
                emailData.maxReschedules = afterData.maxReschedules || 2;
                emailData.reason = 'Livraison reportée';
            }

            // Send status change email
            await db.collection('mail').add({
                to: [customer.email],
                template: {
                    name: emailTemplate,
                    data: emailData
                },
                priority: 'high',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`📧 Status email sent: ${emailTemplate} to ${customer.email}`);
            return { success: true, template: emailTemplate, recipient: customer.email };

        } catch (error) {
            console.error('Error in delivery status change function:', error);
            throw error;
        }
    });

/**
 * NEW DELIVERY AGENT APPLICATION TRIGGER
 */
export const onNewDeliveryAgentApplication = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data() as UserData;
        const afterData = change.after.data() as UserData;
        const userId = context.params.userId;

        // Check if user became a delivery agent
        if (!beforeData.isDeliveryAgent && afterData.isDeliveryAgent) {
            console.log(`New delivery agent application: ${userId}`);

            try {
                // Get all admin users
                const adminsQuery = await db.collection('users')
                    .where('isAdmin', '==', true)
                    .get();

                const adminEmails = adminsQuery.docs
                    .map(doc => {
                        const data = doc.data() as UserData;
                        return data.email;
                    })
                    .filter(email => email);

                if (adminEmails.length > 0) {
                    const userName = getUserDisplayName(afterData);

                    await db.collection('mail').add({
                        to: adminEmails,
                        template: {
                            name: 'new_agent_application',
                            data: {
                                applicant: {
                                    firstName: userName,
                                    email: afterData.email,
                                    userType: afterData.userType
                                },
                                applicationId: userId,
                                applicationDate: new Date().toISOString()
                            }
                        },
                        priority: 'normal',
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    console.log(`📧 Admin notification sent for new agent application: ${userId}`);
                }
            } catch (error) {
                console.error('Error notifying admins of new agent application:', error);
            }
        }

        return null;
    });

// Helper functions
function getUserDisplayName(user: UserData): string {
    if (user.userType === 'individual') {
        return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Client';
    } else {
        return user.contactName || 'Client';
    }
}

function formatTimeSlot(timeSlot: any): string {
    try {
        if (!timeSlot?.start || !timeSlot?.end) return 'Horaire non défini';

        let start: Date, end: Date;

        if (typeof timeSlot.start.toDate === 'function') {
            start = timeSlot.start.toDate();
        } else {
            start = new Date(timeSlot.start);
        }

        if (typeof timeSlot.end.toDate === 'function') {
            end = timeSlot.end.toDate();
        } else {
            end = new Date(timeSlot.end);
        }

        return `${start.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        })} - ${end.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    } catch (error) {
        return 'Horaire non défini';
    }
}

function formatDate(date: any): string {
    try {
        if (!date) return 'Date non définie';

        let actualDate: Date;

        if (typeof date.toDate === 'function') {
            actualDate = date.toDate();
        } else {
            actualDate = new Date(date);
        }

        return actualDate.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return 'Date non définie';
    }
}

function getEmailTemplateForStatus(status: DeliveryStatus): string | null {
    const statusTemplateMap: Record<DeliveryStatus, string | null> = {
        'waiting_for_delivery_guy': null,
        'delivery_guy_accepted': 'agent_assigned',
        'picked_up': 'package_picked_up',
        'delivered': 'delivery_completed',
        'rescheduled': 'delivery_rescheduled',
        'failed': 'delivery_failed'
    };

    return statusTemplateMap[status] || null;
}