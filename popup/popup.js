/**
 * Netatmo Weather Edge Extension
 * Popup Script - Handles the popup UI
 * 
 * Based on the MagicMirror module by Christopher Fenner
 * https://github.com/CFenner/MMM-Netatmo
 */

import { initTranslations, getMessage, applyTranslations } from '../scripts/translations.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const errorTextEl = document.getElementById('error-text');
  const noAuthEl = document.getElementById('no-auth');
  const dataContainerEl = document.getElementById('data-container');
  const updateTimeEl = document.getElementById('update-time');
  const modulesContainerEl = document.getElementById('modules-container');
  const refreshBtn = document.getElementById('refresh-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const goToSettingsBtn = document.getElementById('go-to-settings');
  
  // Initialize translations and setup
  await initializeApp();
  
  /**
   * Initialize the application
   */
  async function initializeApp() {
    showLoadingState();
    
    // Get user language setting
    const { settings } = await chrome.storage.sync.get('settings');
    const language = settings?.language || 'en';
    
    // Initialize translations
    await initTranslations(language);
    
    // Localize UI
    localizeUI();
    
    // Load data and setup event listeners
    await loadData();
    setupEventListeners();
  }
  
  /**
   * Apply localization to UI elements
   */
  function localizeUI() {
    document.getElementById('header-title').textContent = getMessage('extName');
    document.getElementById('loading-text').textContent = getMessage('loadingData');
    document.getElementById('auth-needed-text').textContent = getMessage('authError');
    document.getElementById('auth-instructions-text').textContent = getMessage('apiInstructions');
    document.getElementById('go-to-settings').textContent = getMessage('saveButton');
    
    // Apply translations to any elements with data-i18n attributes
    applyTranslations();
  }
  
  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    refreshBtn.addEventListener('click', async () => {
      await refreshData();
    });
    
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    
    goToSettingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  /**
   * Load data from storage and display it
   */
  async function loadData() {
    showLoadingState();
    
    // Check if we have API credentials
    const { settings } = await chrome.storage.sync.get('settings');
    if (!settings || !settings.clientId || !settings.clientSecret || !settings.refreshToken) {
      showNoAuthState();
      return;
    }
    
    // Request data from background script
    chrome.runtime.sendMessage({ action: 'getNetatmoData' }, (response) => {
      if (chrome.runtime.lastError) {
        showErrorState(chrome.runtime.lastError.message);
        return;
      }
      
      if (!response || !response.data) {
        // Check if we have a stored error
        chrome.storage.local.get(['netatmoError', 'lastErrorTime'], (errorData) => {
          if (errorData.netatmoError) {
            showErrorState(errorData.netatmoError);
          } else {
            showLoadingState(); // Keep showing loading until we get data
          }
        });
        return;
      }
      
      renderData(response.data);
    });
  }
  
  /**
   * Force refresh data from API
   */
  async function refreshData() {
    showLoadingState();
    
    chrome.runtime.sendMessage({ action: 'forceUpdate' }, (response) => {
      if (chrome.runtime.lastError) {
        showErrorState(chrome.runtime.lastError.message);
        return;
      }
      
      if (!response.success) {
        showErrorState(response.error || 'Failed to update data');
        return;
      }
      
      renderData(response.data);
    });
  }
  
  /**
   * Render data in the UI
   * 
   * @param {Object} data - Processed Netatmo data
   */
  function renderData(data) {
    if (!data || !data.modules || data.modules.length === 0) {
      showErrorState(getMessage('noDataAvailable'));
      return;
    }
    
    // Update last updated time
    chrome.storage.local.get('lastUpdate', (result) => {
      if (result.lastUpdate) {
        const timeString = formatTimeAgo(result.lastUpdate);
        updateTimeEl.textContent = getMessage('lastUpdated', [timeString]);
      }
    });
    
    // Clear existing modules
    modulesContainerEl.innerHTML = '';
    
    // Sortera modulerna så att utomhusmodulen kommer först
    const sortedModules = [...data.modules].sort((a, b) => {
      // Placera utomhusmoduler först
      if (a.type === 'NAModule1' && b.type !== 'NAModule1') return -1;
      if (a.type !== 'NAModule1' && b.type === 'NAModule1') return 1;
      
      // Sedan inomhusmoduler
      if (a.type === 'NAMain' && b.type !== 'NAMain') return -1;
      if (a.type !== 'NAMain' && b.type === 'NAMain') return 1;
      
      // Behåll övrig ordning
      return 0;
    });
    
    // Render each module
    sortedModules.forEach(module => {
      if (module.reachable) {
        renderNetatmoModule(module);
      } else {
        renderOfflineModule(module);
      }
    });
    
    // Show data container
    hideAllStates();
    dataContainerEl.classList.remove('hidden');
  }
  
  /**
   * Render a Netatmo module
   * 
   * @param {Object} module - Module data
   */
  function renderNetatmoModule(module) {
    const moduleEl = document.createElement('div');
    moduleEl.className = 'netatmo-module';
    
    // Module header with name
    const headerEl = document.createElement('div');
    headerEl.className = 'module-header';
    headerEl.textContent = module.fullName;
    moduleEl.appendChild(headerEl);
    
    // Module content
    const contentEl = document.createElement('div');
    contentEl.className = 'module-content';
    
    // Module data row
    const dataEl = document.createElement('div');
    dataEl.className = 'module-data';
    
    // Primary value (temperature for most modules, or main measurement)
    const primaryValue = getPrimaryValue(module);
    if (primaryValue) {
      const primaryEl = document.createElement('div');
      primaryEl.className = 'primary-value';
      // Lägg till termometer-ikon före temperaturen
      if (primaryValue.name === 'Temperature') {
        primaryEl.innerHTML = `<i class="fas fa-thermometer-half icon-temperature"></i> ${primaryValue.value}<span class="primary-unit">${primaryValue.unit}</span>`;
      } else {
        primaryEl.innerHTML = `${primaryValue.value}<span class="primary-unit">${primaryValue.unit}</span>`;
      }
      dataEl.appendChild(primaryEl);
    }
    
    // Secondary value (CO2 for indoor modules, wind direction for wind module)
    const secondaryValue = getSecondaryValue(module);
    if (secondaryValue) {
      const secondaryEl = document.createElement('div');
      secondaryEl.className = 'secondary-value';
      
      // For CO2, show colored indicator and use leaf icon
      if (secondaryValue.name === 'CO2') {
        const co2Status = module.co2Status || 'undefined';
        const indicatorEl = document.createElement('div');
        indicatorEl.className = `co2-indicator co2-${co2Status}`;
        secondaryEl.appendChild(indicatorEl);
        
        const textEl = document.createElement('div');
        textEl.className = 'secondary-text';
        textEl.innerHTML = `<i class="fas fa-leaf icon-co2"></i> ${secondaryValue.value} ppm`;
        secondaryEl.appendChild(textEl);
      } 
      // For wind direction, show arrow
      else if (secondaryValue.name === 'WindAngle') {
        const arrowEl = document.createElement('div');
        arrowEl.className = 'wind-direction';
        arrowEl.innerHTML = '<i class="fas fa-arrow-up"></i>';
        arrowEl.style.transform = `rotate(${secondaryValue.value}deg)`;
        secondaryEl.appendChild(arrowEl);
        
        const textEl = document.createElement('div');
        textEl.className = 'secondary-text';
        textEl.textContent = `${secondaryValue.display}`;
        secondaryEl.appendChild(textEl);
      }
      // For humidity, use water drop icon
      else if (secondaryValue.name === 'Humidity') {
        const textEl = document.createElement('div');
        textEl.className = 'secondary-text';
        textEl.innerHTML = `<i class="fas fa-tint icon-humidity"></i> ${secondaryValue.value}${secondaryValue.unit}`;
        secondaryEl.appendChild(textEl);
      }
      // Default display for other secondary values
      else {
        const textEl = document.createElement('div');
        textEl.className = 'secondary-text';
        textEl.textContent = `${secondaryValue.display}`;
        secondaryEl.appendChild(textEl);
      }
      
      dataEl.appendChild(secondaryEl);
    }
    
    // Other measurements
    const measurementsEl = document.createElement('div');
    measurementsEl.className = 'measurements';
    
    // Add each measurement
    const measurements = getOtherMeasurements(module, primaryValue, secondaryValue);
    measurements.forEach(measurement => {
      const measurementEl = document.createElement('div');
      measurementEl.className = 'measurement';
      
      // Icon with appropriate color class
      if (measurement.icon) {
        const iconEl = document.createElement('span');
        let iconColorClass = '';
        
        // Set appropriate color class based on measurement type
        switch(measurement.name) {
          case 'Humidity':
            iconColorClass = 'icon-humidity';
            break;
          case 'Temperature':
            iconColorClass = 'icon-temperature';
            break;
          case 'CO2':
            iconColorClass = 'icon-co2';
            break;
          case 'Noise':
            iconColorClass = 'icon-noise';
            break;
          case 'Pressure':
            iconColorClass = 'icon-pressure';
            break;
          default:
            iconColorClass = '';
        }
        
        iconEl.className = `measurement-icon ${iconColorClass}`;
        iconEl.innerHTML = `<i class="fas fa-${measurement.icon}"></i>`;
        measurementEl.appendChild(iconEl);
      }
      
      // Label
      const labelEl = document.createElement('span');
      labelEl.className = 'measurement-label';
      labelEl.textContent = getLocalizedMeasurementName(measurement.name);
      measurementEl.appendChild(labelEl);
      
      // Value
      const valueEl = document.createElement('span');
      valueEl.className = 'measurement-value';
      valueEl.textContent = measurement.display.replace(/[°%].*/, ''); // Remove units
      measurementEl.appendChild(valueEl);
      
      // Unit
      const unitEl = document.createElement('span');
      unitEl.className = 'measurement-unit';
      unitEl.textContent = measurement.unit;
      measurementEl.appendChild(unitEl);
      
      measurementsEl.appendChild(measurementEl);
    });
    
    // Add system status indicators (battery, signal)
    const systemIndicators = getSystemIndicators(module);
    systemIndicators.forEach(indicator => {
      const indicatorEl = document.createElement('div');
      indicatorEl.className = `system-indicator ${getBatteryClass(indicator)}`;
      
      // Icon with appropriate color class
      if (indicator.icon) {
        let iconColorClass = '';
        
        // Set color class based on indicator type
        switch(indicator.name) {
          case 'battery':
            iconColorClass = 'icon-battery';
            break;
          case 'wifi':
          case 'radio':
            iconColorClass = 'icon-wifi';
            break;
          default:
            iconColorClass = '';
        }
        
        const iconEl = document.createElement('span');
        iconEl.className = `measurement-icon ${iconColorClass}`;
        iconEl.innerHTML = `<i class="fas fa-${indicator.icon}"></i>`;
        indicatorEl.appendChild(iconEl);
      }
      
      // Label
      const labelEl = document.createElement('span');
      labelEl.className = 'measurement-label';
      labelEl.textContent = getLocalizedMeasurementName(indicator.name);
      indicatorEl.appendChild(labelEl);
      
      // Value
      const valueEl = document.createElement('span');
      valueEl.className = 'measurement-value';
      valueEl.textContent = indicator.display;
      indicatorEl.appendChild(valueEl);
      
      measurementsEl.appendChild(indicatorEl);
    });
    
    dataEl.appendChild(measurementsEl);
    contentEl.appendChild(dataEl);
    moduleEl.appendChild(contentEl);
    
    modulesContainerEl.appendChild(moduleEl);
  }
  
  /**
   * Render an offline module
   * 
   * @param {Object} module - Module data
   */
  function renderOfflineModule(module) {
    const moduleEl = document.createElement('div');
    moduleEl.className = 'netatmo-module';
    
    // Module header with name
    const headerEl = document.createElement('div');
    headerEl.className = 'module-header';
    headerEl.textContent = module.fullName;
    moduleEl.appendChild(headerEl);
    
    // Module content
    const contentEl = document.createElement('div');
    contentEl.className = 'module-content';
    
    const offlineEl = document.createElement('div');
    offlineEl.className = 'text-center mt-2 mb-2';
    offlineEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${getMessage('notAvailable')}`;
    contentEl.appendChild(offlineEl);
    
    moduleEl.appendChild(contentEl);
    modulesContainerEl.appendChild(moduleEl);
  }
  
  /**
   * Get the primary value to display for a module
   * 
   * @param {Object} module - Module data
   * @returns {Object|null} Primary measurement
   */
  function getPrimaryValue(module) {
    const measurementPriority = {
      [MODULE_TYPES.MAIN]: 'Temperature',
      [MODULE_TYPES.INDOOR]: 'Temperature',
      [MODULE_TYPES.OUTDOOR]: 'Temperature',
      [MODULE_TYPES.WIND]: 'WindStrength',
      [MODULE_TYPES.RAIN]: 'Rain'
    };
    
    const primaryType = measurementPriority[module.type];
    return module.measurements[primaryType] || null;
  }
  
  /**
   * Get the secondary value to display for a module
   * 
   * @param {Object} module - Module data
   * @returns {Object|null} Secondary measurement
   */
  function getSecondaryValue(module) {
    const secondaryPriority = {
      [MODULE_TYPES.MAIN]: 'CO2',
      [MODULE_TYPES.INDOOR]: 'CO2',
      [MODULE_TYPES.OUTDOOR]: 'Humidity',
      [MODULE_TYPES.WIND]: 'WindAngle',
      [MODULE_TYPES.RAIN]: null
    };
    
    const secondaryType = secondaryPriority[module.type];
    return secondaryType ? module.measurements[secondaryType] : null;
  }
  
  /**
   * Get other measurements for a module
   * 
   * @param {Object} module - Module data
   * @param {Object} primaryValue - Primary measurement
   * @param {Object} secondaryValue - Secondary measurement
   * @returns {Array} Other measurements
   */
  function getOtherMeasurements(module, primaryValue, secondaryValue) {
    const result = [];
    
    // Skip primary and secondary values, and system indicators
    const skipList = ['battery', 'wifi', 'radio'];
    if (primaryValue) skipList.push(primaryValue.name);
    if (secondaryValue) skipList.push(secondaryValue.name);
    
    // Add all other measurements
    for (const [key, measurement] of Object.entries(module.measurements)) {
      if (!skipList.includes(key)) {
        result.push(measurement);
      }
    }
    
    return result;
  }
  
  /**
   * Get system indicators for a module
   * 
   * @param {Object} module - Module data
   * @returns {Array} System indicators
   */
  function getSystemIndicators(module) {
    const result = [];
    
    ['battery', 'wifi', 'radio'].forEach(key => {
      if (module.measurements[key]) {
        result.push(module.measurements[key]);
      }
    });
    
    return result;
  }
  
  /**
   * Get CSS class for battery status
   * 
   * @param {Object} indicator - Indicator data
   * @returns {string} CSS class
   */
  function getBatteryClass(indicator) {
    if (indicator.name !== 'battery') return '';
    
    const value = indicator.value;
    if (value <= 20) return 'signal-bad flash';
    if (value <= 40) return 'signal-average';
    return 'signal-good';
  }
  
  /**
   * Get localized name for a measurement
   * 
   * @param {string} name - Measurement name
   * @returns {string} Localized name
   */
  function getLocalizedMeasurementName(name) {
    const nameMap = {
      'CO2': 'co2',
      'Humidity': 'humidity',
      'Temperature': 'temperature',
      'temp_trend': 'tempTrend',
      'Pressure': 'pressure',
      'pressure_trend': 'pressureTrend',
      'Noise': 'noise',
      'WindStrength': 'wind',
      'WindAngle': 'windDirection',
      'GustStrength': 'gusts',
      'GustAngle': 'gustsDirection',
      'Rain': 'rain',
      'sum_rain_1': 'rainHourly',
      'sum_rain_24': 'rainDaily',
      'battery': 'battery',
      'wifi': 'wifi',
      'radio': 'signal'
    };
    
    const key = nameMap[name] || name;
    return getMessage(key) || key;
  }
  
  /**
   * Format timestamp as relative time
   * 
   * @param {number} timestamp - Timestamp in milliseconds
   * @returns {string} Formatted relative time
   */
  function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) {
      return '<1 min';
    } else if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}min`;
    }
  }
  
  /**
   * Show loading state
   */
  function showLoadingState() {
    hideAllStates();
    loadingEl.classList.remove('hidden');
  }
  
  /**
   * Show error state
   * 
   * @param {string} errorMessage - Error message to display
   */
  function showErrorState(errorMessage) {
    hideAllStates();
    errorTextEl.textContent = errorMessage;
    errorEl.classList.remove('hidden');
  }
  
  /**
   * Show no auth state
   */
  function showNoAuthState() {
    hideAllStates();
    noAuthEl.classList.remove('hidden');
  }
  
  /**
   * Hide all state elements
   */
  function hideAllStates() {
    loadingEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    noAuthEl.classList.add('hidden');
    dataContainerEl.classList.add('hidden');
  }
});

// Module types constants
const MODULE_TYPES = {
  MAIN: 'NAMain',
  INDOOR: 'NAModule4',
  OUTDOOR: 'NAModule1',
  RAIN: 'NAModule3',
  WIND: 'NAModule2'
};