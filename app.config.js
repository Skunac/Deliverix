const { getDefaultConfig } = require('expo/metro-config');

module.exports = ({ config }) => {
    return {
        ...config,
        android: {
            ...config.android,
            googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
        },
        ios: {
            ...config.ios,
            googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
        },
        extra: {
            ...config.extra,
            environment: process.env.APP_ENV || 'development'
        },
    };
};