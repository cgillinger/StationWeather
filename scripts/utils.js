/**
 * StationWeather Edge Extension
 * Utils Module - Helper functions for data processing
 * 
 * Based on the MagicMirror module by Christopher Fenner
 * https://github.com/CFenner/MMM-Netatmo
 */

// Module types
export const MODULE_TYPES = {
  MAIN: 'NAMain',
  INDOOR: 'NAModule4',
  OUTDOOR: 'NAModule1',
  RAIN: 'NAModule3',
  WIND: 'NAModule2'
};

// Measurement types
export const MEASUREMENT_TYPES = {
  CO2: 'CO2',
  HUMIDITY: 'Humidity',
  TEMPERATURE: 'Temperature',
  TEMPERATURE_TREND: 'temp_trend',
  PRESSURE: 'Pressure',
  PRESSURE_TREND: 'pressure_trend',
  NOISE: 'Noise',
  WIND_STRENGTH: 'WindStrength',
  WIND_ANGLE: 'WindAngle',
  GUST_STRENGTH: 'GustStrength',
  GUST_ANGLE: 'GustAngle',
  RAIN: 'Rain',
  RAIN_PER_HOUR: 'sum_rain_1',
  RAIN_PER_DAY: 'sum_rain_24',
};

// Default thresholds for CO2 levels
const CO2_THRESHOLD_AVERAGE = 800;
const CO2_THRESHOLD_BAD = 1800;

/**
 * Get default settings for the extension
 * 
 * @returns {Object} Default settings
 */
export function getDefaultSettings() {
  return {
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    updateInterval: 3,
    showBattery: true,
    showSignal: true,
    showTrend: true,
    showStationName: true,
    thresholdCO2Average: CO2_THRESHOLD_AVERAGE,
    thresholdCO2Bad: CO2_THRESHOLD_BAD,
    displayMeasurements: [
      'Temperature',
      'Humidity',
      'Pressure',
      'CO2',
      'Noise',
      'Rain',
      'WindStrength',
      'WindAngle'
    ],
    unitSystem: 'metric',
    // Nya inställningar för temperatur- och tryckenheter
    temperatureUnit: 'celsius', // 'celsius' eller 'fahrenheit'
    pressureUnit: 'mbar'        // 'mbar' eller 'hpa'
  };
}

/**
 * Process raw data from weather API
 * 
 * @param {Object} data - Raw data from API
 * @param {Object} settings - User settings
 * @returns {Object} Processed data for the UI
 */
export function processMeasurements(data, settings) {
  if (!data || !data.devices) {
    return null;
  }
  
  const result = {
    user: processUserPreferences(data.user),
    modules: []
  };
  
  // Process each station
  for (const station of data.devices) {
    // Add main module
    if (station.reachable !== false) {
      result.modules.push(processModule(station, station.home_name, settings));
    }
    
    // Add sub-modules
    if (Array.isArray(station.modules)) {
      for (const module of station.modules) {
        result.modules.push(processModule(module, station.home_name, settings));
      }
    }
  }
  
  // Reorder modules if moduleOrder is specified in settings
  if (settings.moduleOrder && Array.isArray(settings.moduleOrder) && settings.moduleOrder.length > 0) {
    const orderedModules = [];
    
    for (const moduleName of settings.moduleOrder) {
      const module = result.modules.find(m => m.name === moduleName);
      if (module) {
        orderedModules.push(module);
      }
    }
    
    // Add any modules not in the order list
    result.modules.forEach(module => {
      if (!settings.moduleOrder.includes(module.name)) {
        orderedModules.push(module);
      }
    });
    
    result.modules = orderedModules;
  }
  
  return result;
}

/**
 * Process user preferences from API data
 * 
 * @param {Object} user - User data from API
 * @returns {Object} Processed user preferences
 */
function processUserPreferences(user) {
  if (!user || !user.administrative) {
    return {
      unitSystem: 'metric',
      pressureUnit: 'mbar',
      windUnit: 'kph'
    };
  }
  
  const administrative = user.administrative;
  
  return {
    unitSystem: administrative.unit === 0 ? 'metric' : 'imperial',
    pressureUnit: getPressureUnit(administrative.pressureunit),
    windUnit: getWindUnit(administrative.windunit)
  };
}

/**
 * Get the pressure unit based on unit code
 * 
 * @param {number} unitCode - Pressure unit code
 * @returns {string} Pressure unit
 */
