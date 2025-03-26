import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

interface GradientViewProps {
    children: React.ReactNode;
    style?: any;
}

export function GradientView({ children, style }: GradientViewProps) {
    return (
        <LinearGradient
            colors={['#1D333A', '#1C3D48', '#1C3239', '#111C20']}
            locations={[0, 0.24, 0.45, 1]}
            style={[styles.gradient, style]}
        >
            {children}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    }
});