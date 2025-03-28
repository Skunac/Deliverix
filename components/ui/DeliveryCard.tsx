import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {Delivery} from "@/src/models/delivery.model";

interface DeliveryCardProps {
    delivery: Delivery;
    onPress: (delivery: Delivery) => void;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery, onPress }) => {
    return (
        <TouchableOpacity
            style={styles.darkBackground}
            className="rounded-xl p-4 mx-4 my-2 flex-row items-center justify-between"
            onPress={() => onPress(delivery)}
            activeOpacity={0.7}
        >
            <View className="flex-row items-center flex-1">
                <Feather name="map-pin" size={16} color="#fff" style={{marginRight: 10}}/>
                <Text className="text-base font-cabin-medium text-white flex-1" numberOfLines={1}>
                    {delivery.deliveryAddress.formattedAddress}
                </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#fff" />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    darkBackground: {
        backgroundColor: '#0D1C22',
        color: 'white',
    }
});

export default DeliveryCard;