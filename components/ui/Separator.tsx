import {StyleSheet, View} from "react-native";
import React from "react";

export const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
    separator: {
        height: 1,
        width: '100%',
        backgroundColor: 'white',
        opacity: 0.2,
    }
});