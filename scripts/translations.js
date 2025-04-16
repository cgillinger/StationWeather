/**
 * StationWeather Edge Extension
 * Translations Module - Custom language handling
 */

// Global translations storage
let currentTranslations = {};
let fallbackTranslations = {};
const DEFAULT_LANGUAGE = 'en';

/**
 * Initialize the translation system
 * @param {string} language - The language code to use
 */
export async function initTranslations(language) {
  try {
    // Load default language first (for fallback)
    fallbackTranslations = await loadLanguageFile(DEFAULT_LANGUAGE);
    
    // Then load the requested language
    if (language && language !== DEFAULT_LANGUAGE) {
      currentTranslations = await loadLanguageFile(language);
    } else {
      currentTranslations = fallbackTranslations;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize translations:', error);
    return false;
  }
}

/**
 * Load a language file
 * @param {string} language - The language code to load
 * @returns {Object} The loaded translations
 */
async function loadLanguageFile(language) {
  try {
    const response = await fetch(chrome.runtime.getURL(`_locales/${language}/messages.json`));
    
    if (!response.ok) {
      throw new Error(`Failed to load language file for ${language}: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error loading language file for ${language}:`, error);
    return {};
  }
}

/**
 * Get a translated message
 * @param {string} messageName - The message ID
 * @param {any[]} substitutions - Any substitutions to include
 * @returns {string} The translated message
 */
export function getMessage(messageName, substitutions = []) {
  // First try to get from current language
  const currentMessage = getMessageFromTranslations(currentTranslations, messageName, substitutions);
  if (currentMessage) {
    return currentMessage;
  }
  
  // Fall back to default language
  const fallbackMessage = getMessageFromTranslations(fallbackTranslations, messageName, substitutions);
  if (fallbackMessage) {
    return fallbackMessage;
  }
  
  // Last resort: use Chrome's i18n system
  return chrome.i18n.getMessage(messageName, substitutions);
}

/**
 * Get a message from a translations object
 * @param {Object} translations - The translations object
 * @param {string} messageName - The message ID
 * @param {any[]} substitutions - Any substitutions to include
 * @returns {string|null} The translated message or null if not found
 */
function getMessageFromTranslations(translations, messageName, substitutions) {
  if (!translations || !translations[messageName] || !translations[messageName].message) {
    return null;
  }
  
  let message = translations[messageName].message;
  
  // Handle substitutions if any
  if (substitutions && substitutions.length > 0) {
    substitutions.forEach((substitution, index) => {
      message = message.replace(`$${index + 1}`, substitution);
    });
    
    // Handle named placeholders
    if (translations[messageName].placeholders) {
      Object.entries(translations[messageName].placeholders).forEach(([key, placeholder]) => {
        if (placeholder && placeholder.content) {
          const placeholderContent = placeholder.content;
          // Extract the index from the content (e.g., "$1" -> 1)
          const match = placeholderContent.match(/\$(\d+)/);
          if (match && match[1]) {
            const index = parseInt(match[1]) - 1;
            if (index >= 0 && index < substitutions.length) {
              message = message.replace(`$${key.toUpperCase()}$`, substitutions[index]);
            }
          }
        }
      });
    }
  }
  
  return message;
}

/**
 * Apply translations to the current page
 */
export function applyTranslations() {
  // Find all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      element.textContent = getMessage(key);
    }
  });
  
  // Find all elements with data-i18n-placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (key) {
      element.placeholder = getMessage(key);
    }
  });
  
  // Find all elements with data-i18n-title attribute
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    if (key) {
      element.title = getMessage(key);
    }
  });
}