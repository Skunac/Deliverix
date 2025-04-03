import { Platform } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import {firebaseStorage} from "@/src/firebase/config";

export class StorageService {
    /**
     * Télécharge une image sur Firebase Storage et retourne l'URL de téléchargement
     * @param uri URI local de l'image
     * @param path Chemin dans Storage (ex: 'drivers/photos/')
     * @returns Promise avec l'URL de téléchargement
     */
    async uploadImage(uri: string, path: string): Promise<string> {
        try {
            // Générer un nom de fichier unique avec extension
            const fileName = `${uuidv4()}.jpg`;
            const fullPath = `${path}${fileName}`;

            // Créer une référence dans Firebase Storage
            const storageRef = firebaseStorage.ref(fullPath);

            // Android nécessite un traitement différent des URIs
            let uploadUri = uri;
            if (Platform.OS === 'ios') {
                // Sur iOS, on peut utiliser l'URI directement
                uploadUri = uri.replace('file://', '');
            }

            // Effectuer le téléchargement
            await storageRef.putFile(uploadUri);

            // Obtenir l'URL de téléchargement
            const downloadURL = await storageRef.getDownloadURL();

            console.log('Image téléchargée avec succès:', downloadURL);
            return downloadURL;
        } catch (error) {
            console.error('Erreur lors du téléchargement de l\'image:', error);
            throw error;
        }
    }
}