import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { GradientView } from '@/components/ui/GradientView';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/authContext';
import { User } from '@/src/models/user.model';
import UserCard from '@/components/ui/UserCard';
import { useUsers, useUpdateUserStatus, useUserStats } from '@/hooks/useUserQueries';

type UserFilter = 'all' | 'individual' | 'professional' | 'delivery';
type StatusFilter = 'all' | 'active' | 'disabled' | 'banned';

interface FilterOption {
    label: string;
    value: UserFilter | StatusFilter;
    icon: string;
}

export default function AdminScreen() {
    const { user } = useAuth();
    const [activeUserFilter, setActiveUserFilter] = useState<UserFilter>('all');
    const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);

    // Check if user is admin (you'll need to add this field to your user model)
    const isAdmin = user?.isAdmin || false;

    // Fetch all users using React Query
    const {
        data: users = [],
        isLoading,
        error,
        refetch,
        isRefetching
    } = useUsers();

    // Fetch user statistics
    const {
        data: userStats,
        isLoading: isLoadingStats,
        error: statsError
    } = useUserStats();

    // Mutation for updating user status
    const updateUserStatusMutation = useUpdateUserStatus();

    // Filter options
    const userFilterOptions: FilterOption[] = [
        { label: 'Tous', value: 'all', icon: 'people-outline' },
        { label: 'Particuliers', value: 'individual', icon: 'person-outline' },
        { label: 'Professionnels', value: 'professional', icon: 'business-outline' },
        { label: 'Livreurs', value: 'delivery', icon: 'bicycle-outline' }
    ];

    const statusFilterOptions: FilterOption[] = [
        { label: 'Tous', value: 'all', icon: 'list-outline' },
        { label: 'Actifs', value: 'active', icon: 'checkmark-circle-outline' },
        { label: 'Désactivés', value: 'disabled', icon: 'close-circle-outline' },
        { label: 'Bannis', value: 'banned', icon: 'ban-outline' }
    ];

    // Filtered users based on current filters
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            // User type filter
            if (activeUserFilter !== 'all') {
                if (activeUserFilter === 'delivery' && !user.isDeliveryAgent) return false;
                if (activeUserFilter === 'individual' && (user.userType !== 'individual' || user.isDeliveryAgent)) return false;
                if (activeUserFilter === 'professional' && (user.userType !== 'professional' || user.isDeliveryAgent)) return false;
            }

            // Status filter
            if (activeStatusFilter !== 'all') {
                const isActive = user.isAllowed !== false;
                const isBanned = user.isBanned === true;

                if (activeStatusFilter === 'active' && !isActive) return false;
                if (activeStatusFilter === 'disabled' && (isActive || isBanned)) return false;
                if (activeStatusFilter === 'banned' && !isBanned) return false;
            }

            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const searchFields = [
                    user.email,
                    user.phoneNumber,
                    user.userType === 'individual' ? `${(user as any).firstName} ${(user as any).lastName}` : '',
                    user.userType === 'professional' ? (user as any).companyName : '',
                    user.userType === 'professional' ? (user as any).contactName : ''
                ].filter(Boolean).join(' ').toLowerCase();

                return searchFields.includes(query);
            }

            return true;
        });
    }, [users, activeUserFilter, activeStatusFilter, searchQuery]);

    const handleUserFilterChange = (filter: UserFilter) => {
        setActiveUserFilter(filter);
    };

    const handleStatusFilterChange = (filter: StatusFilter) => {
        setActiveStatusFilter(filter);
    };

    const handleRefresh = () => {
        refetch();
    };

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await updateUserStatusMutation.mutateAsync({
                userId,
                isAllowed: !currentStatus
            });
        } catch (error) {
            console.error('Error updating user status:', error);
        }
    };

    const handleUserPress = (selectedUser: User) => {
        setSelectedUser(selectedUser);
        setShowUserModal(true);
    };

    const handleCloseUserModal = () => {
        setShowUserModal(false);
        setSelectedUser(null);
    };

    const ItemSeparator = () => <View className="h-4" />;

    // Not admin access
    if (!isAdmin) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="shield-outline" size={48} color="#ef4444" />
                    <Text className="text-white text-lg font-cabin-medium mt-4 text-center">
                        Accès non autorisé
                    </Text>
                    <Text className="text-gray-300 font-cabin text-center mt-2">
                        Cette section est réservée aux administrateurs.
                    </Text>
                </View>
            </GradientView>
        );
    }

    // Loading State
    if (isLoading) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#5DD6FF" />
                    <Text className="mt-4 text-white font-cabin">
                        Chargement des utilisateurs...
                    </Text>
                </View>
            </GradientView>
        );
    }

    // Error State
    if (error) {
        return (
            <GradientView>
                <View className="flex-1 justify-center items-center p-4">
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text className="mt-4 text-lg text-red-500 font-cabin">
                        Erreur lors du chargement
                    </Text>
                    <Text className="mt-2 text-gray-300 text-center font-cabin">
                        {error.message || "Une erreur est survenue"}
                    </Text>
                    <TouchableOpacity
                        className="mt-6 p-3 bg-primary rounded-lg"
                        onPress={handleRefresh}
                        disabled={isRefetching}
                    >
                        <Text className="text-white font-cabin-medium">
                            {isRefetching ? 'Rechargement...' : 'Réessayer'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </GradientView>
        );
    }

    return (
        <GradientView>
            <View className="flex-1">
                {/* User Type Filter Tabs */}
                <View className="flex-row bg-dark p-2 mb-2">
                    {userFilterOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            className={`flex-1 flex-row items-center justify-center p-2 rounded-lg mx-1 ${
                                activeUserFilter === option.value ? 'bg-primary' : 'bg-transparent'
                            }`}
                            onPress={() => handleUserFilterChange(option.value as UserFilter)}
                        >
                            <Ionicons
                                name={option.icon as any}
                                size={16}
                                color={activeUserFilter === option.value ? '#0F2026' : 'white'}
                                style={{ marginRight: 4 }}
                            />
                            <Text
                                className={`text-xs font-cabin-medium ${
                                    activeUserFilter === option.value ? 'text-darker' : 'text-white'
                                }`}
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Status Filter Tabs */}
                <View className="flex-row bg-dark p-2 mb-4">
                    {statusFilterOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            className={`flex-1 flex-row items-center justify-center p-2 rounded-lg mx-1 ${
                                activeStatusFilter === option.value ? 'bg-secondary' : 'bg-transparent'
                            }`}
                            onPress={() => handleStatusFilterChange(option.value as StatusFilter)}
                        >
                            <Ionicons
                                name={option.icon as any}
                                size={16}
                                color={activeStatusFilter === option.value ? '#0F2026' : 'white'}
                                style={{ marginRight: 4 }}
                            />
                            <Text
                                className={`text-xs font-cabin-medium ${
                                    activeStatusFilter === option.value ? 'text-darker' : 'text-white'
                                }`}
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Search Bar */}
                <View className="mx-4 mb-4">
                    <View className="flex-row items-center bg-dark p-3 rounded-lg border border-gray-700">
                        <Ionicons name="search-outline" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                        <TextInput
                            className="flex-1 text-white font-cabin"
                            placeholder="Rechercher par nom, email, téléphone..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchQuery('')}
                                className="ml-2"
                            >
                                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Stats Header */}
                <View className="mx-4 mb-4">
                    <Text className="text-white text-lg font-cabin-medium">
                        {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
                    </Text>
                    {searchQuery.trim() && (
                        <Text className="text-gray-400 font-cabin text-sm mt-1">
                            Recherche: "{searchQuery}"
                        </Text>
                    )}
                </View>

                {/* Users List */}
                {filteredUsers.length > 0 ? (
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <UserCard
                                user={item}
                                onPress={() => handleUserPress(item)}
                                onToggleStatus={(isAllowed) => handleToggleUserStatus(item.id, isAllowed)}
                                isUpdating={updateUserStatusMutation.isPending}
                            />
                        )}
                        ItemSeparatorComponent={ItemSeparator}
                        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
                        onRefresh={handleRefresh}
                        refreshing={isRefetching}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View className="flex-1 justify-center items-center p-4">
                        <Ionicons name="people-outline" size={48} color="#6b7280" />
                        <Text className="text-white text-lg font-cabin-medium mt-4 text-center">
                            Aucun utilisateur trouvé
                        </Text>
                        <Text className="text-gray-300 font-cabin text-center mt-2">
                            {searchQuery.trim()
                                ? 'Essayez de modifier vos critères de recherche'
                                : 'Aucun utilisateur ne correspond aux filtres sélectionnés'
                            }
                        </Text>
                        <TouchableOpacity
                            className="mt-4 p-2"
                            onPress={handleRefresh}
                            disabled={isRefetching}
                        >
                            <Text className="text-secondary font-cabin">
                                {isRefetching ? 'Actualisation...' : 'Actualiser'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </GradientView>
    );
}