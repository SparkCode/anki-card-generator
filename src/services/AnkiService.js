/**
 * Service for interacting with Anki through AnkiConnect
 */

import { marked } from 'marked';

// Initialize marked options
marked.setOptions({
  mangle: false,
  headerIds: false
});

// For audio file handling
const AUDIO_FETCH_TIMEOUT = 10000; // 10 seconds timeout for audio downloads

// Constants
const API_URL = 'http://127.0.0.1:8765'; // Direct AnkiConnect URL
const API_VERSION = 6;
const API_TIMEOUT_MS = 1000; // 1 second timeout between requests
const MAX_RETRIES = 3; // Maximum number of retries for failed requests

// Track the last API call time
let lastCallTime = 0;

/**
 * Sleep utility function to create a delay
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ensure we wait the proper time between API calls
 * @param {string} action - The action being performed (for logging)
 * @returns {Promise<void>}
 */
const enforceTimeout = async (action) => {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  
  // If less than the timeout has passed since the last call, wait for the remainder
  if (timeSinceLastCall < API_TIMEOUT_MS && lastCallTime !== 0) {
    const waitTime = API_TIMEOUT_MS - timeSinceLastCall;
    console.log(`Throttling Anki API call to "${action}": waiting ${waitTime}ms`);
    await sleep(waitTime);
  }
};

/**
 * Make a request to the AnkiConnect API with retry functionality
 * @param {string} action - The action to perform
 * @param {Object} params - Parameters for the action
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<any>} - The response from the API
 */
