import React, { useState } from 'react';
import DeckSelector from './DeckSelector';
import { addNote, testConnection, guiAddCards } from '../services/AnkiService';
import { getLocalStorageItem, setLocalStorageItem } from '../utils/localStorage';

/**
 * Modal for creating a card in Anki
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function called when the modal is closed
 * @param {string} props.cardContent - The content of the card to create
 * @param {Function} props.onSuccess - Function called when a card is successfully created
 */
const CreateCardModal = ({ isOpen, onClose, cardContent, onSuccess }) => {
  const [selectedDeck, setSelectedDeck] = useState(
    getLocalStorageItem('lastSelectedDeck') || ''
  );
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  // Check connection to Anki when modal opens
  React.useEffect(() => {
    if (isOpen) {
      checkAnkiConnection();
    }
  }, [isOpen]);

  const checkAnkiConnection = async () => {
    try {
      const connected = await testConnection();
      setConnectionStatus(connected);
      if (!connected) {
        setError('Could not connect to Anki. Please make sure Anki is running and AnkiConnect is installed.');
      }
    } catch (err) {
      setConnectionStatus(false);
      setError(err.message || 'Failed to connect to Anki');
      console.error('Error connecting to Anki:', err);
    }
  };

  const handleDeckSelect = (deck) => {
    setSelectedDeck(deck);
    setLocalStorageItem('lastSelectedDeck', deck);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDeck) {
      setError('Please select a deck');
      return;
    }
    
    try {
      setIsCreating(true);
      setError('');
      
      // Check connection again before trying to add the note
      const connected = await testConnection();
      if (!connected) {
        setError('Could not connect to Anki. Please make sure Anki is running and AnkiConnect is installed.');
        setIsCreating(false);
        return;
      }
      
      const noteId = await addNote(selectedDeck, cardContent, allowDuplicates);
      
      if (onSuccess) {
        onSuccess(noteId, selectedDeck);
      }
      
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create card in Anki');
      console.error('Error creating card:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenAnkiUI = async () => {
    if (!selectedDeck) {
      setError('Please select a deck');
      return;
    }
    
    try {
      setIsCreating(true);
      setError('');
      
      // Check connection before opening Anki UI
      const connected = await testConnection();
      if (!connected) {
        setError('Could not connect to Anki. Please make sure Anki is running and AnkiConnect is installed.');
        setIsCreating(false);
        return;
      }
      
      await guiAddCards(selectedDeck, cardContent, allowDuplicates);
      
      // Closing the modal since Anki UI is now open
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to open Anki UI');
      console.error('Error opening Anki UI:', err);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create Card in Anki</h2>
        
        {connectionStatus === false ? (
          <div className="error-message">
            <p>Could not connect to Anki. Please make sure:</p>
            <ol>
              <li>Anki is running</li>
              <li>AnkiConnect add-on is installed (add-on code: 2055492159)</li>
              <li>You've restarted Anki after installing the add-on</li>
            </ol>
            <button 
              className="button secondary"
              onClick={checkAnkiConnection}
            >
              Try Again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DeckSelector 
              selectedDeck={selectedDeck}
              onDeckSelect={handleDeckSelect}
              disabled={isCreating}
            />
            
            <div className="form-check" style={{ margin: '10px 0' }}>
              <input
                type="checkbox"
                id="allowDuplicates"
                checked={allowDuplicates}
                onChange={(e) => setAllowDuplicates(e.target.checked)}
                disabled={isCreating}
              />
              <label htmlFor="allowDuplicates" style={{ marginLeft: '8px' }}>
                Allow duplicate cards
              </label>
            </div>
            
            <div className="info-message" style={{ margin: '10px 0', fontSize: '0.9rem', color: '#666', backgroundColor: '#f5f7ff', padding: '8px', borderRadius: '4px' }}>
              <p style={{ margin: '0 0 4px 0' }}><strong>Note:</strong> Markdown formatting will be converted to HTML for Anki.</p>
              <p style={{ margin: '0' }}>Headings, lists, code blocks, and other formatting will be preserved in your Anki cards.</p>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="button-group">
              <button 
                type="button" 
                className="button secondary"
                onClick={onClose}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="button primary"
                onClick={handleOpenAnkiUI}
                disabled={isCreating || !selectedDeck || connectionStatus === false}
              >
                Open in Anki UI
              </button>
              <button 
                type="submit" 
                className="button primary"
                disabled={isCreating || !selectedDeck || connectionStatus === false}
              >
                {isCreating ? 'Creating...' : 'Create Card'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateCardModal;
