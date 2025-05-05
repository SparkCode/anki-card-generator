import React, { useState, useEffect, useCallback } from 'react';
import { getDecks, testConnection } from '../services/AnkiService';

/**
 * Component for selecting an Anki deck
 * @param {Object} props - Component props
 * @param {string} props.selectedDeck - The currently selected deck
 * @param {Function} props.onDeckSelect - Function called when a deck is selected
 * @param {boolean} props.disabled - Whether the selector is disabled
 */
const DeckSelector = ({ selectedDeck, onDeckSelect, disabled = false }) => {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDecks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First check if Anki is available
      const connected = await testConnection();
      if (!connected) {
        setError('Could not connect to Anki. Please make sure Anki is running and AnkiConnect is installed.');
        setLoading(false);
        return;
      }
      
      const deckList = await getDecks();
      setDecks(deckList);
      
      // If there's no selected deck but we have decks, select the first one
      if (!selectedDeck && deckList.length > 0) {
        onDeckSelect(deckList[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load decks');
      console.error('Error fetching decks:', err);
    } finally {
      setLoading(false);
    }
  }, [onDeckSelect, selectedDeck]);

  // Only fetch decks when the component mounts
  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  return (
    <div className="deck-selector">
      <div className="deck-selector-header">
        <label htmlFor="deck-select">Select Anki Deck:</label>
        <button 
          type="button"
          className="text-button refresh-button"
          onClick={fetchDecks}
          disabled={disabled || loading}
        >
          Refresh
        </button>
      </div>
      <select
        id="deck-select"
        value={selectedDeck || ''}
        onChange={(e) => onDeckSelect(e.target.value)}
        disabled={disabled || loading || !!error}
        className="form-control"
      >
        {!selectedDeck && <option value="">Select a deck</option>}
        {decks.map((deck) => (
          <option key={deck} value={deck}>
            {deck}
          </option>
        ))}
      </select>
      
      {loading && <div className="loading-indicator">Loading decks...</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default DeckSelector;
