import { generateExampleAudio } from '../TtsService';
import audioDB from '../AudioDBService';

// Mock fetch for TTS API calls
global.fetch = jest.fn();

// Mock AudioDBService
jest.mock('../AudioDBService', () => ({
  storeAudio: jest.fn(),
  getAudio: jest.fn(),
}));

describe('TtsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateExampleAudio', () => {
    const mockCardId = 'card123';
    const mockSentence = 'This is a test sentence.';
    const mockLanguage = 'en';
    const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
    
    test('uses the full sentence as the key when storing audio', async () => {
      // Mock successful TTS API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: jest.fn().mockResolvedValueOnce(mockAudioBlob)
      });

      // Call the function
      await generateExampleAudio(mockCardId, mockSentence, mockLanguage);

      // Verify audio was stored with the sentence as the key
      expect(audioDB.storeAudio).toHaveBeenCalledWith(
        mockCardId,
        mockSentence,
        mockAudioBlob
      );
    });

    test('checks cache using the full sentence as the key before making API call', async () => {
      // Mock cache hit
      audioDB.getAudio.mockResolvedValueOnce(mockAudioBlob);

      // Call the function
      const result = await generateExampleAudio(mockCardId, mockSentence, mockLanguage);

      // Verify cache was checked with the sentence
      expect(audioDB.getAudio).toHaveBeenCalledWith(mockCardId, mockSentence);
      
      // Verify no fetch was made
      expect(global.fetch).not.toHaveBeenCalled();
      
      // Verify correct result returned
      expect(result).toBe(mockAudioBlob);
    });

    test('calls TTS API when audio is not cached', async () => {
      // Mock cache miss
      audioDB.getAudio.mockResolvedValueOnce(null);
      
      // Mock successful TTS API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: jest.fn().mockResolvedValueOnce(mockAudioBlob)
      });

      // Call the function
      const result = await generateExampleAudio(mockCardId, mockSentence, mockLanguage);

      // Verify cache was checked with the sentence
      expect(audioDB.getAudio).toHaveBeenCalledWith(mockCardId, mockSentence);
      
      // Verify TTS API was called
      expect(global.fetch).toHaveBeenCalled();
      
      // Verify audio was stored with the sentence as the key
      expect(audioDB.storeAudio).toHaveBeenCalledWith(
        mockCardId,
        mockSentence,
        mockAudioBlob
      );
      
      // Verify correct result returned
      expect(result).toBe(mockAudioBlob);
    });

    test('handles API errors gracefully', async () => {
      // Mock cache miss
      audioDB.getAudio.mockResolvedValueOnce(null);
      
      // Mock failed TTS API response
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      // Call the function and expect it to throw
      await expect(generateExampleAudio(mockCardId, mockSentence, mockLanguage))
        .rejects.toThrow('Failed to fetch TTS audio: 500 Internal Server Error');

      // Verify cache was checked
      expect(audioDB.getAudio).toHaveBeenCalledWith(mockCardId, mockSentence);
      
      // Verify no audio was stored
      expect(audioDB.storeAudio).not.toHaveBeenCalled();
    });

    test('handles network errors gracefully', async () => {
      // Mock cache miss
      audioDB.getAudio.mockResolvedValueOnce(null);
      
      // Mock network error
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      // Call the function and expect it to throw
      await expect(generateExampleAudio(mockCardId, mockSentence, mockLanguage))
        .rejects.toThrow('Network error');

      // Verify cache was checked
      expect(audioDB.getAudio).toHaveBeenCalledWith(mockCardId, mockSentence);
      
      // Verify no audio was stored
      expect(audioDB.storeAudio).not.toHaveBeenCalled();
    });

    test('normalizes sentence casing for key consistency', async () => {
      const mixedCaseSentence = 'This is a MIXED case Sentence.';
      const normalizedSentence = mixedCaseSentence.toLowerCase();
      
      // Mock successful TTS API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: jest.fn().mockResolvedValueOnce(mockAudioBlob)
      });

      // Call the function with mixed case
      await generateExampleAudio(mockCardId, mixedCaseSentence, mockLanguage);

      // Verify cache was checked with the normalized sentence
      expect(audioDB.getAudio).toHaveBeenCalledWith(mockCardId, expect.stringMatching(/this is a mixed case sentence\./i));
      
      // Verify audio was stored with normalized sentence
      expect(audioDB.storeAudio).toHaveBeenCalledWith(
        mockCardId,
        expect.stringMatching(/this is a mixed case sentence\./i),
        mockAudioBlob
      );
    });

    test('uses correct API endpoint based on language', async () => {
      // Test for English
      audioDB.getAudio.mockResolvedValueOnce(null);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: jest.fn().mockResolvedValueOnce(mockAudioBlob)
      });
      
      await generateExampleAudio(mockCardId, mockSentence, 'en');
      
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('language=en'),
        expect.any(Object)
      );
      
      // Reset for next test
      jest.clearAllMocks();
      
      // Test for Spanish
      audioDB.getAudio.mockResolvedValueOnce(null);
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: jest.fn().mockResolvedValueOnce(mockAudioBlob)
      });
      
      await generateExampleAudio(mockCardId, mockSentence, 'es');
      
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('language=es'),
        expect.any(Object)
      );
    });
  });
}); 