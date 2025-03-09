// Local storage keys
const API_KEY_STORAGE_KEY = 'openrouter_api_key';
const CHAT_HISTORY_STORAGE_KEY = 'anki_chat_history';

/**
 * Get item from local storage with optional parsing of JSON data
 * @param {string} key - The storage key
 * @param {boolean} parse - Whether to parse the value as JSON (default: true)
 * @returns {any} - The stored value or null if not found
 */
export const getLocalStorageItem = (key, parse = true) => {
  const item = localStorage.getItem(key);
  if (item === null) return null;
  
  if (parse) {
    try {
      return JSON.parse(item);
    } catch (e) {
      console.warn(`Failed to parse localStorage item '${key}' as JSON. Returning as string.`);
      return item;
    }
  }
  
  return item;
};

/**
 * Set item in local storage with automatic stringification of objects
 * @param {string} key - The storage key
 * @param {any} value - The value to store
 */
export const setLocalStorageItem = (key, value) => {
  const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
  localStorage.setItem(key, valueToStore);
};

/**
 * Save API key to local storage
 * @param {string} apiKey - The OpenRouter API key
 */
export const saveApiKey = (apiKey) => {
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
};

/**
 * Get API key from local storage
 * @returns {string|null} - The stored API key or null if not found
 */
export const getApiKey = () => {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

/**
 * Check if API key exists in local storage
 * @returns {boolean} - True if API key exists
 */
export const hasApiKey = () => {
  return !!getApiKey();
};

/**
 * Get chat history from local storage
 * @returns {Array} - The stored chat history or empty array if not found
 */
export const getChatHistory = () => {
  const history = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
  return history ? JSON.parse(history) : [];
};

/**
 * Save chat history to local storage
 * @param {Array} history - The chat history array
 */
export const saveChatHistory = (history) => {
  localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(history));
};

/**
 * Add a new entry to chat history
 * @param {Object} entry - The chat entry to add
 */
export const addChatHistoryEntry = (entry) => {
  const history = getChatHistory();
  history.unshift({
    ...entry,
    timestamp: new Date().toISOString(),
    id: Date.now().toString()
  });
  saveChatHistory(history);
};

/**
 * Clear all chat history
 */
export const clearChatHistory = () => {
  localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
};

/**
 * Delete a specific chat history entry by id
 * @param {string} entryId - The id of the entry to delete
 */
export const deleteChatHistoryEntry = (entryId) => {
  const history = getChatHistory();
  const updatedHistory = history.filter(entry => entry.id !== entryId);
  saveChatHistory(updatedHistory);
};
