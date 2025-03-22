/**
 * Service for caching TTS audio files in IndexedDB
 * Allows storing and retrieving audio files to avoid duplicate generation
 */

const DB_NAME = 'AnkiTTSAudioCache';
const STORE_NAME = 'audioFiles';
const DB_VERSION = 1;

class AudioDBService {
  constructor() {
    this.db = null;
    this.dbReady = this.initDatabase();
  }

  /**
   * Initialize the IndexedDB database for audio storage
   * @returns {Promise<IDBDatabase>} Promise resolving to the database instance
   */
  async initDatabase() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      // Open a connection to the database
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Handle database upgrade/creation
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create the audio files store with key as key path
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          
          // Create useful indexes
          store.createIndex('cardId', 'cardId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('text', 'text', { unique: false });
        }
      };

      // Handle connection success
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      // Handle connection error
      request.onerror = (event) => {
        console.error('Failed to open IndexedDB for audio cache:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Generate a storage key for a TTS audio based on the sentence
   * @param {string} cardId - Unique ID of the card (no longer used as primary key)
   * @param {string} text - Text that was converted to speech (used as the primary key)
   * @returns {string} A key for storage based on the sentence
   */
  generateKey(cardId, text) {
    // Use the sentence text directly as the key
    // Normalize it by trimming whitespace and converting to lowercase
    if (!text || text.trim().length === 0) {
      // Fallback to cardId as before if text is empty
      return cardId;
    }
    
    // Clean and normalize the text for use as a key
    return text.trim().toLowerCase();
  }

  /**
   * Store audio data in the IndexedDB cache
   * @param {string} cardId - Unique ID of the card
   * @param {string} text - Text that was converted to speech
   * @param {Blob} audioBlob - Audio data to store
   * @returns {Promise<string>} The key used to store the audio data
   */
  async storeAudio(cardId, text, audioBlob) {
    await this.dbReady;
    
    const key = this.generateKey(cardId, text);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const record = {
        key,
        cardId,
        text,
        audioBlob,
        createdAt: Date.now()
      };
      
      const request = store.put(record);
      
      request.onsuccess = () => resolve(key);
      request.onerror = (event) => {
        console.error('Error storing audio in IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Get audio data from the IndexedDB cache
   * @param {string} cardId - Unique ID of the card (not used for lookup)
   * @param {string} text - Text that was converted to speech (used as key)
   * @returns {Promise<Blob|null>} Audio blob if found, null otherwise
   */
  async getAudio(cardId, text) {
    await this.dbReady;
    
    const key = this.generateKey(cardId, text);
    
    return new Promise((resolve) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.audioBlob : null);
      };
      
      request.onerror = (event) => {
        console.error('Error retrieving audio from IndexedDB:', event.target.error);
        resolve(null);
      };
    });
  }

  /**
   * Delete audio data from the IndexedDB cache
   * @param {string} cardId - Unique ID of the card (not used for lookup)
   * @param {string} text - Text that was converted to speech (used as key)
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteAudio(cardId, text) {
    await this.dbReady;
    
    const key = this.generateKey(cardId, text);
    
    return new Promise((resolve) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.delete(key);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  /**
   * Delete all audio data for a specific card
   * @param {string} cardId - Unique ID of the card
   * @returns {Promise<boolean>} True if deletion was successful
   */
  async deleteCardAudio(cardId) {
    await this.dbReady;
    
    return new Promise((resolve) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('cardId');
      
      const request = index.openCursor(IDBKeyRange.only(cardId));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve(true);
        }
      };
      
      request.onerror = () => resolve(false);
    });
  }

  /**
   * Clean up old audio files to prevent excessive storage use
   * @param {number} daysToKeep - Number of days to keep files before deletion
   * @returns {Promise<number>} Number of files deleted
   */
  async cleanupOldFiles(daysToKeep = 30) {
    await this.dbReady;
    
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    return new Promise((resolve) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      
      let deleteCount = 0;
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deleteCount++;
          cursor.continue();
        } else {
          resolve(deleteCount);
        }
      };
      
      request.onerror = () => resolve(0);
    });
  }
}

// Export as a singleton
const audioDB = new AudioDBService();
export default audioDB; 