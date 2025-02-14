import { Text, View, Button } from "react-native";
import { useState } from "react";
import firestore from '@react-native-firebase/firestore';

function Index() {
    const [testData, setTestData] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const addTestDocument = async () => {
        try {
            // Using the React Native Firebase API directly
            const docRef = await firestore()
                .collection('test')
                .add({
                    message: 'Hello from React Native!',
                    timestamp: firestore.FieldValue.serverTimestamp()
                });

            setTestData('Document written with ID: ' + docRef.id);
            setError(null);
        } catch (e) {
            setError('Error adding document: ' + (e as Error).message);
        }
    };

    const fetchTestData = async () => {
        try {
            const querySnapshot = await firestore()
                .collection('test')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                setTestData(`Latest message: ${doc.data().message}`);
            } else {
                setTestData('No documents found');
            }
            setError(null);
        } catch (e) {
            setError('Error fetching data: ' + (e as Error).message);
        }
    };

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                gap: 20
            }}
        >
            <Button
                title="Add Test Document"
                onPress={addTestDocument}
            />

            <Button
                title="Fetch Latest Document"
                onPress={fetchTestData}
            />

            {testData && (
                <Text style={{ marginTop: 10 }}>
                    {testData}
                </Text>
            )}

            {error && (
                <Text style={{ color: 'red', marginTop: 10 }}>
                    {error}
                </Text>
            )}
        </View>
    );
}

export default Index;