/**
 * Service for interacting with the dictionary API
 */

/**
 * Fetch word information from the dictionary API
 * @param {string} word - The word to look up
 * @returns {Promise<Object>} - The dictionary data
 */
export const fetchWordInfo = async (word) => {
  try {
    const response = await fetch(`https://dictionary-api.eliaschen.dev/api/dictionary/en/${encodeURIComponent(word.trim().toLowerCase())}`);
    
    if (!response.ok) {
      throw new Error(`Dictionary API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if the API returned an error object
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching dictionary data:', error);
    throw error;
  }
};

/**
 * Extract audio URLs and pronunciation info from the dictionary data
 * @param {Object} dictionaryData - The data from the dictionary API
 * @returns {Object} - Audio URLs and pronunciation
 */
export const extractPronunciationInfo = (dictionaryData) => {
  // If no pronunciation data is available, return empty values
  if (!dictionaryData?.pronunciation || !dictionaryData.pronunciation.length) {
    return {
      word: dictionaryData?.word || null,
      usAudioUrl: null,
      ukAudioUrl: null,
      usPronunciation: null,
      ukPronunciation: null
    };
  }

  // Extract US and UK pronunciation info
  let usAudioUrl = null;
  let ukAudioUrl = null;
  let usPronunciation = null;
  let ukPronunciation = null;

  // Find US pronunciation
  const usPronunciationData = dictionaryData.pronunciation.find(p => p.lang === 'us');
  if (usPronunciationData) {
    // Use Google static audio URLs directly based on the word
    usAudioUrl = dictionaryData.word ? 
      `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${dictionaryData.word.toLowerCase()}--_us_1.mp3` :
      usPronunciationData.url;
    usPronunciation = usPronunciationData.pron;
  }

  // Find UK pronunciation
  const ukPronunciationData = dictionaryData.pronunciation.find(p => p.lang === 'uk');
  if (ukPronunciationData) {
    // Use Google static audio URLs directly based on the word
    ukAudioUrl = dictionaryData.word ? 
      `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${dictionaryData.word.toLowerCase()}--_gb_1.mp3` :
      ukPronunciationData.url;
    ukPronunciation = ukPronunciationData.pron;
  }

  return {
    word: dictionaryData.word, // Include the word itself in the pronunciation info
    usAudioUrl,
    ukAudioUrl,
    usPronunciation,
    ukPronunciation
  };
};
