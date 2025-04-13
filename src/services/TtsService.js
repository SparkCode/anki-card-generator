/**
 * Service for generating text-to-speech audio using OpenAI's API
 */

import { getLocalStorageItem } from '../utils/localStorage';

// Available voices from OpenAI's TTS API
const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer'];

// TTS model options
const MODELS = {
  standard: 'tts-1',      // Faster, lower quality
  hd: 'tts-1-hd'          // Higher quality, slower
};

// OpenAI API endpoints
const TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';

// Storage key for OpenAI API key
const OPENAI_API_KEY_STORAGE_KEY = 'openai_api_key';

/**
 * Get the OpenAI API key from local storage
 * @returns {string|null} - The stored API key or null if not found
 */
export const getOpenAIApiKey = () => {
  return getLocalStorageItem(OPENAI_API_KEY_STORAGE_KEY, false);
};

/**
 * Save the OpenAI API key to local storage
 * @param {string} apiKey - The OpenAI API key
 */
export const saveOpenAIApiKey = (apiKey) => {
  localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, apiKey);
};

/**
 * Check if the OpenAI API key exists in local storage
 * @returns {boolean} - True if the API key exists
 */
export const hasOpenAIApiKey = () => {
  return !!getOpenAIApiKey();
};

/**
 * Select a random voice from the available options
 * @returns {string} - A randomly selected voice name
 */
const getRandomVoice = () => {
  return VOICES[Math.floor(Math.random() * VOICES.length)];
};

/**
 * Generate audio from a text input using OpenAI's TTS API
 * @param {string} text - Text to convert to speech
 * @param {string} [voice] - Voice to use (defaults to random voice)
 * @param {string} [model=tts-1] - Model to use (tts-1 or tts-1-hd)
 * @param {string} [format=mp3] - Output format (mp3, opus, aac, flac, wav, pcm)
 * @returns {Promise<ArrayBuffer>} - ArrayBuffer containing the audio data
 * @throws {Error} - If the API call fails or API key is missing
 */
export const generateAudio = async (
  text, 
  voice = getRandomVoice(), 
  model = MODELS.standard,
  format = 'mp3'
) => {
  const apiKey = getOpenAIApiKey();
  
  if (!apiKey) {
    throw new Error('OpenAI API key is required for text-to-speech generation');
  }
  
  try {
    const response = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        response_format: format
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI TTS API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`
      );
    }
    
    // Get the audio data as an ArrayBuffer
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Failed to generate TTS audio:', error);
    throw error;
  }
};

/**
 * Generate speech audio for a language learning example
 * @param {string} word - The word being learned
 * @param {string} exampleSentence - A sample sentence using the word
 * @returns {Promise<{filename: string, audioData: ArrayBuffer}>} - The audio data and suggested filename
 */
export const generateExampleAudio = async (word, exampleSentence) => {
  if (!exampleSentence) {
    throw new Error('Example sentence is required for audio generation');
  }
  
  // Use the example sentence for TTS
  const audioData = await generateAudio(exampleSentence);
  
  // Create a clean filename based on the word
  const safeWord = word.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]/g, '');
  const voice = getRandomVoice(); // We'll include the voice in the filename
  const filename = `${safeWord}_example_${voice}.mp3`;
  
  return {
    filename,
    audioData
  };
};