function getPressureUnit(unitCode) {
  switch (unitCode) {
    case 1: return 'inHg';
    case 2: return 'mmHg';
    case 0:
    default:
      return 'mbar';
  }
}

/**
 * Get the wind unit based on unit code
 * 
 * @param {number} unitCode - Wind unit code
 * @returns {string} Wind unit
 */
function getWindUnit(unitCode) {
  switch (unitCode) {
    case 1: return 'mph';
    case 2: return 'ms';  // m/s
    case 3: return 'bft'; // Beaufort
    case 4: return 'kn';  // Knots
    case 0:
    default:
      return 'kph';       // km/h
  }
}

/**
 * Process a module to extract measurement data
 * 
 * @param {Object} module - Module data from API
 * @param {string} stationName - Name of the parent station
 * @param {Object} settings - User settings
 * @returns {Object} Processed module data
 */
function processModule(module, stationName, settings) {
  const result = {
    id: module._id || `${module.type}-${Date.now()}`,
    type: module.type,
    name: module.module_name,
    stationName: stationName,
    fullName: settings.showStationName ? `${stationName} - ${module.module_name}` : module.module_name,
    reachable: module.reachable !== false,
    measurements: {},
    lastSeen: module.last_seen || module.last_message
  };
  
  // If module is not reachable, add connection status
  if (!result.reachable) {
    if (module.type === MODULE_TYPES.MAIN) {
      result.measurements.wifi = {
        name: 'wifi',
        value: 0,
        unit: '%',
        display: '0%',
        icon: 'wifi'
      };
    } else {
      result.measurements.radio = {
        name: 'radio',
        value: 0,
        unit: '%',
        display: '0%',
        icon: 'signal'
      };
    }
    return result;
  }
  
  // Add module sensor measurements
  if (module.dashboard_data) {
    const data = module.dashboard_data;
    
    // Process different module types
    switch (module.type) {
      case MODULE_TYPES.MAIN:
        if (hasMeasurement(data, MEASUREMENT_TYPES.PRESSURE)) {
          addMeasurement(result, MEASUREMENT_TYPES.PRESSURE, data, settings);
        }
        if (settings.showTrend && hasMeasurement(data, MEASUREMENT_TYPES.PRESSURE_TREND)) {
          addMeasurement(result, MEASUREMENT_TYPES.PRESSURE_TREND, data, settings);
        }
        if (hasMeasurement(data, MEASUREMENT_TYPES.NOISE)) {
          addMeasurement(result, MEASUREMENT_TYPES.NOISE, data, settings);
        }
        // Fall through for common measurements
        
      case MODULE_TYPES.INDOOR:
        if (hasMeasurement(data, MEASUREMENT_TYPES.CO2)) {
          addMeasurement(result, MEASUREMENT_TYPES.CO2, data, settings);
          // Add CO2 visual status
          result.co2Status = getCO2Status(data[MEASUREMENT_TYPES.CO2], settings);
        }
        // Fall through for common measurements
        
      case MODULE_TYPES.OUTDOOR:
        if (hasMeasurement(data, MEASUREMENT_TYPES.TEMPERATURE)) {
          addMeasurement(result, MEASUREMENT_TYPES.TEMPERATURE, data, settings);
        }
        if (settings.showTrend && hasMeasurement(data, MEASUREMENT_TYPES.TEMPERATURE_TREND)) {
          addMeasurement(result, MEASUREMENT_TYPES.TEMPERATURE_TREND, data, settings);
        }
        if (hasMeasurement(data, MEASUREMENT_TYPES.HUMIDITY)) {
          addMeasurement(result, MEASUREMENT_TYPES.HUMIDITY, data, settings);
        }
        break;
        
      case MODULE_TYPES.WIND:
        if (hasMeasurement(data, MEASUREMENT_TYPES.WIND_STRENGTH)) {
          addMeasurement(result, MEASUREMENT_TYPES.WIND_STRENGTH, data, settings);
        }
        if (hasMeasurement(data, MEASUREMENT_TYPES.WIND_ANGLE)) {
          addMeasurement(result, MEASUREMENT_TYPES.WIND_ANGLE, data, settings);
        }
        if (hasMeasurement(data, MEASUREMENT_TYPES.GUST_STRENGTH)) {
          addMeasurement(result, MEASUREMENT_TYPES.GUST_STRENGTH, data, settings);
        }
        if (hasMeasurement(data, MEASUREMENT_TYPES.GUST_ANGLE)) {
          addMeasurement(result, MEASUREMENT_TYPES.GUST_ANGLE, data, settings);
        }
        break;
        
      case MODULE_TYPES.RAIN:
        if (hasMeasurement(data, MEASUREMENT_TYPES.RAIN)) {
          addMeasurement(result, MEASUREMENT_TYPES.RAIN, data, settings);
        }
        if (hasMeasurement(data, MEASUREMENT_TYPES.RAIN_PER_HOUR)) {
          addMeasurement(result, MEASUREMENT_TYPES.RAIN_PER_HOUR, data, settings);
        }
        if (hasMeasurement(data, MEASUREMENT_TYPES.RAIN_PER_DAY)) {
          addMeasurement(result, MEASUREMENT_TYPES.RAIN_PER_DAY, data, settings);
        }
        break;
    }
  }
// Add module specific measurements
  if (module.type === MODULE_TYPES.MAIN) {
    if (settings.showSignal && module.wifi_status !== undefined) {
      result.measurements.wifi = {
        name: 'wifi',
        value: module.wifi_status,
        unit: '%',
        display: `${module.wifi_status}%`,
        icon: 'wifi'
      };
    }
  } else {
    if (settings.showSignal && module.rf_status !== undefined) {
      result.measurements.radio = {
        name: 'radio',
        value: module.rf_status,
        unit: '%',
        display: `${module.rf_status}%`,
        icon: 'signal'
      };
    }
    if (settings.showBattery && module.battery_percent !== undefined) {
      result.measurements.battery = {
        name: 'battery',
        value: module.battery_percent,
        unit: '%',
        display: `${module.battery_percent}%`,
        icon: getBatteryIcon(module.battery_percent)
      };
    }
  }
  
  // Filter measurements based on user preferences
  if (settings.displayMeasurements && Array.isArray(settings.displayMeasurements)) {
    const filteredMeasurements = {};
    
    for (const measurementKey of settings.displayMeasurements) {
      if (result.measurements[measurementKey]) {
        filteredMeasurements[measurementKey] = result.measurements[measurementKey];
      }
    }
    
    // Add special measurements (battery, signal) always
    ['battery', 'wifi', 'radio'].forEach(key => {
      if (result.measurements[key]) {
        filteredMeasurements[key] = result.measurements[key];
      }
    });
    
    result.measurements = filteredMeasurements;
  }
  
  return result;
}

