import {StorageService} from "@/src/services/storage.service";

const storageService = new StorageService();

/**
 * Télécharge toutes les images du formulaire sur Firebase Storage
 * @param formData Données du formulaire contenant les URIs des images
 * @param userId ID de l'utilisateur pour organiser les chemins
 * @returns Promise avec les données mises à jour avec les URLs Firebase
 */
export const uploadFormImages = async (formData: any, userId: string) => {
    try {
        // Créer les dossiers dans Firebase Storage
        const idPhotoPath = `users/${userId}/documents/identity/`;
        const profilePhotoPath = `users/${userId}/profile/`;
        const licensePath = `users/${userId}/documents/license/`;
        const vehiclePath = `users/${userId}/documents/vehicle/`;
        const insurancePath = `users/${userId}/documents/insurance/`;
        const kbisPath = `users/${userId}/documents/business/`;
        const certificatePath = `users/${userId}/documents/certificates/`;

        // Liste des téléchargements à effectuer
        const uploads = [];

        // Récolter toutes les tâches de téléchargement

        // Photo de profil
        if (formData.profilePhoto) {
            const profileUrl = storageService.uploadImage(formData.profilePhoto, profilePhotoPath);
            uploads.push(profileUrl.then(url => ({ field: 'profilePhoto', url })));
        }

        // Pièce d'identité
        if (formData.idPhoto) {
            const idUrl = storageService.uploadImage(formData.idPhoto, idPhotoPath);
            uploads.push(idUrl.then(url => ({ field: 'idPhoto', url })));
        }

        // Permis de conduire
        if (formData.licensePhoto) {
            const licenseUrl = storageService.uploadImage(formData.licensePhoto, licensePath);
            uploads.push(licenseUrl.then(url => ({ field: 'licensePhoto', url })));
        }

        // Carte grise
        if (formData.vehicleRegistrationPhoto) {
            const regUrl = storageService.uploadImage(formData.vehicleRegistrationPhoto, vehiclePath);
            uploads.push(regUrl.then(url => ({ field: 'vehicleRegistrationPhoto', url })));
        }

        // Assurance véhicule
        if (formData.vehicleInsurancePhoto) {
            const vInsUrl = storageService.uploadImage(formData.vehicleInsurancePhoto, insurancePath);
            uploads.push(vInsUrl.then(url => ({ field: 'vehicleInsurancePhoto', url })));
        }

        // Assurance professionnelle
        if (formData.professionalInsurancePhoto) {
            const pInsUrl = storageService.uploadImage(formData.professionalInsurancePhoto, insurancePath);
            uploads.push(pInsUrl.then(url => ({ field: 'professionalInsurancePhoto', url })));
        }

        // Photo Kbis/SIRENE
        if (formData.kbisPhoto) {
            const kbisUrl = storageService.uploadImage(formData.kbisPhoto, kbisPath);
            uploads.push(kbisUrl.then(url => ({ field: 'kbisPhoto', url })));
        }

        // Certificat de transport (optionnel)
        if (formData.transportCertificatePhoto) {
            const certUrl = storageService.uploadImage(formData.transportCertificatePhoto, certificatePath);
            uploads.push(certUrl.then(url => ({ field: 'transportCertificatePhoto', url })));
        }

        // Justificatif de formation (optionnel)
        if (formData.trainingRegistrationPhoto) {
            const trainUrl = storageService.uploadImage(formData.trainingRegistrationPhoto, certificatePath);
            uploads.push(trainUrl.then(url => ({ field: 'trainingRegistrationPhoto', url })));
        }

        // Attendre que tous les téléchargements soient terminés
        const results = await Promise.all(uploads);

        // Créer une copie des données du formulaire
        const updatedFormData = { ...formData };

        // Remplacer les URI locaux par les URLs Firebase
        results.forEach(result => {
            updatedFormData[result.field] = result.url;
        });

        return updatedFormData;
    } catch (error) {
        console.error('Erreur lors du téléchargement des images:', error);
        throw error;
    }
};