/**
 * StationWeather Edge Extension
 * Options Script - Handles settings page
 * 
 * Based on the MagicMirror module by Christopher Fenner
 * https://github.com/CFenner/MMM-Netatmo
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Tab navigation
  setupTabs();
  
  // Load current settings first (needed for language)
  await loadSettings();
  
  // Localize UI elements (after loading settings to get correct language)
  localizeUI();
  
  // Set up form submission handlers
  setupFormHandlers();
  
  // Set up authentication testing
  setupAuthTesting();
});

/**
 * Set up tab navigation
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Add active class to clicked button and corresponding pane
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

/**
 * Apply localization to UI elements
 */
function localizeUI() {
  // Page title and tabs
  document.getElementById('options-title').textContent = chrome.i18n.getMessage('optionsPageTitle');
  document.title = chrome.i18n.getMessage('optionsPageTitle');
  
  // Auth tab
  document.getElementById('auth-section-title').textContent = chrome.i18n.getMessage('optionsPageTitle');
  document.getElementById('auth-instructions').textContent = chrome.i18n.getMessage('apiInstructions');
  document.getElementById('api-portal-link').textContent = chrome.i18n.getMessage('apiPortalLink');
  document.getElementById('client-id-label').textContent = chrome.i18n.getMessage('clientIdLabel');
  document.getElementById('client-secret-label').textContent = chrome.i18n.getMessage('clientSecretLabel');
  document.getElementById('refresh-token-label').textContent = chrome.i18n.getMessage('refreshTokenLabel');
  document.getElementById('update-interval-label').textContent = chrome.i18n.getMessage('updateIntervalLabel');
  document.getElementById('test-auth-text').textContent = chrome.i18n.getMessage('testAuthText');
  document.getElementById('save-auth-text').textContent = chrome.i18n.getMessage('saveButton');
  
  // Display tab
  document.getElementById('display-section-title').textContent = chrome.i18n.getMessage('displayModulesLabel');
  document.getElementById('display-instructions').textContent = chrome.i18n.getMessage('apiInstructions');
  
  // General Options section
  document.getElementById('general-options-title').textContent = chrome.i18n.getMessage('generalOptionsTitle');
  document.getElementById('show-battery-label').textContent = chrome.i18n.getMessage('showBatteryLabel');
  document.getElementById('show-signal-label').textContent = chrome.i18n.getMessage('showSignalLabel');
  document.getElementById('show-trend-label').textContent = chrome.i18n.getMessage('showTrendLabel');
  document.getElementById('show-station-name-label').textContent = chrome.i18n.getMessage('showStationNameLabel');
  
  // Language settings
  document.getElementById('language-settings-title').textContent = chrome.i18n.getMessage('languageSettingsTitle');
  document.getElementById('language-label').textContent = chrome.i18n.getMessage('languageLabel');
  document.getElementById('language-help').textContent = chrome.i18n.getMessage('languageHelp');
  
  // Measurements section
  document.getElementById('measurements-title').textContent = chrome.i18n.getMessage('measurementsTitle');
  document.getElementById('measurements-description').textContent = chrome.i18n.getMessage('measurementsDescription');
  document.getElementById('show-temperature-label').textContent = chrome.i18n.getMessage('temperature');
  document.getElementById('show-humidity-label').textContent = chrome.i18n.getMessage('humidity');
  document.getElementById('show-pressure-label').textContent = chrome.i18n.getMessage('pressure');
  document.getElementById('show-co2-label').textContent = chrome.i18n.getMessage('co2');
  document.getElementById('show-noise-label').textContent = chrome.i18n.getMessage('noise');
  document.getElementById('show-rain-label').textContent = chrome.i18n.getMessage('rain');
  document.getElementById('show-wind-label').textContent = chrome.i18n.getMessage('wind');
  document.getElementById('show-wind-angle-label').textContent = chrome.i18n.getMessage('windDirection');
  document.getElementById('show-gust-label').textContent = chrome.i18n.getMessage('gusts');
  document.getElementById('show-gust-angle-label').textContent = chrome.i18n.getMessage('gustsDirection');
  
  // CO2 Thresholds
  document.getElementById('co2-thresholds-title').textContent = chrome.i18n.getMessage('co2ThresholdsTitle');
  document.getElementById('co2-average-label').textContent = chrome.i18n.getMessage('averageThresholdLabel');
  document.getElementById('co2-bad-label').textContent = chrome.i18n.getMessage('badThresholdLabel');
  document.getElementById('co2-good-label').textContent = chrome.i18n.getMessage('goodLabel');
  document.getElementById('co2-average-preview-label').textContent = chrome.i18n.getMessage('averageLabel');
  document.getElementById('co2-bad-preview-label').textContent = chrome.i18n.getMessage('badLabel');
  
  // Buttons
  document.getElementById('save-display-text').textContent = chrome.i18n.getMessage('saveButton');
  
  // About tab
  document.getElementById('about-description').textContent = chrome.i18n.getMessage('extDescription');
  document.getElementById('original-repo-link').textContent = 'Original Repository (GitHub)';
}

