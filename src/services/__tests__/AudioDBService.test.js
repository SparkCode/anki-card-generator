import 'fake-indexeddb/auto';
import AudioDBService from '../AudioDBService';

// Create a fresh instance of the service for each test
let audioDB;
const originalConsoleError = console.error;

describe('AudioDBService', () => {
  beforeEach(() => {
    // Replace console.error with a mock function to suppress expected errors in tests
    console.error = jest.fn();
    
    // Create a new instance for each test
    audioDB = new AudioDBService();
    
    // Wait for DB initialization
    return audioDB.dbReady;
  });

  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError;
    
    // Delete the database after each test to ensure isolation
    indexedDB.deleteDatabase('AnkiTTSAudioCache');
  });

  describe('generateKey method', () => {
    it('should use the sentence text directly as a key', () => {
      const sentence = 'The quick brown fox jumps over the lazy dog.';
      const cardId = 'card123';
      
      const key = audioDB.generateKey(cardId, sentence);
      
      expect(key).toBe(sentence.toLowerCase());
    });
    
    it('should normalize the sentence by trimming whitespace and converting to lowercase', () => {
      const sentence = '  This Sentence Has UPPERCASE and extra spaces.  ';
      const cardId = 'card123';
      
      const key = audioDB.generateKey(cardId, sentence);
      
      expect(key).toBe('this sentence has uppercase and extra spaces.');
    });
    
    it('should fallback to cardId when sentence is empty', () => {
      const sentence = '';
      const cardId = 'card123';
      
      const key = audioDB.generateKey(cardId, sentence);
      
      expect(key).toBe(cardId);
    });
    
    it('should fallback to cardId when sentence is null or undefined', () => {
      const cardId = 'card123';
      
      const keyForNull = audioDB.generateKey(cardId, null);
      const keyForUndefined = audioDB.generateKey(cardId, undefined);
      
      expect(keyForNull).toBe(cardId);
      expect(keyForUndefined).toBe(cardId);
    });
  });

  describe('storeAudio method', () => {
    it('should store audio with sentence as the key', async () => {
      const sentence = 'The quick brown fox jumps over the lazy dog.';
      const cardId = 'card123';
      const audioBlob = new Blob(['test audio data'], { type: 'audio/mp3' });
      
      const key = await audioDB.storeAudio(cardId, sentence, audioBlob);
      
      expect(key).toBe(sentence.toLowerCase());
      
      // Verify it was stored correctly by retrieving it
      const storedBlob = await audioDB.getAudio(cardId, sentence);
      expect(storedBlob).toBeTruthy();
    });
    
    it('should overwrite existing audio if the same sentence key is used', async () => {
      const sentence = 'This is a test sentence.';
      const cardId = 'card123';
      const audioBlob1 = new Blob(['audio data 1'], { type: 'audio/mp3' });
      const audioBlob2 = new Blob(['audio data 2'], { type: 'audio/mp3' });
      
      // Store first blob
      await audioDB.storeAudio(cardId, sentence, audioBlob1);
      
      // Store second blob with same key
      await audioDB.storeAudio(cardId, sentence, audioBlob2);
      
      // Retrieve and verify it's the second blob
      const storedBlob = await audioDB.getAudio(cardId, sentence);
      
      // Create text from the blob to verify content
      const text = await new Response(storedBlob).text();
      expect(text).toBe('audio data 2');
    });
  });

  describe('getAudio method', () => {
    it('should retrieve audio using sentence as the key', async () => {
      const sentence = 'This is a retrieval test.';
      const cardId = 'card123';
      const audioData = 'test audio content';
      const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
      
      // Store the audio
      await audioDB.storeAudio(cardId, sentence, audioBlob);
      
      // Retrieve the audio
      const retrievedBlob = await audioDB.getAudio(cardId, sentence);
      
      // Verify the content
      const retrievedText = await new Response(retrievedBlob).text();
      expect(retrievedText).toBe(audioData);
    });
    
    it('should return null if audio is not found for the sentence', async () => {
      const sentence = 'This sentence has no audio.';
      const cardId = 'card123';
      
      const result = await audioDB.getAudio(cardId, sentence);
      
      expect(result).toBeNull();
    });
    
    it('should find audio even if the cardId is different but sentence is the same', async () => {
      const sentence = 'The cardId should not matter for retrieval.';
      const originalCardId = 'card123';
      const differentCardId = 'card456';
      const audioBlob = new Blob(['test audio data'], { type: 'audio/mp3' });
      
      // Store with the original cardId
      await audioDB.storeAudio(originalCardId, sentence, audioBlob);
      
      // Retrieve with a different cardId
      const retrievedBlob = await audioDB.getAudio(differentCardId, sentence);
      
      // Should still find it because sentence is the same
      expect(retrievedBlob).toBeTruthy();
    });
  });

  describe('deleteAudio method', () => {
    it('should delete audio using sentence as the key', async () => {
      const sentence = 'This audio will be deleted.';
      const cardId = 'card123';
      const audioBlob = new Blob(['test audio data'], { type: 'audio/mp3' });
      
      // Store the audio
      await audioDB.storeAudio(cardId, sentence, audioBlob);
      
      // Verify it was stored
      const storedBlob = await audioDB.getAudio(cardId, sentence);
      expect(storedBlob).toBeTruthy();
      
      // Delete the audio
      const deleteResult = await audioDB.deleteAudio(cardId, sentence);
      expect(deleteResult).toBe(true);
      
      // Verify it was deleted
      const retrievedAfterDelete = await audioDB.getAudio(cardId, sentence);
      expect(retrievedAfterDelete).toBeNull();
    });
    
    it('should return true even if the audio does not exist', async () => {
      const sentence = 'This audio does not exist.';
      const cardId = 'card123';
      
      const deleteResult = await audioDB.deleteAudio(cardId, sentence);
      
      expect(deleteResult).toBe(true);
    });
  });

  describe('deleteCardAudio method', () => {
    it('should delete all audio for a specific cardId', async () => {
      const cardId = 'card123';
      const sentence1 = 'First sentence for this card.';
      const sentence2 = 'Second sentence for this card.';
      const audioBlob = new Blob(['test audio data'], { type: 'audio/mp3' });
      
      // Store two audio files with the same cardId
      await audioDB.storeAudio(cardId, sentence1, audioBlob);
      await audioDB.storeAudio(cardId, sentence2, audioBlob);
      
      // Verify they were stored
      const storedBlob1 = await audioDB.getAudio(cardId, sentence1);
      const storedBlob2 = await audioDB.getAudio(cardId, sentence2);
      expect(storedBlob1).toBeTruthy();
      expect(storedBlob2).toBeTruthy();
      
      // Delete all audio for this cardId
      const deleteResult = await audioDB.deleteCardAudio(cardId);
      expect(deleteResult).toBe(true);
      
      // Verify both were deleted
      const retrievedAfterDelete1 = await audioDB.getAudio(cardId, sentence1);
      const retrievedAfterDelete2 = await audioDB.getAudio(cardId, sentence2);
      expect(retrievedAfterDelete1).toBeNull();
      expect(retrievedAfterDelete2).toBeNull();
    });
    
    it('should not delete audio for other cardIds', async () => {
      const cardId1 = 'card123';
      const cardId2 = 'card456';
      const sentence1 = 'Sentence for first card.';
      const sentence2 = 'Sentence for second card.';
      const audioBlob = new Blob(['test audio data'], { type: 'audio/mp3' });
      
      // Store audio for both cardIds
      await audioDB.storeAudio(cardId1, sentence1, audioBlob);
      await audioDB.storeAudio(cardId2, sentence2, audioBlob);
      
      // Delete audio for first cardId
      await audioDB.deleteCardAudio(cardId1);
      
      // Verify first card's audio is deleted
      const retrievedCard1 = await audioDB.getAudio(cardId1, sentence1);
      expect(retrievedCard1).toBeNull();
      
      // Verify second card's audio still exists
      const retrievedCard2 = await audioDB.getAudio(cardId2, sentence2);
      expect(retrievedCard2).toBeTruthy();
    });
  });

  describe('cleanupOldFiles method', () => {
    it('should remove audio files older than the specified days', async () => {
      const cardId = 'card123';
      const sentence = 'Test sentence for cleanup.';
      const audioBlob = new Blob(['test audio data'], { type: 'audio/mp3' });
      
      // Create a mock Date.now() that returns a specific time
      const realDateNow = Date.now;
      const currentTime = new Date('2023-01-15').getTime();
      Date.now = jest.fn(() => currentTime);
      
      // Store audio
      await audioDB.storeAudio(cardId, sentence, audioBlob);
      
      // Simulate 40 days passing
      const futureTime = currentTime + (40 * 24 * 60 * 60 * 1000);
      Date.now = jest.fn(() => futureTime);
      
      // Clean up files older than 30 days
      const deleteCount = await audioDB.cleanupOldFiles(30);
      
      // Should have deleted one file
      expect(deleteCount).toBe(1);
      
      // Verify file was deleted
      const retrievedBlob = await audioDB.getAudio(cardId, sentence);
      expect(retrievedBlob).toBeNull();
      
      // Restore the original Date.now
      Date.now = realDateNow;
    });
    
    it('should not remove audio files newer than the specified days', async () => {
      const cardId = 'card123';
      const sentence = 'Test sentence for retention.';
      const audioBlob = new Blob(['test audio data'], { type: 'audio/mp3' });
      
      // Create a mock Date.now() that returns a specific time
      const realDateNow = Date.now;
      const currentTime = new Date('2023-01-15').getTime();
      Date.now = jest.fn(() => currentTime);
      
      // Store audio
      await audioDB.storeAudio(cardId, sentence, audioBlob);
      
      // Simulate 20 days passing
      const futureTime = currentTime + (20 * 24 * 60 * 60 * 1000);
      Date.now = jest.fn(() => futureTime);
      
      // Clean up files older than 30 days
      const deleteCount = await audioDB.cleanupOldFiles(30);
      
      // Should not have deleted any files
      expect(deleteCount).toBe(0);
      
      // Verify file still exists
      const retrievedBlob = await audioDB.getAudio(cardId, sentence);
      expect(retrievedBlob).toBeTruthy();
      
      // Restore the original Date.now
      Date.now = realDateNow;
    });
  });
  
  describe('integration tests', () => {
    it('should handle multiple operations in sequence', async () => {
      const cardId = 'card123';
      const sentence = 'Integration test sentence.';
      const audioBlob = new Blob(['integration test audio'], { type: 'audio/mp3' });
      
      // Store audio
      await audioDB.storeAudio(cardId, sentence, audioBlob);
      
      // Retrieve audio
      const retrievedBlob = await audioDB.getAudio(cardId, sentence);
      expect(retrievedBlob).toBeTruthy();
      
      // Delete audio
      await audioDB.deleteAudio(cardId, sentence);
      
      // Verify it's deleted
      const retrievedAfterDelete = await audioDB.getAudio(cardId, sentence);
      expect(retrievedAfterDelete).toBeNull();
      
      // Store it again
      await audioDB.storeAudio(cardId, sentence, audioBlob);
      
      // Verify it's stored again
      const retrievedAgain = await audioDB.getAudio(cardId, sentence);
      expect(retrievedAgain).toBeTruthy();
    });
    
    it('should handle different case and whitespace in sentences', async () => {
      const cardId = 'card123';
      const originalSentence = 'This is an Original Sentence.';
      const retrievalSentence = '  this is an original sentence.  ';
      const audioBlob = new Blob(['test audio data'], { type: 'audio/mp3' });
      
      // Store with original sentence
      await audioDB.storeAudio(cardId, originalSentence, audioBlob);
      
      // Retrieve with different case and whitespace
      const retrievedBlob = await audioDB.getAudio(cardId, retrievalSentence);
      
      // Should still find it due to normalization
      expect(retrievedBlob).toBeTruthy();
    });
  });
}); 