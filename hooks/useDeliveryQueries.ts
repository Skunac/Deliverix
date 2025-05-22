// hooks/useDeliveryQueries.ts - Updated with auth awareness

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
    enhancedDeliveryService,
    DeliveryWithAgent,
    DeliveryQueryOptions
} from '@/src/services/delivery.service.enhanced';
import { Delivery, DeliveryState, DeliveryStatus } from '@/src/models/delivery.model';
import { useAuth } from '@/contexts/authContext'; // Import useAuth

// ==================== QUERY KEYS FACTORY ====================
export const deliveryKeys = {
    all: ['deliveries'] as const,
    lists: () => [...deliveryKeys.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...deliveryKeys.lists(), filters] as const,
    details: () => [...deliveryKeys.all, 'detail'] as const,
    detail: (id: string) => [...deliveryKeys.details(), id] as const,

    // User-specific keys
    user: (userId: string) => [...deliveryKeys.all, 'user', userId] as const,
    userFiltered: (userId: string, filters: Record<string, any>) =>
        [...deliveryKeys.user(userId), filters] as const,

    // Agent-specific keys
    agent: (agentId: string) => [...deliveryKeys.all, 'agent', agentId] as const,
    agentFiltered: (agentId: string, filters: Record<string, any>) =>
        [...deliveryKeys.agent(agentId), filters] as const,

    // Available deliveries
    available: (agentId: string) => [...deliveryKeys.all, 'available', agentId] as const,
};

// ==================== AUTH-AWARE QUERY HOOKS ====================

// 1. Single Delivery Hook with Auth Awareness
export function useDelivery(deliveryId: string, enableRealtime = true) {
    const queryClient = useQueryClient();
    const { user } = useAuth(); // Add auth awareness

    const query = useQuery({
        queryKey: deliveryKeys.detail(deliveryId),
        queryFn: () => enhancedDeliveryService.getDeliveryById(deliveryId),
        enabled: !!deliveryId && !!user, // Only run if user is authenticated
    });

    // Real-time subscription with auth checks
    useEffect(() => {
        if (!enableRealtime || !deliveryId || !user) {
            console.log('🔒 Skipping real-time subscription - no auth or disabled');
            return;
        }

        console.log('🔄 Starting delivery subscription for:', deliveryId);

        const unsubscribe = enhancedDeliveryService.subscribeToDelivery(
            deliveryId,
            (delivery) => {
                console.log('📡 Delivery update received:', deliveryId);
                queryClient.setQueryData(deliveryKeys.detail(deliveryId), delivery);
            },
            (error) => {
                console.error('🚨 Real-time delivery error:', error);
                // Don't throw error if user is logged out
                if (!user) {
                    console.log('🔒 User logged out, ignoring error');
                    return;
                }
            }
        );

        return () => {
            console.log('🛑 Cleaning up delivery subscription:', deliveryId);
            unsubscribe();
        };
    }, [deliveryId, enableRealtime, queryClient, user]); // Add user as dependency

    return query;
}

// 2. User Deliveries Hook with Auth Awareness
export function useUserDeliveries(
    userId: string,
    options: DeliveryQueryOptions & { enableRealtime?: boolean } = {}
) {
    const queryClient = useQueryClient();
    const { user } = useAuth(); // Add auth awareness
    const { enableRealtime = true, ...queryOptions } = options;

    const query = useQuery({
        queryKey: deliveryKeys.userFiltered(userId, queryOptions),
        queryFn: () => enhancedDeliveryService.getUserDeliveries(userId, queryOptions),
        enabled: !!userId && !!user && user.uid === userId, // Only if authenticated and matches
    });

    // Real-time subscription with auth checks
    useEffect(() => {
        if (!enableRealtime || !userId || !user || user.uid !== userId) {
            console.log('🔒 Skipping user deliveries subscription - no auth or user mismatch');
            return;
        }

        console.log('🔄 Starting user deliveries subscription for:', userId);

        const unsubscribe = enhancedDeliveryService.subscribeToUserDeliveries(
            userId,
            (deliveries) => {
                console.log('📡 User deliveries update received:', deliveries.length);
                queryClient.setQueryData(
                    deliveryKeys.userFiltered(userId, queryOptions),
                    deliveries
                );
            },
            queryOptions,
            (error) => {
                console.error('🚨 Real-time user deliveries error:', error);
                if (!user) {
                    console.log('🔒 User logged out, ignoring error');
                    return;
                }
            }
        );

        return () => {
            console.log('🛑 Cleaning up user deliveries subscription:', userId);
            unsubscribe();
        };
    }, [userId, JSON.stringify(queryOptions), enableRealtime, queryClient, user]);

    return query;
}

