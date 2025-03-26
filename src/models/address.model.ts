import { FirestoreDocument } from './common.model';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface AddressComponent {
    street_number?: string;
    route?: string;
    locality?: string;
    administrative_area_level_1?: string;
    country?: string;
    postal_code?: string;
}

export interface Address extends FirestoreDocument {
    placeId: string;
    formattedAddress: string;
    label?: string;
    coordinates: FirebaseFirestoreTypes.GeoPoint;
    additionalInstructions?: string;
    isDefault?: boolean;
    components: AddressComponent;
    userId: string;
}