/**
 * Check if a measurement exists in the data
 * 
 * @param {Object} data - Dashboard data
 * @param {string} measurement - Measurement type
 * @returns {boolean} True if measurement exists
 */
function hasMeasurement(data, measurement) {
  return data && data[measurement] !== undefined && data[measurement] !== null;
}

/**
 * Add a measurement to the result
 * 
 * @param {Object} result - Result object
 * @param {string} measurement - Measurement type
 * @param {Object} data - Dashboard data
 * @param {Object} settings - User settings
 */
function addMeasurement(result, measurement, data, settings) {
  const value = data[measurement];
  
  // För temperatur, konvertera värdet till Fahrenheit om det är inställt
  let adjustedValue = value;
  if (measurement === MEASUREMENT_TYPES.TEMPERATURE && settings.temperatureUnit === 'fahrenheit') {
    adjustedValue = value * 1.8 + 32;
  }
  
  const measurementInfo = {
    name: measurement,
    value: adjustedValue, // Använd det justerade värdet
    originalValue: value, // Spara originalvärdet också
    unit: getUnitForMeasurement(measurement, settings),
    display: formatValue(measurement, adjustedValue, settings), // Använd det justerade värdet för visning
    icon: getIconForMeasurement(measurement, value)
  };
  
  if (measurement === MEASUREMENT_TYPES.WIND_ANGLE || measurement === MEASUREMENT_TYPES.GUST_ANGLE) {
    measurementInfo.direction = getWindDirection(value);
  }
  
  result.measurements[measurement] = measurementInfo;
}

/**
 * Format a value based on its measurement type
 * 
 * @param {string} measurement - Measurement type
 * @param {*} value - Raw value
 * @param {Object} settings - User settings
 * @returns {string} Formatted value
 */
