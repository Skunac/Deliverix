import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { Ionicons } from '@expo/vector-icons';
import StyledTextInput from '@/components/ui/StyledTextInput';
import { EmbeddedAddress } from '@/src/models/delivery.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import {generateFormattedAddress} from "@/utils/formatters/address-formatter";

interface ModernAddressInputProps {
    address: EmbeddedAddress | null;
    onAddressSelected: (address: EmbeddedAddress) => void;
    isDeliveryAddress?: boolean;
}

const ModernAddressInput = ({
                                address,
                                onAddressSelected,
                                isDeliveryAddress = true
                            }: ModernAddressInputProps) => {
    const [showModal, setShowModal] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [displayAddress, setDisplayAddress] = useState('');
    const expandAnimation = useRef(new Animated.Value(0)).current;
    const [isManuallyEdited, setIsManuallyEdited] = useState(false);

    // For manual editing of address components
    const [streetNumber, setStreetNumber] = useState('');
    const [route, setRoute] = useState('');
    const [locality, setLocality] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [complementaryAddress, setComplementaryAddress] = useState('');
    const [additionalInstructions, setAdditionalInstructions] = useState('');

    // Flag to prevent update loops
    const [isUpdatingFromProps, setIsUpdatingFromProps] = useState(false);
    const [skipNextPropsUpdate, setSkipNextPropsUpdate] = useState(false);

    // Helper function to create a GeoPoint
    const createGeoPoint = (lat: number, lng: number): FirebaseFirestoreTypes.GeoPoint => {
        return {
            latitude: lat,
            longitude: lng
        } as FirebaseFirestoreTypes.GeoPoint;
    };

    // Update all fields when address prop changes, but only if not manually edited
    useEffect(() => {
        if (skipNextPropsUpdate) {
            setSkipNextPropsUpdate(false);
            return;
        }

        if (isUpdatingFromProps) return;

        setIsUpdatingFromProps(true);

        try {
            // Update display address
            if (address?.formattedAddress) {
                setDisplayAddress(address.formattedAddress);
            } else if (address?.components) {
                const formattedAddress = generateFormattedAddress(address.components);
                if (formattedAddress) {
                    setDisplayAddress(formattedAddress);
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
        } finally {
            setIsUpdatingFromProps(false);
        }
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

        // Update local fields without triggering manual edit flag
        setIsUpdatingFromProps(true);
        setStreetNumber(components.street_number || '');
        setRoute(components.route || '');
        setLocality(components.locality || '');
        setPostalCode(components.postal_code || '');
        setCountry(components.country || '');
        setDisplayAddress(formatted_address);
        setIsManuallyEdited(false);
        setIsUpdatingFromProps(false);

        // Call the callback with the new address
        onAddressSelected(newAddress);
        setShowModal(false); // Close modal after selection
        setIsExpanded(true);  // Show details
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
        setIsManuallyEdited(false);

        // Create an empty address
        const emptyAddress: EmbeddedAddress = {
            placeId: 'manual-input',
            formattedAddress: '',
            coordinates: createGeoPoint(0, 0), // Default coordinates
            components: {},
            complementaryAddress: '',
            additionalInstructions: ''
        };

        onAddressSelected(emptyAddress);
        setIsExpanded(false);
    };

    // Function to handle field changes
    const handleFieldChange = (field: string, value: string) => {
        // Skip if we're currently updating from props
        if (isUpdatingFromProps) return;

        setIsManuallyEdited(true);

        // Update the relevant field
        switch (field) {
            case 'street_number':
                setStreetNumber(value);
                break;
            case 'route':
                setRoute(value);
                break;
            case 'locality':
                setLocality(value);
                break;
            case 'postal_code':
                setPostalCode(value);
                break;
            case 'country':
                setCountry(value);
                break;
            default:
                break;
        }

        // Immediately update the display address to keep in sync
        const updatedComponents = {
            street_number: field === 'street_number' ? value : streetNumber,
            route: field === 'route' ? value : route,
            locality: field === 'locality' ? value : locality,
            postal_code: field === 'postal_code' ? value : postalCode,
            country: field === 'country' ? value : country
        };

        const formattedAddress = generateFormattedAddress(updatedComponents);
        setDisplayAddress(formattedAddress);

        // Immediately update the address object
        updateManualAddress(field, value);
    };

    // Function to update address when manual fields change
    const updateManualAddress = (changedField?: string, newValue?: string) => {
        // Skip if we're currently updating from props
        if (isUpdatingFromProps) return;

        // Build components object with the updated field value if provided
        const components = {
            street_number: changedField === 'street_number' ? newValue! : streetNumber,
            route: changedField === 'route' ? newValue! : route,
            locality: changedField === 'locality' ? newValue! : locality,
            postal_code: changedField === 'postal_code' ? newValue! : postalCode,
            country: changedField === 'country' ? newValue! : country
        };

        // Create formatted address from components
        const formattedAddress = generateFormattedAddress(components);

        // Create updated address object, preserving coordinates if possible
        const updatedAddress: EmbeddedAddress = {
            placeId: isManuallyEdited ? 'manual-input' : (address?.placeId || 'manual-input'),
            formattedAddress: formattedAddress,
            coordinates: address?.coordinates || createGeoPoint(48.8592184, 2.3456696), // Keep existing coordinates or use default
            components: components,
            complementaryAddress: complementaryAddress,
            additionalInstructions: additionalInstructions
        };

        // Prevent the next props update from overriding our manual changes
        setSkipNextPropsUpdate(true);

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

            // Prevent the next props update from overriding our manual changes
            setSkipNextPropsUpdate(true);

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

            // Prevent the next props update from overriding our manual changes
            setSkipNextPropsUpdate(true);

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
                        {displayAddress ? "ADRESSE SÉLECTIONNÉE" : "RECHERCHER UNE ADRESSE"}
                    </Text>
                    <Text className="text-white font-cabin" numberOfLines={1}>
                        {displayAddress || "Appuyez pour rechercher une adresse"}
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
                            {isExpanded ? "Masquer les détails" : "Modifier les détails"}
                        </Text>
                    </TouchableOpacity>

                    <Animated.View style={{ maxHeight, opacity }}>
                        <View className="bg-dark p-4 rounded-lg border border-gray-700">
                            <StyledTextInput
                                label="Numéro"
                                placeholder="Entrez le numéro"
                                value={streetNumber}
                                onChangeText={(text) => handleFieldChange('street_number', text)}
                                darkBackground={true}
                            />

                            <StyledTextInput
                                label="Rue"
                                placeholder="Entrez le nom de la rue"
                                value={route}
                                onChangeText={(text) => handleFieldChange('route', text)}
                                darkBackground={true}
                            />

                            <View className="flex-row">
                                <View className="flex-1 mr-2">
                                    <StyledTextInput
                                        label="Ville"
                                        placeholder="Entrez la ville"
                                        value={locality}
                                        onChangeText={(text) => handleFieldChange('locality', text)}
                                        darkBackground={true}
                                    />
                                </View>
                                <View className="flex-1 ml-2">
                                    <StyledTextInput
                                        label="Code postal"
                                        placeholder="Entrez le code postal"
                                        value={postalCode}
                                        onChangeText={(text) => handleFieldChange('postal_code', text)}
                                        darkBackground={true}
                                    />
                                </View>
                            </View>

                            <StyledTextInput
                                label="Pays"
                                placeholder="Entrez le pays"
                                value={country}
                                onChangeText={(text) => handleFieldChange('country', text)}
                                darkBackground={true}
                            />
                            {isDeliveryAddress && (
                                <View>
                                    <StyledTextInput
                                        label="Complément d'adresse"
                                        placeholder="Appartement, étage, digicode, etc."
                                        value={complementaryAddress}
                                        onChangeText={handleComplementaryAddressChange}
                                        darkBackground={true}
                                    />

                                    <StyledTextInput
                                        label="Instructions supplémentaires"
                                        placeholder="Instructions spéciales pour le livreur"
                                        multiline
                                        numberOfLines={2}
                                        value={additionalInstructions}
                                        onChangeText={handleAdditionalInstructionsChange}
                                        darkBackground={true}
                                    />
                                </View>
                            )}
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
                        {isExpanded ? "Masquer la saisie manuelle" : "Saisir l'adresse manuellement"}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Manual Entry Fields - Show when expanded and no address */}
            {!displayAddress && (
                <Animated.View style={{ maxHeight, opacity }}>
                    {isExpanded && (
                        <View className="bg-dark p-4 rounded-lg border border-gray-700">
                            <StyledTextInput
                                label="Numéro"
                                placeholder="Entrez le numéro"
                                value={streetNumber}
                                onChangeText={(text) => handleFieldChange('street_number', text)}
                                darkBackground={true}
                            />

                            <StyledTextInput
                                label="Nom de la rue"
                                placeholder="Entrez le nom de la rue"
                                value={route}
                                onChangeText={(text) => handleFieldChange('route', text)}
                                darkBackground={true}
                            />

                            <View className="flex-row">
                                <View className="flex-1 mr-2">
                                    <StyledTextInput
                                        label="Ville"
                                        placeholder="Entrez la ville"
                                        value={locality}
                                        onChangeText={(text) => handleFieldChange('locality', text)}
                                        darkBackground={true}
                                    />
                                </View>
                                <View className="flex-1 ml-2">
                                    <StyledTextInput
                                        label="Code postal"
                                        placeholder="Entrez le code postal"
                                        value={postalCode}
                                        onChangeText={(text) => handleFieldChange('postal_code', text)}
                                        darkBackground={true}
                                    />
                                </View>
                            </View>

                            <StyledTextInput
                                label="Pays"
                                placeholder="Entrez le pays"
                                value={country}
                                onChangeText={(text) => handleFieldChange('country', text)}
                                darkBackground={true}
                            />

                            <StyledTextInput
                                label="Complément d'adresse"
                                placeholder="Appartement, étage, digicode, etc."
                                value={complementaryAddress}
                                onChangeText={handleComplementaryAddressChange}
                                darkBackground={true}
                            />

                            <StyledTextInput
                                label="Instructions supplémentaires"
                                placeholder="Instructions spéciales pour le livreur"
                                multiline
                                numberOfLines={2}
                                value={additionalInstructions}
                                onChangeText={handleAdditionalInstructionsChange}
                                darkBackground={true}
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
                                Rechercher une adresse
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowModal(false)}
                                className="p-2"
                            >
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        <GooglePlacesAutocomplete
                            placeholder="Entrez une adresse"
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
                                    backgroundColor: 'white',
                                    borderTopWidth: 0,
                                    borderBottomWidth: 0,
                                    borderRadius: 8,
                                    paddingHorizontal: 10,
                                },
                                textInput: {
                                    height: 50,
                                    color: 'black',
                                    fontSize: 16,
                                    backgroundColor: 'white',
                                    fontFamily: 'Cabin',
                                },
                                predefinedPlacesDescription: {
                                    color: '#5DD6FF',
                                },
                                listView: {
                                    backgroundColor: 'white',
                                    marginTop: 5,
                                    borderRadius: 8,
                                },
                                row: {
                                    backgroundColor: 'white',
                                    padding: 13,
                                    flexDirection: 'row',
                                },
                                separator: {
                                    height: 1,
                                    backgroundColor: '#e0e0e0',
                                },
                                description: {
                                    color: '#333',  // Dark color for light background
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