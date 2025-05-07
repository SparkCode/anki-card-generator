import React, { useState, useCallback } from 'react';
import DeckSelector from './DeckSelector';
import { getLocalStorageItem, setLocalStorageItem } from '../utils/localStorage';

/**
 * Form for entering a word and context to generate an Anki card
 * @param {Object} props - Component props
 * @param {Function} props.onSubmit - Function called when form is submitted
 * @param {boolean} props.isLoading - Whether the form submission is loading
 */
const WordForm = ({ onSubmit, isLoading }) => {
  const [word, setWord] = useState('');
  const [context, setContext] = useState('');
  const [error, setError] = useState('');
  const [selectedDeck, setSelectedDeck] = useState(
    getLocalStorageItem('lastSelectedDeck') || ''
  );

  const handleDeckSelect = useCallback((deck) => {
    setSelectedDeck(deck);
    setLocalStorageItem('lastSelectedDeck', deck);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!word.trim()) {
      setError('Please enter a word');
      return;
    }

    if (!selectedDeck) {
      setError('Please select a deck');
      return;
    }
    
    setError('');
    onSubmit(word.trim(), context.trim(), selectedDeck);
  };

  return (
    <div className="word-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="word-input">Enter a word to learn:</label>
          <input
            id="word-input"
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g., diligent, eloquent, procrastinate"
            className="form-control"
            disabled={isLoading}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="context-input">Optional context:</label>
          <input
            id="context-input"
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g., work ethics, public speaking or 'He was diligent in completing his work on time'"
            className="form-control"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <DeckSelector
            selectedDeck={selectedDeck}
            onDeckSelect={handleDeckSelect}
            disabled={isLoading}
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          type="submit" 
          className="button primary"
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Card'}
        </button>
      </form>
    </div>
  );
};

export default WordForm;
