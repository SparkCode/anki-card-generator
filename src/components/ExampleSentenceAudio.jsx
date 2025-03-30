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
  const audioRef = useRef(null);

  // Update localAudioUrl when audioUrl prop changes
  useEffect(() => {
    setLocalAudioUrl(audioUrl);
    setFallbackAttempted(false);
    setLocalLoading(isLoading);
  }, [audioUrl, isLoading]);

  useEffect(() => {
    console.log('ExampleSentenceAudio mounted/updated with audioUrl:', audioUrl ? 'exists' : 'missing');
    
    // Cleanup function to stop audio when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);
  
  useEffect(() => {
    // Log when audioUrl changes
    console.log('audioUrl changed:', { 
      hasAudioUrl: !!audioUrl,
      audioRefExists: !!audioRef.current
    });
    
    // Verify the audio URL is valid
    if (localAudioUrl) {
      console.log('Testing if audio URL is valid and accessible...');
      
      const testAudio = new Audio();
      
      // Listen for errors
      const handleError = async (e) => {
        console.error('Test audio error:', e);
        console.error('Audio URL is not valid or accessible:', localAudioUrl);
        
        // Try to regenerate if we have both sentence and cardId and haven't tried fallback yet
        if (!fallbackAttempted && sentence && cardId && audioFilename) {
          console.log('Attempting to regenerate audio URL for:', audioFilename);
          setFallbackAttempted(true);
          setLocalLoading(true); // Set loading state while regenerating
          
          try {
            // Try to regenerate TTS
            const result = await getTtsForSentence(cardId, sentence);
            if (result.success) {
              console.log('Successfully regenerated audio URL:', result.previewUrl);
              setLocalAudioUrl(result.previewUrl);
            } else {
              console.error('Failed to regenerate audio:', result.error || 'Unknown error');
            }
          } catch (err) {
            console.error('Error regenerating audio:', err);
          } finally {
            setLocalLoading(false); // Reset loading state when done
          }
        }
      };
      
      // Listen for metadata loaded (success case)
      const handleMetadata = () => {
        console.log('Audio URL is valid and accessible:', localAudioUrl);
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
      };
    }
  }, [localAudioUrl, sentence, cardId, audioFilename, fallbackAttempted]);

  // Attempt to regenerate audio if we have filename but no audioUrl
  useEffect(() => {
    if (!localAudioUrl && !fallbackAttempted && audioFilename && sentence && cardId) {
      console.log('Have filename but no URL, attempting to regenerate audio:', {
        audioFilename,
        cardId,
        sentenceStart: sentence.substring(0, 30) + (sentence.length > 30 ? '...' : '')
      });
      
      const regenerateAudio = async () => {
        setFallbackAttempted(true);
        setLocalLoading(true);
        
        try {
          console.log('Regenerating audio with getTtsForSentence...');
          const result = await getTtsForSentence(cardId, sentence);
          
          if (result && result.success) {
            console.log('Successfully regenerated audio, setting new URL:', result.previewUrl);
            setLocalAudioUrl(result.previewUrl);
          } else {
            console.error('Failed to regenerate audio:', result?.error || 'Unknown error');
          }
        } catch (err) {
          console.error('Error during audio regeneration:', err);
        } finally {
          setLocalLoading(false);
        }
      };
      
      regenerateAudio();
    }
  }, [localAudioUrl, fallbackAttempted, audioFilename, sentence, cardId]);

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
    isLoading: localLoading
  });

  return (
    <div className="example-sentence-audio">
      <div className="example-sentence-audio__content">
        <p className="example-sentence-audio__sentence">{sentence}</p>
        
        <div className="example-sentence-audio__controls">
          {localLoading ? (
            <div className="example-sentence-audio__loading-indicator">
              <div className="loading-spinner"></div>
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
              {audioFilename ? `Audio file ${audioFilename} exists but URL is missing` : 'No audio available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExampleSentenceAudio;