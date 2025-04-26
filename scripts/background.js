/**
 * StationWeather Browser Extension
 * Background Script - Handles API communication and data updates
 * 
 * Based on the MagicMirror module by Christopher Fenner
 * https://github.com/CFenner/MMM-Netatmo
 */

import { fetchWeatherData, refreshAccessToken, testAuthentication } from './api.js';
import { processMeasurements, getDefaultSettings } from './utils.js';
import { initTranslations } from './translations.js';

// Default settings
const DEFAULT_UPDATE_INTERVAL = 3; // minutes
let currentLanguage = 'en';

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('StationWeather extension installed');
  
  // Set default settings if not already set
  const settings = await chrome.storage.sync.get('settings');
  if (!settings.settings) {
    // Try to detect browser language
    const browserLanguage = navigator.language.split('-')[0];
    const supportedLanguages = ['en', 'sv', 'da', 'nb', 'fi', 'is', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ar', 'hi', 'it', 'pl', 'nl', 'uk'];
    const defaultLanguage = supportedLanguages.includes(browserLanguage) ? browserLanguage : 'en';
    
    // Set default language based on browser language
    await chrome.storage.sync.set({ 
      settings: {
        ...getDefaultSettings(),
        language: defaultLanguage
      }
    });
    
    currentLanguage = defaultLanguage;
  } else if (settings.settings.language) {
    currentLanguage = settings.settings.language;
  }
  
  // Initialize translations system
  await initTranslations(currentLanguage);
  
  // Create alarm for data updates
  setupUpdateAlarm();
});

// Listen for alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'weatherUpdate') {
    await updateWeatherData();
  }
});

