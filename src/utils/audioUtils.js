import audioDB from '../services/AudioDBService';
import { generateExampleAudio, hasOpenAIApiKey } from '../services/TtsService';
import { storeAudioData } from '../services/AnkiService';
import { generateDictDataKey } from '../App';
import { setLocalStorageItem } from './localStorage';

/**
 * Retrieves TTS result for a sentence from the audio database
 * @param {string} sentence - The example sentence to get audio for
 * @param {object} audioDBInstance - The audio database instance
 * @returns {Promise<Object>} - The TTS result object with success, filename, and previewUrl
 */
export const getTtsResultFromAudioDB = async (sentence, audioDBInstance = audioDB) => {
  try {
    if (!sentence || sentence.trim().length === 0) {
      console.log('No sentence provided for TTS retrieval');
      return { success: false };
    }
    
    console.log('Attempting to get audio from AudioDB for sentence:', sentence.substring(0, 30) + (sentence.length > 30 ? '...' : ''));
    
    // Get the audio blob and metadata from the database
    const audioData = await audioDBInstance.getAudioForSentence(sentence);
    
    console.log('AudioDB getAudioForSentence result:', 
      audioData ? 
      `Found data (has blob: ${!!audioData.blob}, filename: ${audioData.filename})` : 
      'No data found');
    
    if (!audioData || !audioData.blob) {
      console.log('No audio found for sentence:', sentence.substring(0, 30) + (sentence.length > 30 ? '...' : ''));
      return { success: false };
    }
    
    // Make sure the blob is valid
    console.log('Audio blob details:', {
      type: audioData.blob.type || 'no type',
      size: audioData.blob.size,
      isBlob: audioData.blob instanceof Blob
    });
    
    // Create a temporary URL for preview in the browser
    try {
      const previewUrl = URL.createObjectURL(audioData.blob);
      console.log('Successfully created blob URL:', previewUrl);
      
      return {
        success: true,
        filename: audioData.filename || `tts_${Date.now()}.mp3`,
        previewUrl,
        blob: audioData.blob,
        fromCache: true
      };
    } catch (urlError) {
      console.error('Error creating URL from blob:', urlError);
      return { success: false, error: 'Failed to create URL from blob: ' + urlError.message };
    }
  } catch (error) {
    console.error('Error retrieving TTS from AudioDB:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Utility function that can be called from anywhere to get TTS for a sentence
 * @param {string} word - The word associated with the sentence
 * @param {string} sentence - The sentence to get audio for
 * @param {boolean} enableTtsOption - Whether TTS generation is enabled
 * @returns {Promise<Object>} - TTS result with success, filename, and previewUrl
 */
export const getTtsForSentence = async (word, sentence, enableTtsOption = true) => {
  // First try to get from AudioDB
  try {
    console.log(`getTtsForSentence called for word "${word}" and sentence: ${sentence.substring(0, 30) + (sentence.length > 30 ? '...' : '')}`);
    
    const ttsResult = await getTtsResultFromAudioDB(sentence);
    
    // If found, return immediately
    if (ttsResult.success) {
      console.log('Found existing TTS in AudioDB, returning result');
      return ttsResult;
    }
    
    console.log('No existing TTS found, checking if generation is enabled:', {
      enableTtsOption,
      hasOpenAIKey: hasOpenAIApiKey()
    });
    
    // If not found and TTS is enabled, generate it
    if (enableTtsOption && hasOpenAIApiKey()) {
      try {
        console.log('Generating new TTS audio with OpenAI...');
        // Use the imported generateExampleAudio function directly
        const { filename, audioData } = await generateExampleAudio(word, sentence);
        
        console.log('TTS generation successful, creating blob with audioData length:', audioData.length);
        
        // Create a proper audio blob
        let audioBlob;
        try {
          audioBlob = new Blob([audioData], { type: 'audio/mp3' });
          console.log('Successfully created audio blob:', {
            type: audioBlob.type,
            size: audioBlob.size,
            isBlob: audioBlob instanceof Blob
          });
        } catch (blobError) {
          console.error('Error creating audio blob:', blobError);
          throw new Error('Failed to create audio blob: ' + blobError.message);
        }
        
        // Create URL for preview - do this before trying to store in DB
        let previewUrl;
        try {
          previewUrl = URL.createObjectURL(audioBlob);
          console.log('Successfully created preview URL:', previewUrl);
        } catch (urlError) {
          console.error('Error creating preview URL:', urlError);
          throw new Error('Failed to create preview URL: ' + urlError.message);
        }
        
        // Try to store in AudioDB
        try {
          console.log('Attempting to store audio in AudioDB...');
          await audioDB.storeAudio(word, sentence, audioBlob);
          console.log('Successfully stored audio in AudioDB');
        } catch (dbError) {
          // Log error but continue - we can still use the audio we generated
          console.warn('Failed to store audio in AudioDB:', dbError);
        }
        
        // Store in Anki if possible
        try {
          console.log('Attempting to store audio in Anki...');
          await storeAudioData(audioData, filename);
          console.log('Successfully stored audio in Anki');
        } catch (ankiError) {
          console.warn('Failed to store audio in Anki:', ankiError);
          // Continue even if Anki storage fails
        }
        
        // Store TTS data in localStorage
        try {
          console.log('Storing TTS data in localStorage...');
          const dictKey = generateDictDataKey(sentence);
          setLocalStorageItem(dictKey, {
            ttsAudioFilename: filename,
            exampleSentence: sentence,
            word: word,
            ttsPreviewUrl: previewUrl,
            pronunciationInfo: {
              ttsGeneratedSuccessfully: true,
              attemptedTts: true
            },
            timestamp: Date.now()
          });
          console.log('Successfully stored TTS data in localStorage');
        } catch (localStorageError) {
          console.warn('Failed to store TTS data in localStorage:', localStorageError);
        }
        
        console.log('TTS generation complete, returning result');
        return {
          success: true,
          filename,
          previewUrl,
          fromCache: false
        };
      } catch (ttsError) {
        console.error('Failed to generate TTS:', ttsError);
        return {
          success: false,
          error: ttsError.message
        };
      }
    }
    
    // Return empty result if TTS is disabled or no OpenAI key
    console.log('TTS generation skipped: TTS disabled or no API key');
    return { success: false, reason: 'TTS disabled or no API key' };
  } catch (error) {
    console.error('Error in getTtsForSentence:', error);
    return { success: false, error: error.message };
  }
}; 