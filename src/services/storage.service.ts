import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { firebaseStorage } from '@/src/firebase/config';

export class StorageService {
    /**
     * Uploads an image to Firebase Storage and returns the download URL
     * @param uri Local URI of the image
     * @param path Path in Storage (e.g., 'drivers/photos/')
     * @returns Promise with the download URL
     */
    async uploadImage(uri: string, path: string): Promise<string> {
        try {
            // Generate a unique filename with extension
            const fileName = `${uuidv4()}.jpg`;
            const fullPath = `${path}${fileName}`;

            // Create a reference in Firebase Storage
            const storageRef = firebaseStorage.ref(fullPath);

            // Android requires different handling of URIs
            let uploadUri = uri;
            if (Platform.OS === 'ios') {
                // On iOS, we can use the URI directly
                uploadUri = uri.replace('file://', '');
            }

            // Perform the upload
            await storageRef.putFile(uploadUri);

            // Get the download URL
            const downloadURL = await storageRef.getDownloadURL();

            console.log('Image uploaded successfully:', downloadURL);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    /**
     * Deletes an image from Firebase Storage
     * @param url Full URL of the image to delete
     */
    async deleteImage(url: string): Promise<void> {
        try {
            // Extract the path from the URL
            const path = this.getPathFromURL(url);

            if (!path) {
                console.warn('Invalid URL format, cannot delete image');
                return;
            }

            // Create a reference to the file
            const storageRef = firebaseStorage.ref(path);

            // Delete the file
            await storageRef.delete();
            console.log('Image deleted successfully');
        } catch (error) {
            console.error('Error deleting image:', error);
            throw error;
        }
    }

    /**
     * Extract the storage path from a Firebase Storage URL
     * @param url Firebase Storage URL
     * @returns Path or null if invalid URL
     */
    private getPathFromURL(url: string): string | null {
        try {
            // Firebase Storage URLs usually contain /o/ followed by the encoded path
            const regex = /firebase.*\.com\/o\/(.+)\?/;
            const match = url.match(regex);

            if (match && match[1]) {
                // Decode the URL component
                return decodeURIComponent(match[1]);
            }

            return null;
        } catch (error) {
            console.error('Error extracting path from URL:', error);
            return null;
        }
    }
}