import React from 'react';
import { TextInput, TextInputProps, View, Text, StyleSheet } from 'react-native';

interface StyledTextInputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerClassName?: string;
    labelClassName?: string;
    errorClassName?: string;
    showBorder?: boolean;
    darkBackground?: boolean;
}

export const StyledTextInput: React.FC<StyledTextInputProps> = ({
                                                                    label,
                                                                    error,
                                                                    containerClassName = "",
                                                                    labelClassName = "",
                                                                    errorClassName = "",
                                                                    showBorder = false,
                                                                    darkBackground = true,
                                                                    className = "",
                                                                    style,
                                                                    ...props
                                                                }) => {
    const borderClass = showBorder ? "border border-gray-300" : "";
    const errorBorderClass = error ? "border-red-500" : "";

    return (
        <View className={`mb-4 ${containerClassName}`}>
            {label && (
                <Text className={`text-white mb-1 font-cabin-medium ${labelClassName}`}>
                    {label}
                </Text>
            )}

            <TextInput
                className={`${borderClass} ${errorBorderClass} p-3 rounded-lg ${className}`}
                placeholderTextColor="#9ca3af"
                style={[darkBackground ? styles.darkBackground : styles.lightBackground, style]}
                {...props}
            />

            {error && (
                <Text className={`text-red-500 text-sm mt-1 font-cabin-medium ${errorClassName}`}>
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    darkBackground: {
        backgroundColor: '#0D1C22',
        color: 'white',
    },
    lightBackground: {
        color: 'black',
    }
});

export default StyledTextInput;