// 3. Agent Deliveries Hook with Auth Awareness
export function useAgentDeliveries(
    agentId: string,
    options: DeliveryQueryOptions & { enableRealtime?: boolean } = {}
) {
    const queryClient = useQueryClient();
    const { user } = useAuth(); // Add auth awareness
    const { enableRealtime = true, ...queryOptions } = options;

    const query = useQuery({
        queryKey: deliveryKeys.agentFiltered(agentId, queryOptions),
        queryFn: () => enhancedDeliveryService.getAgentDeliveries(agentId, queryOptions),
        enabled: !!agentId && !!user && user.uid === agentId && user.isDeliveryAgent, // Auth + agent check
    });

    // Real-time subscription with auth checks
    useEffect(() => {
        if (!enableRealtime || !agentId || !user || user.uid !== agentId || !user.isDeliveryAgent) {
            console.log('🔒 Skipping agent deliveries subscription - no auth or not agent');
            return;
        }

        console.log('🔄 Starting agent deliveries subscription for:', agentId);

        const unsubscribe = enhancedDeliveryService.subscribeToAgentDeliveries(
            agentId,
            (deliveries) => {
                console.log('📡 Agent deliveries update received:', deliveries.length);
                queryClient.setQueryData(
                    deliveryKeys.agentFiltered(agentId, queryOptions),
                    deliveries
                );
            },
            queryOptions,
            (error) => {
                console.error('🚨 Real-time agent deliveries error:', error);
                if (!user) {
                    console.log('🔒 User logged out, ignoring error');
                    return;
                }
            }
        );

        return () => {
            console.log('🛑 Cleaning up agent deliveries subscription:', agentId);
            unsubscribe();
        };
    }, [agentId, JSON.stringify(queryOptions), enableRealtime, queryClient, user]);

    return query;
}

// 4. Available Deliveries Hook with Auth Awareness - FIXED
export function useAvailableDeliveries(agentId: string, enableRealtime = false) {
    const queryClient = useQueryClient();
    const { user } = useAuth(); // Add auth awareness

    const query = useQuery({
        queryKey: deliveryKeys.available(agentId),
        queryFn: () => enhancedDeliveryService.getAvailableDeliveriesForAgent(agentId),
        enabled: !!agentId && !!user && user.uid === agentId && user.isDeliveryAgent, // Auth + agent check
        refetchInterval: enableRealtime ? undefined : 30 * 1000, // Poll if not real-time
        refetchIntervalInBackground: false,
    });

    // Real-time subscription with auth checks
    useEffect(() => {
        if (!enableRealtime || !agentId || !user || user.uid !== agentId || !user.isDeliveryAgent) {
            console.log('🔒 Skipping available deliveries subscription - no auth or not agent');
            return;
        }

        console.log('🔄 Starting available deliveries subscription for:', agentId);

        const unsubscribe = enhancedDeliveryService.subscribeToAvailableDeliveries(
            agentId,
            (deliveries) => {
                console.log('📡 Available deliveries update received:', deliveries.length);
                queryClient.setQueryData(deliveryKeys.available(agentId), deliveries);
            },
            (error) => {
                console.error('🚨 Real-time available deliveries error:', error);
                // Check if user is still authenticated before showing error
                if (!user) {
                    console.log('🔒 User logged out, ignoring available deliveries error');
                    return;
                }
                // If user is still authenticated, this is a real error
                console.error('🚨 Real available deliveries error while authenticated:', error);
            }
        );

        return () => {
            console.log('🛑 Cleaning up available deliveries subscription:', agentId);
            unsubscribe();
        };
    }, [agentId, enableRealtime, queryClient, user]);

    return query;
}

// ==================== AUTH-AWARE QUERY CLEANUP ====================

// Hook to clear all delivery queries when user logs out
export function useDeliveryQueryCleanup() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    useEffect(() => {
        // When user becomes null (logout), clear all delivery queries
        if (!user) {
            console.log('🧹 User logged out - clearing all delivery queries');

            // Clear all delivery-related queries
            queryClient.removeQueries({ queryKey: deliveryKeys.all });

            // Also clear any ongoing mutations
            queryClient.getMutationCache().clear();

            console.log('✅ All delivery queries cleared');
        }
    }, [user, queryClient]);
}

