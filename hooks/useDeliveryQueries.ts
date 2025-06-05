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

    // Permissions
    permissions: (deliveryId: string, userId: string) =>
        [...deliveryKeys.all, 'permissions', deliveryId, userId] as const,
};

// ==================== AUTH-AWARE QUERY HOOKS ====================

// 1. Single Delivery Hook with Auth Awareness
export function useDelivery(deliveryId: string, enableRealtime = true) {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const query = useQuery({
        queryKey: deliveryKeys.detail(deliveryId),
        queryFn: () => enhancedDeliveryService.getDeliveryById(deliveryId),
        enabled: !!deliveryId && !!user,
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
    }, [deliveryId, enableRealtime, queryClient, user]);

    return query;
}

// 2. User Deliveries Hook with Auth Awareness
export function useUserDeliveries(
    userId: string,
    options: DeliveryQueryOptions & { enableRealtime?: boolean } = {}
) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { enableRealtime = true, ...queryOptions } = options;

    const query = useQuery({
        queryKey: deliveryKeys.userFiltered(userId, queryOptions),
        queryFn: () => enhancedDeliveryService.getUserDeliveries(userId, queryOptions),
        enabled: !!userId && !!user && user.uid === userId,
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
    const { user } = useAuth();
    const { enableRealtime = true, ...queryOptions } = options;

    const query = useQuery({
        queryKey: deliveryKeys.agentFiltered(agentId, queryOptions),
        queryFn: () => enhancedDeliveryService.getAgentDeliveries(agentId, queryOptions),
        enabled: !!agentId && !!user && user.uid === agentId && user.isDeliveryAgent,
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

// 4. Available Deliveries Hook with Auth Awareness
export function useAvailableDeliveries(agentId: string, enableRealtime = false) {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const query = useQuery({
        queryKey: deliveryKeys.available(agentId),
        queryFn: () => enhancedDeliveryService.getAvailableDeliveriesForAgent(agentId),
        enabled: !!agentId && !!user && user.uid === agentId && user.isDeliveryAgent,
        refetchInterval: enableRealtime ? undefined : 30 * 1000,
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
                if (!user) {
                    console.log('🔒 User logged out, ignoring available deliveries error');
                    return;
                }
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

// 5. All Deliveries Hook for Admin
export function useAllDeliveries(
    options: DeliveryQueryOptions & { enableRealtime?: boolean } = {},
    enabled: boolean = true
) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { enableRealtime = true, ...queryOptions } = options;

    const query = useQuery({
        queryKey: [...deliveryKeys.all, 'admin-all', queryOptions],
        queryFn: () => enhancedDeliveryService.getAllDeliveries(queryOptions),
        enabled: enabled && !!user && user.isAdmin,
        staleTime: 5 * 60 * 1000, // 5 minutes for admin queries
    });

    // Real-time subscription with auth checks
    useEffect(() => {
        if (!enableRealtime || !enabled || !user || !user.isAdmin) {
            console.log('🔒 Skipping admin all deliveries subscription - no auth or not admin');
            return;
        }

        console.log('🔄 Starting admin all deliveries subscription');

        const unsubscribe = enhancedDeliveryService.subscribeToAllDeliveries(
            (deliveries) => {
                console.log('📡 Admin all deliveries update received:', deliveries.length);
                queryClient.setQueryData(
                    [...deliveryKeys.all, 'admin-all', queryOptions],
                    deliveries
                );
            },
            queryOptions,
            (error) => {
                console.error('🚨 Real-time admin all deliveries error:', error);
                if (!user) {
                    console.log('🔒 User logged out, ignoring error');
                    return;
                }
            }
        );

        return () => {
            console.log('🛑 Cleaning up admin all deliveries subscription');
            unsubscribe();
        };
    }, [JSON.stringify(queryOptions), enableRealtime, queryClient, user, enabled]);

    return query;
}

// 6. Delivery Edit/Delete Permissions Hook
export function useDeliveryPermissions(deliveryId: string, userId: string) {
    const { user } = useAuth();

    return useQuery({
        queryKey: deliveryKeys.permissions(deliveryId, userId),
        queryFn: async () => {
            if (user?.isAdmin) {
                return { canEdit: true, canDelete: true };
            }
            return enhancedDeliveryService.canEditOrDeleteDelivery(deliveryId, userId, user?.isAdmin);
        },
        enabled: !!deliveryId && !!userId && !!user,
        staleTime: 60 * 1000,
    });
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

// ==================== MUTATION HOOKS ====================

// 1. Create Delivery Mutation
export function useCreateDelivery() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: (delivery: Omit<Delivery, "id">) => {
            if (!user) {
                throw new Error('User not authenticated');
            }
            return enhancedDeliveryService.createDelivery(delivery);
        },
        onSuccess: (newDelivery) => {
            if (user) {
                queryClient.invalidateQueries({
                    queryKey: deliveryKeys.user(newDelivery.creator)
                });
            }
            queryClient.setQueryData(deliveryKeys.detail(newDelivery.id), newDelivery);
        },
        onError: (error) => {
            console.error('Create delivery failed:', error);
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
            if (!user || !user.isDeliveryAgent) {
                throw new Error('User not authenticated or not a delivery agent');
            }
            return enhancedDeliveryService.acceptDelivery(deliveryId, agentId);
        },
        onMutate: async ({ deliveryId, agentId }) => {
            if (!user) return {};

            await queryClient.cancelQueries({ queryKey: deliveryKeys.detail(deliveryId) });

            const previousDelivery = queryClient.getQueryData<DeliveryWithAgent>(
                deliveryKeys.detail(deliveryId)
            );

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
            if (context?.previousDelivery) {
                queryClient.setQueryData(deliveryKeys.detail(deliveryId), context.previousDelivery);
            }

            if (err.message?.includes('permission-denied') && !user) {
                console.log('🔒 Accept delivery failed - user not authenticated');
            }
        },
        onSettled: (_, __, { deliveryId, agentId }) => {
            if (!user) return;

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
            if (!user || !user.isDeliveryAgent) {
                throw new Error('User not authenticated or not a delivery agent');
            }
            return enhancedDeliveryService.validateDelivery(deliveryId);
        },
        onMutate: async (deliveryId) => {
            if (!user) return {};

            await queryClient.cancelQueries({ queryKey: deliveryKeys.detail(deliveryId) });

            const previousDelivery = queryClient.getQueryData<DeliveryWithAgent>(
                deliveryKeys.detail(deliveryId)
            );

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
            if (context?.previousDelivery) {
                queryClient.setQueryData(deliveryKeys.detail(deliveryId), context.previousDelivery);
            }

            if (err.message?.includes('permission-denied') && !user) {
                console.log('🔒 Validate delivery failed - user not authenticated');
            }
        },
        onSettled: (_, __, deliveryId) => {
            if (!user) return;

            queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(deliveryId) });
            queryClient.invalidateQueries({ queryKey: deliveryKeys.lists() });
        },
    });
}

// 4. Edit Delivery Mutation
export function useEditDelivery() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: ({
                         deliveryId,
                         updateData
                     }: {
            deliveryId: string;
            updateData: Partial<Delivery>
        }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }
            // Pass admin status to the service method
            return enhancedDeliveryService.editDelivery(deliveryId, user.uid!, updateData, user.isAdmin);
        },
        onMutate: async ({ deliveryId, updateData }) => {
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
                    ...updateData,
                    updatedAt: new Date(),
                });
            }

            return { previousDelivery };
        },
        onError: (err, { deliveryId }, context) => {
            // Rollback on error
            if (context?.previousDelivery) {
                queryClient.setQueryData(deliveryKeys.detail(deliveryId), context.previousDelivery);
            }
            console.error('Edit delivery failed:', err);
        },
        onSuccess: (updatedDelivery, { deliveryId }) => {
            // Update the delivery in cache
            queryClient.setQueryData(deliveryKeys.detail(deliveryId), updatedDelivery);

            // Invalidate related queries
            if (user) {
                queryClient.invalidateQueries({ queryKey: deliveryKeys.user(user.uid!) });
                queryClient.invalidateQueries({ queryKey: deliveryKeys.permissions(deliveryId, user.uid!) });
            }
        },
    });
}

