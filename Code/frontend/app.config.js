// Dynamic Expo configuration
// This file reads environment variables at bundle time

module.exports = ({ config }) => {
    // Read API host from environment, default to localhost
    const apiHost = process.env.EXPO_PUBLIC_API_HOST || 'localhost';
    const apiPort = process.env.EXPO_PUBLIC_API_PORT || '3001';

    console.log(`[app.config.js] API_HOST=${apiHost}, API_PORT=${apiPort}`);

    return {
        ...config,
        name: "Team Sports",
        slug: "tennis-scheduler-expo-starter",
        version: "0.1.1",
        platforms: ["ios", "android", "web"],
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        splash: {
            image: "./assets/splash.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        assetBundlePatterns: ["**/*"],
        ios: {
            supportsTablet: true
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#ffffff"
            }
        },
        web: {
            favicon: "./assets/favicon.png"
        },
        // Extra config available via Constants.expoConfig.extra
        extra: {
            apiHost,
            apiPort,
            apiBaseUrl: `http://${apiHost}:${apiPort}/api`
        }
    };
};
