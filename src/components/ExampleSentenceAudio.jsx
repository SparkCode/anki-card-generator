import React, { useState, useRef, useEffect } from 'react';
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
 */
const ExampleSentenceAudio = ({ 
  sentence, 
  audioUrl, 
  audioFilename,
  loading = false 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef(null);

  // Reset audio state when the URL changes
  useEffect(() => {
    setIsPlaying(false);
    setAudioError(false);
    
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
    };
  }, [audioUrl]);

  const handlePlayAudio = () => {
    if (!audioUrl || !audioRef.current) return;
    
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

  return (
    <div className="example-sentence-audio">
      <div className="example-sentence-audio__header">
        <h3 className="example-sentence-audio__title">📢 Sentence Audio:</h3>
        {audioFilename && (
          <div className="example-sentence-audio__badge">TTS</div>
        )}
      </div>

      <div className="example-sentence-audio__content">
        {loading ? (
          <div className="example-sentence-audio__loading">
            <span className="loading-spinner"></span>
            <span>Generating audio...</span>
          </div>
        ) : audioError ? (
          <div className="example-sentence-audio__no-audio">
            <span>Error loading audio</span>
          </div>
        ) : (
          <div className="example-sentence-audio__row">
            {/* Sentence text first */}
            {sentence && (
              <p className="example-sentence-audio__text">"{sentence}"</p>
            )}
            
            {/* Audio controls at the end - simplified to only show play icon */}
            {audioUrl ? (
              <button 
                className={`example-sentence-audio__play-button ${isPlaying ? 'playing' : ''}`}
                onClick={handlePlayAudio}
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
              >
                ▶
              </button>
            ) : audioFilename ? (
              <div className="example-sentence-audio__anki-ready">
                ▶
              </div>
            ) : (
              <div className="example-sentence-audio__no-audio-icon">
                ⚠
              </div>
            )}
            
            <audio 
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleAudioEnded}
              onError={handleAudioError}
              preload="metadata"
            />
          </div>
        )}
      </div>
      
      {!audioError && (audioUrl || audioFilename) && (
        <div className="example-sentence-audio__footer">
          This example sentence audio will be added to your Anki card
        </div>
      )}
    </div>
  );
};

export default ExampleSentenceAudio; 