// 5. Delete Delivery Mutation
export function useDeleteDelivery() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: (deliveryId: string) => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            // If admin, use permanent delete, otherwise use soft delete
            if (user.isAdmin) {
                return enhancedDeliveryService.adminDeleteDelivery(deliveryId, user.uid!);
            } else {
                return enhancedDeliveryService.softDeleteDelivery(deliveryId, user.uid!);
            }
        },
        onMutate: async (deliveryId) => {
            if (!user) return {};

            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: deliveryKeys.detail(deliveryId) });

            // Snapshot previous value
            const previousDelivery = queryClient.getQueryData<DeliveryWithAgent>(
                deliveryKeys.detail(deliveryId)
            );

            // Optimistically remove from lists
            if (user.uid) {
                queryClient.setQueriesData(
                    { queryKey: deliveryKeys.user(user.uid) },
                    (old: DeliveryWithAgent[] | undefined) => {
                        if (!old) return old;
                        return old.filter(delivery => delivery.id !== deliveryId);
                    }
                );
            }

            // For admin, also remove from all deliveries
            if (user.isAdmin) {
                queryClient.setQueriesData(
                    { queryKey: [...deliveryKeys.all, 'admin-all'] },
                    (old: DeliveryWithAgent[] | undefined) => {
                        if (!old) return old;
                        return old.filter(delivery => delivery.id !== deliveryId);
                    }
                );
            }

            return { previousDelivery };
        },
        onError: (err, deliveryId, context) => {
            console.error('Delete delivery failed:', err);

            // Rollback optimistic updates
            if (context?.previousDelivery && user) {
                queryClient.setQueryData(deliveryKeys.detail(deliveryId), context.previousDelivery);
                if (user.uid) {
                    queryClient.invalidateQueries({ queryKey: deliveryKeys.user(user.uid) });
                }
                if (user.isAdmin) {
                    queryClient.invalidateQueries({ queryKey: [...deliveryKeys.all, 'admin-all'] });
                }
            }
        },
        onSuccess: (_, deliveryId) => {
            // Remove from cache and invalidate related queries
            queryClient.removeQueries({ queryKey: deliveryKeys.detail(deliveryId) });

            if (user && user.uid) {
                queryClient.invalidateQueries({ queryKey: deliveryKeys.user(user.uid) });
                queryClient.invalidateQueries({ queryKey: deliveryKeys.permissions(deliveryId, user.uid) });
            }

            // For admin, also invalidate admin queries
            if (user?.isAdmin) {
                queryClient.invalidateQueries({ queryKey: [...deliveryKeys.all, 'admin-all'] });
            }
        },
    });
}