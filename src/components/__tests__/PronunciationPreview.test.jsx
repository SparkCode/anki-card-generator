import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PronunciationPreview from '../PronunciationPreview';
import audioDB from '../../services/AudioDBService';
import { generateDictDataKey } from '../../utils/extractors';

// Mock AudioDBService
jest.mock('../../services/AudioDBService', () => ({
  getAudio: jest.fn(),
  storeAudio: jest.fn(),
  deleteAudio: jest.fn(),
}));

// Mock generateDictDataKey
jest.mock('../../utils/extractors', () => ({
  generateDictDataKey: jest.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockObjectURL = 'blob:mock-url';
global.URL.createObjectURL = jest.fn(() => mockObjectURL);
global.URL.revokeObjectURL = jest.fn();

describe('PronunciationPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation for generateDictDataKey
    generateDictDataKey.mockImplementation((word, language) => `${word}_${language}`);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders with word and attempts to load cached audio using the correct key', async () => {
    const props = {
      word: 'test',
      language: 'en',
      cardId: 'card123',
    };

    // Expected dictionary key
    const dictKey = `${props.word}_${props.language}`;
    
    // Mock successful cache retrieval
    const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
    audioDB.getAudio.mockResolvedValue(mockAudioBlob);

    render(<PronunciationPreview {...props} />);

    // Verify generateDictDataKey was called with correct params
    expect(generateDictDataKey).toHaveBeenCalledWith(props.word, props.language);

    // Verify AudioDBService was called with the generated dictionary key
    await waitFor(() => {
      expect(audioDB.getAudio).toHaveBeenCalledWith(props.cardId, dictKey);
    });

    // Verify URL.createObjectURL was called with the cached blob
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockAudioBlob);
    });
  });

  test('plays audio when play button is clicked', async () => {
    const props = {
      word: 'example',
      language: 'en',
      cardId: 'card123',
    };

    // Expected dictionary key
    const dictKey = `${props.word}_${props.language}`;

    // Mock audio retrieval
    const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
    audioDB.getAudio.mockResolvedValue(mockAudioBlob);

    // Mock HTMLMediaElement
    const mockPlay = jest.fn(() => Promise.resolve());
    const mockPause = jest.fn();
    HTMLMediaElement.prototype.play = mockPlay;
    HTMLMediaElement.prototype.pause = mockPause;

    render(<PronunciationPreview {...props} />);

    // Wait for component to load cached audio
    await waitFor(() => {
      expect(audioDB.getAudio).toHaveBeenCalledWith(props.cardId, dictKey);
    });

    // Find and click the play button
    const playButton = await screen.findByRole('button');
    fireEvent.click(playButton);

    // Verify audio playback was attempted
    expect(mockPlay).toHaveBeenCalled();
  });

  test('works with sentence-based lookup', async () => {
    const props = {
      word: 'example',
      language: 'en',
      cardId: 'card123',
      sentence: 'This is an example sentence.'
    };

    // Expected dictionary key when sentence is provided
    const sentenceKey = props.sentence;
    
    // Mock the key generation for sentence-based lookup
    generateDictDataKey.mockReturnValue(sentenceKey);
    
    // Mock successful cache retrieval
    const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
    audioDB.getAudio.mockResolvedValue(mockAudioBlob);

    render(<PronunciationPreview {...props} />);

    // Verify generateDictDataKey was called with correct params
    expect(generateDictDataKey).toHaveBeenCalledWith(props.word, props.language, props.sentence);

    // Verify AudioDBService was called with the sentence key
    await waitFor(() => {
      expect(audioDB.getAudio).toHaveBeenCalledWith(props.cardId, sentenceKey);
    });
  });

  test('falls back to word-based key when sentence is not available', async () => {
    const props = {
      word: 'fallback',
      language: 'en',
      cardId: 'card123',
      // No sentence provided
    };

    // Expected word-based key
    const wordKey = `${props.word}_${props.language}`;
    
    // Mock the key generation for word-based lookup
    generateDictDataKey.mockReturnValue(wordKey);
    
    // Mock successful cache retrieval
    const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
    audioDB.getAudio.mockResolvedValue(mockAudioBlob);

    render(<PronunciationPreview {...props} />);

    // Verify generateDictDataKey was called with correct params (no sentence)
    expect(generateDictDataKey).toHaveBeenCalledWith(props.word, props.language, undefined);

    // Verify AudioDBService was called with the word-based key
    await waitFor(() => {
      expect(audioDB.getAudio).toHaveBeenCalledWith(props.cardId, wordKey);
    });
  });

  test('handles dictionary audio lookup with varying card IDs', async () => {
    // First render with one card ID
    const props1 = {
      word: 'same-word',
      language: 'en',
      cardId: 'card123',
      sentence: 'This is a test sentence.'
    };

    // Second render with different card ID but same content
    const props2 = {
      ...props1,
      cardId: 'card456'
    };

    // Common dictionary key (should be the same for both renders)
    const dictKey = props1.sentence;
    generateDictDataKey.mockReturnValue(dictKey);
    
    // Mock successful cache retrieval
    const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
    audioDB.getAudio.mockResolvedValue(mockAudioBlob);

    // Render with first card ID
    const { unmount } = render(<PronunciationPreview {...props1} />);
    
    await waitFor(() => {
      expect(audioDB.getAudio).toHaveBeenCalledWith(props1.cardId, dictKey);
    });

    // Unmount and reset mocks
    unmount();
    jest.clearAllMocks();

    // Render with second card ID
    render(<PronunciationPreview {...props2} />);
    
    await waitFor(() => {
      expect(audioDB.getAudio).toHaveBeenCalledWith(props2.cardId, dictKey);
    });
  });

  test('handles audio error gracefully', async () => {
    const props = {
      word: 'error-word',
      language: 'en',
      cardId: 'card123',
    };

    // Mock failed audio retrieval
    audioDB.getAudio.mockRejectedValue(new Error('Audio not found'));

    // Silence console errors for this test
    const originalConsoleError = console.error;
    console.error = jest.fn();

    render(<PronunciationPreview {...props} />);

    // Verify error handling (no audio element should be created)
    await waitFor(() => {
      expect(screen.queryByRole('audio')).not.toBeInTheDocument();
    });

    // Restore console.error
    console.error = originalConsoleError;
  });
}); 