const invokeAnkiConnect = async (action, params = {}, retryCount = 0) => {
  try {
    // Enforce timeout between requests
    await enforceTimeout(action);
    
    // Update the last call time BEFORE making the request
    // This ensures even failed requests contribute to throttling
    lastCallTime = Date.now();
    console.log(`Making Anki API call: ${action}`);
    
    const payload = {
      action,
      version: API_VERSION,
      params
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.result;
  } catch (error) {
    // Handle request failures with retry logic
    if (retryCount < MAX_RETRIES) {
      const nextRetry = retryCount + 1;
      const delayMs = nextRetry * API_TIMEOUT_MS; // Progressive backoff
      
      console.warn(`Anki API call to "${action}" failed (attempt ${nextRetry}/${MAX_RETRIES}). Retrying in ${delayMs}ms...`);
      console.error(error);
      
      await sleep(delayMs);
      return invokeAnkiConnect(action, params, nextRetry);
    }
    
    // Final attempt failed
    if (error.message === 'Failed to fetch') {
      throw new Error('Could not connect to Anki. Please make sure Anki is running and AnkiConnect is installed.');
    }
    throw error;
  }
};

/**
 * Test connection to Anki
 * @returns {Promise<boolean>} - True if connection is successful
 */
export const testConnection = async () => {
  try {
    const version = await invokeAnkiConnect('version');
    return version >= API_VERSION;
  } catch (error) {
    return false;
  }
};

/**
 * Get all available decks from Anki
 * @returns {Promise<string[]>} - Array of deck names
 */
export const getDecks = async () => {
  return invokeAnkiConnect('deckNames');
};

/**
 * Convert markdown text to HTML
 * @param {string} markdownText - Markdown text to convert
 * @returns {string} - HTML version of the markdown
 */
export const markdownToHtml = (markdownText) => {
  // Add prism CSS styles for syntax highlighting in Anki
  const prismCss = `
    <style>
      code { background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
      pre { background-color: #f5f5f5; padding: 8px; border-radius: 4px; overflow-x: auto; }
      pre code { background-color: transparent; padding: 0; }
      
      /* PrismJS 1.29.0 - Basic syntax highlighting */
      .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #708090; }
      .token.punctuation { color: #999; }
      .token.namespace { opacity: .7; }
      .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol { color: #905; }
      .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin { color: #690; }
      .token.operator, .token.entity, .token.url, .language-css .token.string, .token.variable { color: #9a6e3a; }
      .token.atrule, .token.attr-value, .token.keyword { color: #07a; }
      .token.function, .token.class-name { color: #DD4A68; }
      .token.regex, .token.important { color: #e90; }
      .token.important, .token.bold { font-weight: bold; }
      .token.italic { font-style: italic; }
      .token.entity { cursor: help; }
    </style>
  `;
  
  // Add the style tag and then the converted markdown
  return prismCss + marked(markdownText, {
    gfm: true,
    breaks: true,
    highlight: function(code, lang) {
      // Basic syntax highlighting for code blocks
      if (lang) {
        return `<pre class="language-${lang}"><code class="language-${lang}">${code}</code></pre>`;
      }
      return `<pre><code>${code}</code></pre>`;
    }
  });
};

/**
 * Parse the AI-generated content into Anki card fields
 * @param {string} content - The AI-generated card content
 * @param {boolean} convertToHtml - Whether to convert markdown to HTML
 * @returns {Object} - The front and back content
 */
export const parseCardContent = (content, convertToHtml = true) => {
  const frontMatch = content.match(/==front part==([\s\S]*?)==front part==/);
  const backMatch = content.match(/==bottom part==([\s\S]*?)==bottom part==/);
  
  const frontText = frontMatch ? frontMatch[1].trim() : '';
  const backText = backMatch ? backMatch[1].trim() : '';
  
  if (convertToHtml) {
    return {
      front: markdownToHtml(frontText),
      back: markdownToHtml(backText)
    };
  }
  
  return { front: frontText, back: backText };
};

/**
 * Store media file directly from URL
 * @param {string} url - URL of the file to download
 * @param {string} filename - Filename to save as
 * @returns {Promise<string>} - The filename used in Anki
 */
export const storeMediaFileFromUrl = async (url, filename) => {
  try {
    console.log(`Storing media file from URL: ${url} as ${filename}`);
    // Use Anki's storeMediaFile API with url parameter
    const result = await invokeAnkiConnect('storeMediaFile', {
      filename,
      url
    });
    
    return result || filename;
  } catch (error) {
    console.error(`Error storing media file from URL ${url}:`, error);
    throw error;
  }
};

/**
 * Add a note to Anki
 * @param {string} deckName - The name of the deck to add the note to
 * @param {string} content - The AI-generated card content
 * @param {boolean} allowDuplicate - Whether to allow duplicate cards
 * @param {Object} pronunciationInfo - Optional pronunciation information from dictionary
 * @returns {Promise<number>} - The ID of the created note
 */
export const addNote = async (deckName, content, allowDuplicate = false, pronunciationInfo = null) => {
  let { front, back } = parseCardContent(content, true); // Convert to HTML
  
  if (!front || !back) {
    throw new Error('Failed to parse card content. Make sure the content contains both front and back parts.');
  }
  
  // Process pronunciation info if available
  if (pronunciationInfo) {
    const { usAudioUrl, ukAudioUrl, usPronunciation, ukPronunciation, word } = pronunciationInfo;
    
    // Create safe filenames based on the word
    const safeWord = word ? word.replace(/\s+/g, '_').toLowerCase().replace(/[^\w-]/g, '') : 'word';
    let audioHtml = '';
    
    try {
      // Store US pronunciation
      if (usAudioUrl) {
        const usAudioFilename = `${safeWord}_us.mp3`;
        // Have Anki download the file directly from the URL
        await storeMediaFileFromUrl(usAudioUrl, usAudioFilename);
        audioHtml += `🇺🇸 ${usPronunciation || ''} [sound:${usAudioFilename}] `;
      }
      
      // Store UK pronunciation
      if (ukAudioUrl) {
        const ukAudioFilename = `${safeWord}_uk.mp3`;
        // Have Anki download the file directly from the URL
        await storeMediaFileFromUrl(ukAudioUrl, ukAudioFilename);
        audioHtml += `🇬🇧 ${ukPronunciation || ''} [sound:${ukAudioFilename}] `;
      }
      
      // Add a line break before the audio references
      if (audioHtml) {
        audioHtml = '<br/><br/>' + audioHtml;
        front = front + audioHtml; // Audio at the end of the card
      }
    } catch (error) {
      console.error('Error storing audio files:', error);
      // Continue without audio if storing fails
    }
  }
  
  const note = {
    deckName,
    modelName: 'Basic (and reversed card)',
    fields: {
      Front: front,
      Back: back
    },
    options: {
      allowDuplicate: allowDuplicate
    },
    tags: ['anki-card-generator']
  };
  
  try {
    return await invokeAnkiConnect('addNote', { note });
  } catch (error) {
    if (error.message.includes('duplicate') && !allowDuplicate) {
      throw new Error('This card appears to be a duplicate. You can enable "Allow Duplicates" to add it anyway.');
    }
    throw error;
  }
};

/**
 * Open Anki's Add Cards dialog with prefilled content
 * This shows the Anki native UI dialog instead of directly adding the card
 * @param {string} deckName - The name of the deck
 * @param {string} content - The AI-generated card content
 * @param {boolean} allowDuplicate - Whether to allow duplicate cards
 * @param {Object} pronunciationInfo - Optional pronunciation information from dictionary
 * @returns {Promise<number>} - The ID of the note that would be created
 */
export const guiAddCards = async (deckName, content, allowDuplicate = false, pronunciationInfo = null) => {
  let { front, back } = parseCardContent(content, true); // Convert to HTML
  
  if (!front || !back) {
    throw new Error('Failed to parse card content. Make sure the content contains both front and back parts.');
  }
  
  // Process pronunciation info if available
  if (pronunciationInfo) {
    const { usAudioUrl, ukAudioUrl, usPronunciation, ukPronunciation, word } = pronunciationInfo;
    
    // Create safe filenames based on the word
    const safeWord = word ? word.replace(/\s+/g, '_').toLowerCase().replace(/[^\w-]/g, '') : 'word';
    let audioHtml = '';
    
    try {
      // Store US pronunciation
      if (usAudioUrl) {
        const usAudioFilename = `${safeWord}_us.mp3`;
        // Have Anki download the file directly from the URL
        await storeMediaFileFromUrl(usAudioUrl, usAudioFilename);
        audioHtml += `🇺🇸 ${usPronunciation || ''} [sound:${usAudioFilename}] `;
      }
      
      // Store UK pronunciation
      if (ukAudioUrl) {
        const ukAudioFilename = `${safeWord}_uk.mp3`;
        // Have Anki download the file directly from the URL
        await storeMediaFileFromUrl(ukAudioUrl, ukAudioFilename);
        audioHtml += `🇬🇧 ${ukPronunciation || ''} [sound:${ukAudioFilename}] `;
      }
      
      // Add a line break before the audio references
      if (audioHtml) {
        audioHtml = '<br/><br/>' + audioHtml;
        front = front + audioHtml; // Audio at the end of the card
      }
    } catch (error) {
      console.error('Error storing audio files:', error);
      // Continue without audio if storing fails
    }
  }
  
  const note = {
    deckName,
    modelName: 'Basic (and reversed card)',
    fields: {
      Front: front,
      Back: back
    },
    options: {
      allowDuplicate: allowDuplicate
    },
    tags: ['anki-card-generator']
  };
  
  return invokeAnkiConnect('guiAddCards', { note });
};

/**
 * Get note info by ID
 * @param {number} noteId - The note ID
 * @returns {Promise<Object>} - Note information
 */
export const getNoteInfo = async (noteId) => {
  const result = await invokeAnkiConnect('notesInfo', { notes: [noteId] });
  return result[0];
};

/**
 * Fetches the audio file from the URL and returns it as a base64 string
 * @param {string} audioUrl - URL of the audio file
 * @returns {Promise<string>} - Base64 encoded audio data
 */
export const fetchAudioAsBase64 = async (audioUrl) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUDIO_FETCH_TIMEOUT);
    
    // First try direct access - this may work if no CORS restrictions
    let response;
    let errorMessage = '';
    
    try {
      response = await fetch(audioUrl, { 
        signal: controller.signal,
        mode: 'cors'
      });
    } catch (directError) {
      console.log('Direct fetch failed, trying CORS proxy:', directError);
      errorMessage = directError.message;
      
      // If direct access fails, try multiple CORS proxies
      const proxyUrls = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(audioUrl)}`,
        `https://cors-anywhere.herokuapp.com/${audioUrl}`,
        `https://corsproxy.io/?${encodeURIComponent(audioUrl)}`
      ];
      
      // Try each proxy until one works
      for (const proxyUrl of proxyUrls) {
        try {
          response = await fetch(proxyUrl, { 
            signal: controller.signal,
            headers: {
              'Origin': window.location.origin,
            }
          });
          
          if (response.ok) {
            console.log('Successfully fetched audio with proxy:', proxyUrl);
            break; // Found a working proxy
          }
        } catch (proxyError) {
          console.log(`Proxy ${proxyUrl} failed:`, proxyError);
          errorMessage += ` | Proxy error: ${proxyError.message}`;
        }
      }
    }
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }
    
    const audioBlob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Get the base64 string (remove the data URL prefix)
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  } catch (error) {
    console.error('Error fetching audio:', error);
    throw error;
  }
};