function formatValue(measurement, value, settings) {
  if (value === undefined || value === null) {
    return '';
  }
  
  switch (measurement) {
    case MEASUREMENT_TYPES.CO2:
      return value.toFixed(0);
      
    case MEASUREMENT_TYPES.NOISE:
      return value.toFixed(0);
      
    case MEASUREMENT_TYPES.HUMIDITY:
      return value.toFixed(0) + '%';
      
    case MEASUREMENT_TYPES.PRESSURE:
      return formatPressure(value, settings);
      
    case MEASUREMENT_TYPES.TEMPERATURE:
      return formatTemperature(value, settings);
      
    case MEASUREMENT_TYPES.RAIN:
    case MEASUREMENT_TYPES.RAIN_PER_HOUR:
    case MEASUREMENT_TYPES.RAIN_PER_DAY:
      return formatRain(value, settings);
      
    case MEASUREMENT_TYPES.WIND_STRENGTH:
    case MEASUREMENT_TYPES.GUST_STRENGTH:
      return formatWind(value, settings);
      
    case MEASUREMENT_TYPES.WIND_ANGLE:
    case MEASUREMENT_TYPES.GUST_ANGLE:
      return `${getWindDirection(value)} | ${value}°`;
      
    case MEASUREMENT_TYPES.TEMPERATURE_TREND:
    case MEASUREMENT_TYPES.PRESSURE_TREND:
      return formatTrend(value);
      
    default:
      return value.toString();
  }
}

/**
 * Format temperature based on user settings
 * 
 * @param {number} value - Raw temperature value (already converted if necessary)
 * @param {Object} settings - User settings
 * @returns {string} Formatted temperature
 */
function formatTemperature(value, settings) {
  // Värdet har redan konverterats till fahrenheit om det behövs
  // så vi behöver bara formatera det här
  return value.toFixed(1);
}

/**
 * Format pressure based on user preferences
 * 
 * @param {number} value - Raw pressure value
 * @param {Object} settings - User settings
 * @returns {string} Formatted pressure (without unit)
 */
function formatPressure(value, settings) {
  // Använd den specifika tryckinställningen
  const pressureUnit = settings.pressureUnit || 'mbar';
  
  switch (pressureUnit) {
    case 'mmHg':
      return (value / 1.333).toFixed(1);
    case 'inHg':
      return (value / 33.864).toFixed(2);
    case 'hpa':
    case 'mbar':
    default:
      return value.toFixed(0);
  }
}

/**
 * Format rain based on user preferences
 * 
 * @param {number} value - Raw rain value
 * @param {Object} settings - User settings
 * @returns {string} Formatted rain
 */
function formatRain(value, settings) {
  const unitSystem = settings.unitSystem || 'metric';
  
  if (unitSystem === 'imperial') {
    return (value / 25.4).toFixed(2);
  }
  
  return value.toFixed(1);
}

/**
 * Format wind based on user preferences
 * 
 * @param {number} value - Raw wind value
 * @param {Object} settings - User settings
 * @returns {string} Formatted wind
 */
function formatWind(value, settings) {
  let unit = 'kph';
  if (settings.user && settings.user.windUnit) {
    unit = settings.user.windUnit;
  }
  
  switch (unit) {
    case 'mph':
      return (value / 1.609).toFixed(1);
    case 'ms':
      return (value / 3.6).toFixed(1);
    case 'bft':
      return convertToBeaufort(value);
    case 'kn':
      return (value / 1.852).toFixed(1);
    case 'kph':
    default:
      return value.toFixed(1);
  }
}

/**
 * Format trend value
 * 
 * @param {string} value - Trend value
 * @returns {string} Formatted trend
 */
function formatTrend(value) {
  if (!value || value === 'undefined') {
    return chrome.i18n.getMessage('notAvailable');
  }
  
  return chrome.i18n.getMessage(value);
}

/**
 * Get unit for a measurement
 * 
 * @param {string} measurement - Measurement type
 * @param {Object} settings - User settings
 * @returns {string} Unit
 */
function getUnitForMeasurement(measurement, settings) {
  switch (measurement) {
    case MEASUREMENT_TYPES.CO2:
      return 'ppm';
    case MEASUREMENT_TYPES.NOISE:
      return 'dB';
    case MEASUREMENT_TYPES.HUMIDITY:
      return '%';
    case MEASUREMENT_TYPES.PRESSURE:
      // Använd tryckinställningen
      return settings.pressureUnit || 'mbar';
    case MEASUREMENT_TYPES.TEMPERATURE:
      // Använd temperaturinställningen
      return settings.temperatureUnit === 'fahrenheit' ? '°F' : '°C';
    case MEASUREMENT_TYPES.RAIN:
    case MEASUREMENT_TYPES.RAIN_PER_HOUR:
    case MEASUREMENT_TYPES.RAIN_PER_DAY:
      return settings.unitSystem === 'imperial' ? 'in/h' : 'mm/h';
    case MEASUREMENT_TYPES.WIND_STRENGTH:
    case MEASUREMENT_TYPES.GUST_STRENGTH:
      return settings.windUnit || 'kph';
    case MEASUREMENT_TYPES.WIND_ANGLE:
    case MEASUREMENT_TYPES.GUST_ANGLE:
      return '°';
    default:
      return '';
  }
}

