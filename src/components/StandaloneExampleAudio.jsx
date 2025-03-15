import React, { useState, useEffect } from 'react';
import ExampleSentenceAudio from './ExampleSentenceAudio';
import { getLocalStorageItem } from '../utils/localStorage';
// Basic resets and global styles
import '../styles/reset.css';
// Import global animations first
import '../styles/animations.scss';
// Then import component styles
import './StandaloneExampleAudio.scss';
import './ExampleSentenceAudio.scss';

/**
 * Standalone component for displaying example sentence audio
 * Can be used independently of the CardDisplay component
 * 
 * @param {Object} props Component props
 * @param {string} props.word The word for which to display example sentence audio
 */
const StandaloneExampleAudio = ({ word }) => {
  const [loading, setLoading] = useState(true);
  const [exampleSentence, setExampleSentence] = useState('');
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [ttsAudioFilename, setTtsAudioFilename] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reset state when word changes
    setLoading(true);
    setError(null);
    setExampleSentence('');
    setTtsAudioUrl(null);
    setTtsAudioFilename(null);
    
    if (!word) {
      setLoading(false);
      setError('No word provided');
      return;
    }

    try {
      // Look up stored data for this word
      const storedDictData = getLocalStorageItem(`dictData_${word.toLowerCase()}`);
      
      if (!storedDictData) {
        setLoading(false);
        setError(`No audio data found for "${word}"`);
        return;
      }
      
      // Set example sentence data
      setExampleSentence(storedDictData.exampleSentence || '');
      
      // Handle audio URL carefully
      if (storedDictData.ttsPreviewUrl) {
        try {
          // Validate URL
          new URL(storedDictData.ttsPreviewUrl);
          setTtsAudioUrl(storedDictData.ttsPreviewUrl);
        } catch (urlError) {
          console.warn('Invalid audio URL:', urlError);
          setTtsAudioUrl(null);
        }
      }
      
      setTtsAudioFilename(storedDictData.ttsAudioFilename || null);
      setLoading(false);
    } catch (error) {
      console.error('Error loading example audio:', error);
      setError(`Error loading audio: ${error.message}`);
      setLoading(false);
    }
  }, [word]);

  if (loading) {
    return (
      <div className="standalone-example-audio">
        <div className="standalone-example-audio__loading">
          <div className="loading-spinner"></div>
          <p>Loading audio for "{word}"...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="standalone-example-audio">
        <div className="standalone-example-audio__error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!exampleSentence && !ttsAudioFilename) {
    return (
      <div className="standalone-example-audio">
        <div className="standalone-example-audio__not-found">
          <p>No example sentence available for "{word}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="standalone-example-audio">
      <header className="standalone-example-audio__header">
        <h2 className="standalone-example-audio__title">Example for "{word}"</h2>
      </header>
      
      <ExampleSentenceAudio 
        sentence={exampleSentence}
        audioUrl={ttsAudioUrl}
        audioFilename={ttsAudioFilename}
      />
    </div>
  );
};

export default StandaloneExampleAudio; 