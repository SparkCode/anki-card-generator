import React, { useState, useRef, useEffect, useCallback } from 'react';
import audioDB from '../services/AudioDBService';
// Import service to fetch audio from Anki
import { fetchMediaFile } from '../services/AnkiService';
// Basic resets and global styles
import '../styles/reset.css';
// Import global animations
import '../styles/animations.scss';
// Component styles
import './ExampleSentenceAudio.scss';

/**
 * Standalone component for displaying example sentences with audio pronunciation
 * 
 * @param {Object} props Component props
 * @param {string} props.sentence The example sentence text
 * @param {string} props.audioUrl URL to the audio file for playback
 * @param {string} props.audioFilename Filename of the audio in Anki (for reference)
 * @param {boolean} props.loading Whether audio is currently loading
 * @param {string} props.cardId Unique identifier for the card
 */
const ExampleSentenceAudio = ({ 
  sentence, 
  audioUrl, 
  audioFilename,
  loading = false,
  cardId
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  // Initialize without audioUrl - we'll validate it first
  const [cachedAudioUrl, setCachedAudioUrl] = useState(null);
  const [isFetchingFromAnki, setIsFetchingFromAnki] = useState(false);
  const audioRef = useRef(null);

  // Cache audio from URL when available
  const cacheAudioFromUrl = useCallback(async (url) => {
    if (!url || !cardId || !sentence) return;
    
    // Skip caching if it's a blob URL
    if (url.startsWith('blob:')) {
      console.log('Skipping caching for blob URL - these are temporary by nature');
      return;
    }
    
    try {
      // Fetch the audio file
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch audio');
      
      // Get the blob from the response
      const audioBlob = await response.blob();
      
      // Store in IndexedDB
      await audioDB.storeAudio(cardId, sentence, audioBlob);
      console.log('Cached TTS audio in IndexedDB');
    } catch (error) {
      console.error('Error caching audio:', error);
      // Just log the error but don't set audioError
      // This way if the audio URL is still valid we can play it
    }
  }, [cardId, sentence]);

  // Check if the audioUrl is valid (if it's a blob URL)
  useEffect(() => {
    // Immediately mark as error if it's a blob URL
    // We'll validate it in the next effect
    if (audioUrl && audioUrl.startsWith('blob:')) {
      setAudioError(true);
    }
  }, [audioUrl]);

  // Check for cached audio when component mounts or when sentence/cardId changes
  useEffect(() => {
    async function checkCachedAudio() {
      if (!cardId || !sentence) return;
      
      try {
        // Attempt to get cached audio from IndexedDB
        const cachedAudio = await audioDB.getAudio(cardId, sentence);
        
        if (cachedAudio) {
          // Create object URL from the cached blob
          const objectUrl = URL.createObjectURL(cachedAudio);
          setCachedAudioUrl(objectUrl);
          setAudioError(false); // Clear error since we have valid cached audio
          console.log('Using cached TTS audio from IndexedDB');
        } else if (audioUrl) {
          // If audioUrl is a blob URL, just use it directly
          if (audioUrl.startsWith('blob:')) {
            setCachedAudioUrl(audioUrl);
            setAudioError(false);
            // We'll let the audio element's error event handle any invalid blob URLs
            console.log('Using provided blob URL directly');
          } else {
            // Regular URL - assume it's valid
            setCachedAudioUrl(audioUrl);
            cacheAudioFromUrl(audioUrl);
          }
        } else {
          // No cached audio and no audioUrl
          setCachedAudioUrl(null);
          // Don't set audioError if we don't have any audio to play yet
          // This will show the "audio will be available in Anki" message
          setAudioError(false);
          console.log('No audio available - will show placeholder');
        }
      } catch (error) {
        console.error('Error retrieving cached audio:', error);
        setCachedAudioUrl(null);
        setAudioError(true);
      }
    }
    
    checkCachedAudio();
  }, [cardId, sentence, audioUrl, cacheAudioFromUrl]);

  useEffect(() => {
    console.log('Cached audio URL:', cardId, sentence, cachedAudioUrl);
    console.log('Audio URL:', cardId, sentence, audioUrl);
  }, [cachedAudioUrl, audioUrl, cardId, sentence]);

  // Reset audio state when the URL changes
  useEffect(() => {
    setIsPlaying(false);
    // Don't reset audioError - we handle this in the initial setup
    
    // Clean up previous audio element if it exists
    return () => {
      // Store current ref value to avoid the React warning
      const audioElement = audioRef.current;
      if (audioElement) {
        try {
          audioElement.pause();
          audioElement.src = '';
        } catch (e) {
          console.error('Error cleaning up audio element:', e);
        }
      }
      
      // Clean up object URLs
      if (cachedAudioUrl && cachedAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cachedAudioUrl);
      }
    };
  }, [audioUrl]);

  const handlePlayAudio = () => {
    if (!cachedAudioUrl || !audioRef.current) return;
    
    if (isPlaying) {
      try {
        audioRef.current.pause();
      } catch (e) {
        console.error('Error pausing audio:', e);
        setIsPlaying(false);
      }
    } else {
      try {
        // Create new audio promise
        const playPromise = audioRef.current.play();
        
        // Handle play promise rejection (common in browsers)
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error('Failed to play audio:', err);
            setIsPlaying(false);
            setAudioError(true);
          });
        }
      } catch (e) {
        console.error('Error playing audio:', e);
        setIsPlaying(false);
        setAudioError(true);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };
  
  const handleAudioError = (e) => {
    console.error('Audio error:', e);
    setAudioError(true);
    setIsPlaying(false);
  };

  // Function to play audio from Anki
  const playAudioFromAnki = async () => {
    if (!audioFilename) return;
    
    try {
      // Set loading state
      setIsPlaying(true);
      setIsFetchingFromAnki(true);
      
      // Fetch the audio file from Anki
      const audioData = await fetchMediaFile(audioFilename);
      
      if (!audioData) {
        throw new Error('Failed to fetch audio from Anki');
      }
      
      // Create a blob URL for the audio
      const blob = new Blob([audioData], { type: 'audio/mp3' });
      const objectUrl = URL.createObjectURL(blob);
      
      // Save in state
      setCachedAudioUrl(objectUrl);
      setAudioError(false);
      
      // Store in IndexedDB for future use
      await audioDB.storeAudio(cardId, sentence, blob);
      
      // Play the audio
      if (audioRef.current) {
        audioRef.current.src = objectUrl;
        audioRef.current.play().catch(err => {
          console.error('Failed to play audio:', err);
          setAudioError(true);
          setIsPlaying(false);
        });
      }
    } catch (error) {
      console.error('Error fetching audio from Anki:', error);
      setAudioError(true);
      setIsPlaying(false);
    } finally {
      setIsFetchingFromAnki(false);
    }
  };

  return (
    <div className="example-sentence-audio">
      <div className="example-sentence-audio__header">
        <h3 className="example-sentence-audio__title">📢 Sentence Audio:</h3>
        {audioFilename && (
          <div className="example-sentence-audio__badge">TTS</div>
        )}
        {cachedAudioUrl && cachedAudioUrl !== audioUrl && (
          <div className="example-sentence-audio__badge example-sentence-audio__badge--cached">Cached</div>
        )}
      </div>

      <div className="example-sentence-audio__content">
        {loading ? (
          <div className="example-sentence-audio__loading">
            <span className="loading-spinner"></span>
            <span>Generating audio...</span>
          </div>
        ) : audioError ? (
          <div className="example-sentence-audio__row">
            {sentence && (
              <p className="example-sentence-audio__text">"{sentence}"</p>
            )}
            <div className="example-sentence-audio__no-audio">
              <span>Error loading audio</span>
            </div>
          </div>
        ) : (
          <div className="example-sentence-audio__row">
            {/* Sentence text first */}
            {sentence && (
              <p className="example-sentence-audio__text">"{sentence}"</p>
            )}
            
            {/* Audio controls at the end - simplified to only show play icon */}
            {!audioError && cachedAudioUrl ? (
              <button 
                className={`example-sentence-audio__play-button ${isPlaying ? 'playing' : ''}`}
                onClick={handlePlayAudio}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
                disabled={isPlaying}
              >
                {isPlaying ? "▶" : "▶"}
              </button>
            ) : audioFilename ? (
              <button 
                className={`example-sentence-audio__play-button ${isPlaying || isFetchingFromAnki ? 'playing' : ''}`}
                onClick={playAudioFromAnki}
                aria-label={isFetchingFromAnki ? "Loading from Anki..." : "Play audio from Anki"}
                disabled={isPlaying || isFetchingFromAnki}
              >
                {isFetchingFromAnki ? "⌛" : "▶"}
              </button>
            ) : sentence ? (
              <div className="example-sentence-audio__no-audio-icon" title="Audio will be available in Anki">
                🔊
                <span className="example-sentence-audio__anki-notice">(in Anki)</span>
              </div>
            ) : (
              <div className="example-sentence-audio__no-audio-icon">
                ⚠
              </div>
            )}
            
            <audio 
              ref={audioRef}
              src={!audioError ? cachedAudioUrl : null}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleAudioEnded}
              onError={handleAudioError}
              preload="metadata"
            />
          </div>
        )}
      </div>
      
      {(audioFilename || (!audioError && cachedAudioUrl)) && (
        <div className="example-sentence-audio__footer">
          {isPlaying ? 
            "Playing audio..." : 
            isFetchingFromAnki ?
              "Fetching audio from Anki..." :
              audioError ? 
                "There was an error playing the audio, but it will be included in your Anki card" : 
                "This example sentence audio is playable and will be added to your Anki card"}
        </div>
      )}
    </div>
  );
};

export default ExampleSentenceAudio;