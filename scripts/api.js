/**
 * StationWeather Edge Extension
 * API Module - Handles communication with weather station API
 * 
 * Based on the MagicMirror module by Christopher Fenner
 * https://github.com/CFenner/MMM-Netatmo
 */

const API_BASE = 'https://api.netatmo.com';
const AUTH_ENDPOINT = '/oauth2/token';
const DATA_ENDPOINT = '/api/getstationsdata';

/**
 * Fetch weather station data from API
 * 
 * @param {string} accessToken - The OAuth access token
 * @returns {Promise<Object>} The API response data
 */
export async function fetchWeatherData(accessToken) {
  try {
    const response = await fetch(`${API_BASE}${DATA_ENDPOINT}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Authentication failed. Please refresh your access token.');
      }
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`API error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    return data.body;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}

/**
 * Refresh the OAuth access token
 * 
 * @param {string} clientId - The application client ID
 * @param {string} clientSecret - The application client secret
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<Object>} The new token data
 */
export async function refreshAccessToken(clientId, clientSecret, refreshToken) {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    
    const response = await fetch(`${API_BASE}${AUTH_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });
    
    if (!response.ok) {
      throw new Error(`Token refresh failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Token refresh error: ${data.error_description || data.error}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

/**
 * Test authentication with the provided credentials
 * 
 * @param {Object} authData - Object containing clientId, clientSecret, and refreshToken
 * @returns {Promise<Object>} Result of the authentication test
 */
export async function testAuthentication(authData) {
  try {
    const { clientId, clientSecret, refreshToken } = authData;
    
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing required authentication parameters');
    }
    
    // Try to get an access token
    const tokenData = await refreshAccessToken(clientId, clientSecret, refreshToken);
    
    // Make a test request to the API
    const testData = await fetchWeatherData(tokenData.access_token);
    
    return {
      success: true,
      token: tokenData,
      userData: testData.user
    };
  } catch (error) {
    console.error('Authentication test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}