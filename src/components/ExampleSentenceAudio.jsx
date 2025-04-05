import React, { useState, useRef, useEffect } from 'react';
import { getTtsForSentence } from '../utils/audioUtils';
import './ExampleSentenceAudio.scss';

/**
 * Component for displaying example sentence with TTS audio playback
 * 
 * @param {Object} props Component properties
 * @param {string} props.sentence The example sentence to display
 * @param {string} props.audioUrl URL to the audio file to play
 * @param {boolean} props.isLoading Whether the audio is still loading
 * @param {string} props.cardId Optional unique identifier for the card
 * @param {string} props.audioFilename Optional filename of the audio file
 */
const ExampleSentenceAudio = ({ sentence, audioUrl, isLoading, cardId, audioFilename }) => {
  console.log('ExampleSentenceAudio props:', { 
    sentence: sentence?.substring(0, 30) + (sentence?.length > 30 ? '...' : ''), 
    audioUrl: audioUrl ? 'exists' : 'missing', 
    isLoading, 
    cardId,
    audioFilename
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [localAudioUrl, setLocalAudioUrl] = useState(audioUrl);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  const [localLoading, setLocalLoading] = useState(isLoading);
  const [retryCount, setRetryCount] = useState(0);
  const [retryMessage, setRetryMessage] = useState('');
  const maxRetryAttempts = 3;
  const audioRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Update localAudioUrl when audioUrl prop changes
  useEffect(() => {
    setLocalAudioUrl(audioUrl);
    setFallbackAttempted(false);
    setLocalLoading(isLoading);
    setRetryCount(0);
    setRetryMessage('');
  }, [audioUrl, isLoading]);

  // Clean up any pending timeouts on unmount
  useEffect(() => {
    const currentAudio = audioRef.current;
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    console.log('ExampleSentenceAudio mounted/updated with audioUrl:', audioUrl ? 'exists' : 'missing');
  }, [audioUrl]);

  // Verify the audio URL is valid and handle automatic retry
  useEffect(() => {
    // Log when audioUrl changes
    console.log('audioUrl changed:', { 
      hasAudioUrl: !!localAudioUrl,
      audioRefExists: !!audioRef.current,
      fallbackAttempted,
      localAudioUrl: localAudioUrl
    });
    
    // If we don't have a URL, ensure regeneration is attempted
    if (!localAudioUrl && !fallbackAttempted && sentence && cardId) {
      console.log('URL missing, should trigger regeneration in the other useEffect');
      return;
    }
    
    // Verify the audio URL is valid if we have one
    if (localAudioUrl) {
      console.log('Testing if audio URL is valid and accessible...');
      
      const testAudio = new Audio();
      
      // Listen for errors
      const handleError = async (e) => {
        console.error('Test audio error:', e);
        console.error('Audio URL is not valid or accessible:', localAudioUrl);
        
        // Automatically retry if we have both sentence and cardId
        if (sentence && cardId && retryCount < maxRetryAttempts) {
          const nextRetry = retryCount + 1;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff
          
          console.log(`Scheduling automatic retry attempt ${nextRetry}/${maxRetryAttempts} in ${delay}ms`);
          setRetryMessage(`Retry attempt ${nextRetry}/${maxRetryAttempts} in ${delay/1000}s...`);
          setRetryCount(nextRetry);
          
          // Clear any existing timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
          // Set a new timeout for the retry
          retryTimeoutRef.current = setTimeout(async () => {
            console.log(`Executing automatic retry attempt ${nextRetry}/${maxRetryAttempts}`);
            setLocalLoading(true);
            setRetryMessage(`Generating audio (attempt ${nextRetry}/${maxRetryAttempts})...`);
            
            try {
              const result = await getTtsForSentence(cardId, sentence);
              if (result && result.success) {
                console.log('Automatic TTS regeneration successful:', result.previewUrl);
                setLocalAudioUrl(result.previewUrl);
                setRetryMessage('');
              } else {
                console.error('Automatic TTS regeneration failed:', result?.error || 'Unknown error');
                setRetryMessage(`Retry failed. ${maxRetryAttempts - nextRetry} attempts remaining.`);
              }
            } catch (err) {
              console.error('Error during automatic TTS regeneration:', err);
              setRetryMessage(`Error: ${err.message}. ${maxRetryAttempts - nextRetry} attempts remaining.`);
            } finally {
              setLocalLoading(false);
            }
          }, delay);
        } else if (retryCount >= maxRetryAttempts) {
          console.log('Maximum retry attempts reached');
          setRetryMessage('Maximum retry attempts reached. Try manual regeneration.');
        }
      };
      
      // Listen for metadata loaded (success case)
      const handleMetadata = () => {
        console.log('Audio URL is valid and accessible:', localAudioUrl);
        setRetryMessage('');
        setRetryCount(0);
        testAudio.removeEventListener('error', handleError);
        testAudio.removeEventListener('loadedmetadata', handleMetadata);
      };
      
      testAudio.addEventListener('error', handleError);
      testAudio.addEventListener('loadedmetadata', handleMetadata);
      
      // Attempt to load the audio
      testAudio.src = localAudioUrl;
      testAudio.load();
      
      // Cleanup
      return () => {
        testAudio.removeEventListener('error', handleError);
        testAudio.removeEventListener('loadedmetadata', handleMetadata);
        testAudio.src = '';
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }
  }, [localAudioUrl, sentence, cardId, retryCount, fallbackAttempted]);

  // Attempt to regenerate audio if we have sentence but no audioUrl
  useEffect(() => {
    if (!localAudioUrl && !fallbackAttempted && sentence && cardId) {
      console.log('No audio URL available, attempting to generate audio:', {
        audioFilename: audioFilename || 'none',
        cardId,
        sentenceStart: sentence.substring(0, 30) + (sentence.length > 30 ? '...' : '')
      });
      
      const regenerateAudio = async () => {
        setFallbackAttempted(true);
        setLocalLoading(true);
        setRetryMessage('Generating audio...');
        
        try {
          console.log('Regenerating audio with getTtsForSentence...');
          const result = await getTtsForSentence(cardId, sentence);
          
          if (result && result.success) {
            console.log('Successfully regenerated audio, setting new URL:', result.previewUrl);
            setLocalAudioUrl(result.previewUrl);
            setRetryMessage('');
          } else {
            console.error('Failed to regenerate audio:', result?.error || 'Unknown error');
            setRetryMessage('Initial generation failed. Starting retry sequence...');
            // Reset fallbackAttempted to allow retry sequence to work
            setFallbackAttempted(false);
          }
        } catch (err) {
          console.error('Error during audio regeneration:', err);
          setRetryMessage(`Error: ${err.message}. Starting retry sequence...`);
          // Reset fallbackAttempted to allow retry sequence to work
          setFallbackAttempted(false);
        } finally {
          setLocalLoading(false);
        }
      };
      
      regenerateAudio();
    }
  }, [localAudioUrl, fallbackAttempted, sentence, cardId, audioFilename]);

  // Initialize generation immediately upon component mount if needed
  useEffect(() => {
    // If we have sentence and cardId but no audioUrl on first render, trigger generation right away
    if (!audioUrl && sentence && cardId && !fallbackAttempted) {
      console.log('Component mounted with no audioUrl, triggering immediate generation');
      
      const initiateGeneration = async () => {
        setFallbackAttempted(true);
        setLocalLoading(true);
        setRetryMessage('Initializing audio generation...');
        
        try {
          console.log('Initiating first-time audio generation with getTtsForSentence');
          const result = await getTtsForSentence(cardId, sentence);
          
          if (result && result.success) {
            console.log('Initial TTS generation successful:', result.previewUrl);
            setLocalAudioUrl(result.previewUrl);
            setRetryMessage('');
          } else {
            console.error('Initial TTS generation failed:', result?.error || 'Unknown error');
            setRetryMessage('Initial generation failed. Starting retry sequence...');
            // Reset fallbackAttempted to allow retry sequence to work
            setFallbackAttempted(false);
          }
        } catch (err) {
          console.error('Error during initial audio generation:', err);
          setRetryMessage(`Error: ${err.message}. Starting retry sequence...`);
          // Reset fallbackAttempted to allow retry sequence to work
          setFallbackAttempted(false);
        } finally {
          setLocalLoading(false);
        }
      };
      
      initiateGeneration();
    }
  // Include dependencies that are used in the effect
  }, [audioUrl, sentence, cardId, fallbackAttempted]);

  // Handle audio end event
  const handleAudioEnd = () => {
    console.log('Audio playback ended');
    setIsPlaying(false);
  };

  // Handle play button click for direct audio URL
  const handlePlayClick = () => {
    console.log('Play button clicked, audioRef:', !!audioRef.current);
    
    if (!audioRef.current) {
      console.error('Audio ref is null');
      return;
    }
    
    if (isPlaying) {
      console.log('Pausing audio');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      console.log('Attempting to play audio from URL:', localAudioUrl);
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  if (!sentence) {
    console.log('No sentence provided, not rendering audio component');
    return (
      <div className="example-sentence-audio">
        <div className="example-sentence-audio__no-audio">
          No example sentence available
        </div>
      </div>
    );
  }

  console.log('Rendering audio component with:', {
    sentence: sentence?.substring(0, 30) + (sentence?.length > 30 ? '...' : ''),
    hasAudioUrl: !!localAudioUrl,
    isLoading: localLoading,
    retryCount,
    retryMessage
  });

  return (
    <div className="example-sentence-audio">
      <div className="example-sentence-audio__content">
        <p className="example-sentence-audio__sentence">{sentence}</p>
        
        <div className="example-sentence-audio__controls">
          {localLoading ? (
            <div className="example-sentence-audio__loading-indicator">
              <div className="loading-spinner"></div>
              {retryMessage && (
                <span className="example-sentence-audio__status-message">{retryMessage}</span>
              )}
            </div>
          ) : localAudioUrl ? (
            <>
              <button 
                className="example-sentence-audio__play-button"
                onClick={handlePlayClick}
                disabled={localLoading}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {isPlaying ? (
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  ) : (
                    <path d="M8 5v14l11-7z" />
                  )}
                </svg>
              </button>
              <audio 
                ref={audioRef}
                src={localAudioUrl}
                onEnded={handleAudioEnd}
                preload="auto"
                onLoadStart={() => console.log('Audio loading started')}
                onCanPlay={() => console.log('Audio can play')}
                onError={(e) => console.error('Audio loading error:', e)}
              />
            </>
          ) : (
            <div className="example-sentence-audio__no-audio-indicator">
              {audioFilename ? (
                <>
                  <span>Audio file exists but needs to be regenerated</span>
                  <small>Filename: {audioFilename}</small>
                </>
              ) : 'No audio available'}
              
              {retryMessage && (
                <div className="example-sentence-audio__status-message">
                  {retryMessage}
                </div>
              )}
              
              {sentence && cardId && (
                <button 
                  className="example-sentence-audio__retry-button"
                  onClick={async () => {
                    setLocalLoading(true);
                    setRetryCount(0);
                    setRetryMessage('Manually generating audio...');
                    console.log('Manually retrying TTS generation for:', {
                      cardId,
                      sentencePreview: sentence.substring(0, 30) + (sentence.length > 30 ? '...' : '')
                    });
                    
                    try {
                      const result = await getTtsForSentence(cardId, sentence);
                      if (result && result.success) {
                        console.log('Manual TTS regeneration successful:', result);
                        setLocalAudioUrl(result.previewUrl);
                        setRetryMessage('');
                      } else {
                        console.error('Manual TTS regeneration failed:', result?.error || 'Unknown error');
                        setRetryMessage('Manual generation failed. Please try again.');
                      }
                    } catch (err) {
                      console.error('Error during manual TTS regeneration:', err);
                      setRetryMessage(`Error: ${err.message}. Please try again.`);
                    } finally {
                      setLocalLoading(false);
                    }
                  }}
                  disabled={localLoading}
                >
                  {localLoading ? 'Generating...' : audioFilename ? 'Regenerate Audio' : 'Generate Audio'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExampleSentenceAudio;