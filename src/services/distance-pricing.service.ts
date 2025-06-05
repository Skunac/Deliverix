import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface DistanceCalculationResult {
    trip1Distance: number; // Agent to pickup (km)
    trip2Distance: number; // Pickup to delivery (km)
    totalBillableDistance: number; // (trip1 * 2) + (trip2 * 2)
    estimatedDuration: number; // Total duration in minutes
    success: boolean;
    error?: string;
}

export interface PriceCalculationResult {
    basePrice: number;
    distancePrice: number;
    finalPrice: number;
    breakdown: {
        trip1Distance: number;
        trip2Distance: number;
        totalBillableDistance: number;
        pricePerKm: number;
    };
}

export class DistancePricingService {
    private apiKey: string;
    private basePrice: number = 5.00;
    private pricePerKm: number = 2.00;
    private minimumPrice: number = 8.00;

    constructor(apiKey: string = 'AIzaSyBmDRLS39EJf9I54k9lDGfu1hdumFZ7v0c') {
        this.apiKey = apiKey;
    }

    /**
     * Calculate distances using Google Distance Matrix API
     */
    async calculateDistances(
        agentLocation: FirebaseFirestoreTypes.GeoPoint,
        pickupLocation: FirebaseFirestoreTypes.GeoPoint,
        deliveryLocation: FirebaseFirestoreTypes.GeoPoint,
        trip1Enabled: boolean = true,
        trip2Enabled: boolean = true
    ): Promise<DistanceCalculationResult> {
        try {
            console.log('Calculating distances for pricing...');

            const origins1 = `${agentLocation.latitude},${agentLocation.longitude}`;
            const destinations1 = `${pickupLocation.latitude},${pickupLocation.longitude}`;

            const origins2 = `${pickupLocation.latitude},${pickupLocation.longitude}`;
            const destinations2 = `${deliveryLocation.latitude},${deliveryLocation.longitude}`;

            // First API call: Agent to Pickup
            const url1 = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins1}&destinations=${destinations1}&units=metric&mode=driving&key=${this.apiKey}`;

            // Second API call: Pickup to Delivery
            const url2 = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins2}&destinations=${destinations2}&units=metric&mode=driving&key=${this.apiKey}`;

            console.log('Making Distance Matrix API calls...');

            const [response1, response2] = await Promise.all([
                fetch(url1),
                fetch(url2)
            ]);

            if (!response1.ok || !response2.ok) {
                throw new Error(`HTTP Error: ${response1.status} or ${response2.status}`);
            }

            const [data1, data2] = await Promise.all([
                response1.json(),
                response2.json()
            ]);

            console.log('API Response 1 (Agent to Pickup):', data1);
            console.log('API Response 2 (Pickup to Delivery):', data2);

            // Validate responses
            if (data1.status !== 'OK' || data2.status !== 'OK') {
                throw new Error(`API Error: ${data1.status} / ${data2.status}`);
            }

            const element1 = data1.rows[0]?.elements[0];
            const element2 = data2.rows[0]?.elements[0];

            if (!element1 || !element2) {
                throw new Error('No route data returned from API');
            }

            if (element1.status !== 'OK' || element2.status !== 'OK') {
                throw new Error(`Route calculation failed: ${element1.status} / ${element2.status}`);
            }

            // Extract distances (convert from meters to kilometers)
            const trip1Distance = element1.distance.value / 1000; // Agent to Pickup
            const trip2Distance = element2.distance.value / 1000; // Pickup to Delivery

            // Calculate total billable distance: (trip1 * 2) + (trip2 * 2)
            const totalBillableDistance = trip1Distance + trip2Distance;

            // Extract durations (in seconds, convert to minutes)
            const duration1 = element1.duration.value / 60;
            const duration2 = element2.duration.value / 60;
            const estimatedDuration = duration1 + duration2;

            console.log(`Trip 1 (Agent to Pickup): ${trip1Distance.toFixed(2)}km`);
            console.log(`Trip 2 (Pickup to Delivery): ${trip2Distance.toFixed(2)}km`);
            console.log(`Total billable distance: ${totalBillableDistance.toFixed(2)}km`);
            console.log(`Estimated duration: ${estimatedDuration.toFixed(0)} minutes`);

            return {
                trip1Distance,
                trip2Distance,
                totalBillableDistance,
                estimatedDuration,
                success: true
            };

        } catch (error) {
            console.error('Error calculating distances:', error);
            return {
                trip1Distance: 0,
                trip2Distance: 0,
                totalBillableDistance: 0,
                estimatedDuration: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Calculate price based on distances
     */
    calculatePrice(distanceResult: DistanceCalculationResult): PriceCalculationResult {
        if (!distanceResult.success) {
            // Fallback to minimum price if distance calculation failed
            return {
                basePrice: this.basePrice,
                distancePrice: 0,
                finalPrice: this.minimumPrice,
                breakdown: {
                    trip1Distance: 0,
                    trip2Distance: 0,
                    totalBillableDistance: 0,
                    pricePerKm: this.pricePerKm
                }
            };
        }

        const distancePrice = distanceResult.totalBillableDistance * this.pricePerKm;
        const totalPrice = this.basePrice + distancePrice;

        // Apply minimum price
        const finalPrice = Math.max(totalPrice, this.minimumPrice);

        return {
            basePrice: this.basePrice,
            distancePrice,
            finalPrice,
            breakdown: {
                trip1Distance: distanceResult.trip1Distance,
                trip2Distance: distanceResult.trip2Distance,
                totalBillableDistance: distanceResult.totalBillableDistance,
                pricePerKm: this.pricePerKm
            }
        };
    }

    /**
     * Calculate price for a delivery with agent location
     */
    async calculateDeliveryPrice(
        agentLocation: FirebaseFirestoreTypes.GeoPoint,
        pickupLocation: FirebaseFirestoreTypes.GeoPoint,
        deliveryLocation: FirebaseFirestoreTypes.GeoPoint
    ): Promise<PriceCalculationResult> {
        const distanceResult = await this.calculateDistances(
            agentLocation,
            pickupLocation,
            deliveryLocation
        );

        return this.calculatePrice(distanceResult);
    }

    /**
     * Format price for display
     */
    formatPrice(price: number): string {
        return `€${price.toFixed(2)}`;
    }

    /**
     * Get pricing configuration
     */
    getPricingConfig() {
        return {
            basePrice: this.basePrice,
            pricePerKm: this.pricePerKm,
            minimumPrice: this.minimumPrice
        };
    }

    /**
     * Update pricing configuration
     */
    updatePricingConfig(config: {
        basePrice?: number;
        pricePerKm?: number;
        minimumPrice?: number;
    }) {
        if (config.basePrice !== undefined) this.basePrice = config.basePrice;
        if (config.pricePerKm !== undefined) this.pricePerKm = config.pricePerKm;
        if (config.minimumPrice !== undefined) this.minimumPrice = config.minimumPrice;
    }
}

// Export singleton instance
export const distancePricingService = new DistancePricingService();