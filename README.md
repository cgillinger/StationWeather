# Netatmo Weather Edge Extension

A Microsoft Edge extension to display information from your Netatmo weather station directly in your browser.

## Features

- View real-time weather data from your Netatmo weather station
- Supports all Netatmo module types: main station, indoor, outdoor, rain, and wind modules
- Displays temperature, humidity, CO2 levels, pressure, wind, and rain data
- Quick glance at current conditions via the extension popup
- Customize which measurements are displayed
- Visual indicators for CO2 quality levels
- Battery and signal strength monitoring for each module
- Automatic data updates in the background

## Installation

You can install this extension from the Microsoft Edge Add-ons store:

1. Visit the [Edge Add-ons Store](https://microsoftedge.microsoft.com/addons)
2. Search for "Netatmo Weather"
3. Click "Add to Edge"

## Setup

After installation, you need to connect the extension to your Netatmo account:

1. Create an application in the [Netatmo Developer Portal](https://dev.netatmo.com/apps)
2. Generate a token with the `read_station` scope
3. Copy your Client ID, Client Secret, and the refresh token to the extension settings

### Detailed Setup Instructions

1. **Create a Netatmo application**:
   - Go to the [Netatmo Developer Portal](https://dev.netatmo.com/apps)
   - Sign in with your Netatmo account
   - Click "Create" to create a new application
   - Fill in the required information (name, description, etc.)
   - For the redirect URI, you can use `https://example.com` (it's not used by the extension)

2. **Generate a refresh token**:
   - In your application page, scroll down to "Token Generator"
   - Select the `read_station` scope
   - Click "Generate Token"
   - After authorizing your app, you'll receive a refresh token

3. **Configure the extension**:
   - Click on the extension icon in the browser toolbar
   - Click the gear icon to open settings
   - Enter your Client ID, Client Secret, and refresh token
   - Click "Save Settings"

## Usage

- Click the extension icon in your browser toolbar to see the current weather data
- The badge on the icon shows the current outdoor temperature (if available)
- Data is automatically updated at the interval you set in the settings (default is every 3 minutes)
- To manually refresh the data, click the refresh button in the popup

## Privacy

This extension only communicates with the Netatmo API. Your API credentials are stored locally in your browser's secure storage and are never sent to any third-party servers.

## Attribution

This extension is based on the [MMM-Netatmo](https://github.com/CFenner/MMM-Netatmo) module for MagicMirror² by Christopher Fenner. The original code is used under the MIT License.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