/**
 * Get icon for a measurement
 * 
 * @param {string} measurement - Measurement type
 * @param {*} value - Value
 * @returns {string} Icon identifier
 */
function getIconForMeasurement(measurement, value) {
  switch (measurement) {
    case MEASUREMENT_TYPES.CO2:
      return 'leaf';  // Ändrat till grönt löv för CO2
    case MEASUREMENT_TYPES.HUMIDITY:
      return 'tint';  // Ändrat till blå droppe för luftfuktighet
    case MEASUREMENT_TYPES.TEMPERATURE:
      return 'thermometer-half';  // Ändrat till termometer för temperatur
    case MEASUREMENT_TYPES.NOISE:
      return 'volume-up';
    case MEASUREMENT_TYPES.PRESSURE:
      return 'gauge';
    case MEASUREMENT_TYPES.WIND_STRENGTH:
    case MEASUREMENT_TYPES.GUST_STRENGTH:
      return 'wind';
    case MEASUREMENT_TYPES.TEMPERATURE_TREND:
    case MEASUREMENT_TYPES.PRESSURE_TREND:
      return getTrendIcon(value);
    default:
      return '';
  }
}

/**
 * Get icon for a trend
 * 
 * @param {string} value - Trend value
 * @returns {string} Icon identifier
 */
function getTrendIcon(value) {
  if (value === 'stable') return 'right-circle';
  if (value === 'down') return 'down-circle';
  if (value === 'up') return 'up-circle';
  return 'x-circle';
}

/**
 * Get icon for battery level
 * 
 * @param {number} value - Battery percentage
 * @returns {string} Icon identifier
 */
function getBatteryIcon(value) {
  if (value > 80) return 'battery-full';
  if (value > 60) return 'battery-3';
  if (value > 40) return 'battery-2';
  if (value > 20) return 'battery-1';
  return 'battery';
}

/**
 * Get status for CO2 level
 * 
 * @param {number} value - CO2 value
 * @param {Object} settings - User settings
 * @returns {string} Status 'good', 'average', 'bad' or 'undefined'
 */
function getCO2Status(value, settings) {
  if (!value || value === 'undefined' || value < 0) {
    return 'undefined';
  }
  
  const thresholdBad = settings.thresholdCO2Bad || CO2_THRESHOLD_BAD;
  const thresholdAverage = settings.thresholdCO2Average || CO2_THRESHOLD_AVERAGE;
  
  if (value >= thresholdBad) return 'bad';
  if (value >= thresholdAverage) return 'average';
  return 'good';
}

/**
 * Convert wind speed to Beaufort scale
 * 
 * @param {number} value - Wind speed in km/h
 * @returns {number} Beaufort value
 */
function convertToBeaufort(value) {
  if (value < 1) return 0;
  if (value <= 5) return 1;
  if (value <= 11) return 2;
  if (value <= 19) return 3;
  if (value <= 28) return 4;
  if (value <= 38) return 5;
  if (value <= 49) return 6;
  if (value <= 61) return 7;
  if (value <= 74) return 8;
  if (value <= 88) return 9;
  if (value <= 102) return 10;
  if (value <= 117) return 11;
  return 12;
}

/**
 * Get wind direction from angle
 * 
 * @param {number} value - Angle in degrees
 * @returns {string} Direction (N, NE, etc.)
 */
function getWindDirection(value) {
  if (value < 11.25) return 'N';
  if (value < 33.75) return 'NNE';
  if (value < 56.25) return 'NE';
  if (value < 78.75) return 'ENE';
  if (value < 101.25) return 'E';
  if (value < 123.75) return 'ESE';
  if (value < 146.25) return 'SE';
  if (value < 168.75) return 'SSE';
  if (value < 191.25) return 'S';
  if (value < 213.75) return 'SSW';
  if (value < 236.25) return 'SW';
  if (value < 258.75) return 'WSW';
  if (value < 281.25) return 'W';
  if (value < 303.75) return 'WNW';
  if (value < 326.25) return 'NW';
  if (value < 348.75) return 'NNW';
  return 'N';
}