/**
 * Load current settings from storage
 */
async function loadSettings() {
  const { settings } = await chrome.storage.sync.get('settings');
  
  if (!settings) {
    // Get browser language
    determineBrowserLanguage();
    return;
  }
  
  // Auth form
  document.getElementById('client-id').value = settings.clientId || '';
  document.getElementById('client-secret').value = settings.clientSecret || '';
  document.getElementById('refresh-token').value = settings.refreshToken || '';
  document.getElementById('update-interval').value = settings.updateInterval || 3;
  
  // Display form
  document.getElementById('show-battery').checked = settings.showBattery !== false;
  document.getElementById('show-signal').checked = settings.showSignal !== false;
  document.getElementById('show-trend').checked = settings.showTrend !== false;
  document.getElementById('show-station-name').checked = settings.showStationName !== false;
  
  // CO2 thresholds
  document.getElementById('co2-average').value = settings.thresholdCO2Average || 800;
  document.getElementById('co2-bad').value = settings.thresholdCO2Bad || 1800;
  
  // Apply language setting
  if (settings.language) {
    document.getElementById('language-selector').value = settings.language;
  } else {
    // Default to browser language
    determineBrowserLanguage();
  }
  
  // Measurement display options
  const displayMeasurements = settings.displayMeasurements || [];
  const measurementMap = {
    'Temperature': 'show-temperature',
    'Humidity': 'show-humidity',
    'Pressure': 'show-pressure',
    'CO2': 'show-co2',
    'Noise': 'show-noise',
    'Rain': 'show-rain',
    'WindStrength': 'show-wind',
    'WindAngle': 'show-wind-angle',
    'GustStrength': 'show-gust',
    'GustAngle': 'show-gust-angle'
  };
  
  // Reset all checkboxes first
  Object.values(measurementMap).forEach(id => {
    document.getElementById(id).checked = false;
  });
  
  // Set checkboxes based on current settings
  displayMeasurements.forEach(measurement => {
    const checkboxId = measurementMap[measurement];
    if (checkboxId) {
      document.getElementById(checkboxId).checked = true;
    }
  });
}

/**
 * Determine browser language and set it as default
 */
function determineBrowserLanguage() {
  // Get browser language (first part of locale, e.g. 'en' from 'en-US')
  const browserLanguage = navigator.language.split('-')[0];
  const languageSelect = document.getElementById('language-selector');
  
  // Check if browser language is available in options
  let languageFound = false;
  for (let i = 0; i < languageSelect.options.length; i++) {
    if (languageSelect.options[i].value === browserLanguage) {
      languageSelect.value = browserLanguage;
      languageFound = true;
      break;
    }
  }
  
  if (!languageFound) {
    languageSelect.value = 'en'; // Default to English
  }
}

/**
 * Set up form submission handlers
 */
function setupFormHandlers() {
  // Auth form
  const authForm = document.getElementById('auth-form');
  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveAuthSettings();
  });
  
  // Display form
  const displayForm = document.getElementById('display-form');
  displayForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveDisplaySettings();
  });
}

/**
 * Set up authentication testing
 */
function setupAuthTesting() {
  const testAuthBtn = document.getElementById('test-auth-btn');
  testAuthBtn.addEventListener('click', async () => {
    await testAuthentication();
  });
}

/**
 * Save authentication settings
 */
async function saveAuthSettings() {
  const clientId = document.getElementById('client-id').value.trim();
  const clientSecret = document.getElementById('client-secret').value.trim();
  const refreshToken = document.getElementById('refresh-token').value.trim();
  const updateInterval = parseInt(document.getElementById('update-interval').value) || 3;
  
  if (!clientId || !clientSecret || !refreshToken) {
    showAlert('Please fill in all required fields');
    return;
  }
  
  // Get current settings
  const { settings = {} } = await chrome.storage.sync.get('settings');
  
  // Update auth settings
  const updatedSettings = {
    ...settings,
    clientId,
    clientSecret,
    refreshToken,
    updateInterval: Math.max(1, Math.min(60, updateInterval)), // Limit between 1-60 minutes
  };
  
  try {
    await chrome.storage.sync.set({ settings: updatedSettings });
    chrome.runtime.sendMessage({ action: 'saveSettings', settings: updatedSettings });
    showStatusMessage(chrome.i18n.getMessage('settingsSaved'));
  } catch (error) {
    showAlert(`Error saving settings: ${error.message}`);
  }
}

