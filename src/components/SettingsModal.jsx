import React from 'react';
import Modal from './Modal';
import LanguageSelector from './LanguageSelector';
import EnglishLevelSelector from './EnglishLevelSelector';
// Import the constant needed for reset
import { DEFAULT_PROMPT_TEMPLATE } from '../services/OpenAIChatService';
// Import utility functions used directly
import { getApiKey } from '../utils/localStorage';
import { hasOpenAIApiKey } from '../services/TtsService'; // Assuming this is where it lives

// Assuming styling is handled by existing CSS or inline styles for now

const SettingsModal = ({
  isOpen, // Controls visibility
  onClose, // Function to close the modal
  onManageApiKeys, // Function to open API settings
  enableTts,
  onToggleTts,
  selectedLanguage,
  onLanguageSelect,
  selectedEnglishLevel,
  onLevelSelect,
  promptTemplate,
  onPromptTemplateChange,
  onSavePromptTemplate,
  onResetPromptTemplate, // Pass the function to reset
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal onClose={onClose}>
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>API Settings</h3>
        {/* Use functions passed via props or imported directly */}
        <p>OpenAI API Key: {getApiKey() ? '••••••••' + getApiKey().slice(-4) : 'Not set'}</p>
        <button
          className="button secondary"
          onClick={onManageApiKeys} // Use the passed handler
        >
          Manage API Keys
        </button>
      </div>

      <div className="settings-section">
        <h3>Text-to-Speech</h3>
        <div className="setting-toggle">
          <label htmlFor="tts-toggle">Generate example audio using OpenAI TTS</label>
          <input
            id="tts-toggle"
            type="checkbox"
            checked={enableTts}
            onChange={onToggleTts} // Use the passed handler
          />
        </div>
        <p className="help-text">
          When enabled, the app will generate audio for example sentences using OpenAI's text-to-speech.
          {!hasOpenAIApiKey() && enableTts && (
            <span className="warning-text"> OpenAI API key is required for this feature.</span>
          )}
        </p>
      </div>

      <div className="settings-section">
        <h3>Language Preferences</h3>
        <p>Select your native language for card translations:</p>
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageSelect={onLanguageSelect} // Use the passed handler
          showLabel={false}
        />
      </div>

      <div className="settings-section">
        <h3>English Level</h3>
        <p>Specify your English proficiency level:</p>
        <EnglishLevelSelector
          selectedLevel={selectedEnglishLevel}
          onLevelSelect={onLevelSelect} // Use the passed handler
          showLabel={false}
        />
      </div>

      <div className="settings-section">
        <h3>Prompt Template</h3>
        <p>{`Edit the template used to generate Anki cards. Use placeholders like {{{level}}}, {{{languageName}}}, {{{word}}}, {{{contextPart}}}, {{{deckContext}}}.`}</p>
        <textarea
          value={promptTemplate}
          onChange={onPromptTemplateChange} // Use the passed handler
          rows="15"
          style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', padding: '5px' }}
        />
        <button
          className="button secondary"
          onClick={onSavePromptTemplate} // Use the passed handler
          style={{ marginTop: '10px' }}
        >
          Save Prompt Template
        </button>
        <button
           className="button secondary"
           onClick={onResetPromptTemplate} // Use the passed handler
           style={{ marginTop: '10px', marginLeft: '10px' }}
        >
          Reset to Default
        </button>
      </div>

      <div className="settings-section">
        <h3>About</h3>
        <p>This app generates Anki flashcards using OpenAI's GPT-4o model for content and can optionally generate TTS audio.</p>
        <p>Your API keys are stored only in your browser's local storage.</p>
      </div>

      <button
        className="button primary close-button"
        onClick={onClose} // Use the passed handler
        style={{ marginTop: '20px' }}
      >
        Close
      </button>
    </Modal>
  );
};

export default SettingsModal; 