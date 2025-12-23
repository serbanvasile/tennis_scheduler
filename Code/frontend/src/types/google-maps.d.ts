// Google Maps JavaScript SDK type declarations for new Places API
// Using the modern importLibrary approach

declare namespace google {
    namespace maps {
        interface PlacesLibrary {
            AutocompleteSuggestion: any;
            Place: any;
        }

        function importLibrary(library: string): Promise<PlacesLibrary>;

        namespace places {
            enum PlacesServiceStatus {
                OK = 'OK',
            }
        }
    }
}
