import { debounce } from 'lodash';

// Google Maps API key (same one used in backend)
// Can be restricted by domain (for web) or package name (for iOS/Android) in Google Cloud Console
const GOOGLE_MAPS_API_KEY = 'AIzaSyAqOnn8hRcEuC9N1AV0Oq7xxaFO6T3O2yM';

export interface GeocodingResult {
    place_id: string;
    name: string;
    displayAddress: string;
    lat: string;
    lon: string;
    geocodedData?: any; // Full response from Google for storage
}

// Load Google Maps JavaScript SDK dynamically
let googleMapsLoaded = false;
let googleMapsLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
    if (googleMapsLoaded) {
        return Promise.resolve();
    }

    if (googleMapsLoadPromise) {
        return googleMapsLoadPromise;
    }

    googleMapsLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        // Added loading=async to prevent performance warning
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            // Wait for google.maps.places to be available
            const checkPlacesReady = () => {
                if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                    googleMapsLoaded = true;
                    resolve();
                } else {
                    setTimeout(checkPlacesReady, 100);
                }
            };
            checkPlacesReady();
        };
        script.onerror = () => reject(new Error('Failed to load Google Maps script'));
        document.head.appendChild(script);
    });

    return googleMapsLoadPromise;
}

export const GeocodingService = {
    search: async (query: string): Promise<GeocodingResult[]> => {
        console.log('[GeocodingService] Search called with query:', query);

        if (!query || query.length < 3) {
            console.log('[GeocodingService] Query too short or empty, returning empty array');
            return [];
        }

        try {
            // Load Google Maps SDK if not already loaded
            await loadGoogleMapsScript();

            // Use new AutocompleteSuggestion API (recommended over deprecated AutocompleteService)
            const { AutocompleteSuggestion } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;

            const request = {
                input: query,
                includedPrimaryTypes: ['establishment', 'street_address', 'premise'],
            };

            // Get suggestions
            const suggestions = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

            if (!suggestions || !suggestions.suggestions || suggestions.suggestions.length === 0) {
                console.warn('[GeocodingService] No results');
                return [];
            }

            // Convert suggestions to Place objects and get details
            const results: GeocodingResult[] = [];

            for (const suggestion of suggestions.suggestions.slice(0, 5)) {
                try {
                    // Convert to Place object to get full details
                    const place = suggestion.placePrediction?.toPlace();

                    if (place) {
                        // Fetch basic place details
                        await place.fetchFields({
                            fields: ['displayName', 'formattedAddress', 'location', 'id'],
                        });

                        const location = place.location;

                        results.push({
                            place_id: place.id || '',
                            name: place.displayName || suggestion.placePrediction?.text?.text || '',
                            displayAddress: place.formattedAddress || suggestion.placePrediction?.text?.text || '',
                            lat: location?.lat()?.toString() || '',
                            lon: location?.lng()?.toString() || '',
                            geocodedData: {
                                place_id: place.id,
                                name: place.displayName,
                                formatted_address: place.formattedAddress,
                                geometry: {
                                    location: {
                                        lat: location?.lat(),
                                        lng: location?.lng(),
                                    }
                                }
                            },
                        });
                    }
                } catch (err) {
                    console.warn('[GeocodingService] Error fetching place details:', err);
                }
            }

            console.log('[GeocodingService] Returning', results.length, 'results');
            return results;

        } catch (error) {
            console.error('[GeocodingService] Search failed:', error);
            return [];
        }
    }
};

// Re-export debounce for UI to use
export { debounce };
