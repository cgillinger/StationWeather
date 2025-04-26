# StationWeather Privacy Policy

## IMPORTANT NOTICE

**The developer of StationWeather does NOT collect, access, or process any of your personal data.** This extension operates entirely on your device and communicates only with the official weather station API service.

## Summary

- **No data is collected by the developer**
- **No analytics or telemetry is implemented**
- **All data is stored exclusively on your device**
- **This extension only communicates directly with the weather station API**

## Detailed Data Storage Information

StationWeather stores the following information **exclusively on your device**:

| Data Type | Purpose | Storage Location | Shared With |
|-----------|---------|------------------|-------------|
| API Credentials (Client ID, Client Secret, Refresh Token) | To authenticate with the weather station API | Browser's secure storage (chrome.storage.sync) | Only sent to the official weather station API for authentication |
| Display preferences (unit format, selected measurements, etc.) | To remember your display settings | Browser's secure storage (chrome.storage.sync) | Nobody - stored only on your device |
| Cached weather data | Temporary performance improvement | Browser's local storage (chrome.storage.local) | Nobody - stored only on your device |
| Temporary access tokens | For API communication | Browser's local storage (chrome.storage.local) | Nobody - stored only on your device |

## Developer Access to Your Data

The developer of StationWeather:
- Has **NO** access to any data stored on your device
- Does **NOT** collect telemetry, analytics, or usage statistics
- Cannot see your API credentials or weather data
- Has **NO** remote servers for data collection

## Third-Party Communication

StationWeather communicates **only** with the official weather station API service (api.netatmo.com) to retrieve your weather data. This communication happens directly from your browser to their servers.

This communication includes:
- Authentication requests (using your API credentials that you provided)
- Data retrieval requests for your weather station information

## Your Control Over Data

You have complete control over all data. You can:
- View all stored data by going to your browser's developer tools → Application → Storage → Extension Storage
- Delete all data by clicking "Clear Site Data" in browser settings, or by uninstalling the extension
- Modify your stored API credentials and preferences through the extension's settings

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the extension update and the updated policy will be available in the extension's repository.

## Contact

If you have any questions or concerns about this privacy policy or the extension's data practices, please contact the developer through the official extension repository or store listing.

*Last updated: April 25, 2025*