// app.config.js — dynamic config that injects secrets from env vars
// The static app.json is the base; values here override / extend it.
const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      googleMaps: { apiKey: mapsKey },
    },
  },
  ios: {
    ...config.ios,
    config: {
      googleMapsApiKey: mapsKey,
    },
  },
});