// Handle messages from popup and options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getNetatmoData') {
    // Return cached data immediately
    chrome.storage.local.get(['weatherData', 'rawWeatherData'], async (data) => {
      // Get current settings
      const { settings } = await chrome.storage.sync.get('settings');
      
      // If we have raw data, process it with current settings to ensure correct units
      if (data.rawWeatherData) {
        const processedData = processMeasurements(data.rawWeatherData, settings || getDefaultSettings());
        sendResponse({ data: processedData || null });
      } else {
        sendResponse({ data: data.weatherData || null });
      }
    });
    
    // Then update if necessary
    updateWeatherDataIfNeeded();
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'forceUpdate') {
    updateWeatherData().then((data) => {
      sendResponse({ success: true, data });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'saveSettings') {
    saveSettings(message.settings).then(() => {
      sendResponse({ success: true });
      setupUpdateAlarm(); // Update alarm with new interval
      updateWeatherData(); // Fetch new data with new settings
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'testAuthentication') {
    const { authData } = message;
    testAuthentication(authData).then((result) => {
      sendResponse(result);
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'getLanguage') {
    chrome.storage.sync.get('settings', (data) => {
      if (data.settings && data.settings.language) {
        sendResponse({ language: data.settings.language });
      } else {
        // Default to browser language
        const browserLanguage = navigator.language.split('-')[0];
        const supportedLanguages = ['en', 'sv', 'da', 'nb', 'fi', 'is', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ar', 'hi', 'it', 'pl', 'nl', 'uk'];
        const defaultLanguage = supportedLanguages.includes(browserLanguage) ? browserLanguage : 'en';
        sendResponse({ language: defaultLanguage });
      }
    });
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'languageChanged') {
    const { language } = message;
    if (language) {
      currentLanguage = language;
      initTranslations(language).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    }
    return true; // Keep channel open for async response
  }
});

/**
 * Setup the alarm for periodic updates
 */
async function setupUpdateAlarm() {
  // Clear any existing alarms
  await chrome.alarms.clear('weatherUpdate');
  
  // Get update interval from settings
  const { settings } = await chrome.storage.sync.get('settings');
  const interval = settings?.updateInterval || DEFAULT_UPDATE_INTERVAL;
  
  // Create new alarm
  chrome.alarms.create('weatherUpdate', {
    periodInMinutes: interval
  });
  
  console.log(`Weather update alarm set for every ${interval} minutes`);
}

/**
 * Update data if it's stale or doesn't exist
 */
async function updateWeatherDataIfNeeded() {
  const { weatherData, lastUpdate } = await chrome.storage.local.get(['weatherData', 'lastUpdate']);
  
  // Update if no data or data is older than the update interval
  if (!weatherData || !lastUpdate) {
    await updateWeatherData();
    return;
  }
  
  const { settings } = await chrome.storage.sync.get('settings');
  const interval = settings?.updateInterval || DEFAULT_UPDATE_INTERVAL;
  const now = Date.now();
  const updateThreshold = interval * 60 * 1000; // Convert minutes to milliseconds
  
  if (now - lastUpdate > updateThreshold) {
    await updateWeatherData();
  }
}

/**
 * Fetch new data from weather API and store it
 */
async function updateWeatherData() {
  console.log('Updating weather data...');
  
  try {
    // Get auth details
    const { settings } = await chrome.storage.sync.get('settings');
    if (!settings || !settings.clientId || !settings.clientSecret || !settings.refreshToken) {
      console.error('Missing authentication credentials');
      await chrome.storage.local.set({ 
        weatherError: 'Missing authentication credentials',
        lastErrorTime: Date.now()
      });
      return null;
    }
    
    // Check if we need to refresh the access token
    await refreshTokenIfNeeded(settings);
    
    // Get access token
    const { accessToken } = await chrome.storage.local.get('accessToken');
    if (!accessToken) {
      throw new Error('No access token available');
    }
    
    // Fetch data from API
    const rawData = await fetchWeatherData(accessToken);
    
    // Store the raw data for future use
    await chrome.storage.local.set({
      rawWeatherData: rawData,
      lastUpdate: Date.now(),
      weatherError: null
    });
    
    // Process data for display
    const processedData = processMeasurements(rawData, settings);
    
    await chrome.storage.local.set({
      weatherData: processedData
    });
    
    // Update extension badge
    updateBadge(rawData, settings);
    
    console.log('Weather data updated successfully');
    return processedData;
    
  } catch (error) {
    console.error('Error updating weather data:', error);
    await chrome.storage.local.set({ 
      weatherError: error.message,
      lastErrorTime: Date.now()
    });
    return null;
  }
}

/**
 * Refresh access token if needed
 */
async function refreshTokenIfNeeded(settings) {
  const { accessToken, tokenExpires } = await chrome.storage.local.get(['accessToken', 'tokenExpires']);
  
  // Refresh if no token or token is about to expire (within 5 minutes)
  const shouldRefresh = !accessToken || !tokenExpires || Date.now() > (tokenExpires - 5 * 60 * 1000);
  
  if (shouldRefresh) {
    console.log('Refreshing access token...');
    try {
      const tokenData = await refreshAccessToken(settings.clientId, settings.clientSecret, settings.refreshToken);
      
      await chrome.storage.local.set({
        accessToken: tokenData.access_token,
        tokenExpires: Date.now() + (tokenData.expires_in * 1000),
        refreshToken: tokenData.refresh_token || settings.refreshToken // Update refresh token if provided
      });
      
      // Also update the refresh token in sync settings if it changed
      if (tokenData.refresh_token && tokenData.refresh_token !== settings.refreshToken) {
        await chrome.storage.sync.set({
          settings: {
            ...settings,
            refreshToken: tokenData.refresh_token
          }
        });
      }
      
      console.log('Access token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh access token: ' + error.message);
    }
  }
}

/**
 * Update the extension badge with current information
 */
function updateBadge(data, settings) {
  if (!data || !data.devices || data.devices.length === 0) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  
  // Hitta utomhusmodulen
  let outdoorTemp = null;
  
  // Leta igenom alla enheter och moduler
  for (const device of data.devices) {
    // Sök efter outdoor-moduler först (NAModule1)
    if (device.modules && Array.isArray(device.modules)) {
      const outdoorModule = device.modules.find(m => 
        m.type === 'NAModule1' && m.reachable === true && 
        m.dashboard_data && m.dashboard_data.Temperature !== undefined
      );
      
      if (outdoorModule && outdoorModule.dashboard_data) {
        outdoorTemp = outdoorModule.dashboard_data.Temperature;
        break;
      }
    }
    
    // Om ingen utomhusmodul, använd huvudstationen om den har temp
    if (outdoorTemp === null && device.dashboard_data && 
        device.dashboard_data.Temperature !== undefined) {
      outdoorTemp = device.dashboard_data.Temperature;
    }
  }
  
  if (outdoorTemp !== null) {
    // Temperaturen är i Celsius från API:et
    // Konvertera till Fahrenheit om det är användarens val
    let displayTemp = Math.round(outdoorTemp);
    
    if (settings.temperatureUnit === 'fahrenheit') {
      displayTemp = Math.round(outdoorTemp * 1.8 + 32);
    }
    
    chrome.action.setBadgeText({ text: `${displayTemp}°` });
    chrome.action.setBadgeBackgroundColor({ color: '#1E88E5' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

/**
 * Save user settings
 */
async function saveSettings(newSettings) {
  await chrome.storage.sync.set({ settings: newSettings });
  console.log('Settings saved:', newSettings);
  
  // Update current language if it changed
  if (newSettings.language && newSettings.language !== currentLanguage) {
    currentLanguage = newSettings.language;
    await initTranslations(currentLanguage);
  }
  
  // När inställningarna sparas, bearbeta om rådata med de nya inställningarna
  const { rawWeatherData } = await chrome.storage.local.get('rawWeatherData');
  if (rawWeatherData) {
    // Bearbeta rådata med nya inställningar
    const processedData = processMeasurements(rawWeatherData, newSettings);
    
    // Spara bearbetad data
    await chrome.storage.local.set({
      weatherData: processedData
    });
    
    // Uppdatera badge med rådatan och nya inställningar
    updateBadge(rawWeatherData, newSettings);
  }
}

// Initial data update on startup
updateWeatherData();