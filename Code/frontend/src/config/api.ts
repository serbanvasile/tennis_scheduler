/**
 * API Configuration
 * 
 * For mobile device testing, set the EXPO_PUBLIC_API_HOST environment variable
 * before starting Expo:
 * 
 * Example: set EXPO_PUBLIC_API_HOST=192.168.1.100 && npm run restart
 * 
 * The value is read by app.config.js and injected into Constants.expoConfig.extra
 */

import Constants from 'expo-constants';

// Get API config from Expo's extra config (set at bundle time in app.config.js)
const extra = Constants.expoConfig?.extra || {};

const API_HOST = extra.apiHost || 'localhost';
const API_PORT = extra.apiPort || '3001';

// Log the API URL on startup for debugging
console.log(`[API Config] Using API at http://${API_HOST}:${API_PORT}`);

export const API_CONFIG = {
    HOST: API_HOST,
    PORT: API_PORT,
    BASE_URL: `http://${API_HOST}:${API_PORT}/api`,
    // Helper to get full URL for an endpoint
    url: (endpoint: string) => `http://${API_HOST}:${API_PORT}/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
};

export default API_CONFIG;