/**
 * Save display settings
 */
async function saveDisplaySettings() {
  // Get current settings
  const { settings = {} } = await chrome.storage.sync.get('settings');
  
  // Update display settings
  const updatedSettings = {
    ...settings,
    showBattery: document.getElementById('show-battery').checked,
    showSignal: document.getElementById('show-signal').checked,
    showTrend: document.getElementById('show-trend').checked,
    showStationName: document.getElementById('show-station-name').checked,
    thresholdCO2Average: parseInt(document.getElementById('co2-average').value) || 800,
    thresholdCO2Bad: parseInt(document.getElementById('co2-bad').value) || 1800,
    language: document.getElementById('language-selector').value
  };
  
  // Update measurement display options
  const measurementMap = {
    'show-temperature': 'Temperature',
    'show-humidity': 'Humidity',
    'show-pressure': 'Pressure',
    'show-co2': 'CO2',
    'show-noise': 'Noise',
    'show-rain': 'Rain',
    'show-wind': 'WindStrength',
    'show-wind-angle': 'WindAngle',
    'show-gust': 'GustStrength',
    'show-gust-angle': 'GustAngle'
  };
  
  const displayMeasurements = [];
  Object.entries(measurementMap).forEach(([id, measurement]) => {
    if (document.getElementById(id).checked) {
      displayMeasurements.push(measurement);
    }
  });
  
  updatedSettings.displayMeasurements = displayMeasurements;
  
  try {
    await chrome.storage.sync.set({ settings: updatedSettings });
    chrome.runtime.sendMessage({ action: 'saveSettings', settings: updatedSettings });
    
    // Handle language change
    await applyLanguageChange(updatedSettings.language);
    
    showStatusMessage(chrome.i18n.getMessage('settingsSaved'));
    
    // Reload page to apply the language change immediately
    window.location.reload();
  } catch (error) {
    showAlert(`Error saving settings: ${error.message}`);
  }
}

/**
 * Apply language change
 * 
 * @param {string} language - Selected language code
 */
async function applyLanguageChange(language) {
  try {
    // Edge/Chrome extensions can't change language directly
    // We just save the setting and show a message about restarting
    showStatusMessage(chrome.i18n.getMessage('languageChangeRestart'));
  } catch (error) {
    console.error('Error applying language change:', error);
  }
}

/**
 * Test authentication with current settings
 */
async function testAuthentication() {
  const clientId = document.getElementById('client-id').value.trim();
  const clientSecret = document.getElementById('client-secret').value.trim();
  const refreshToken = document.getElementById('refresh-token').value.trim();
  
  if (!clientId || !clientSecret || !refreshToken) {
    showAlert('Please fill in all fields before testing');
    return;
  }
  
  const testAuthBtn = document.getElementById('test-auth-btn');
  const originalText = testAuthBtn.innerHTML;
  
  try {
    // Show loading indicator
    testAuthBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Testing...';
    testAuthBtn.disabled = true;
    
    // Send test authentication request to background script
    const response = await chrome.runtime.sendMessage({
      action: 'testAuthentication',
      authData: { clientId, clientSecret, refreshToken }
    });
    
    if (response && response.success) {
      showStatusMessage('Authentication successful!');
    } else {
      showAlert(response?.error || 'Authentication failed. Please check your credentials.');
    }
  } catch (error) {
    showAlert(`Authentication error: ${error.message}`);
  } finally {
    // Restore button
    testAuthBtn.innerHTML = originalText;
    testAuthBtn.disabled = false;
  }
}

/**
 * Show alert message
 * 
 * @param {string} message - Message to display
 */
function showAlert(message) {
  const alertEl = document.getElementById('auth-alert');
  const alertTextEl = document.getElementById('auth-alert-text');
  
  alertTextEl.textContent = message;
  alertEl.classList.remove('hidden');
  
  // Scroll to alert
  alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  
  // Hide after 5 seconds
  setTimeout(() => {
    alertEl.classList.add('hidden');
  }, 5000);
}

/**
 * Show status message
 * 
 * @param {string} message - Message to display
 */
function showStatusMessage(message) {
  const statusEl = document.getElementById('status-message');
  const statusTextEl = document.getElementById('status-text');
  
  statusTextEl.textContent = message;
  statusEl.classList.remove('hidden');
  
  // Hide after 3 seconds (animation handles this)
  setTimeout(() => {
    statusEl.classList.add('hidden');
  }, 3000);
}