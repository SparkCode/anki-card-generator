import React, { useState, useEffect } from 'react';
import { saveApiKey, getApiKey } from '../utils/localStorage';
import { saveOpenAIApiKey, getOpenAIApiKey } from '../services/TtsService';

/**
 * Modal dialog for managing API settings
 * @param {Object} props - Component props
 * @param {Function} props.onSave - Callback function when settings are saved
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {boolean} props.embedded - Whether the component is embedded in another modal
 */
const APISettingsModal = ({ onSave, isOpen, embedded = false }) => {
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Load existing API keys when the modal opens
  useEffect(() => {
    if (isOpen) {
      const existingOpenRouterKey = getApiKey() || '';
      const existingOpenAIKey = getOpenAIApiKey() || '';
      
      setOpenRouterKey(existingOpenRouterKey);
      setOpenAIKey(existingOpenAIKey);
      setError('');
      setSuccessMessage('');
    }
  }, [isOpen]);

  const handleSave = () => {
    try {
      // Check if at least one API key is provided
      if (!openRouterKey.trim() && !openAIKey.trim()) {
        setError('Please enter at least one API key');
        return;
      }

      // Save OpenRouter API key if provided
      if (openRouterKey.trim()) {
        saveApiKey(openRouterKey.trim());
      }
      
      // Save OpenAI API key if provided
      if (openAIKey.trim()) {
        saveOpenAIApiKey(openAIKey.trim());
      }
      
      setSuccessMessage('API settings saved successfully!');
      setTimeout(() => {
        onSave();
        setSuccessMessage('');
      }, 1500);
    } catch (err) {
      setError('Failed to save API settings. Please try again.');
    }
  };

  if (!isOpen) return null;

  // The content to be rendered inside the modal or as a standalone component
  const renderContent = () => (
    <>
      {!embedded && <h2>API Settings</h2>}
      <p>
        Configure your API keys for card generation and audio features. Your keys are stored only in your
        browser's local storage and are never sent to our servers.
      </p>
      
      <div className="form-group">
        <label htmlFor="openrouter-key">OpenRouter API Key (for card generation)</label>
        <input
          id="openrouter-key"
          type="password"
          value={openRouterKey}
          onChange={(e) => setOpenRouterKey(e.target.value)}
          placeholder="Enter your OpenRouter API key"
          className="form-control"
        />
        
        <div className="help-text">
          <p>Don't have an OpenRouter API key? <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
            Get one from OpenRouter
          </a></p>
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="openai-key">OpenAI API Key (for audio generation)</label>
        <input
          id="openai-key"
          type="password"
          value={openAIKey}
          onChange={(e) => setOpenAIKey(e.target.value)}
          placeholder="Enter your OpenAI API key"
          className="form-control"
        />
        
        <div className="help-text">
          <p>Don't have an OpenAI API key? <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer">
            Get one from OpenAI
          </a></p>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      <div className="modal-actions">
        {!embedded && (
          <button 
            className="button secondary" 
            onClick={onSave}
          >
            Cancel
          </button>
        )}
        <button 
          className="button primary" 
          onClick={handleSave}
        >
          Save Settings
        </button>
      </div>
    </>
  );

  // If embedded, just return the content directly
  if (embedded) {
    return renderContent();
  }

  // Otherwise wrap it in a modal
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default APISettingsModal;
