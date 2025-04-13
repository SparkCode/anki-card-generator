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
   * Stores an audio blob in the database
   * @param {string} word - The word associated with the audio
   * @param {string} sentence - The sentence associated with the audio
   * @param {Blob} audioBlob - The audio blob to store
   * @returns {Promise<string|null>} - The filename or null if storage failed
   */
  async storeAudio(word, sentence, audioBlob) {
    try {
      if (!word || !sentence || !audioBlob) {
        console.error('Missing required parameters for storing audio');
        return null;
      }

      // Verify the audioBlob is actually a Blob or File
      if (!(audioBlob instanceof Blob)) {
        console.error('audioBlob must be an instance of Blob');
        return null;
      }

      const db = await this.openDB();
      
      // Use a Promise to properly handle the transaction
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(['audioStore'], 'readwrite');
          const store = transaction.objectStore('audioStore');
          
          // Generate filename for the audio
          const filename = `tts_${word.replace(/\s+/g, '_')}_${Date.now()}.mp3`;
          
          // Check if we already have an entry for this sentence
          const sentenceIndex = store.index('sentenceIndex');
          
          // We need to use request pattern for IndexedDB operations
          const getRequest = sentenceIndex.get(sentence);
          
          getRequest.onsuccess = (event) => {
            const existingEntry = event.target.result;
            let request;
            
            try {
              if (existingEntry) {
                // Update the existing entry
                existingEntry.audioBlob = audioBlob;
                existingEntry.filename = filename;
                existingEntry.timestamp = Date.now();
                request = store.put(existingEntry);
              } else {
                // Create a new entry - make sure to use a unique ID
                const entry = {
                  id: Date.now() + '-' + Math.random().toString(36).substring(2, 15),
                  word,
                  sentence,
                  audioBlob,
                  filename,
                  timestamp: Date.now()
                };
                
                request = store.add(entry);
              }
              
              request.onsuccess = () => {
                console.log(`Audio ${existingEntry ? 'updated' : 'stored'} for sentence:`, sentence);
                resolve(filename);
              };
              
              request.onerror = (err) => {
                console.error('Error in IndexedDB operation:', err.target.error);
                reject(err.target.error);
              };
            } catch (err) {
              console.error('Error preparing data for IndexedDB:', err);
              reject(err);
            }
          };
          
          getRequest.onerror = (err) => {
            console.error('Error checking for existing entry:', err.target.error);
            reject(err.target.error);
          };
          
          // Handle transaction errors
          transaction.onerror = (err) => {
            console.error('Transaction error:', err.target.error);
            reject(err.target.error);
          };
        } catch (err) {
          console.error('Error setting up transaction:', err);
          reject(err);
        }
      });
    } catch (error) {
      console.error('Error storing audio in DB:', error);
      return null;
    }
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

  /**
   * Retrieves audio data for a specific sentence
   * @param {string} sentence - The sentence to retrieve audio for
   * @returns {Promise<Object|null>} - The audio data or null if not found
   */
  async getAudioForSentence(sentence) {
    try {
      if (!sentence || sentence.trim().length === 0) {
        console.log('Empty sentence provided to getAudioForSentence');
        return null;
      }
      
      const db = await this.openDB();
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(['audioStore'], 'readonly');
          const store = transaction.objectStore('audioStore');
          
          // Use an index to search by sentence
          const index = store.index('sentenceIndex');
          const request = index.get(sentence);
          
          request.onsuccess = (event) => {
            const result = event.target.result;
            
            if (!result) {
              console.log('No audio found for sentence:', sentence);
              resolve(null);
              return;
            }
            
            console.log('Found audio in database for sentence:', sentence);
            resolve({
              blob: result.audioBlob,
              filename: result.filename || `tts_audio_${Date.now()}.mp3`,
              word: result.word,
              sentence: result.sentence
            });
          };
          
          request.onerror = (event) => {
            console.error('Error getting audio from DB:', event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          console.error('Exception in getAudioForSentence transaction:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error in getAudioForSentence:', error);
      return null;
    }
  }

  /**
   * Opens the database connection
   * @returns {Promise<IDBDatabase>} - The opened database
   */
  async openDB() {
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open('AudioDB', 2);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          console.log('Upgrading AudioDB database schema');
          
          // Create the audio store if it doesn't exist
          if (!db.objectStoreNames.contains('audioStore')) {
            console.log('Creating audioStore objectStore');
            const audioStore = db.createObjectStore('audioStore', { keyPath: 'id' });
            
            // Create indexes for efficient retrieval
            audioStore.createIndex('wordIndex', 'word', { unique: false });
            audioStore.createIndex('sentenceIndex', 'sentence', { unique: true });
            audioStore.createIndex('timestampIndex', 'timestamp', { unique: false });
            
            console.log('AudioDB indexes created');
          } else {
            // Check if we need to add the sentenceIndex
            const transaction = event.target.transaction;
            const audioStore = transaction.objectStore('audioStore');
            
            if (!audioStore.indexNames.contains('sentenceIndex')) {
              console.log('Adding missing sentenceIndex to audioStore');
              audioStore.createIndex('sentenceIndex', 'sentence', { unique: true });
            }
          }
        };
        
        request.onsuccess = (event) => {
          console.log('Successfully opened AudioDB database');
          resolve(event.target.result);
        };
        
        request.onerror = (event) => {
          console.error('Failed to open audio database:', event.target.error);
          reject(new Error('Failed to open audio database: ' + event.target.error));
        };
      } catch (error) {
        console.error('Exception during openDB:', error);
        reject(error);
      }
    });
  }
}

// Export as a singleton
const audioDB = new AudioDBService();
export default audioDB; 