import React from 'react';
import { View, Text } from 'react-native';

interface AuthErrorMessagesProps {
    error: string | null;
    className?: string;
    textClassName?: string;
}

const AuthErrorMessages: React.FC<AuthErrorMessagesProps> = ({
                                                                 error,
                                                                 className = "",
                                                                 textClassName = ""
                                                             }) => {
    if (!error) return null;

    return (
        <View className={`bg-red-500/20 p-3 rounded-md mb-4 ${className}`}>
            <Text className={`text-white text-center font-cabin-medium ${textClassName}`}>
                {error}
            </Text>
        </View>
    );
};

export default AuthErrorMessages;