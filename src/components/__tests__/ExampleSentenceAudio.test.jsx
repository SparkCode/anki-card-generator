import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExampleSentenceAudio from '../ExampleSentenceAudio';
import audioDB from '../../services/AudioDBService';
import { fetchMediaFile } from '../../services/AnkiService';

// Mock AudioDBService
jest.mock('../../services/AudioDBService', () => ({
  getAudio: jest.fn(),
  storeAudio: jest.fn(),
  deleteAudio: jest.fn(),
}));

// Mock AnkiService
jest.mock('../../services/AnkiService', () => ({
  fetchMediaFile: jest.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockObjectURL = 'blob:mock-url';
global.URL.createObjectURL = jest.fn(() => mockObjectURL);
global.URL.revokeObjectURL = jest.fn();

describe('ExampleSentenceAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders with sentence and attempts to load cached audio', async () => {
    const props = {
      sentence: 'This is a test sentence.',
      cardId: 'card123',
    };

    // Mock successful cache retrieval
    const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
    audioDB.getAudio.mockResolvedValue(mockAudioBlob);

    render(<ExampleSentenceAudio {...props} />);

    // Check that the sentence is displayed
    expect(screen.getByText(props.sentence)).toBeInTheDocument();

    // Verify AudioDBService was called with the sentence
    await waitFor(() => {
      expect(audioDB.getAudio).toHaveBeenCalledWith(props.cardId, props.sentence);
    });

    // Verify URL.createObjectURL was called with the cached blob
    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockAudioBlob);
    });
  });

  test('plays audio when play button is clicked', async () => {
    const props = {
      sentence: 'This is a sentence to play.',
      cardId: 'card123',
    };

    // Mock audio retrieval
    const mockAudioBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
    audioDB.getAudio.mockResolvedValue(mockAudioBlob);

    // Mock HTMLMediaElement
    const mockPlay = jest.fn(() => Promise.resolve());
    const mockPause = jest.fn();
    HTMLMediaElement.prototype.play = mockPlay;
    HTMLMediaElement.prototype.pause = mockPause;

    render(<ExampleSentenceAudio {...props} />);

    // Wait for component to load cached audio
    await waitFor(() => {
      expect(audioDB.getAudio).toHaveBeenCalledWith(props.cardId, props.sentence);
    });

    // Find and click the play button
    const playButton = await screen.findByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    // Verify audio playback was attempted
    expect(mockPlay).toHaveBeenCalled();
  });

  test('caches audio from URL when provided', async () => {
    const props = {
      sentence: 'This is a sentence with a URL.',
      audioUrl: 'https://example.com/audio.mp3',
      cardId: 'card123',
    };

    // Mock fetch for caching
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['audio from url'], { type: 'audio/mp3' }))
      })
    );

    render(<ExampleSentenceAudio {...props} />);

    // Verify caching attempt
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(props.audioUrl);
    });

    // Verify storage with sentence as key
    await waitFor(() => {
      expect(audioDB.storeAudio).toHaveBeenCalledWith(
        props.cardId, 
        props.sentence, 
        expect.any(Blob)
      );
    });
  });

  test('shows refresh button and handles refresh', async () => {
    const onRefreshMock = jest.fn(() => Promise.resolve());
    
    const props = {
      sentence: 'This is a sentence that needs refreshing.',
      cardId: 'card123',
      onRefresh: onRefreshMock,
    };

    // Mock successful cache retrieval
    audioDB.getAudio.mockResolvedValue(new Blob(['mock audio data'], { type: 'audio/mp3' }));

    render(<ExampleSentenceAudio {...props} />);

    // Find and click the refresh button
    const refreshButton = await screen.findByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    // Verify audio deletion was attempted with the sentence
    await waitFor(() => {
      expect(audioDB.deleteAudio).toHaveBeenCalledWith(props.cardId, props.sentence);
    });

    // Verify callback was called
    expect(onRefreshMock).toHaveBeenCalled();
  });

  test('fetches audio from Anki when audioFilename is provided', async () => {
    const props = {
      sentence: 'This is a sentence with Anki audio.',
      audioFilename: 'anki_audio.mp3',
      cardId: 'card123',
    };

    // Mock Anki fetch
    const mockAudioData = new Uint8Array([1, 2, 3, 4]).buffer;
    fetchMediaFile.mockResolvedValue(mockAudioData);

    // Mock URL creation
    URL.createObjectURL.mockReturnValue('blob:anki-audio-url');

    render(<ExampleSentenceAudio {...props} />);

    // Find and click the "Play from Anki" button
    const ankiButton = await screen.findByRole('button', { name: /anki/i });
    fireEvent.click(ankiButton);

    // Verify Anki fetch was attempted
    await waitFor(() => {
      expect(fetchMediaFile).toHaveBeenCalledWith(props.audioFilename);
    });

    // Verify the audio was stored with the sentence as key
    await waitFor(() => {
      expect(audioDB.storeAudio).toHaveBeenCalledWith(
        props.cardId,
        props.sentence,
        expect.any(Blob)
      );
    });
  });

  test('handles audio error gracefully', async () => {
    const props = {
      sentence: 'This sentence will have an audio error.',
      audioUrl: 'blob:invalid-url',
      cardId: 'card123',
    };

    // Mock failed URL validation
    global.fetch = jest.fn(() => Promise.reject(new Error('Invalid URL')));

    // Silence console errors for this test
    const originalConsoleError = console.error;
    console.error = jest.fn();

    render(<ExampleSentenceAudio {...props} />);

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/unable to play audio/i)).toBeInTheDocument();
    });

    // Restore console.error
    console.error = originalConsoleError;
  });
}); 