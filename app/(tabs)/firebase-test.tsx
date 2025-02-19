import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { testCollection, firestoreService, Collections } from '@/services/firebase/firestore';
import { router } from 'expo-router';
import { useAuth } from "@/contexts/authContext";

export default function FirebaseTestPage() {
    // Auth state
    const { user, login, register, logout, error: authError } = useAuth();

    // Log when the component renders
    useEffect(() => {
        console.log("FirebaseTestPage rendered, auth state:", {
            isAuthenticated: !!user,
            userId: user?.uid,
            authError
        });
    }, [user, authError]);

    // Test states
    const [firestoreResult, setFirestoreResult] = useState<string>('');
    const [firestoreError, setFirestoreError] = useState<string | null>(null);

    // Form states
    const [email, setEmail] = useState<string>('test@example.com');
    const [password, setPassword] = useState<string>('password123');
    const [displayName, setDisplayName] = useState<string>('Test User');
    const [testMessage, setTestMessage] = useState<string>('Hello from test!');

    // Clear results
    const clearResults = () => {
        setFirestoreResult('');
        setFirestoreError(null);
    };

    // Test: Create document
    const testCreateDocument = async () => {
        clearResults();
        try {
            console.log("Testing document creation:", testMessage);
            const docId = await testCollection.add(testMessage);
            console.log("Document created:", docId);
            setFirestoreResult(`Document created with ID: ${docId}`);
        } catch (error) {
            console.error("Document creation error:", error);
            setFirestoreError(`Error creating document: ${(error as Error).message}`);
        }
    };

    // Test: Fetch latest document
    const testFetchLatest = async () => {
        clearResults();
        try {
            console.log("Fetching latest document");
            const doc = await testCollection.getLatest();
            if (doc) {
                console.log("Document found:", doc.id);
                setFirestoreResult(`Latest document: ${JSON.stringify(doc, null, 2)}`);
            } else {
                console.log("No documents found");
                setFirestoreResult('No documents found');
            }
        } catch (error) {
            console.error("Fetch document error:", error);
            setFirestoreError(`Error fetching document: ${(error as Error).message}`);
        }
    };

    // Test: Query documents
    const testQueryDocuments = async () => {
        clearResults();
        try {
            console.log("Querying documents");
            const docs = await firestoreService.queryDocuments(
                Collections.TEST,
                [],
                'timestamp',
                'desc',
                5
            );
            console.log(`Found ${docs.length} documents`);
            setFirestoreResult(`Found ${docs.length} documents:\n${JSON.stringify(docs, null, 2)}`);
        } catch (error) {
            console.error("Query documents error:", error);
            setFirestoreError(`Error querying documents: ${(error as Error).message}`);
        }
    };

    // Test: Register user
    const testRegister = async () => {
        clearResults();
        try {
            console.log(`Registering user: ${email}`);
            await register(email, password, displayName);
            console.log("Registration successful");
            setFirestoreResult('User registered successfully');
        } catch (error) {
            console.error("Registration error:", error);
            setFirestoreError(`Error registering user: ${(error as Error).message}`);
        }
    };

    // Test: Login user
    const testLogin = async () => {
        clearResults();
        try {
            console.log(`Logging in user: ${email}`);
            await login(email, password);
            console.log("Login successful");
            setFirestoreResult('User logged in successfully');
        } catch (error) {
            console.error("Login error:", error);
            setFirestoreError(`Error logging in: ${(error as Error).message}`);
        }
    };

    // Test: Logout user
    const testLogout = async () => {
        clearResults();
        try {
            console.log("Logging out user");
            await logout();
            console.log("Logout successful");
            setFirestoreResult('User logged out successfully');
        } catch (error) {
            console.error("Logout error:", error);
            setFirestoreError(`Error logging out: ${(error as Error).message}`);
        }
    };

    return (
        <ScrollView className="flex-1 bg-gray-50 p-4">
            {/* Auth Status */}
            <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <Text className="text-lg font-bold mb-2">Auth Status</Text>
                {user ? (
                    <View>
                        <Text className="text-green-600">✓ Authenticated</Text>
                        <Text>User ID: {user.uid}</Text>
                        <Text>Email: {user.email}</Text>
                        <Text>Display Name: {user.displayName || 'Not set'}</Text>
                    </View>
                ) : (
                    <Text className="text-yellow-600">Not authenticated</Text>
                )}
            </View>

            {/* Auth Form */}
            <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <Text className="text-lg font-bold mb-2">Auth Test</Text>
                <TextInput
                    className="border border-gray-300 rounded-md p-2 mb-2"
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <TextInput
                    className="border border-gray-300 rounded-md p-2 mb-2"
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                <TextInput
                    className="border border-gray-300 rounded-md p-2 mb-4"
                    placeholder="Display Name"
                    value={displayName}
                    onChangeText={setDisplayName}
                />

                <View className="flex-row mb-2">
                    <TouchableOpacity
                        className="bg-blue-500 px-4 py-2 rounded-md flex-1 mr-2"
                        onPress={testRegister}
                    >
                        <Text className="text-white text-center">Register</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="bg-green-500 px-4 py-2 rounded-md flex-1"
                        onPress={testLogin}
                    >
                        <Text className="text-white text-center">Login</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className="bg-red-500 px-4 py-2 rounded-md"
                    onPress={testLogout}
                >
                    <Text className="text-white text-center">Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Firestore Test */}
            <View className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <Text className="text-lg font-bold mb-2">Firestore Test</Text>
                <TextInput
                    className="border border-gray-300 rounded-md p-2 mb-4"
                    placeholder="Test message"
                    value={testMessage}
                    onChangeText={setTestMessage}
                />

                <View className="flex-row mb-2">
                    <TouchableOpacity
                        className="bg-blue-500 px-4 py-2 rounded-md flex-1 mr-2"
                        onPress={testCreateDocument}
                    >
                        <Text className="text-white text-center">Create Document</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="bg-purple-500 px-4 py-2 rounded-md flex-1"
                        onPress={testFetchLatest}
                    >
                        <Text className="text-white text-center">Fetch Latest</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className="bg-indigo-500 px-4 py-2 rounded-md mb-2"
                    onPress={testQueryDocuments}
                >
                    <Text className="text-white text-center">Query Documents (Last 5)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="bg-gray-500 px-4 py-2 rounded-md"
                    onPress={clearResults}
                >
                    <Text className="text-white text-center">Clear Results</Text>
                </TouchableOpacity>
            </View>

            {/* Results */}
            <View className="p-4 bg-white rounded-lg shadow-sm">
                <Text className="text-lg font-bold mb-2">Results</Text>

                {authError && (
                    <View className="mb-4 p-3 bg-red-100 rounded-md">
                        <Text className="text-red-700">{authError}</Text>
                    </View>
                )}

                {firestoreError && (
                    <View className="mb-4 p-3 bg-red-100 rounded-md">
                        <Text className="text-red-700">{firestoreError}</Text>
                    </View>
                )}

                {firestoreResult && (
                    <View className="p-3 bg-blue-50 rounded-md">
                        <Text className="text-blue-800" selectable>{firestoreResult}</Text>
                    </View>
                )}
            </View>

            {/* Navigation */}
            <View className="mt-6 items-center mb-8">
                <TouchableOpacity
                    className="bg-gray-200 px-6 py-3 rounded-md"
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text>Back to Home</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}