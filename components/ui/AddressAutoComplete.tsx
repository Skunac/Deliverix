import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import StyledTextInput from '@/components/ui/StyledTextInput';
import { EmbeddedAddress } from '@/src/models/delivery.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

interface AddressAutocompleteProps {
    label: string;
    address: EmbeddedAddress | null;
    onAddressSelected: (address: EmbeddedAddress) => void;
    additionalInstructions: string;
    onAdditionalInstructionsChange: (text: string) => void;
    complementaryAddress: string;
    onComplementaryAddressChange: (text: string) => void;
}

const AddressAutocomplete = ({
                                 label,
                                 address,
                                 onAddressSelected,
                                 additionalInstructions,
                                 onAdditionalInstructionsChange,
                                 complementaryAddress,
                                 onComplementaryAddressChange
                             }: AddressAutocompleteProps) => {
    const [showManualFields, setShowManualFields] = useState(false);
    const [displayAddress, setDisplayAddress] = useState('');
    const [showModal, setShowModal] = useState(false);
    const autocompleteRef = useRef(null);

    // For manual editing of address components
    const [streetNumber, setStreetNumber] = useState('');
    const [route, setRoute] = useState('');
    const [locality, setLocality] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');

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
            }
        } else {
            setDisplayAddress('');
        }

        // Update component fields
        if (address?.components) {
            setStreetNumber(address.components.street_number || '');
            setRoute(address.components.route || '');
            setLocality(address.components.locality || '');
            setPostalCode(address.components.postal_code || '');
            setCountry(address.components.country || '');

            // Auto-show manual fields if we have an address from Google Maps
            if (address.placeId && address.placeId !== 'manual-input') {
                setShowManualFields(true);
            }
        }
    }, [address]);

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
            // Preserve existing values or set to empty string
            complementaryAddress: address?.complementaryAddress || '',
            additionalInstructions: address?.additionalInstructions || ''
        };

        // Call the callback with the new address
        onAddressSelected(newAddress);
        setDisplayAddress(formatted_address);
        setShowModal(false); // Close modal after selection

        // Immediately update our local state for manual fields
        setStreetNumber(components.street_number || '');
        setRoute(components.route || '');
        setLocality(components.locality || '');
        setPostalCode(components.postal_code || '');
        setCountry(components.country || '');

        // Auto-expand manual fields when an address is selected
        setShowManualFields(true);
    };

    const clearAddress = () => {
        setDisplayAddress('');

        // Clear all manual fields
        setStreetNumber('');
        setRoute('');
        setLocality('');
        setPostalCode('');
        setCountry('');

        // Create an empty address
        const emptyAddress: EmbeddedAddress = {
            placeId: 'manual-input',
            formattedAddress: '',
            coordinates: createGeoPoint(48.8566, 2.3522), // Default coordinates (Paris)
            components: {},
            complementaryAddress: '',
            additionalInstructions: ''
        };

        onAddressSelected(emptyAddress);

        // Hide manual fields on clear
        setShowManualFields(false);
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
            coordinates: address?.coordinates || createGeoPoint(48.8566, 2.3522), // Keep existing coordinates or use default
            components: components,
            complementaryAddress: complementaryAddress,
            additionalInstructions: additionalInstructions
        };

        // Update the display address
        setDisplayAddress(formattedAddress);

        // Send the updated address
        onAddressSelected(updatedAddress);
    };

    // Instead of embedding GooglePlacesAutocomplete directly in the scrollview,
    // we'll use a touchable input that opens a modal with the autocomplete
    return (
        <View className="mb-4">
            <Text className="text-white font-cabin-medium mb-2">{label}</Text>

            {/* Address Input Field (Touch to open modal) */}
            <TouchableOpacity
                className="bg-gray-800 flex-row items-center justify-between p-3 rounded-lg mb-2"
                onPress={() => setShowModal(true)}
            >
                <Text className="text-white">
                    {displayAddress || "Search for an address"}
                </Text>
                <View className="flex-row">
                    {displayAddress ? (
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                clearAddress();
                            }}
                            className="mr-2"
                        >
                            <Ionicons name="close-circle" size={24} color="#666" />
                        </TouchableOpacity>
                    ) : null}
                    <Ionicons name="search" size={24} color="#2EC3F5" />
                </View>
            </TouchableOpacity>

            {/* Selected Address Display */}
            {displayAddress ? (
                <View className="bg-gray-700 p-3 rounded-lg mb-3">
                    <Text className="text-white">{displayAddress}</Text>
                </View>
            ) : null}

            {/* Toggle for manual fields - only if no address is selected */}
            {!displayAddress && (
                <TouchableOpacity
                    className="flex-row items-center mb-3"
                    onPress={() => setShowManualFields(!showManualFields)}
                >
                    <Ionicons
                        name={showManualFields ? "chevron-down" : "chevron-forward"}
                        size={20}
                        color="#2EC3F5"
                    />
                    <Text className="text-primary ml-2">
                        {showManualFields ? "Hide manual fields" : "Enter address manually"}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Manual address fields - always show if an address is selected */}
            {showManualFields && (
                <View className="mb-4">
                    <Text className="text-white font-cabin-medium mb-2">Edit Address Details</Text>

                    <StyledTextInput
                        label="Street Number"
                        placeholder="Street number"
                        value={streetNumber}
                        onChangeText={(text) => {
                            setStreetNumber(text);
                            // Update when field changes
                            setTimeout(updateManualAddress, 100);
                        }}
                    />

                    <StyledTextInput
                        label="Street"
                        placeholder="Street name"
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
                                placeholder="City"
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
                                placeholder="Postal code"
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
                        placeholder="Country"
                        value={country}
                        onChangeText={(text) => {
                            setCountry(text);
                            setTimeout(updateManualAddress, 100);
                        }}
                    />

                    <StyledTextInput
                        label="Complementary Address"
                        placeholder="Apartment number, floor, interphone code, etc."
                        value={complementaryAddress}
                        onChangeText={onComplementaryAddressChange}
                    />

                    <StyledTextInput
                        label="Additional Instructions"
                        placeholder="Special instructions for the delivery agent"
                        multiline
                        numberOfLines={2}
                        value={additionalInstructions}
                        onChangeText={onAdditionalInstructionsChange}
                    />
                </View>
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
                    style={{ flex: 1, backgroundColor: '#09121A' }}
                >
                    <View className="flex-1 p-4">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-white text-lg font-cabin-medium">
                                Search for an address
                            </Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <GooglePlacesAutocomplete
                            ref={autocompleteRef}
                            placeholder="Enter address"
                            onPress={processGooglePlacesResult}
                            fetchDetails={true}
                            query={{
                                key: 'AIzaSyBmDRLS39EJf9I54k9lDGfu1hdumFZ7v0c',
                                language: 'fr',
                                components: 'country:fr', // Limit to France (or remove/change as needed)
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
                                },
                                predefinedPlacesDescription: {
                                    color: '#1faadb',
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

export default AddressAutocomplete;