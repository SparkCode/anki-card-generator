import 'fake-indexeddb/auto';
import AudioDBService from '../AudioDBService';
import { generateExampleAudio } from '../TtsService';

// Mock the TtsService methods
jest.mock('../TtsService', () => ({
  generateExampleAudio: jest.fn(),
  hasOpenAIApiKey: jest.fn().mockReturnValue(true),
  setOpenAIApiKey: jest.fn()
}));

describe('AudioDBService Integration', () => {
  let audioDB;
  
  beforeEach(() => {
    audioDB = new AudioDBService();
    return audioDB.dbReady;
  });
  
  afterEach(() => {
    indexedDB.deleteDatabase('AnkiTTSAudioCache');
    jest.clearAllMocks();
  });
  
  describe('TTS integration', () => {
    it('should store audio generated from TTS using the sentence as key', async () => {
      // Setup test data
      const word = 'example';
      const sentence = 'This is an example sentence for TTS audio.';
      const audioData = new Uint8Array([1, 2, 3, 4, 5]).buffer; // Mock ArrayBuffer
      const filename = 'example_tts.mp3';
      
      // Mock TTS service response
      generateExampleAudio.mockResolvedValue({
        filename,
        audioData
      });
      
      // Generate and store audio
      const ttsResult = await generateExampleAudio(word, sentence);
      const audioBlob = new Blob([ttsResult.audioData], { type: 'audio/mp3' });
      const key = await audioDB.storeAudio(word, sentence, audioBlob);
      
      // Verify key is based on sentence
      expect(key).toBe(sentence.toLowerCase());
      
      // Verify TTS was called with the sentence
      expect(generateExampleAudio).toHaveBeenCalledWith(word, sentence);
      
      // Verify audio can be retrieved by sentence
      const retrievedBlob = await audioDB.getAudio(word, sentence);
      expect(retrievedBlob).toBeTruthy();
    });
    
    it('should use the exact sentence for storage and retrieval', async () => {
      // Setup
      const word = 'pronunciation';
      const exactSentence = 'The pronunciation of this word is difficult.';
      
      // Mock audio data
      const audioData = new Uint8Array([10, 20, 30, 40, 50]).buffer;
      generateExampleAudio.mockResolvedValue({
        filename: 'pronunciation_tts.mp3',
        audioData
      });
      
      // Generate and store
      const ttsResult = await generateExampleAudio(word, exactSentence);
      const audioBlob = new Blob([ttsResult.audioData], { type: 'audio/mp3' });
      await audioDB.storeAudio(word, exactSentence, audioBlob);
      
      // Try to retrieve with slightly different sentence (should fail)
      const slightlyDifferentSentence = 'The pronunciation of these words is difficult.';
      const retrievedWithDifferentSentence = await audioDB.getAudio(word, slightlyDifferentSentence);
      expect(retrievedWithDifferentSentence).toBeNull();
      
      // Retrieve with exact same sentence (should succeed)
      const retrievedWithExactSentence = await audioDB.getAudio(word, exactSentence);
      expect(retrievedWithExactSentence).toBeTruthy();
    });
  });
  
  describe('Card ID usage', () => {
    it('should store the cardId as metadata but use sentence as key', async () => {
      // Setup
      const cardId = 'card123';
      const sentence = 'This sentence is the key, not the card ID.';
      const audioBlob = new Blob(['test audio data'], { type: 'audio/mp3' });
      
      // Store with cardId and sentence
      await audioDB.storeAudio(cardId, sentence, audioBlob);
      
      // Simulate looking up with a different cardId but same sentence
      const differentCardId = 'card456';
      const retrievedBlob = await audioDB.getAudio(differentCardId, sentence);
      
      // Should still find it because the sentence is the same
      expect(retrievedBlob).toBeTruthy();
      
      // Get direct access to the store for verification
      const db = await new Promise((resolve) => {
        const request = indexedDB.open('AnkiTTSAudioCache', 1);
        request.onsuccess = (event) => resolve(event.target.result);
      });
      
      const transaction = db.transaction(['audioFiles'], 'readonly');
      const store = transaction.objectStore('audioFiles');
      const key = sentence.trim().toLowerCase();
      
      // Verify the record has the original cardId stored as metadata
      const getRequest = store.get(key);
      const record = await new Promise((resolve) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
      });
      
      expect(record.cardId).toBe(cardId);
      expect(record.key).toBe(key);
      expect(record.text).toBe(sentence);
    });
  });
  
  describe('Normalization', () => {
    it('should normalize sentences with different casing and whitespace', async () => {
      // Original sentence with specific casing and whitespace
      const original = '  This Sentence Has SPECIFIC Casing and Whitespace.  ';
      const cardId = 'card123';
      const audioBlob = new Blob(['test audio data'], { type: 'audio/mp3' });
      
      // Store with original format
      await audioDB.storeAudio(cardId, original, audioBlob);
      
      // Test retrieval with variations
      const variations = [
        'this sentence has specific casing and whitespace.',
        'THIS SENTENCE HAS SPECIFIC CASING AND WHITESPACE.',
        '  this sentence has specific casing and whitespace.  ',
        'this sentence has specific casing and whitespace.'
      ];
      
      for (const variant of variations) {
        // Should find the audio regardless of casing and whitespace differences
        const retrieved = await audioDB.getAudio(cardId, variant);
        expect(retrieved).toBeTruthy(`Failed to retrieve with variant: "${variant}"`);
      }
    });
  });
  
  describe('Duplicate handling', () => {
    it('should handle storage of multiple versions of the same sentence', async () => {
      const sentence = 'This sentence will have multiple audio versions.';
      const cardId = 'card123';
      
      // Store first version
      const audioBlob1 = new Blob(['first version'], { type: 'audio/mp3' });
      await audioDB.storeAudio(cardId, sentence, audioBlob1);
      
      // Store second version (should overwrite)
      const audioBlob2 = new Blob(['second version'], { type: 'audio/mp3' });
      await audioDB.storeAudio(cardId, sentence, audioBlob2);
      
      // Retrieve the stored blob
      const retrievedBlob = await audioDB.getAudio(cardId, sentence);
      
      // Verify it's the second version
      const retrievedText = await new Response(retrievedBlob).text();
      expect(retrievedText).toBe('second version');
    });
  });
}); 