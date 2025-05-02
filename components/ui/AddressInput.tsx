import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import StyledTextInput from '@/components/ui/StyledTextInput';
import { EmbeddedAddress } from '@/src/models/delivery.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

interface ModernAddressInputProps {
    address: EmbeddedAddress | null;
    onAddressSelected: (address: EmbeddedAddress) => void;
}

const ModernAddressInput = ({
                                address,
                                onAddressSelected
                            }: ModernAddressInputProps) => {
    const [showModal, setShowModal] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [displayAddress, setDisplayAddress] = useState('');
    const expandAnimation = useRef(new Animated.Value(0)).current;

    // For manual editing of address components
    const [streetNumber, setStreetNumber] = useState('');
    const [route, setRoute] = useState('');
    const [locality, setLocality] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [complementaryAddress, setComplementaryAddress] = useState('');
    const [additionalInstructions, setAdditionalInstructions] = useState('');

    // Helper function to create a GeoPoint
    const createGeoPoint = (lat: number, lng: number): FirebaseFirestoreTypes.GeoPoint => {
        return {
            latitude: lat,
            longitude: lng
        } as FirebaseFirestoreTypes.GeoPoint;
    };

    // Update all fields when address prop changes
    useEffect(() => {
        // Update display address
        if (address?.formattedAddress) {
            setDisplayAddress(address.formattedAddress);
            setIsExpanded(true); // Auto-expand when address is set
        } else if (address?.components) {
            const components = address.components;
            const formattedAddress = [
                components.street_number,
                components.route,
                components.locality,
                components.postal_code,
                components.country
            ].filter(Boolean).join(', ');

            if (formattedAddress) {
                setDisplayAddress(formattedAddress);
                setIsExpanded(true); // Auto-expand when address is set
            }
        } else {
            setDisplayAddress('');
            setIsExpanded(false);
        }

        // Update component fields
        if (address?.components) {
            setStreetNumber(address.components.street_number || '');
            setRoute(address.components.route || '');
            setLocality(address.components.locality || '');
            setPostalCode(address.components.postal_code || '');
            setCountry(address.components.country || '');
        }

        // Update additional fields
        setComplementaryAddress(address?.complementaryAddress || '');
        setAdditionalInstructions(address?.additionalInstructions || '');
    }, [address]);

    // Animation for expanding/collapsing details
    useEffect(() => {
        Animated.timing(expandAnimation, {
            toValue: isExpanded ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isExpanded, expandAnimation]);

    // Process Google Places result and extract address components
    const processGooglePlacesResult = (data: any, details: any) => {
        if (!details) return;

        const { geometry, address_components, formatted_address, place_id } = details;

        // Create a components object to map Google components to our model
        const components: Record<string, string> = {};

        // Process address components
        address_components.forEach((component: any) => {
            const types = component.types;

            if (types.includes('street_number')) {
                components.street_number = component.long_name;
            } else if (types.includes('route')) {
                components.route = component.long_name;
            } else if (types.includes('locality')) {
                components.locality = component.long_name;
            } else if (types.includes('postal_code')) {
                components.postal_code = component.long_name;
            } else if (types.includes('country')) {
                components.country = component.long_name;
            }
        });

        // Create the address object
        const newAddress: EmbeddedAddress = {
            placeId: place_id,
            formattedAddress: formatted_address,
            coordinates: createGeoPoint(
                geometry.location.lat,
                geometry.location.lng
            ),
            components: components,
            complementaryAddress: complementaryAddress,
            additionalInstructions: additionalInstructions
        };

        // Update local fields
        setStreetNumber(components.street_number || '');
        setRoute(components.route || '');
        setLocality(components.locality || '');
        setPostalCode(components.postal_code || '');
        setCountry(components.country || '');
        setDisplayAddress(formatted_address);

        // Call the callback with the new address
        onAddressSelected(newAddress);
        setShowModal(false); // Close modal after selection
        setIsExpanded(true);  // Expand details
    };

    const clearAddress = () => {
        // Clear all fields
        setDisplayAddress('');
        setStreetNumber('');
        setRoute('');
        setLocality('');
        setPostalCode('');
        setCountry('');
        setComplementaryAddress('');
        setAdditionalInstructions('');

        // Create an empty address
        const emptyAddress: EmbeddedAddress = {
            placeId: 'manual-input',
            formattedAddress: '',
            coordinates: createGeoPoint(0, 0), // Default coordinates (Paris)
            components: {},
            complementaryAddress: '',
            additionalInstructions: ''
        };

        onAddressSelected(emptyAddress);
        setIsExpanded(false);
    };

    // Function to update address when manual fields change
    const updateManualAddress = () => {
        // Build components object
        const components = {
            street_number: streetNumber,
            route: route,
            locality: locality,
            postal_code: postalCode,
            country: country
        };

        // Create formatted address from components
        const formattedAddress = [
            streetNumber,
            route,
            locality,
            postalCode,
            country
        ].filter(Boolean).join(', ');

        // Create updated address object
        const updatedAddress: EmbeddedAddress = {
            placeId: 'manual-input', // Mark as manually entered
            formattedAddress: formattedAddress,
            coordinates: address?.coordinates || createGeoPoint(48.8592184,  2.3456696), // Keep existing coordinates or use default
            components: components,
            complementaryAddress: complementaryAddress,
            additionalInstructions: additionalInstructions
        };

        // Update the display address
        setDisplayAddress(formattedAddress);

        // Send the updated address
        onAddressSelected(updatedAddress);
    };

    // Update additional fields
    const handleComplementaryAddressChange = (text: string) => {
        setComplementaryAddress(text);

        // Update the address with the new complementary address
        if (address) {
            const updatedAddress = {
                ...address,
                complementaryAddress: text
            };
            onAddressSelected(updatedAddress);
        }
    };

    const handleAdditionalInstructionsChange = (text: string) => {
        setAdditionalInstructions(text);

        // Update the address with the new additional instructions
        if (address) {
            const updatedAddress = {
                ...address,
                additionalInstructions: text
            };
            onAddressSelected(updatedAddress);
        }
    };

    // Calculate animation values
    const maxHeight = expandAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 500]  // Adjust this value based on content height
    });

    const opacity = expandAnimation.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1]
    });

    return (
        <View>
            {/* Modern Address Search Field */}
            <TouchableOpacity
                onPress={() => setShowModal(true)}
                className="flex-row items-center bg-dark mb-3 p-4 rounded-lg border border-gray-700"
            >
                <Ionicons name="location-outline" size={22} color="#5DD6FF" className="mr-3" />
                <View className="flex-1">
                    <Text className="text-gray-400 text-xs mb-1 font-cabin">
                        {displayAddress ? "SELECTED ADDRESS" : "SEARCH ADDRESS"}
                    </Text>
                    <Text className="text-white font-cabin" numberOfLines={1}>
                        {displayAddress || "Tap to search for an address"}
                    </Text>
                </View>
                {displayAddress ? (
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            clearAddress();
                        }}
                        className="ml-2 p-2"
                    >
                        <Ionicons name="close-circle" size={22} color="#9EAEB4" />
                    </TouchableOpacity>
                ) : (
                    <Ionicons name="search" size={20} color="#5DD6FF" />
                )}
            </TouchableOpacity>

            {/* Address Details - Expandable Section */}
            {displayAddress && (
                <View className="mb-4">
                    <TouchableOpacity
                        onPress={() => setIsExpanded(!isExpanded)}
                        className="flex-row items-center mb-2"
                    >
                        <Ionicons
                            name={isExpanded ? "chevron-down" : "chevron-forward"}
                            size={18}
                            color="#5DD6FF"
                        />
                        <Text className="ml-2 font-cabin" style={{ color: '#5DD6FF'}}>
                            {isExpanded ? "Hide details" : "Edit details"}
                        </Text>
                    </TouchableOpacity>

                    <Animated.View style={{ maxHeight, opacity }}>
                        <View className="bg-dark p-4 rounded-lg border border-gray-700">
                            <StyledTextInput
                                label="Street Number"
                                placeholder="Enter street number"
                                value={streetNumber}
                                onChangeText={(text) => {
                                    setStreetNumber(text);
                                    setTimeout(updateManualAddress, 100);
                                }}
                            />

                            <StyledTextInput
                                label="Street"
                                placeholder="Enter street name"
                                value={route}
                                onChangeText={(text) => {
                                    setRoute(text);
                                    setTimeout(updateManualAddress, 100);
                                }}
                            />

                            <View className="flex-row">
                                <View className="flex-1 mr-2">
                                    <StyledTextInput
                                        label="City"
                                        placeholder="Enter city"
                                        value={locality}
                                        onChangeText={(text) => {
                                            setLocality(text);
                                            setTimeout(updateManualAddress, 100);
                                        }}
                                    />
                                </View>
                                <View className="flex-1 ml-2">
                                    <StyledTextInput
                                        label="Postal Code"
                                        placeholder="Enter postal code"
                                        value={postalCode}
                                        onChangeText={(text) => {
                                            setPostalCode(text);
                                            setTimeout(updateManualAddress, 100);
                                        }}
                                    />
                                </View>
                            </View>

                            <StyledTextInput
                                label="Country"
                                placeholder="Enter country"
                                value={country}
                                onChangeText={(text) => {
                                    setCountry(text);
                                    setTimeout(updateManualAddress, 100);
                                }}
                            />

                            <StyledTextInput
                                label="Complementary Address"
                                placeholder="Apartment, floor, building code, etc."
                                value={complementaryAddress}
                                onChangeText={handleComplementaryAddressChange}
                            />

                            <StyledTextInput
                                label="Additional Instructions"
                                placeholder="Special instructions for the delivery agent"
                                multiline
                                numberOfLines={2}
                                value={additionalInstructions}
                                onChangeText={handleAdditionalInstructionsChange}
                            />
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* Manual Entry Option - Only show if no address is selected */}
            {!displayAddress && (
                <TouchableOpacity
                    onPress={() => setIsExpanded(!isExpanded)}
                    className="flex-row items-center mb-2"
                >
                    <Ionicons
                        name={isExpanded ? "chevron-down" : "chevron-forward"}
                        size={18}
                        color="#5DD6FF"
                    />
                    <Text className="ml-2 font-cabin" style={{ color: '#5DD6FF'}}>
                        {isExpanded ? "Hide manual entry" : "Enter address manually"}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Manual Entry Fields - Show when expanded and no address */}
            {!displayAddress && (
                <Animated.View style={{ maxHeight, opacity }}>
                    {isExpanded && (
                        <View className="bg-dark p-4 rounded-lg border border-gray-700">
                            <StyledTextInput
                                label="Street Number"
                                placeholder="Enter street number"
                                value={streetNumber}
                                onChangeText={(text) => {
                                    setStreetNumber(text);
                                    setTimeout(updateManualAddress, 100);
                                }}
                            />

                            <StyledTextInput
                                label="Street"
                                placeholder="Enter street name"
                                value={route}
                                onChangeText={(text) => {
                                    setRoute(text);
                                    setTimeout(updateManualAddress, 100);
                                }}
                            />

                            <View className="flex-row">
                                <View className="flex-1 mr-2">
                                    <StyledTextInput
                                        label="City"
                                        placeholder="Enter city"
                                        value={locality}
                                        onChangeText={(text) => {
                                            setLocality(text);
                                            setTimeout(updateManualAddress, 100);
                                        }}
                                    />
                                </View>
                                <View className="flex-1 ml-2">
                                    <StyledTextInput
                                        label="Postal Code"
                                        placeholder="Enter postal code"
                                        value={postalCode}
                                        onChangeText={(text) => {
                                            setPostalCode(text);
                                            setTimeout(updateManualAddress, 100);
                                        }}
                                    />
                                </View>
                            </View>

                            <StyledTextInput
                                label="Country"
                                placeholder="Enter country"
                                value={country}
                                onChangeText={(text) => {
                                    setCountry(text);
                                    setTimeout(updateManualAddress, 100);
                                }}
                            />

                            <StyledTextInput
                                label="Complementary Address"
                                placeholder="Apartment, floor, building code, etc."
                                value={complementaryAddress}
                                onChangeText={handleComplementaryAddressChange}
                            />

                            <StyledTextInput
                                label="Additional Instructions"
                                placeholder="Special instructions for the delivery agent"
                                multiline
                                numberOfLines={2}
                                value={additionalInstructions}
                                onChangeText={handleAdditionalInstructionsChange}
                            />
                        </View>
                    )}
                </Animated.View>
            )}

            {/* Modal with Google Places Autocomplete */}
            <Modal
                visible={showModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1, backgroundColor: '#0F2026' }}
                >
                    <View className="flex-1 p-4">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-white text-lg font-cabin-medium">
                                Search for an address
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowModal(false)}
                                className="p-2"
                            >
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <GooglePlacesAutocomplete
                            placeholder="Enter address"
                            onPress={processGooglePlacesResult}
                            fetchDetails={true}
                            query={{
                                key: 'AIzaSyBmDRLS39EJf9I54k9lDGfu1hdumFZ7v0c',
                                language: 'fr',
                                components: 'country:fr',
                            }}
                            styles={{
                                container: {
                                    flex: 0,
                                },
                                textInputContainer: {
                                    backgroundColor: '#1F2937',
                                    borderTopWidth: 0,
                                    borderBottomWidth: 0,
                                    borderRadius: 8,
                                    paddingHorizontal: 10,
                                },
                                textInput: {
                                    height: 50,
                                    color: 'white',
                                    fontSize: 16,
                                    backgroundColor: '#1F2937',
                                    fontFamily: 'Cabin',
                                },
                                predefinedPlacesDescription: {
                                    color: '#5DD6FF',
                                },
                                listView: {
                                    backgroundColor: '#1F2937',
                                    marginTop: 5,
                                    borderRadius: 8,
                                },
                                row: {
                                    backgroundColor: '#1F2937',
                                    padding: 13,
                                    flexDirection: 'row',
                                },
                                separator: {
                                    height: 1,
                                    backgroundColor: '#333',
                                },
                                description: {
                                    color: 'white',
                                    fontFamily: 'Cabin',
                                },
                                poweredContainer: {
                                    display: 'none',
                                },
                            }}
                            enablePoweredByContainer={false}
                            keyboardShouldPersistTaps="handled"
                            listViewDisplayed="auto"
                        />
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

export default ModernAddressInput;