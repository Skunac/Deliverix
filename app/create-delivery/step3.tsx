import React, { useState } from 'react';
import { View, Text, ScrollView, Platform, Pressable, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientView } from '@/components/ui/GradientView';
import StyledTextInput from '@/components/ui/StyledTextInput';
import StyledButton from '@/components/ui/StyledButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {useDeliveryForm} from "@/contexts/DeliveryFormContext";

export default function ScheduleScreen() {
    const router = useRouter();
    const { formState, updateFormState, validateStep } = useDeliveryForm();
    const [errors, setErrors] = useState<string[]>([]);

    // Date picker state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'night'>(
        formState.timeSlotStart && formState.timeSlotStart.getHours() >= 12 ? 'afternoon' : 'morning'
    );

    const handleDateChange = (event: any, selectedDate?: Date) => {
        // Hide the picker on Android immediately after selection
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (selectedDate) {
            updateFormState({ scheduledDate: selectedDate });
        }
    };

    const handleDonePress = () => {
        setShowDatePicker(false);
    };

    const handleTimeSlotChange = (slot: 'morning' | 'afternoon' | 'night') => {
        setTimeSlot(slot);

        const startDate = new Date();
        const endDate = new Date();

        if (slot === 'morning') {
            // Set time slot for morning (8:00 - 12:00)
            startDate.setHours(8, 0, 0, 0);
            endDate.setHours(12, 0, 0, 0);
        } else if (slot === 'afternoon') {
            // Set time slot for afternoon (12:00 - 18:00)
            startDate.setHours(12, 0, 0, 0);
            endDate.setHours(18, 0, 0, 0);
        } else if (slot === 'night') {
            // Set time slot for night (18:00 - 00:00)
            startDate.setHours(18, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
        }

        updateFormState({
            timeSlotStart: startDate,
            timeSlotEnd: endDate
        });
    };

    const handleContinue = () => {
        const stepErrors = validateStep(3);
        if (stepErrors.length > 0) {
            setErrors(stepErrors);
            return;
        }

        router.push('/create-delivery/step4');
    };

    return (
        <GradientView>
            <ScrollView className="flex-1 p-4">
                <Text className="text-white text-lg font-cabin-medium mb-6">
                    Schedule delivery and add comments
                </Text>

                {/* Display validation errors if any */}
                {errors.length > 0 && (
                    <View className="bg-red-500/20 p-4 rounded-lg mb-4">
                        {errors.map((error, index) => (
                            <Text key={index} className="text-red-400 font-cabin">
                                • {error}
                            </Text>
                        ))}
                    </View>
                )}

                {/* Scheduled Date */}
                <View className="bg-gray-800 p-4 rounded-lg mb-6">
                    <Text className="text-white font-cabin-medium text-lg mb-4">
                        Delivery Date and Time
                    </Text>

                    {/* Date Picker */}
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        className="bg-gray-700 p-3 rounded-lg mb-6 flex-row items-center justify-between"
                    >
                        <Text className="text-white font-cabin-medium">
                            Date: {formState.scheduledDate
                            ? format(formState.scheduledDate, 'dd/MM/yyyy', { locale: fr })
                            : 'Select a date'}
                        </Text>
                        <Ionicons name="calendar" size={20} color="white" />
                    </TouchableOpacity>

                    {/* Time Slot */}
                    <Text className="text-white mb-3 font-cabin-medium">Time Slot</Text>
                    <View className="flex-row mb-2">
                        <Pressable
                            className={`flex-1 p-4 rounded-lg mr-2 items-center justify-center ${
                                timeSlot === 'morning' ? 'bg-primary' : 'bg-gray-700'
                            }`}
                            onPress={() => handleTimeSlotChange('morning')}
                        >
                            <View className="items-center">
                                <Ionicons
                                    name="sunny-outline"
                                    size={24}
                                    color="white"
                                    style={{ marginBottom: 4 }}
                                />
                                <Text className="text-white font-cabin-medium">Morning</Text>
                                <Text className="text-gray-300 text-xs">8:00 - 12:00</Text>
                            </View>
                        </Pressable>

                        <Pressable
                            className={`flex-1 p-4 rounded-lg ml-2 items-center justify-center ${
                                timeSlot === 'afternoon' ? 'bg-primary' : 'bg-gray-700'
                            }`}
                            onPress={() => handleTimeSlotChange('afternoon')}
                        >
                            <View className="items-center">
                                <Ionicons
                                    name="partly-sunny-outline"
                                    size={24}
                                    color="white"
                                    style={{ marginBottom: 4 }}
                                />
                                <Text className="text-white font-cabin-medium">Afternoon</Text>
                                <Text className="text-gray-300 text-xs">12:00 - 18:00</Text>
                            </View>
                        </Pressable>

                        <Pressable
                            className={`flex-1 p-4 rounded-lg ml-2 items-center justify-center ${
                                timeSlot === 'night' ? 'bg-primary' : 'bg-gray-700'
                            }`}
                            onPress={() => handleTimeSlotChange('night')}
                        >
                            <View className="items-center">
                                <Ionicons
                                    name="moon-outline"
                                    size={24}
                                    color="white"
                                    style={{ marginBottom: 4 }}
                                />
                                <Text className="text-white font-cabin-medium">Night</Text>
                                <Text className="text-gray-300 text-xs">18:00 - 00:00</Text>
                            </View>
                        </Pressable>
                    </View>
                </View>

                {/* Comments */}
                <View className="bg-gray-800 p-4 rounded-lg mb-6">
                    <Text className="text-white font-cabin-medium text-lg mb-4">
                        Delivery Comment
                    </Text>

                    <StyledTextInput
                        label="Comment"
                        placeholder="Information for the delivery agent"
                        multiline
                        numberOfLines={3}
                        value={formState.comment}
                        onChangeText={(text) => updateFormState({ comment: text })}
                    />
                </View>

                {/* Navigation buttons */}
                <View className="flex-row justify-between mb-4">
                    <StyledButton
                        variant="primary"
                        shadow
                        className="flex-1 ml-2"
                        onPress={handleContinue}
                    >
                        <Text className="text-white font-cabin-medium">Continue</Text>
                    </StyledButton>
                </View>
            </ScrollView>

            {/* Date Picker Modal (conditionally rendered) */}
            {showDatePicker && (
                <>
                    {Platform.OS === 'ios' && (
                        <View className="w-full bg-white p-2 flex-row justify-end">
                            <TouchableOpacity onPress={handleDonePress}>
                                <Text className="text-blue-500 text-lg font-bold">Done</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <DateTimePicker
                        value={formState.scheduledDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                    />
                </>
            )}
        </GradientView>
    );
}