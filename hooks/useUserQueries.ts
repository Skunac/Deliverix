import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@/src/models/user.model';
import { AdminUserService } from '@/src/services/admin.service';

const adminUserService = new AdminUserService();

// Query Keys
export const userKeys = {
    all: ['users'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...userKeys.lists(), { filters }] as const,
    details: () => [...userKeys.all, 'detail'] as const,
    detail: (id: string) => [...userKeys.details(), id] as const,
};

// Get all users (admin only)
export function useUsers() {
    return useQuery({
        queryKey: userKeys.lists(),
        queryFn: () => adminUserService.getAllUsers(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
}

// Get single user details
export function useUser(userId: string, enabled: boolean = true) {
    return useQuery({
        queryKey: userKeys.detail(userId),
        queryFn: () => adminUserService.getUserById(userId),
        enabled: enabled && !!userId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Update user status (activate/deactivate)
export function useUpdateUserStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, isAllowed }: { userId: string; isAllowed: boolean }) =>
            adminUserService.updateUserStatus(userId, isAllowed),
        onSuccess: (data, variables) => {
            // Invalidate and refetch users list
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });

            // Update the specific user in cache if we have it
            queryClient.setQueryData(userKeys.detail(variables.userId), (old: User | undefined) => {
                if (old) {
                    return { ...old, isAllowed: variables.isAllowed };
                }
                return old;
            });
        },
        onError: (error) => {
            console.error('Error updating user status:', error);
        },
    });
}

// Delete user (admin only)
export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId: string) => adminUserService.deleteUser(userId),
        onSuccess: (data, userId) => {
            // Remove user from cache
            queryClient.removeQueries({ queryKey: userKeys.detail(userId) });

            // Invalidate users list
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });
        },
        onError: (error) => {
            console.error('Error deleting user:', error);
        },
    });
}

// Update user profile (admin only)
export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, userData }: { userId: string; userData: Partial<User> }) =>
            adminUserService.updateUser(userId, userData),
        onSuccess: (data, variables) => {
            // Invalidate and refetch users list
            queryClient.invalidateQueries({ queryKey: userKeys.lists() });

            // Invalidate the specific user
            queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
        },
        onError: (error) => {
            console.error('Error updating user:', error);
        },
    });
}

// Get delivery agents (admin only)
export function useDeliveryAgents() {
    return useQuery({
        queryKey: [...userKeys.lists(), 'delivery-agents'],
        queryFn: () => adminUserService.getDeliveryAgents(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });
}

// Approve/reject delivery agent
export function useUpdateDeliveryAgentStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ agentId, isAllowed }: { agentId: string; isAllowed: boolean }) =>
            adminUserService.updateDeliveryAgentStatus(agentId, isAllowed),
        onSuccess: () => {
            // Invalidate all user-related queries
            queryClient.invalidateQueries({ queryKey: userKeys.all });
        },
        onError: (error) => {
            console.error('Error updating delivery agent status:', error);
        },
    });
}

// Get user statistics
export function useUserStats() {
    return useQuery({
        queryKey: [...userKeys.all, 'stats'],
        queryFn: () => adminUserService.getUserStats(),
        staleTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
    });
}

// Search users
export function useSearchUsers(searchQuery: string, enabled: boolean = true) {
    return useQuery({
        queryKey: [...userKeys.lists(), 'search', searchQuery],
        queryFn: () => adminUserService.searchUsers(searchQuery),
        enabled: enabled && searchQuery.length >= 2,
        staleTime: 2 * 60 * 1000, // 2 minutes
        refetchOnWindowFocus: false,
    });
}