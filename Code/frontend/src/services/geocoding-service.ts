import { debounce } from 'lodash';
import { API_CONFIG } from '../config/api';

export interface GeocodingResult {
    place_id: string;
    name: string;
    displayAddress: string;
    lat: string;
    lon: string;
    geocodedData?: any; // Full response from Google for storage
}

export const GeocodingService = {
    search: async (query: string): Promise<GeocodingResult[]> => {
        console.log('[GeocodingService] Search called with query:', query);

        if (!query || query.length < 3) {
            console.log('[GeocodingService] Query too short or empty, returning empty array');
            return [];
        }

        try {
            // Call our backend proxy to avoid CORS issues
            const url = API_CONFIG.url(`/geocode?q=${encodeURIComponent(query)}`);

            console.log('[GeocodingService] Calling backend proxy...');
            const response = await fetch(url);

            if (!response.ok) {
                console.error(`[GeocodingService] API error: ${response.status}`);
                return [];
            }

            const data = await response.json();
            console.log('[GeocodingService] API response:', data.status, data.results?.length || 0, 'results');

            if (data.status !== 'OK' || !data.results) {
                console.warn('[GeocodingService] No results:', data.status);
                return [];
            }

            // Map Google Places results to our interface
            return data.results.slice(0, 5).map((place: any) => ({
                place_id: place.place_id,
                name: place.name,
                displayAddress: place.formatted_address,
                lat: place.geometry.location.lat.toString(),
                lon: place.geometry.location.lng.toString(),
                geocodedData: place // Store full response for database
            }));

        } catch (error) {
            console.error('[GeocodingService] Search failed:', error);
            return [];
        }
    }
};

// Re-export debounce for UI to use
export { debounce };
