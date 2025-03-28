import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, View } from 'react-native';

// Define button variants
type ButtonVariant = 'primary' | 'bordered' | 'transparent';

// Define props interface with className support
interface StyledButtonProps extends TouchableOpacityProps {
    children: React.ReactNode;
    className?: string;
    textClassName?: string;
    shadow?: boolean;
    variant?: ButtonVariant;
}

const StyledButton: React.FC<StyledButtonProps> = ({
                                                       children,
                                                       className = '',
                                                       shadow = false,
                                                       variant = 'primary',
                                                       style,
                                                       ...props
                                                   }) => {
    // Determine base class based on variant
    let baseClass = '';

    switch (variant) {
        case 'primary':
            baseClass = 'bg-primary p-4 rounded-lg items-center';
            break;
        case 'bordered':
            baseClass = 'bg-transparent border border-white p-4 rounded-lg items-center';
            break;
        case 'transparent':
            baseClass = 'bg-transparent p-4 items-center';
            break;
        default:
            baseClass = 'p-4 items-center';
    }

    // Only apply shadow to primary variant
    const shouldApplyShadow = shadow && variant === 'primary';

    return (
        <View style={shouldApplyShadow ? styles.shadowContainer : null}>
            <TouchableOpacity
                className={`${baseClass} ${className}`}
                activeOpacity={0.7}
                style={[shouldApplyShadow ? styles.buttonWithShadow : null, style]}
                {...props}
            >
                {children}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    shadowContainer: {
        // First shadow layer (y: 4, blur: 8)
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.32,
        shadowRadius: 4,
        elevation: 4,
    },
    buttonWithShadow: {
        // Second shadow layer (y: 16, blur: 32)
        borderRadius: 16,
        shadowColor: "#2EC3F5", // Light blue shadow color from your primary color
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.24,
        shadowRadius: 16,
        elevation: 8,
    }
});

export default StyledButton;