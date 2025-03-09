import React, { useState } from 'react';
import { saveApiKey } from '../utils/localStorage';

/**
 * Modal dialog for setting up OpenRouter API key
 * @param {Object} props - Component props
 * @param {Function} props.onSave - Callback function when API key is saved
 * @param {boolean} props.isOpen - Whether the modal is open
 */
const APIKeyModal = ({ onSave, isOpen }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    try {
      saveApiKey(apiKey.trim());
      onSave();
      setApiKey('');
      setError('');
    } catch (err) {
      setError('Failed to save API key. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Welcome to Anki Card Generator</h2>
        <p>
          To generate cards, we need your OpenRouter API key. Your key is stored only in your
          browser's local storage and is never sent to our servers.
        </p>
        
        <div className="form-group">
          <label htmlFor="api-key">OpenRouter API Key</label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your OpenRouter API key"
            className="form-control"
          />
          {error && <div className="error-message">{error}</div>}
          
          <div className="help-text">
            <p>Don't have an API key? <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
              Get one from OpenRouter
            </a></p>
          </div>
        </div>
        
        <div className="modal-actions">
          <button 
            className="button primary" 
            onClick={handleSave}
          >
            Save API Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default APIKeyModal;