/**
 * Stores an audio file in Anki's media collection
 * @param {string} filename - Desired filename for the audio file
 * @param {string} base64Data - Base64 encoded audio data
 * @returns {Promise<string>} - The filename used in Anki
 */
export const storeAudioFile = async (filename, base64Data) => {
  try {
    await invokeAnkiConnect('storeMediaFile', {
      filename,
      data: base64Data
    });
    
    return filename;
  } catch (error) {
    console.error('Error storing audio in Anki:', error);
    throw error;
  }
};

/**
 * Downloads and stores an audio file in Anki's media collection
 * @param {string} audioUrl - URL of the audio file
 * @param {string} preferredFilename - Preferred filename for the stored audio
 * @returns {Promise<string|null>} - Filename of the stored audio, or null if failed
 */
export const downloadAndStoreAudio = async (audioUrl, preferredFilename) => {
  if (!audioUrl) return null;
  
  // Generate safe filename from URL if none provided
  const filename = preferredFilename || 
    `audio_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp3`;
  
  // Try primary URL first
  try {
    // Fetch the audio as base64
    const base64Data = await fetchAudioAsBase64(audioUrl);
    
    // Store in Anki
    return await storeAudioFile(filename, base64Data);
  } catch (primaryError) {
    console.error('Primary audio URL failed:', primaryError);    
    // If all attempts failed, log and return null
    console.error('All audio download attempts failed');
    return null;
  }
};

/**
 * Extracts word and pronunciations from the card content
 * @param {string} content - The card content
 * @returns {Object} - The word and pronunciations
 */
export const extractWordAndPronunciations = (content) => {
  // Try to extract the word and pronunciation from the front card
  const frontMatch = content.match(/==front part==([\s\S]*?)==front part==/);
  if (!frontMatch) return null;
  
  const frontContent = frontMatch[1];
  
  // Look for bold word with pronunciation
  const boldWordWithPronMatch = frontContent.match(/\*\*([^*]+)\*\*\s*(\/(.*?)\/)/);
  
  if (boldWordWithPronMatch) {
    return {
      word: boldWordWithPronMatch[1].trim(),
      pronunciation: boldWordWithPronMatch[3].trim()
    };
  }
  
  // If no pronunciation format found, just get the bold word
  const boldWordMatch = frontContent.match(/\*\*([^*]+)\*\*/);
  if (boldWordMatch) {
    return {
      word: boldWordMatch[1].trim(),
      pronunciation: null
    };
  }
  
  return null;
};