// ==================== MUTATION HOOKS (unchanged but with better error handling) ====================

// 1. Create Delivery Mutation
export function useCreateDelivery() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: (delivery: Omit<Delivery, "id">) => {
            // Check auth before executing
            if (!user) {
                throw new Error('User not authenticated');
            }
            return enhancedDeliveryService.createDelivery(delivery);
        },
        onSuccess: (newDelivery) => {
            // Update user deliveries cache
            if (user) {
                queryClient.invalidateQueries({
                    queryKey: deliveryKeys.user(newDelivery.creator)
                });
            }

            // Set the new delivery in cache
            queryClient.setQueryData(deliveryKeys.detail(newDelivery.id), newDelivery);
        },
        onError: (error) => {
            console.error('Create delivery failed:', error);
            // Check if error is due to auth
            if (error.message?.includes('permission-denied') && !user) {
                console.log('🔒 Create delivery failed - user not authenticated');
            }
        },
    });
}

// 2. Accept Delivery Mutation
export function useAcceptDelivery() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: ({ deliveryId, agentId }: { deliveryId: string; agentId: string }) => {
            // Check auth before executing
            if (!user || !user.isDeliveryAgent) {
                throw new Error('User not authenticated or not a delivery agent');
            }
            return enhancedDeliveryService.acceptDelivery(deliveryId, agentId);
        },
        onMutate: async ({ deliveryId, agentId }) => {
            if (!user) return {};

            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: deliveryKeys.detail(deliveryId) });

            // Snapshot previous value
            const previousDelivery = queryClient.getQueryData<DeliveryWithAgent>(
                deliveryKeys.detail(deliveryId)
            );

            // Optimistically update
            if (previousDelivery) {
                queryClient.setQueryData(deliveryKeys.detail(deliveryId), {
                    ...previousDelivery,
                    deliveryAgentId: agentId,
                    status: 'delivery_guy_accepted' as DeliveryStatus,
                    state: 'processing' as DeliveryState,
                });
            }

            return { previousDelivery };
        },
        onError: (err, { deliveryId }, context) => {
            // Rollback on error
            if (context?.previousDelivery) {
                queryClient.setQueryData(deliveryKeys.detail(deliveryId), context.previousDelivery);
            }

            // Check if error is due to auth
            if (err.message?.includes('permission-denied') && !user) {
                console.log('🔒 Accept delivery failed - user not authenticated');
            }
        },
        onSettled: (_, __, { deliveryId, agentId }) => {
            if (!user) return;

            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(deliveryId) });
            queryClient.invalidateQueries({ queryKey: deliveryKeys.available(agentId) });
            queryClient.invalidateQueries({ queryKey: deliveryKeys.agent(agentId) });
        },
    });
}

// 3. Validate Delivery Mutation
export function useValidateDelivery() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: (deliveryId: string) => {
            // Check auth before executing
            if (!user || !user.isDeliveryAgent) {
                throw new Error('User not authenticated or not a delivery agent');
            }
            return enhancedDeliveryService.validateDelivery(deliveryId);
        },
        onMutate: async (deliveryId) => {
            if (!user) return {};

            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: deliveryKeys.detail(deliveryId) });

            // Snapshot previous value
            const previousDelivery = queryClient.getQueryData<DeliveryWithAgent>(
                deliveryKeys.detail(deliveryId)
            );

            // Optimistically update
            if (previousDelivery) {
                queryClient.setQueryData(deliveryKeys.detail(deliveryId), {
                    ...previousDelivery,
                    status: 'delivered' as DeliveryStatus,
                    state: 'completed' as DeliveryState,
                });
            }

            return { previousDelivery };
        },
        onError: (err, deliveryId, context) => {
            // Rollback on error
            if (context?.previousDelivery) {
                queryClient.setQueryData(deliveryKeys.detail(deliveryId), context.previousDelivery);
            }

            // Check if error is due to auth
            if (err.message?.includes('permission-denied') && !user) {
                console.log('🔒 Validate delivery failed - user not authenticated');
            }
        },
        onSettled: (_, __, deliveryId) => {
            if (!user) return;

            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(deliveryId) });
            queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
        },
    });
}